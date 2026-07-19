import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import fs from "fs";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import { z } from "zod";

dotenv.config();

const USERS_FILE_PATH = path.join(process.cwd(), "server_users.json");

// Helper to load users from server_users.json
function loadServerUsers(): any[] {
  if (fs.existsSync(USERS_FILE_PATH)) {
    try {
      const content = fs.readFileSync(USERS_FILE_PATH, "utf-8");
      return JSON.parse(content || "[]");
    } catch (e) {
      console.error("Error reading users file:", e);
      return [];
    }
  }
  return [];
}

// Helper to save users to server_users.json
function saveServerUsers(users: any[]) {
  try {
    fs.writeFileSync(USERS_FILE_PATH, JSON.stringify(users, null, 2), "utf-8");
  } catch (e) {
    console.error("Error writing users file:", e);
  }
}

// In-memory active sessions map (userId -> sessionToken)
const activeSessions: Record<string, string> = {};
const lastActiveTime: Record<string, number> = {};

// In-memory store for OTP/Auth endpoints rate limiting
interface RateLimitRecord {
  count: number;
  resetTime: number;
}
const authRateLimits: Record<string, RateLimitRecord> = {};

// Custom Rate Limiter: Maximum 3 requests per 10 minutes per IP/Account
function authRateLimiter(req: express.Request, res: express.Response, next: express.NextFunction) {
  const ip = req.ip || req.headers["x-forwarded-for"] || "unknown";
  const account = (
    req.body?.loginIdentifier || 
    req.body?.email || 
    req.body?.mobile || 
    "global"
  ).toString().toLowerCase().trim();

  const now = Date.now();
  const windowMs = 10 * 60 * 1000; // 10 minutes
  const maxRequests = 3;

  const keyIp = `rate_ip_${ip}`;
  const keyAcc = `rate_acc_${account}`;

  for (const key of [keyIp, keyAcc]) {
    if (key === "rate_acc_global") continue;

    const record = authRateLimits[key];
    if (!record) {
      authRateLimits[key] = { count: 1, resetTime: now + windowMs };
    } else {
      if (now > record.resetTime) {
        record.count = 1;
        record.resetTime = now + windowMs;
      } else {
        record.count += 1;
        if (record.count > maxRequests) {
          const timeLeftSec = Math.ceil((record.resetTime - now) / 1000);
          const timeLeftMin = Math.ceil(timeLeftSec / 60);
          return res.status(429).json({
            error: `Security Alert: Too many auth/OTP attempts. Try again in ${timeLeftMin} minutes.`
          });
        }
      }
    }
  }
  next();
}

// Deep sanitization helper against XSS and prototype pollution
function sanitizeInput(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "string") {
    // Escape standard HTML tags and characters
    return obj
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;")
      .replace(/\//g, "&#x2F;");
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeInput);
  }
  if (typeof obj === "object") {
    const result: any = {};
    for (const key of Object.keys(obj)) {
      // Prevent prototype pollution attacks
      if (key === "__proto__" || key === "constructor" || key === "prototype") continue;
      result[key] = sanitizeInput(obj[key]);
    }
    return result;
  }
  return obj;
}

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// Zod validation schemas
const registerSchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9_-]+$/).optional(),
  name: z.string().min(1, "Name is required").max(100).trim(),
  email: z.string().email("Invalid email format").or(z.literal("")).optional(),
  mobile: z.string().max(20).optional(),
  hobbies: z.string().max(200).optional(),
  password: z.string().min(4, "Password must be at least 4 characters"),
  createdAt: z.string().optional(),
});

const loginSchema = z.object({
  loginMethod: z.string().optional(),
  loginIdentifier: z.string().min(1, "Missing login identifier").trim(),
  password: z.string().min(1, "Password is required"),
});

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email format").or(z.literal("")).optional(),
  mobile: z.string().max(20).optional(),
  newPassword: z.string().min(4, "Password must be at least 4 characters"),
});

const updateHobbiesSchema = z.object({
  userId: z.string().min(1),
  hobbies: z.string().max(200),
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  // --- NETWORK HARDENING & SECURITY HEADERS (Helmet & CORS) ---
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "https:", "http:"],
          connectSrc: ["'self'", "ws:", "wss:", "https:", "http:"],
          frameAncestors: [
            "'self'",
            "https://*.google.com",
            "https://*.google.dev",
            "https://*.run.app",
            "https://ai.studio",
            "https://*.studio"
          ],
        },
      },
      // Modern mitigation against clickjacking relies on CSP frame-ancestors.
      frameguard: false,
    })
  );

  app.use(
    cors({
      origin: ["http://localhost:3000", "https://*.run.app", "https://ai.studio"],
      credentials: true,
    })
  );

  app.use(express.json());
  app.use(cookieParser("super-secure-cookie-ledger-key"));

  // Global sanitization middleware for all request bodies
  app.use((req, res, next) => {
    if (req.body) {
      req.body = sanitizeInput(req.body);
    }
    if (req.query) {
      req.query = sanitizeInput(req.query);
    }
    next();
  });

  // API Route: AI Habit/Hobby Link Update Prompt
  app.post("/api/gemini/update-habits", async (req, res) => {
    try {
      const { prompt, currentFocus, currentHabitsList } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required to link with Google AI Studio" });
      }

      const systemInstruction = `You are a professional student mentor and academic routine optimizer.
Based on the student's request, you will update or suggest their primary FOCUS HOBBIES (as a single descriptive string), and suggest a list of 1 to 5 highly structured habits/routines to add.
Each suggested habit must include:
1. A clear, concise title/name.
2. A single matching emoji character.
3. A category name (e.g. "Tech", "Routine", "Study", "Fitness", "Creative").

Guidelines:
- If the student requests specific topics, tailor the focus field and habits to match them exactly.
- Keep the habit names actionable, e.g. "Practice DSA", "Read 10 pages", "Workout".
- Keep the category simple and capitalized.`;

      const contents = `User Request: "${prompt}"
Current Focus Area/Hobbies: "${currentFocus || ""}"
Current Habits: ${JSON.stringify(currentHabitsList || [])}

Analyze the user's intent, then output the updated focus/hobbies, and the recommended habits to be created.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              updatedFocus: {
                type: Type.STRING,
                description: "The optimized focus hobbies field for the student based on their request.",
              },
              suggestedHabits: {
                type: Type.ARRAY,
                description: "The list of custom habits suggested to add.",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: {
                      type: Type.STRING,
                      description: "Brief name of the habit/routine.",
                    },
                    emoji: {
                      type: Type.STRING,
                      description: "Exactly one visual emoji character matching the routine.",
                    },
                    category: {
                      type: Type.STRING,
                      description: "Simple category tag (e.g. 'Study', 'Fitness', 'Routine', 'Skill').",
                    },
                  },
                  required: ["name", "emoji", "category"],
                },
              },
            },
            required: ["updatedFocus", "suggestedHabits"],
          },
        },
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("No response received from Google AI Studio models");
      }

      const result = JSON.parse(responseText.trim());
      res.json(result);
    } catch (error: any) {
      console.error("Gemini AI API Error:", error);
      res.status(500).json({ 
        error: "Failed to query Google AI Studio", 
        details: error.message || error 
      });
    }
  });

  // --- SESSION AND USER SHARING AUTH ENDPOINTS ---
  
  // Sync local users to server
  app.post("/api/auth/sync", (req, res) => {
    try {
      const { users: clientUsers } = req.body;
      if (!Array.isArray(clientUsers)) {
        return res.status(400).json({ error: "Invalid users list" });
      }
      
      const serverUsers = loadServerUsers();
      let updated = false;
      
      clientUsers.forEach((clientUser: any) => {
        const exists = serverUsers.some((u: any) => 
          u.id === clientUser.id || 
          u.email.toLowerCase() === clientUser.email.toLowerCase() || 
          u.mobile === clientUser.mobile
        );
        if (!exists) {
          serverUsers.push(clientUser);
          updated = true;
        }
      });
      
      if (updated) {
        saveServerUsers(serverUsers);
      }
      
      res.json({ success: true, count: serverUsers.length });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Handle server Register (Rate Limited)
  app.post("/api/auth/register", authRateLimiter, (req, res) => {
    try {
      const validationResult = registerSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ error: validationResult.error.issues[0].message });
      }

      const { id, name, email, mobile, hobbies, password, createdAt } = validationResult.data;
      
      const emailTrimmed = email ? email.trim() : "";
      const mobileTrimmed = mobile ? mobile.trim() : "";

      if (!emailTrimmed && !mobileTrimmed) {
        return res.status(400).json({ error: "Please provide either an email or a mobile number." });
      }
      
      const serverUsers = loadServerUsers();
      const exists = serverUsers.some((u: any) => {
        const emailDuplicate = emailTrimmed && u.email && u.email.toLowerCase() === emailTrimmed.toLowerCase();
        const mobileDuplicate = mobileTrimmed && u.mobile && u.mobile.trim() === mobileTrimmed;
        return emailDuplicate || mobileDuplicate;
      });

      if (exists) {
        return res.status(400).json({ error: "An account with this email or mobile already exists." });
      }
      
      const timestamp = new Date().toISOString();
      const newUser = {
        id: id || "user-" + Date.now(),
        name,
        email: emailTrimmed,
        mobile: mobileTrimmed,
        hobbies: hobbies || "General Productivity",
        password,
        createdAt: createdAt || timestamp,
        lastLoginAt: timestamp,
      };
      
      serverUsers.push(newUser);
      saveServerUsers(serverUsers);
      
      const sessionToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
      activeSessions[newUser.id] = sessionToken;
      lastActiveTime[newUser.id] = Date.now();
      
      // Set secure HttpOnly cookies
      res.cookie("sessionToken", sessionToken, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        maxAge: 30 * 60 * 1000, // 30 minutes
      });
      res.cookie("userId", newUser.id, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        maxAge: 30 * 60 * 1000,
      });

      res.json({ success: true, user: newUser, sessionToken });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Handle server Login (Rate Limited)
  app.post("/api/auth/login", authRateLimiter, (req, res) => {
    try {
      const validationResult = loginSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ error: validationResult.error.issues[0].message });
      }

      const { loginIdentifier, password } = validationResult.data;
      
      const serverUsers = loadServerUsers();
      const identifier = loginIdentifier.toLowerCase().trim();
      const userIndex = serverUsers.findIndex((u: any) => {
        const emailMatch = u.email && u.email.toLowerCase() === identifier;
        const mobileMatch = u.mobile && u.mobile.trim() === identifier;
        const nameMatch = u.name && u.name.toLowerCase().trim() === identifier;
        return (emailMatch || mobileMatch || nameMatch) && u.password === password;
      });
      
      if (userIndex === -1) {
        return res.status(400).json({ error: "Invalid credentials. Please verify details." });
      }
      
      const user = serverUsers[userIndex];
      const timestamp = new Date().toISOString();
      
      // Track last login timestamp in Security Activity Log
      user.lastLoginAt = timestamp;
      saveServerUsers(serverUsers);

      const sessionToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
      activeSessions[user.id] = sessionToken;
      lastActiveTime[user.id] = Date.now();
      
      // Set secure HttpOnly cookies
      res.cookie("sessionToken", sessionToken, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        maxAge: 30 * 60 * 1000, // 30 minutes
      });
      res.cookie("userId", user.id, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        maxAge: 30 * 60 * 1000,
      });

      res.json({ success: true, user, sessionToken });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update user's password (forgot password) (Rate Limited)
  app.post("/api/auth/forgot-password", authRateLimiter, (req, res) => {
    try {
      const validationResult = forgotPasswordSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ error: validationResult.error.issues[0].message });
      }

      const { email, mobile, newPassword } = validationResult.data;
      const emailTrimmed = email ? email.toLowerCase().trim() : "";
      const mobileTrimmed = mobile ? mobile.trim() : "";

      if ((!emailTrimmed && !mobileTrimmed) || !newPassword) {
        return res.status(400).json({ error: "Please provide either an email or a mobile number, and the new password." });
      }

      const serverUsers = loadServerUsers();
      const userIndex = serverUsers.findIndex((u: any) => {
        if (emailTrimmed && mobileTrimmed) {
          return u.email && u.email.toLowerCase() === emailTrimmed && u.mobile && u.mobile.trim() === mobileTrimmed;
        } else if (emailTrimmed) {
          return u.email && u.email.toLowerCase() === emailTrimmed;
        } else if (mobileTrimmed) {
          return u.mobile && u.mobile.trim() === mobileTrimmed;
        }
        return false;
      });

      if (userIndex === -1) {
        return res.status(404).json({ error: "No account found with the provided details." });
      }

      serverUsers[userIndex].password = newPassword;
      saveServerUsers(serverUsers);

      res.json({ success: true, message: "Password updated successfully!" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Secure cookie-based me/session retrieval for page reload
  app.get("/api/auth/session", (req, res) => {
    try {
      const { sessionToken, userId } = req.cookies;
      if (!sessionToken || !userId) {
        return res.json({ success: false });
      }

      const activeToken = activeSessions[userId];
      const lastSeen = lastActiveTime[userId] || 0;
      const now = Date.now();

      // Enforce 30-minute inactivity limit on startup as well
      if (!activeToken || activeToken !== sessionToken || (now - lastSeen > 30 * 60 * 1000)) {
        delete activeSessions[userId];
        delete lastActiveTime[userId];
        res.clearCookie("sessionToken");
        res.clearCookie("userId");
        return res.json({ success: false });
      }

      lastActiveTime[userId] = now;
      const serverUsers = loadServerUsers();
      const user = serverUsers.find((u: any) => u.id === userId);
      if (!user) {
        return res.json({ success: false });
      }

      res.json({ success: true, user });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Clear Session & Cookies on Logout
  app.post("/api/auth/logout", (req, res) => {
    try {
      const { userId } = req.cookies;
      if (userId) {
        delete activeSessions[userId];
        delete lastActiveTime[userId];
      }
      res.clearCookie("sessionToken");
      res.clearCookie("userId");
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update user's focus hobbies
  app.post("/api/auth/update-hobbies", (req, res) => {
    try {
      const validationResult = updateHobbiesSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ error: validationResult.error.issues[0].message });
      }

      const { userId, hobbies } = validationResult.data;

      const serverUsers = loadServerUsers();
      const userIndex = serverUsers.findIndex((u: any) => u.id === userId);
      if (userIndex === -1) {
        return res.status(404).json({ error: "User not found" });
      }

      serverUsers[userIndex].hobbies = hobbies;
      saveServerUsers(serverUsers);

      res.json({ success: true, user: serverUsers[userIndex] });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- REAL-TIME USERS AND SOCIAL ENDPOINTS ---

  // Get all users with online status and request list
  app.get("/api/auth/users", (req, res) => {
    try {
      const serverUsers = loadServerUsers();
      const usersWithOnline = serverUsers.map((u: any) => {
        const lastSeen = lastActiveTime[u.id] || 0;
        const isOnline = !!activeSessions[u.id] && (Date.now() - lastSeen < 12000);
        return {
          id: u.id,
          name: u.name,
          friendsList: u.friendsList || [],
          sentRequests: u.sentRequests || [],
          receivedRequests: u.receivedRequests || [],
          isOnline
        };
      });
      res.json({ success: true, users: usersWithOnline });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Send single/multiple friend requests
  app.post("/api/auth/friend-request/send", (req, res) => {
    try {
      const { senderId, receiverId, receiverIds } = req.body;
      const targetIds = receiverIds ? receiverIds : (receiverId ? [receiverId] : []);
      if (!senderId || targetIds.length === 0) {
        return res.status(400).json({ error: "Missing senderId or target receiverIds" });
      }

      const serverUsers = loadServerUsers();
      let updated = false;

      const sender = serverUsers.find((u: any) => u.id === senderId);
      if (sender) {
        if (!sender.sentRequests) sender.sentRequests = [];
        targetIds.forEach((rId: string) => {
          if (!sender.sentRequests.includes(rId)) {
            sender.sentRequests.push(rId);
            updated = true;
          }

          const receiver = serverUsers.find((u: any) => u.id === rId);
          if (receiver) {
            if (!receiver.receivedRequests) receiver.receivedRequests = [];
            if (!receiver.receivedRequests.includes(senderId)) {
              receiver.receivedRequests.push(senderId);
              updated = true;
            }
          }
        });
      }

      if (updated) {
        saveServerUsers(serverUsers);
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Accept a friend request
  app.post("/api/auth/friend-request/accept", (req, res) => {
    try {
      const { userId, requesterId } = req.body;
      if (!userId || !requesterId) {
        return res.status(400).json({ error: "Missing userId or requesterId" });
      }

      const serverUsers = loadServerUsers();
      let updated = false;

      const user = serverUsers.find((u: any) => u.id === userId);
      const requester = serverUsers.find((u: any) => u.id === requesterId);

      if (user && requester) {
        // Update user
        user.receivedRequests = (user.receivedRequests || []).filter((id: string) => id !== requesterId);
        if (!user.friendsList) user.friendsList = [];
        if (!user.friendsList.includes(requesterId)) {
          user.friendsList.push(requesterId);
        }

        // Update requester
        requester.sentRequests = (requester.sentRequests || []).filter((id: string) => id !== userId);
        if (!requester.friendsList) requester.friendsList = [];
        if (!requester.friendsList.includes(userId)) {
          requester.friendsList.push(userId);
        }

        updated = true;
      }

      if (updated) {
        saveServerUsers(serverUsers);
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Reject a friend request
  app.post("/api/auth/friend-request/reject", (req, res) => {
    try {
      const { userId, requesterId } = req.body;
      if (!userId || !requesterId) {
        return res.status(400).json({ error: "Missing userId or requesterId" });
      }

      const serverUsers = loadServerUsers();
      let updated = false;

      const user = serverUsers.find((u: any) => u.id === userId);
      const requester = serverUsers.find((u: any) => u.id === requesterId);

      if (user) {
        user.receivedRequests = (user.receivedRequests || []).filter((id: string) => id !== requesterId);
        updated = true;
      }
      if (requester) {
        requester.sentRequests = (requester.sentRequests || []).filter((id: string) => id !== userId);
        updated = true;
      }

      if (updated) {
        saveServerUsers(serverUsers);
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Check active device session concurrency & inactivity
  app.get("/api/auth/check-session", (req, res) => {
    try {
      const { sessionToken, userId } = req.cookies;
      if (!userId || !sessionToken) {
        return res.json({ valid: false, reason: "session_expired" });
      }
      
      const uId = String(userId);
      const sToken = String(sessionToken);
      
      const activeToken = activeSessions[uId];
      const lastSeen = lastActiveTime[uId] || 0;
      const now = Date.now();
      
      // If server was restarted and session isn't in-memory, adopt it to prevent false logouts
      if (!activeToken) {
        activeSessions[uId] = sToken;
        lastActiveTime[uId] = now;
        return res.json({ valid: true });
      }
      
      // 30 minutes Inactivity Timeout
      if (now - lastSeen > 30 * 60 * 1000) {
        delete activeSessions[uId];
        delete lastActiveTime[uId];
        res.clearCookie("sessionToken");
        res.clearCookie("userId");
        return res.json({ valid: false, reason: "session_expired" });
      }
      
      if (activeToken === sToken) {
        lastActiveTime[uId] = now;
        return res.json({ valid: true });
      } else {
        return res.json({ valid: false, reason: "logged_out_by_other_device" });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Health endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite integration middleware for development vs production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

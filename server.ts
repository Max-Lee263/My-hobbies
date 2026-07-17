import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import fs from "fs";

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

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(express.json());

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

  // Handle server Register
  app.post("/api/auth/register", (req, res) => {
    try {
      const { id, name, email, mobile, hobbies, password, createdAt } = req.body;
      if (!name || !email || !mobile || !password) {
        return res.status(400).json({ error: "Missing required register fields" });
      }
      
      const serverUsers = loadServerUsers();
      const exists = serverUsers.some((u: any) => 
        u.email.toLowerCase() === email.toLowerCase() || 
        u.mobile === mobile
      );
      if (exists) {
        return res.status(400).json({ error: "An account with this email or mobile already exists." });
      }
      
      const newUser = {
        id: id || "user-" + Date.now(),
        name,
        email,
        mobile,
        hobbies: hobbies || "General Productivity",
        password,
        createdAt: createdAt || new Date().toISOString(),
      };
      
      serverUsers.push(newUser);
      saveServerUsers(serverUsers);
      
      const sessionToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
      activeSessions[newUser.id] = sessionToken;
      
      res.json({ success: true, user: newUser, sessionToken });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Handle server Login
  app.post("/api/auth/login", (req, res) => {
    try {
      const { loginMethod, loginIdentifier, password } = req.body;
      if (!loginIdentifier || !password) {
        return res.status(400).json({ error: "Missing credentials" });
      }
      
      const serverUsers = loadServerUsers();
      const user = serverUsers.find((u: any) => {
        if (loginMethod === "email") {
          return u.email.toLowerCase() === loginIdentifier.toLowerCase().trim() && u.password === password;
        } else {
          return u.mobile.trim() === loginIdentifier.trim() && u.password === password;
        }
      });
      
      if (!user) {
        return res.status(400).json({ error: "Invalid credentials. Please verify details." });
      }
      
      const sessionToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
      activeSessions[user.id] = sessionToken;
      
      res.json({ success: true, user, sessionToken });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update user's focus hobbies
  app.post("/api/auth/update-hobbies", (req, res) => {
    try {
      const { userId, hobbies } = req.body;
      if (!userId) {
        return res.status(400).json({ error: "Missing userId" });
      }

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

  // Check active device session concurrency
  app.get("/api/auth/check-session", (req, res) => {
    try {
      const { userId, sessionToken } = req.query;
      if (!userId || !sessionToken) {
        return res.status(400).json({ error: "Missing parameters" });
      }
      
      const uId = String(userId);
      const sToken = String(sessionToken);
      
      // If server was restarted and session isn't in-memory, adopt it to prevent false logouts
      if (!activeSessions[uId]) {
        activeSessions[uId] = sToken;
        lastActiveTime[uId] = Date.now();
        return res.json({ valid: true });
      }
      
      if (activeSessions[uId] === sToken) {
        lastActiveTime[uId] = Date.now();
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

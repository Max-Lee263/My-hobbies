import React, { useState, FormEvent, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { User } from "../types";
import { KeyRound, Mail, Phone, School, Sparkles, UserPlus, LogIn, Heart, Check, Plus, ChevronDown, ChevronUp, Award, BookOpen, Eye, EyeOff, HelpCircle, RefreshCw, ArrowLeft } from "lucide-react";

interface AuthScreenProps {
  onLogin: (user: User) => void;
}

// Prefilled schools/accounts to make the app easy to play with right away
const DEMO_ACCOUNTS: Omit<User, "password">[] = [
  {
    id: "demo-school-1",
    name: "Delhi Public School",
    email: "school@dps.edu",
    mobile: "9876543210",
    hobbies: "Academic Discipline, Daily Sports, Creative Arts",
    createdAt: new Date().toISOString(),
  },
  {
    id: "demo-school-2",
    name: "Green Valley High",
    email: "info@greenvalley.edu",
    mobile: "9988776655",
    hobbies: "Yoga & Mindfulness, Clean Campus Drive, Reading",
    createdAt: new Date().toISOString(),
  },
];

const PREDEFINED_SUBJECTS: Record<string, string[]> = {
  "Physics": [
    "Mechanics", "Thermodynamics", "Optics", "Electromagnetism", "Nuclear Physics",
    "Physics Mock Test - Part 1", "Physics Mock Test - Part 2", "Physics Mock Test - Part 3", "Physics Mock Test - Part 4"
  ],
  "Chemistry": [
    "Organic Chemistry", "Inorganic Chemistry", "Physical Chemistry", "Biochemistry", "Electrochemistry",
    "Chemistry Mock Test - Part 1", "Chemistry Mock Test - Part 2", "Chemistry Mock Test - Part 3", "Chemistry Mock Test - Part 4"
  ],
  "Mathematics": [
    "Algebra & Calculus", "Geometry & Vectors", "Probability & Statistics", "Trigonometry", "Linear Algebra",
    "Mathematics Mock Test - Part 1", "Mathematics Mock Test - Part 2", "Mathematics Mock Test - Part 3", "Mathematics Mock Test - Part 4"
  ],
  "Biology": [
    "Cell Biology", "Genetics & Evolution", "Human Physiology", "Plant Anatomy", "Ecology",
    "Biology Mock Test - Part 1", "Biology Mock Test - Part 2", "Biology Mock Test - Part 3", "Biology Mock Test - Part 4"
  ],
  "Computer Science": [
    "Data Structures & Algorithms", "Web Development", "Database Systems", "Machine Learning", "Operating Systems",
    "Computer Science Mock Test - Part 1", "Computer Science Mock Test - Part 2", "Computer Science Mock Test - Part 3", "Computer Science Mock Test - Part 4"
  ],
  "English": [
    "Grammar & Syntax", "Reading Comprehension", "Creative Writing", "Vocabulary & Idioms", "Literature Review",
    "English Mock Test - Part 1", "English Mock Test - Part 2", "English Mock Test - Part 3", "English Mock Test - Part 4"
  ],
  "General Hobbies": [
    "Yoga & Meditation", "Daily Fitness & Workout", "Creative Writing", "Book Reading", "Digital Art & Painting", "Competitive Gaming"
  ]
};

export default function AuthScreen({ onLogin }: AuthScreenProps) {
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [loginMethod, setLoginMethod] = useState<"email" | "mobile">("email");

  // Login Form State
  const [loginIdentifier, setLoginIdentifier] = useState(""); // email or mobile
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // Registration Form State
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regMobile, setRegMobile] = useState("");
  const [regHobbies, setRegHobbies] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regError, setRegError] = useState("");
  const [showQuickSelect, setShowQuickSelect] = useState(false);
  const [activeRegSubject, setActiveRegSubject] = useState("Physics");

  // Show/Hide password states
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Forgot Password flow states
  const [isForgotFlow, setIsForgotFlow] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotMobile, setForgotMobile] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");
  const [forgotError, setForgotError] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState("");
  const [showForgotNewPassword, setShowForgotNewPassword] = useState(false);
  const [showForgotConfirmPassword, setShowForgotConfirmPassword] = useState(false);

  // Sync existing local accounts to server database on mount
  useEffect(() => {
    const localUsers = JSON.parse(localStorage.getItem("ledger_users") || "[]");
    if (localUsers.length > 0) {
      fetch("/api/auth/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ users: localUsers })
      })
      .then(res => res.json())
      .catch(err => console.error("Error syncing local users to server on load:", err));
    }
  }, []);

  // Handle Register
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError("");

    if (!regName.trim() || !regEmail.trim() || !regMobile.trim() || !regPassword.trim()) {
      setRegError("Please fill out all required fields.");
      return;
    }

    // Basic Validation
    if (!regEmail.includes("@")) {
      setRegError("Please enter a valid email address.");
      return;
    }

    if (regMobile.length < 10) {
      setRegError("Please enter a valid 10-digit mobile number.");
      return;
    }

    const newUser: User = {
      id: "user-" + Date.now(),
      name: regName.trim(),
      email: regEmail.trim(),
      mobile: regMobile.trim(),
      hobbies: regHobbies.trim() || "General Productivity",
      password: regPassword,
      createdAt: new Date().toISOString(),
    };

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser)
      });
      
      const data = await response.json();
      if (!response.ok || !data.success) {
        setRegError(data.error || "Failed to register on the ledger server.");
        return;
      }

      // Sync local cache
      const users: User[] = JSON.parse(localStorage.getItem("ledger_users") || "[]");
      if (!users.some(u => u.id === data.user.id)) {
        users.push(data.user);
        localStorage.setItem("ledger_users", JSON.stringify(users));
      }

      // Save active session token and user
      localStorage.setItem("ledger_session_token", data.sessionToken);
      localStorage.setItem("ledger_current_user", JSON.stringify(data.user));
      onLogin(data.user);
    } catch (err: any) {
      setRegError("Connection to active ledger server failed. Please try again.");
    }
  };

  // Handle Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    if (!loginIdentifier.trim() || !loginPassword.trim()) {
      setLoginError("Please enter your credentials.");
      return;
    }

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loginMethod,
          loginIdentifier,
          password: loginPassword
        })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        setLoginError(data.error || "Invalid credentials.");
        return;
      }

      // Save to local cache if not present
      const users: User[] = JSON.parse(localStorage.getItem("ledger_users") || "[]");
      if (!users.some(u => u.id === data.user.id)) {
        users.push(data.user);
        localStorage.setItem("ledger_users", JSON.stringify(users));
      }

      // Save active session token and user
      localStorage.setItem("ledger_session_token", data.sessionToken);
      localStorage.setItem("ledger_current_user", JSON.stringify(data.user));
      onLogin(data.user);
    } catch (err: any) {
      setLoginError("Failed to connect to session manager server.");
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError("");
    setForgotSuccess("");

    if (!forgotEmail.trim() || !forgotMobile.trim() || !forgotNewPassword.trim()) {
      setForgotError("Please fill in all required fields.");
      return;
    }

    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError("Passwords do not match.");
      return;
    }

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: forgotEmail.trim(),
          mobile: forgotMobile.trim(),
          newPassword: forgotNewPassword
        })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        setForgotError(data.error || "Failed to reset password.");
        return;
      }

      // Update in local cache as well
      const localUsers: User[] = JSON.parse(localStorage.getItem("ledger_users") || "[]");
      const updatedUsers = localUsers.map(u => {
        if (u.email.toLowerCase() === forgotEmail.trim().toLowerCase() && u.mobile.trim() === forgotMobile.trim()) {
          return { ...u, password: forgotNewPassword };
        }
        return u;
      });
      localStorage.setItem("ledger_users", JSON.stringify(updatedUsers));

      setForgotSuccess("Password updated successfully! You can now sign in with your new password.");
      
      // Clear fields
      setForgotEmail("");
      setForgotMobile("");
      setForgotNewPassword("");
      setForgotConfirmPassword("");
    } catch (err: any) {
      setForgotError("Failed to connect to ledger server.");
    }
  };

  // Quick Demo Login
  const handleDemoLogin = async (demoUser: Omit<User, "password">) => {
    // Attempt standard login first
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loginMethod: "email",
          loginIdentifier: demoUser.email,
          password: "password123"
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        localStorage.setItem("ledger_session_token", data.sessionToken);
        localStorage.setItem("ledger_current_user", JSON.stringify(data.user));
        onLogin(data.user);
        return;
      }
    } catch (e) {}

    // Fallback: register the demo account if it doesn't exist on server yet
    const newUserWithPassword: User = {
      ...demoUser,
      password: "password123",
    };

    try {
      const registerRes = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUserWithPassword)
      });
      const data = await registerRes.json();
      if (registerRes.ok && data.success) {
        localStorage.setItem("ledger_session_token", data.sessionToken);
        localStorage.setItem("ledger_current_user", JSON.stringify(data.user));
        onLogin(data.user);
      }
    } catch (e) {
      // Offline local-only fallback
      localStorage.setItem("ledger_current_user", JSON.stringify(newUserWithPassword));
      onLogin(newUserWithPassword);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f2f2f2] flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 selection:bg-orange-500 selection:text-black font-sans">
      
      {/* Branding Header */}
      <div className="max-w-md w-full text-center mb-8">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex justify-center items-center gap-2 text-[10px] font-mono font-bold text-orange-500 uppercase tracking-[0.3em] mb-4"
        >
          <Sparkles className="w-4 h-4 text-orange-500 animate-pulse" />
          <span>Institutional & Personal Ledger</span>
        </motion.div>
        
        <motion.h1 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-4xl sm:text-5xl font-black text-white tracking-tighter uppercase leading-none"
        >
          MST <span className="text-orange-500">LEDGER</span>
        </motion.h1>
        
        <p className="mt-3 text-xs text-zinc-500 font-mono">
          Create accounts for your School, Academy, or Personal Routine. Track customized accountability matrices.
        </p>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="max-w-md w-full bg-zinc-950 border border-zinc-800 rounded-none p-6 shadow-2xl relative overflow-hidden"
      >
        {/* Corner lines for Brutalist aesthetic */}
        <div className="absolute top-0 right-0 w-12 h-[1px] bg-orange-500/20"></div>
        <div className="absolute top-0 right-0 w-[1px] h-12 bg-orange-500/20"></div>
        <div className="absolute bottom-0 left-0 w-12 h-[1px] bg-orange-500/20"></div>
        <div className="absolute bottom-0 left-0 w-[1px] h-12 bg-orange-500/20"></div>

        {isForgotFlow ? (
          /* FORGOT PASSWORD FORM */
          <form onSubmit={handleForgotSubmit} className="space-y-4">
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => {
                  setIsForgotFlow(false);
                  setForgotError("");
                  setForgotSuccess("");
                }}
                className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-zinc-400 hover:text-orange-500 uppercase tracking-wider transition-colors cursor-pointer mb-2"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Sign In</span>
              </button>
              <h3 className="text-sm font-black text-white uppercase tracking-tight">
                Reset Ledger Password
              </h3>
              <p className="text-[10px] text-zinc-500 font-mono">
                Verify your account email and mobile number to reset your password manually.
              </p>
            </div>

            {/* Error & Success banner */}
            {forgotError && (
              <div className="p-3 bg-red-950/20 border border-red-900/40 text-red-400 text-xs font-mono">
                {forgotError}
              </div>
            )}
            {forgotSuccess && (
              <div className="p-3 bg-emerald-950/20 border border-emerald-900/40 text-emerald-400 text-xs font-mono">
                {forgotSuccess}
              </div>
            )}

            {/* Email input */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-bold text-orange-500 uppercase tracking-[0.25em] flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" />
                <span>Account Email / Gmail ID</span>
              </label>
              <input
                type="email"
                placeholder="name@school.com"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-none text-zinc-100 placeholder-zinc-650 focus:outline-hidden focus:ring-1 focus:ring-orange-500 transition-all font-sans text-sm"
                required
              />
            </div>

            {/* Mobile number */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-bold text-orange-500 uppercase tracking-[0.25em] flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" />
                <span>Account Mobile Number</span>
              </label>
              <input
                type="tel"
                placeholder="e.g. 9876543210"
                value={forgotMobile}
                onChange={(e) => setForgotMobile(e.target.value)}
                className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-none text-zinc-100 placeholder-zinc-650 focus:outline-hidden focus:ring-1 focus:ring-orange-500 transition-all font-sans text-sm"
                required
              />
            </div>

            {/* New Password */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-bold text-orange-500 uppercase tracking-[0.25em] flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5" />
                <span>New Password</span>
              </label>
              <div className="relative">
                <input
                  type={showForgotNewPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={forgotNewPassword}
                  onChange={(e) => setForgotNewPassword(e.target.value)}
                  className="w-full pl-4 pr-11 py-2.5 bg-zinc-900 border border-zinc-800 rounded-none text-zinc-100 placeholder-zinc-650 focus:outline-hidden focus:ring-1 focus:ring-orange-500 transition-all font-sans text-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowForgotNewPassword(!showForgotNewPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors cursor-pointer p-1"
                  title={showForgotNewPassword ? "Hide" : "Show"}
                >
                  {showForgotNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-bold text-orange-500 uppercase tracking-[0.25em] flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5" />
                <span>Confirm New Password</span>
              </label>
              <div className="relative">
                <input
                  type={showForgotConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={forgotConfirmPassword}
                  onChange={(e) => setForgotConfirmPassword(e.target.value)}
                  className="w-full pl-4 pr-11 py-2.5 bg-zinc-900 border border-zinc-800 rounded-none text-zinc-100 placeholder-zinc-650 focus:outline-hidden focus:ring-1 focus:ring-orange-500 transition-all font-sans text-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowForgotConfirmPassword(!showForgotConfirmPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors cursor-pointer p-1"
                  title={showForgotConfirmPassword ? "Hide" : "Show"}
                >
                  {showForgotConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Action Button */}
            <button
              type="submit"
              className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-black text-xs font-black uppercase tracking-widest shadow-xl transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4 stroke-[3px]" />
              <span>Reset & Update Password</span>
            </button>
          </form>
        ) : (
          <>
            {/* Tab Buttons */}
            <div className="flex border-b border-zinc-800 mb-6">
              <button
                onClick={() => { setActiveTab("login"); setLoginError(""); }}
                className={`flex-1 py-3 text-center text-xs font-black uppercase tracking-widest transition-colors duration-200 border-b-2 flex items-center justify-center gap-2 ${
                  activeTab === "login"
                    ? "border-orange-500 text-white"
                    : "border-transparent text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                Sign In
              </button>
              <button
                onClick={() => { setActiveTab("register"); setRegError(""); }}
                className={`flex-1 py-3 text-center text-xs font-black uppercase tracking-widest transition-colors duration-200 border-b-2 flex items-center justify-center gap-2 ${
                  activeTab === "register"
                    ? "border-orange-500 text-white"
                    : "border-transparent text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                Register Account
              </button>
            </div>

            {activeTab === "login" ? (
              /* LOGIN FORM */
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                
                {/* Active Ledger Info Notice */}
                <div className="p-3 bg-zinc-950 border border-zinc-900 rounded-none text-left mb-2">
                  <div className="flex items-start gap-2">
                    <HelpCircle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] font-mono font-black text-orange-400 uppercase tracking-wider">
                        First Time or Returning? / पहली बार आए हैं?
                      </p>
                      <p className="text-[10px] text-zinc-400 mt-1 leading-normal">
                        Since database refreshes after server updates, please <strong>Register Account</strong> if your login fails, or use the <strong>Quick Demo Log In</strong> cards below to test instantly!
                      </p>
                      <p className="text-[10px] text-zinc-500 mt-0.5 leading-normal italic font-sans">
                        (चूंकि सर्वर अपडेट के बाद डेटा रीसेट हो सकता है, लॉगिन न होने पर नया अकाउंट बनाएं या नीचे दिए गए डेमो लॉग इन का उपयोग करें।)
                      </p>
                    </div>
                  </div>
                </div>

                {/* Login Toggle */}
                <div className="flex bg-zinc-900/60 p-1 border border-zinc-900 rounded-none mb-2">
                  <button
                    type="button"
                    onClick={() => { setLoginMethod("email"); setLoginIdentifier(""); }}
                    className={`flex-1 py-1.5 text-[10px] font-mono font-bold uppercase tracking-wider transition-colors duration-150 ${
                      loginMethod === "email" ? "bg-orange-500 text-black" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    Email ID / Gmail
                  </button>
                  <button
                    type="button"
                    onClick={() => { setLoginMethod("mobile"); setLoginIdentifier(""); }}
                    className={`flex-1 py-1.5 text-[10px] font-mono font-bold uppercase tracking-wider transition-colors duration-150 ${
                      loginMethod === "mobile" ? "bg-orange-500 text-black" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    Mobile Number
                  </button>
                </div>

                {/* Error banner */}
                {loginError && (
                  <div className="p-3 bg-red-950/20 border border-red-900/40 text-red-400 text-xs font-mono space-y-1.5">
                    <div>{loginError}</div>
                    <div className="text-[10px] text-zinc-400 font-sans leading-relaxed pt-1.5 border-t border-red-900/30">
                      💡 <strong>Note / ध्यान दें:</strong> यदि आपका पुराना अकाउंट लॉगिन नहीं हो रहा है, तो सर्वर रीस्टार्ट के कारण डेटा रीसेट हो गया हो सकता है। कृपया <strong>Register Account</strong> पर जाकर एक नया अकाउंट बनाएं या नीचे दिए गए <strong>Quick Demo Log In</strong> बटन का उपयोग करें।
                    </div>
                  </div>
                )}

                {/* Credential input */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono font-bold text-orange-500 uppercase tracking-[0.25em] flex items-center gap-1.5">
                    {loginMethod === "email" ? (
                      <>
                        <Mail className="w-3.5 h-3.5" />
                        <span>Email or Gmail ID</span>
                      </>
                    ) : (
                      <>
                        <Phone className="w-3.5 h-3.5" />
                        <span>Mobile Number</span>
                      </>
                    )}
                  </label>
                  <input
                    type={loginMethod === "email" ? "email" : "tel"}
                    placeholder={loginMethod === "email" ? "name@school.com" : "e.g. 9876543210"}
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-none text-zinc-100 placeholder-zinc-650 focus:outline-hidden focus:ring-1 focus:ring-orange-500 transition-all font-sans text-sm"
                    required
                  />
                </div>

                {/* Password input */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-mono font-bold text-orange-500 uppercase tracking-[0.25em] flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Password</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotFlow(true);
                        setForgotError("");
                        setForgotSuccess("");
                      }}
                      className="text-[10px] font-mono font-bold text-orange-500 hover:text-orange-400 uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showLoginPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full pl-4 pr-11 py-2.5 bg-zinc-900 border border-zinc-800 rounded-none text-zinc-100 placeholder-zinc-650 focus:outline-hidden focus:ring-1 focus:ring-orange-500 transition-all font-sans text-sm"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors cursor-pointer p-1"
                      title={showLoginPassword ? "Hide Password" : "Show Password"}
                    >
                      {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-black text-xs font-black uppercase tracking-widest shadow-xl transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <LogIn className="w-4 h-4 stroke-[3px]" />
                  <span>Enter Ledger Room</span>
                </button>
              </form>
            ) : (
              /* REGISTRATION FORM */
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            
            {/* Error banner */}
            {regError && (
              <div className="p-3 bg-red-950/20 border border-red-900/40 text-red-400 text-xs font-mono">
                {regError}
              </div>
            )}

            {/* Account Name / School Name */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-bold text-orange-500 uppercase tracking-[0.25em] flex items-center gap-1.5">
                <School className="w-3.5 h-3.5" />
                <span>School / Account Name</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Greenwoods Academy"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-none text-zinc-100 placeholder-zinc-650 focus:outline-hidden focus:ring-1 focus:ring-orange-500 transition-all font-sans text-sm"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono font-bold text-orange-500 uppercase tracking-[0.25em] flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" />
                  <span>Email ID / Gmail</span>
                </label>
                <input
                  type="email"
                  placeholder="contact@school.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-none text-zinc-100 placeholder-zinc-650 focus:outline-hidden focus:ring-1 focus:ring-orange-500 transition-all font-sans text-xs"
                  required
                />
              </div>

              {/* Mobile */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono font-bold text-orange-500 uppercase tracking-[0.25em] flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" />
                  <span>Mobile Number</span>
                </label>
                <input
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={regMobile}
                  onChange={(e) => setRegMobile(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-none text-zinc-100 placeholder-zinc-650 focus:outline-hidden focus:ring-1 focus:ring-orange-500 transition-all font-sans text-xs"
                  maxLength={15}
                  required
                />
              </div>
            </div>

            {/* Personal Hobbies / Habits type */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-mono font-bold text-orange-500 uppercase tracking-[0.25em] flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5" />
                  <span>Personal Hobbies / Habit Focus</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowQuickSelect(!showQuickSelect)}
                  className="text-[10px] font-mono font-bold text-orange-400 hover:text-orange-300 flex items-center gap-1 bg-zinc-900 px-2.5 py-1 border border-zinc-800 transition-colors cursor-pointer"
                >
                  <Award className="w-3 h-3 text-orange-500" />
                  <span>{showQuickSelect ? "Hide Subjects" : "Quick Select Subjects"}</span>
                  {showQuickSelect ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </div>

              {/* Tag Badges for already selected */}
              {regHobbies.trim() && (
                <div className="flex flex-wrap gap-1 p-2 bg-zinc-900/40 border border-zinc-900 rounded-none">
                  {regHobbies.split(",").map(h => h.trim()).filter(Boolean).map(hobby => (
                    <span key={hobby} className="inline-flex items-center gap-1 text-[9px] font-mono font-bold px-2 py-0.5 bg-zinc-900 border border-zinc-800 text-zinc-300">
                      <span>{hobby}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const currentList = regHobbies.split(",").map(x => x.trim()).filter(Boolean);
                          const newList = currentList.filter(x => x !== hobby);
                          setRegHobbies(newList.join(", "));
                        }}
                        className="text-zinc-500 hover:text-red-500 font-bold ml-1 cursor-pointer text-[10px]"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <input
                type="text"
                placeholder="e.g. Sports, Yoga, Math Drills, Coding, Meditation"
                value={regHobbies}
                onChange={(e) => setRegHobbies(e.target.value)}
                className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-none text-zinc-100 placeholder-zinc-650 focus:outline-hidden focus:ring-1 focus:ring-orange-500 transition-all font-sans text-sm"
              />

              {/* Predefined Quick Select Panel */}
              <AnimatePresence>
                {showQuickSelect && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden border border-zinc-850 bg-zinc-950 p-3 space-y-3"
                  >
                    {/* Subject Row Tabs */}
                    <div className="flex gap-1 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-zinc-800">
                      {Object.keys(PREDEFINED_SUBJECTS).map((subject) => {
                        const isSubjectActive = activeRegSubject === subject;
                        return (
                          <button
                            key={subject}
                            type="button"
                            onClick={() => setActiveRegSubject(subject)}
                            className={`px-2.5 py-1 text-[9px] font-mono font-bold uppercase tracking-wider shrink-0 border transition-all cursor-pointer ${
                              isSubjectActive
                                ? "bg-orange-500 text-black border-orange-500 font-extrabold"
                                : "bg-zinc-900 text-zinc-400 hover:text-white border-zinc-850"
                            }`}
                          >
                            {subject}
                          </button>
                        );
                      })}
                    </div>

                    {/* Active subject's topics list */}
                    <div className="grid grid-cols-2 gap-1 max-h-[140px] overflow-y-auto pr-1">
                      {PREDEFINED_SUBJECTS[activeRegSubject].map((topic) => {
                        const currentList = regHobbies.split(",").map(x => x.trim()).filter(Boolean);
                        const isSelected = currentList.some(x => x.toLowerCase() === topic.toLowerCase());

                        return (
                          <button
                            key={topic}
                            type="button"
                            onClick={() => {
                              const list = regHobbies.split(",").map(x => x.trim()).filter(Boolean);
                              if (list.some(x => x.toLowerCase() === topic.toLowerCase())) {
                                // Remove
                                const updated = list.filter(x => x.toLowerCase() !== topic.toLowerCase());
                                setRegHobbies(updated.join(", "));
                              } else {
                                // Add
                                list.push(topic);
                                setRegHobbies(list.join(", "));
                              }
                            }}
                            className={`p-1.5 text-left text-[10px] border flex items-center justify-between transition-all cursor-pointer ${
                              isSelected
                                ? "bg-orange-500/10 border-orange-500 text-orange-400"
                                : "bg-zinc-900 border-zinc-850 hover:bg-zinc-800 text-zinc-300"
                            }`}
                          >
                            <span className="truncate pr-1">{topic}</span>
                            <span className="shrink-0 text-[10px]">
                              {isSelected ? <Check className="w-3 h-3 text-orange-400 stroke-[3]" /> : <Plus className="w-3 h-3 text-zinc-600" />}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-bold text-orange-500 uppercase tracking-[0.25em] flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5" />
                <span>Ledger Security Password</span>
              </label>
              <div className="relative">
                <input
                  type={showRegPassword ? "text" : "password"}
                  placeholder="Create password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className="w-full pl-4 pr-11 py-2.5 bg-zinc-900 border border-zinc-800 rounded-none text-zinc-100 placeholder-zinc-650 focus:outline-hidden focus:ring-1 focus:ring-orange-500 transition-all font-sans text-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowRegPassword(!showRegPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors cursor-pointer p-1"
                  title={showRegPassword ? "Hide Password" : "Show Password"}
                >
                  {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Register Action */}
            <button
              type="submit"
              className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-black text-xs font-black uppercase tracking-widest shadow-xl transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <UserPlus className="w-4 h-4 stroke-[3px]" />
              <span>Generate New Ledger Account</span>
            </button>
          </form>
        )}
        </>
        )}

        {/* Demo Accounts List to jump right in */}
        <div className="mt-8 pt-6 border-t border-zinc-900">
          <p className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider mb-3 text-center">
            — Or Quick Demo Log In (As School) —
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {DEMO_ACCOUNTS.map((demo) => (
              <button
                key={demo.id}
                type="button"
                onClick={() => handleDemoLogin(demo)}
                className="flex flex-col items-start p-2.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800/60 hover:border-orange-500/40 rounded-none text-left transition-all group cursor-pointer"
              >
                <span className="text-xs font-bold text-orange-400 group-hover:text-orange-500 font-sans truncate w-full">
                  {demo.name}
                </span>
                <span className="text-[9px] font-mono text-zinc-500 group-hover:text-zinc-400 mt-0.5 truncate w-full">
                  {demo.email}
                </span>
              </button>
            ))}
          </div>
        </div>

      </motion.div>
    </div>
  );
}

import React, { useState, FormEvent, useEffect } from "react";
import { motion } from "motion/react";
import { User } from "../types";
import { KeyRound, Mail, Phone, School, Sparkles, UserPlus, LogIn, Heart } from "lucide-react";

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
          HABIT <span className="text-orange-500">LEDGER</span>
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
              <div className="p-3 bg-red-950/20 border border-red-900/40 text-red-400 text-xs font-mono">
                {loginError}
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
              <label className="text-[10px] font-mono font-bold text-orange-500 uppercase tracking-[0.25em] flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5" />
                <span>Password</span>
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-none text-zinc-100 placeholder-zinc-650 focus:outline-hidden focus:ring-1 focus:ring-orange-500 transition-all font-sans text-sm"
                required
              />
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
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-bold text-orange-500 uppercase tracking-[0.25em] flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5" />
                <span>Personal Hobbies / Habit Focus</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Sports, Yoga, Math Drills, Coding, Meditation"
                value={regHobbies}
                onChange={(e) => setRegHobbies(e.target.value)}
                className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-none text-zinc-100 placeholder-zinc-650 focus:outline-hidden focus:ring-1 focus:ring-orange-500 transition-all font-sans text-sm"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-bold text-orange-500 uppercase tracking-[0.25em] flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5" />
                <span>Ledger Security Password</span>
              </label>
              <input
                type="password"
                placeholder="Create password"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-none text-zinc-100 placeholder-zinc-650 focus:outline-hidden focus:ring-1 focus:ring-orange-500 transition-all font-sans text-sm"
                required
              />
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

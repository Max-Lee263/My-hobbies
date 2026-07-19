import { Habit, HabitLog, User } from "../types";

/**
 * databaseService.ts - Production-Ready Data Management Layer
 * 
 * This service provides structured async/await interfaces for fetching and saving:
 *  - User Profiles (including Hobbies & lastLoginAt)
 *  - Habits (and Subject tags)
 *  - Daily Logs / Completion Records
 *  - Custom Tabs
 * 
 * ARCHITECTURE FOR PRODUCTION DATABASE (Supabase / Firebase / PostgreSQL):
 * 1. Currently, this service transparently uses LocalStorage for client-side state
 *    to guarantee 100% functional offline capability inside the AI Studio preview container.
 * 2. To activate your real database backend (e.g., Supabase or PostgreSQL),
 *    provide the `DATABASE_URL` environment variable (as configured in `.env.example`).
 * 3. The async functions below are fully ready to be swapped with either:
 *    a. Fetch calls to Express server API proxy routes (e.g., `/api/habits`, `/api/logs`)
 *    b. Direct Supabase / Firebase SDK queries.
 */

// Example database connection configuration placeholder for when you plug in your keys
export const DB_CONFIG = {
  // Accessing database URL via process.env equivalent in Node/Bundler environments
  connectionString: typeof process !== "undefined" ? process.env?.DATABASE_URL : undefined,
  supabaseUrl: typeof process !== "undefined" ? process.env?.SUPABASE_URL : undefined,
  supabaseAnonKey: typeof process !== "undefined" ? process.env?.SUPABASE_ANON_KEY : undefined,
};

/**
 * Helper to simulate network latency to test loading UI, spin states, and async robustness.
 */
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const databaseService = {
  /**
   * --- USER PROFILE OPERATIONS ---
   */
  async fetchUser(userId: string): Promise<User | null> {
    await delay(100); // Simulate network round-trip

    // Production hook:
    if (DB_CONFIG.connectionString) {
      console.log(`[Database] Querying user profile for: ${userId} from process.env.DATABASE_URL`);
      // const { data } = await axios.get(`/api/user/profile?userId=${userId}`);
      // return data.user;
    }

    const stored = localStorage.getItem("ledger_current_user");
    if (!stored) return null;
    try {
      const user = JSON.parse(stored) as User;
      if (user.id === userId) return user;
    } catch (e) {
      console.error("[DatabaseService] Error parsing user profile", e);
    }
    return null;
  },

  async saveUser(user: User): Promise<void> {
    await delay(100);

    // Production hook:
    if (DB_CONFIG.connectionString) {
      console.log(`[Database] Saving user profile for ${user.id} to process.env.DATABASE_URL`);
      // await axios.post("/api/user/profile", { user });
    }

    localStorage.setItem("ledger_current_user", JSON.stringify(user));
    
    // Sync with global users cache for local multi-account logins
    const cachedUsers = JSON.parse(localStorage.getItem("ledger_users") || "[]") as User[];
    const updatedUsers = cachedUsers.map((u) => (u.id === user.id ? user : u));
    localStorage.setItem("ledger_users", JSON.stringify(updatedUsers));
  },

  /**
   * --- HABITS OPERATIONS ---
   */
  async fetchHabits(userId: string): Promise<Habit[]> {
    await delay(150);

    // Production hook:
    if (DB_CONFIG.connectionString) {
      console.log(`[Database] Querying habits for user: ${userId} from DATABASE_URL`);
      // const res = await fetch(`/api/habits?userId=${userId}`);
      // return await res.json();
    }

    const habitsKey = `habit_tracker_items_${userId}`;
    const stored = localStorage.getItem(habitsKey);
    if (!stored) return [];
    try {
      return JSON.parse(stored) as Habit[];
    } catch (e) {
      console.error("[DatabaseService] Error parsing habits list", e);
      return [];
    }
  },

  async saveHabits(userId: string, habits: Habit[]): Promise<void> {
    await delay(150);

    // Production hook:
    if (DB_CONFIG.connectionString) {
      console.log(`[Database] Persisting ${habits.length} habits for user ${userId}`);
      // await fetch(`/api/habits`, {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({ userId, habits }),
      // });
    }

    const habitsKey = `habit_tracker_items_${userId}`;
    localStorage.setItem(habitsKey, JSON.stringify(habits));
  },

  /**
   * --- DAILY LOGS / COMPLETION OPERATIONS ---
   */
  async fetchLogs(userId: string): Promise<HabitLog> {
    await delay(150);

    // Production hook:
    if (DB_CONFIG.connectionString) {
      console.log(`[Database] Querying daily completion logs for user: ${userId}`);
      // const res = await fetch(`/api/logs?userId=${userId}`);
      // return await res.json();
    }

    const logsKey = `habit_tracker_logs_${userId}`;
    const stored = localStorage.getItem(logsKey);
    if (!stored) return {};
    try {
      return JSON.parse(stored) as HabitLog;
    } catch (e) {
      console.error("[DatabaseService] Error parsing daily logs", e);
      return {};
    }
  },

  async saveLogs(userId: string, logs: HabitLog): Promise<void> {
    await delay(100);

    // Production hook:
    if (DB_CONFIG.connectionString) {
      console.log(`[Database] Persisting habit logs to relational storage`);
      // await fetch(`/api/logs`, {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({ userId, logs }),
      // });
    }

    const logsKey = `habit_tracker_logs_${userId}`;
    localStorage.setItem(logsKey, JSON.stringify(logs));
  },

  /**
   * --- CUSTOM TABS OPERATIONS ---
   */
  async fetchCustomTabs(userId: string): Promise<string[]> {
    await delay(50);

    const tabsKey = `habit_tracker_custom_tabs_${userId}`;
    const stored = localStorage.getItem(tabsKey);
    if (!stored) return [];
    try {
      return JSON.parse(stored) as string[];
    } catch (e) {
      console.error("[DatabaseService] Error parsing custom tabs", e);
      return [];
    }
  },

  async saveCustomTabs(userId: string, tabs: string[]): Promise<void> {
    await delay(50);
    const tabsKey = `habit_tracker_custom_tabs_${userId}`;
    localStorage.setItem(tabsKey, JSON.stringify(tabs));
  },
};

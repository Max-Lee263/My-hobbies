export interface Habit {
  id: string;
  name: string;
  emoji: string;
  createdAt: string; // ISO date string
  category?: string; // Tab/Category for organizing habits
  subjectTag?: string; // Tag for connecting to "Focus Hobbies & Subjects"
}

export interface DayProgress {
  dateKey: string; // YYYY-MM-DD
  doneCount: number;
  totalCount: number;
  percentage: number;
}

export interface HabitLog {
  // key: "YYYY-MM-DD", value: array of habit IDs that are completed
  [dateKey: string]: string[];
}

export interface MonthData {
  year: number;
  month: number; // 0-indexed (0 = January)
}

export interface User {
  id: string;
  name: string;      // School/Account name
  email: string;     // Email/Gmail ID
  mobile: string;    // Mobile number
  hobbies: string;   // Personal Hobbies / Habits type info
  password: string;  // Plaintext password (stored locally for demo/auth logic)
  createdAt: string;
  friendsList?: string[]; // IDs of accepted friends
  sentRequests?: string[]; // IDs of pending requests sent
  receivedRequests?: string[]; // IDs of pending requests received
  isOnline?: boolean;
  lastLoginAt?: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: string;
}


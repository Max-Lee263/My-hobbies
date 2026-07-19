import { Habit, HabitLog } from "./types";

// Default habits exactly matching the user's photo with high-quality descriptions and custom emojis
export const DEFAULT_HABITS: Habit[] = [
  { id: "habit-1", name: "Wake up at 5:00 AM", emoji: "⏰", category: "Routine", createdAt: new Date(2026, 0, 1).toISOString() },
  { id: "habit-2", name: "Workout", emoji: "🏋️‍♂️", category: "Fitness", createdAt: new Date(2026, 0, 1).toISOString() },
  { id: "habit-3", name: "Meditation / Breathing", emoji: "🧘", category: "Fitness", createdAt: new Date(2026, 0, 1).toISOString() },
  { id: "habit-4", name: "Day Planning", emoji: "📋", category: "Routine", createdAt: new Date(2026, 0, 1).toISOString() },
  { id: "habit-5", name: "Project Work", emoji: "🎯", category: "Academics", createdAt: new Date(2026, 0, 1).toISOString() },
  { id: "habit-6", name: "Content Creation", emoji: "🎬", category: "Academics", createdAt: new Date(2026, 0, 1).toISOString() },
  { id: "habit-7", name: "Skill Learning", emoji: "📚", category: "Academics", createdAt: new Date(2026, 0, 1).toISOString() },
  { id: "habit-8", name: "No Sugar Day", emoji: "🚫", category: "Fitness", createdAt: new Date(2026, 0, 1).toISOString() },
  { id: "habit-9", name: "Clean Room", emoji: "🧹", category: "Routine", createdAt: new Date(2026, 0, 1).toISOString() },
  { id: "habit-10", name: "Sleep at 10 PM", emoji: "😴", category: "Routine", createdAt: new Date(2026, 0, 1).toISOString() },
];

// Helper to format date key safely in local timezone
export function formatDateKey(year: number, month: number, day: number): string {
  const y = String(year);
  const m = String(month + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export interface CalendarDay {
  dayNumber: number;
  dayOfWeekShort: string; // "Sa", "Su", "Mo", etc.
  dateKey: string;
  isToday: boolean;
}

// Generate all calendar days for a specific year and month
export function getDaysInMonth(year: number, month: number): CalendarDay[] {
  const days: CalendarDay[] = [];
  const numDays = new Date(year, month + 1, 0).getDate(); // Get last day of the month
  
  const today = new Date();
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth();
  const todayDate = today.getDate();

  const weekdayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  for (let d = 1; d <= numDays; d++) {
    const dateObj = new Date(year, month, d);
    const dayOfWeekShort = weekdayNames[dateObj.getDay()];
    const dateKey = formatDateKey(year, month, d);
    const isToday = year === todayYear && month === todayMonth && d === todayDate;

    days.push({
      dayNumber: d,
      dayOfWeekShort,
      dateKey,
      isToday,
    });
  }

  return days;
}

// Group days into chunks of 7 representing Week 1, Week 2, etc.
export function groupDaysIntoWeeks(days: CalendarDay[]): CalendarDay[][] {
  const weeks: CalendarDay[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  return weeks;
}

// Get month name in English (all uppercase, matching the elegant design in the photo)
export const MONTH_NAMES = [
  "JANUARY",
  "FEBRUARY",
  "MARCH",
  "APRIL",
  "MAY",
  "JUNE",
  "JULY",
  "AUGUST",
  "SEPTEMBER",
  "OCTOBER",
  "NOVEMBER",
  "DECEMBER",
];

// Calculate current streak for a specific habit across all recorded logs
export function calculateHabitStreaks(
  habitId: string,
  logs: HabitLog,
  currentYear: number,
  currentMonth: number
): { currentStreak: number; longestStreak: number; totalCompleted: number; isStreakAtRisk: boolean } {
  let totalCompleted = 0;
  
  // Collect all date keys that have this habit completed, sorted chronologically
  const completedDates = Object.keys(logs)
    .filter((key) => logs[key]?.includes(habitId))
    .map((key) => {
      const [y, m, d] = key.split("-").map(Number);
      return new Date(y, m - 1, d);
    })
    .sort((a, b) => a.getTime() - b.getTime());

  totalCompleted = completedDates.length;

  if (completedDates.length === 0) {
    return { currentStreak: 0, longestStreak: 0, totalCompleted: 0, isStreakAtRisk: false };
  }

  let longestStreak = 0;
  let currentStreak = 0;
  let tempStreak = 0;
  let prevDate: Date | null = null;

  // Calculate longest streak
  for (let i = 0; i < completedDates.length; i++) {
    const currentDate = completedDates[i];
    
    if (prevDate === null) {
      tempStreak = 1;
    } else {
      const diffTime = Math.abs(currentDate.getTime() - prevDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        tempStreak += 1;
      } else if (diffDays > 1) {
        if (tempStreak > longestStreak) {
          longestStreak = tempStreak;
        }
        tempStreak = 1;
      }
    }
    prevDate = currentDate;
  }
  
  if (tempStreak > longestStreak) {
    longestStreak = tempStreak;
  }

  // Calculate current streak (ending today or yesterday)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Check if completed today or yesterday to continue current streak
  const hasCompletedToday = completedDates.some(
    (d) => d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate()
  );
  const hasCompletedYesterday = completedDates.some(
    (d) => d.getFullYear() === yesterday.getFullYear() && d.getMonth() === yesterday.getMonth() && d.getDate() === yesterday.getDate()
  );

  if (hasCompletedToday || hasCompletedYesterday) {
    // Traverse backwards from today or yesterday to find consecutive days
    let checkDate = hasCompletedToday ? today : yesterday;
    let streakCount = 0;
    let continueChecking = true;

    while (continueChecking) {
      const checkKey = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, "0")}-${String(checkDate.getDate()).padStart(2, "0")}`;
      if (logs[checkKey]?.includes(habitId)) {
        streakCount++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        continueChecking = false;
      }
    }
    currentStreak = streakCount;
  } else {
    currentStreak = 0;
  }

  const isStreakAtRisk = currentStreak > 0 && !hasCompletedToday;

  return {
    currentStreak,
    longestStreak,
    totalCompleted,
    isStreakAtRisk,
  };
}

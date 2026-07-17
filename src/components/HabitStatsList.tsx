import { useState, useMemo } from "react";
import { Flame, Trophy, CheckCircle, Search, ArrowUpDown, Sparkles } from "lucide-react";
import { Habit, HabitLog } from "../types";
import { calculateHabitStreaks } from "../utils";

interface HabitStatsListProps {
  habits: Habit[];
  logs: HabitLog;
  currentYear: number;
  currentMonth: number;
  daysInMonthCount: number;
  onEditHabit: (habit: Habit) => void;
}

type SortOption = "name" | "streak" | "longest" | "completion";

export default function HabitStatsList({
  habits,
  logs,
  currentYear,
  currentMonth,
  daysInMonthCount,
  onEditHabit,
}: HabitStatsListProps) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("name");

  // Calculate detailed stats for each habit
  const habitStats = useMemo(() => {
    return habits.map((habit) => {
      const streaks = calculateHabitStreaks(habit.id, logs, currentYear, currentMonth);
      
      // Calculate monthly completions & percentage
      let monthlyCompletions = 0;
      for (let day = 1; day <= daysInMonthCount; day++) {
        const m = String(currentMonth + 1).padStart(2, "0");
        const d = String(day).padStart(2, "0");
        const key = `${currentYear}-${m}-${d}`;
        if (logs[key]?.includes(habit.id)) {
          monthlyCompletions++;
        }
      }

      const completionRate = daysInMonthCount > 0 ? (monthlyCompletions / daysInMonthCount) * 100 : 0;

      return {
        habit,
        currentStreak: streaks.currentStreak,
        longestStreak: streaks.longestStreak,
        totalCompleted: streaks.totalCompleted,
        monthlyCompletions,
        completionRate,
      };
    });
  }, [habits, logs, currentYear, currentMonth, daysInMonthCount]);

  // Filter & Sort
  const filteredAndSortedStats = useMemo(() => {
    let result = habitStats.filter((stat) =>
      stat.habit.name.toLowerCase().includes(search.toLowerCase())
    );

    result.sort((a, b) => {
      if (sortBy === "name") {
        return a.habit.name.localeCompare(b.habit.name);
      } else if (sortBy === "streak") {
        return b.currentStreak - a.currentStreak;
      } else if (sortBy === "longest") {
        return b.longestStreak - a.longestStreak;
      } else if (sortBy === "completion") {
        return b.completionRate - a.completionRate;
      }
      return 0;
    });

    return result;
  }, [habitStats, search, sortBy]);

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-none shadow-2xl p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-black text-white font-sans uppercase tracking-[0.1em] flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-orange-500" />
            Habit Breakdown & Streaks
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5 font-mono">
            Real-time streaks and monthly completion progress
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter habits..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-1.5 bg-zinc-900 border border-zinc-800 rounded-none text-xs text-zinc-200 placeholder-zinc-500 focus:outline-hidden focus:ring-1 focus:ring-orange-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Sort Menu */}
          <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-none p-1">
            <button
              onClick={() => setSortBy("name")}
              className={`px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-none transition-all ${
                sortBy === "name" ? "bg-orange-500 text-black shadow-xs" : "text-zinc-400 hover:text-white"
              }`}
            >
              Name
            </button>
            <button
              onClick={() => setSortBy("streak")}
              className={`px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-none transition-all ${
                sortBy === "streak" ? "bg-orange-500 text-black shadow-xs" : "text-zinc-400 hover:text-white"
              }`}
            >
              Streak
            </button>
            <button
              onClick={() => setSortBy("completion")}
              className={`px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-none transition-all ${
                sortBy === "completion" ? "bg-orange-500 text-black shadow-xs" : "text-zinc-400 hover:text-white"
              }`}
            >
              Rate
            </button>
          </div>
        </div>
      </div>

      {filteredAndSortedStats.length === 0 ? (
        <div className="text-center py-10 bg-zinc-900/35 border border-dashed border-zinc-800 rounded-none">
          <p className="text-sm text-zinc-500 font-mono">No habits found matching your filter</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAndSortedStats.map(({ habit, currentStreak, longestStreak, monthlyCompletions, completionRate }) => (
            <div
              key={habit.id}
              className="flex flex-col p-4 bg-zinc-900/30 border border-zinc-800 rounded-none hover:border-zinc-700 transition-all duration-300 group relative overflow-hidden"
            >
              {/* Decorative side block */}
              <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-zinc-800 group-hover:bg-orange-500 transition-colors"></div>

              {/* Habit Header */}
              <div className="flex items-start justify-between gap-2 mb-3 pl-1.5">
                <div 
                  onClick={() => onEditHabit(habit)}
                  className="flex items-center gap-2.5 truncate cursor-pointer hover:text-orange-500 group/statitem transition-colors duration-200 active:scale-98"
                  title="Click to edit habit"
                >
                  <span className="text-xl flex-shrink-0 group-hover/statitem:scale-110 transition-transform duration-200">{habit.emoji}</span>
                  <span className="font-black text-sm text-zinc-100 group-hover/statitem:text-orange-500 truncate font-sans uppercase tracking-tight transition-colors duration-200">
                    {habit.name}
                  </span>
                </div>
                <span className="text-xs font-bold text-orange-500 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-none font-mono">
                  {monthlyCompletions}/{daysInMonthCount} DAYS
                </span>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-2 py-2 bg-zinc-950 rounded-none border border-zinc-900 p-2.5 mb-3">
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-1 text-orange-500">
                    <Flame className="w-3.5 h-3.5 fill-orange-500/10" />
                    <span className="text-xs font-black font-mono">{currentStreak}d</span>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-sans mt-0.5 uppercase tracking-wider">Streak</span>
                </div>

                <div className="flex flex-col items-center border-x border-zinc-900">
                  <div className="flex items-center gap-1 text-orange-400">
                    <Trophy className="w-3.5 h-3.5 fill-orange-500/5 text-orange-500" />
                    <span className="text-xs font-black font-mono">{longestStreak}d</span>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-sans mt-0.5 uppercase tracking-wider">Best</span>
                </div>

                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-1 text-zinc-300">
                    <CheckCircle className="w-3.5 h-3.5 text-zinc-400" />
                    <span className="text-xs font-black font-mono">{completionRate.toFixed(0)}%</span>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-sans mt-0.5 uppercase tracking-wider">Success</span>
                </div>
              </div>

              {/* Completion Progress Bar */}
              <div className="space-y-1 pl-1.5">
                <div className="flex justify-between text-[10px] text-zinc-500 font-bold font-mono uppercase tracking-wider">
                  <span>Month Progress</span>
                  <span className="text-orange-500">{completionRate.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-zinc-950 h-2 rounded-none overflow-hidden border border-zinc-900">
                  <div
                    className="bg-orange-500 h-full rounded-none transition-all duration-500"
                    style={{ width: `${completionRate}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

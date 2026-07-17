import { motion } from "motion/react";
import { Trash2, Edit2, ChevronUp, ChevronDown, CheckSquare, Square, Check, RefreshCw } from "lucide-react";
import { Habit, HabitLog } from "../types";
import { CalendarDay, groupDaysIntoWeeks } from "../utils";

interface HabitGridProps {
  habits: Habit[];
  days: CalendarDay[];
  logs: HabitLog;
  onToggleHabit: (habitId: string, dateKey: string) => void;
  onEditHabit: (habit: Habit) => void;
  onDeleteHabit: (habitId: string) => void;
  onMoveHabit: (index: number, direction: "up" | "down") => void;
  onQuickFillDay: (dateKey: string, action: "all" | "none") => void;
}

export default function HabitGrid({
  habits,
  days,
  logs,
  onToggleHabit,
  onEditHabit,
  onDeleteHabit,
  onMoveHabit,
  onQuickFillDay,
}: HabitGridProps) {
  const weeks = groupDaysIntoWeeks(days);

  // Calculate daily progress statistics
  const dayStats = days.map((day) => {
    const doneCount = habits.filter((h) => logs[day.dateKey]?.includes(h.id)).length;
    const totalCount = habits.length;
    const percentage = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
    return {
      dateKey: day.dateKey,
      doneCount,
      totalCount,
      percentage,
    };
  });

  return (
    <div className="w-full bg-zinc-950 border border-zinc-800 rounded-none shadow-2xl overflow-hidden">
      {/* Quick Tips */}
      <div className="bg-zinc-900/90 px-6 py-3 border-b border-zinc-800 flex flex-wrap justify-between items-center text-xs text-zinc-400 gap-2 font-mono">
        <span className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-orange-500 animate-pulse"></span>
          <span>Click checkboxes to log. Headers dynamically compute daily progress logs.</span>
        </span>
        <span className="text-[11px] bg-zinc-950 border border-zinc-800 px-3 py-0.5 rounded-none text-orange-500 font-bold">
          HABITS LOADED: {habits.length}
        </span>
      </div>

      {/* Grid Scroll Wrapper */}
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full border-collapse text-left select-none min-w-[800px]">
          <thead>
            {/* Row 1: Weeks */}
            <tr className="bg-zinc-900/60 border-b border-zinc-800">
              <th className="sticky left-0 bg-zinc-950 z-25 border-r border-zinc-800 min-w-[220px] max-w-[280px] p-4 text-[10px] font-mono font-bold text-orange-500 uppercase tracking-[0.25em]">
                My Habits Ledger
              </th>
              {weeks.map((week, weekIdx) => (
                <th
                  key={weekIdx}
                  colSpan={week.length}
                  className="border-r border-zinc-800 text-center py-2.5 text-xs font-black text-zinc-100 font-sans tracking-[0.2em] uppercase border-b border-zinc-800 bg-zinc-900/40"
                >
                  Week {weekIdx + 1}
                </th>
              ))}
            </tr>

            {/* Row 2: Days of the week (Sa, Su, Mo...) */}
            <tr className="bg-zinc-950 border-b border-zinc-800/80 text-center">
              <th className="sticky left-0 bg-zinc-950 z-25 border-r border-zinc-800"></th>
              {days.map((day) => {
                const isWeekend = day.dayOfWeekShort === "Sa" || day.dayOfWeekShort === "Su";
                return (
                  <th
                    key={day.dateKey}
                    className={`border-r border-zinc-850 text-center py-1.5 text-[11px] font-bold font-mono tracking-wider w-11 min-w-[44px] ${
                      day.isToday
                        ? "bg-orange-500 text-black font-black"
                        : isWeekend
                        ? "bg-zinc-900/40 text-zinc-500"
                        : "text-zinc-400"
                    }`}
                  >
                    {day.dayOfWeekShort}
                  </th>
                );
              })}
            </tr>

            {/* Row 3: Day numbers & Quick Controls */}
            <tr className="bg-zinc-950 border-b border-zinc-800 text-center">
              <th className="sticky left-0 bg-zinc-950 z-25 border-r border-zinc-800"></th>
              {days.map((day) => (
                <th
                  key={day.dateKey}
                  className={`border-r border-zinc-850 py-2 w-11 min-w-[44px] relative group text-center ${
                    day.isToday ? "bg-zinc-900/60 text-orange-500" : "text-zinc-400"
                  }`}
                >
                  <div className="flex flex-col items-center justify-center">
                    <span
                      className={`text-xs font-black font-mono h-6 w-6 flex items-center justify-center ${
                        day.isToday ? "bg-orange-500 text-black font-black" : ""
                      }`}
                    >
                      {day.dayNumber}
                    </span>
                    
                    {/* Quick check/uncheck day actions on hover */}
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-900 border border-zinc-800 shadow-xl rounded-none p-1 flex gap-1.5 z-30">
                      <button
                        title="Check all for this day"
                        onClick={() => onQuickFillDay(day.dateKey, "all")}
                        className="p-0.5 hover:bg-zinc-800 text-zinc-400 hover:text-orange-500 rounded-none transition-colors"
                      >
                        <CheckSquare className="w-3.5 h-3.5" />
                      </button>
                      <button
                        title="Clear all for this day"
                        onClick={() => onQuickFillDay(day.dateKey, "none")}
                        className="p-0.5 hover:bg-zinc-800 text-zinc-400 hover:text-red-500 rounded-none transition-colors"
                      >
                        <Square className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {/* Habit Rows */}
            {habits.map((habit, hIdx) => (
              <tr
                key={habit.id}
                className="hover:bg-zinc-900/30 border-b border-zinc-900 group transition-colors"
              >
                {/* Sticky Left Column: Habit details */}
                <td className="sticky left-0 bg-zinc-950 group-hover:bg-zinc-900/90 z-20 border-r border-zinc-800 p-3 text-sm font-medium text-zinc-200 transition-colors">
                  <div className="flex items-center justify-between">
                    <div 
                      onClick={() => onEditHabit(habit)}
                      className="flex items-center gap-2.5 truncate cursor-pointer hover:text-orange-500 group/item transition-all duration-200 active:scale-98"
                      title="Click to edit habit"
                    >
                      <span className="text-lg flex-shrink-0 group-hover/item:scale-115 transition-transform duration-200">{habit.emoji}</span>
                      <span className="truncate pr-1 font-sans font-bold text-zinc-100 group-hover/item:text-orange-500 transition-colors duration-200" title={habit.name}>
                        {habit.name}
                      </span>
                    </div>

                    {/* Row controls (Move / Edit / Delete) */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-all ml-1 flex-shrink-0 bg-zinc-950/90 group-hover:bg-zinc-900/95 pl-1 rounded-none">
                      <button
                        onClick={() => onMoveHabit(hIdx, "up")}
                        disabled={hIdx === 0}
                        title="Move Up"
                        className="p-1 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded-none disabled:opacity-20 transition-colors"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onMoveHabit(hIdx, "down")}
                        disabled={hIdx === habits.length - 1}
                        title="Move Down"
                        className="p-1 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded-none disabled:opacity-20 transition-colors"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onEditHabit(habit)}
                        title="Edit Habit"
                        className="p-1 text-zinc-500 hover:text-orange-500 hover:bg-zinc-800 rounded-none transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteHabit(habit.id)}
                        title="Delete Habit"
                        className="p-1 text-zinc-500 hover:text-red-500 hover:bg-red-950/30 rounded-none transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </td>

                {/* Day checkbox cells */}
                {days.map((day) => {
                  const isCompleted = logs[day.dateKey]?.includes(habit.id) || false;
                  return (
                    <td
                      key={day.dateKey}
                      onClick={() => onToggleHabit(habit.id, day.dateKey)}
                      className={`border-r border-zinc-900/50 p-0 text-center cursor-pointer transition-colors hover:bg-zinc-900/25 ${
                        day.isToday ? "bg-zinc-900/20" : ""
                      }`}
                    >
                      <div className="h-11 w-11 flex items-center justify-center mx-auto">
                        <motion.button
                          type="button"
                          whileTap={{ scale: 0.9 }}
                          animate={{
                            backgroundColor: isCompleted ? "#f97316" : "transparent",
                            borderColor: isCompleted ? "#f97316" : "#3f3f46",
                          }}
                          transition={{ duration: 0.1 }}
                          className={`w-[20px] h-[20px] border rounded-none flex items-center justify-center focus:outline-hidden relative cursor-pointer`}
                        >
                          {isCompleted && (
                            <motion.div
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ type: "spring", damping: 12, stiffness: 200 }}
                            >
                              <Check className="w-3.5 h-3.5 text-black stroke-[4px]" />
                            </motion.div>
                          )}
                        </motion.button>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}

            {/* Bottom Progress Row 1: Percentage (%) */}
            <tr className="bg-zinc-900 border-t border-zinc-800 font-black font-mono text-center">
              <td className="sticky left-0 bg-zinc-900 font-sans font-bold text-orange-500 border-r border-zinc-800 p-3 text-[10px] uppercase tracking-[0.2em] text-left">
                Progress %
              </td>
              {dayStats.map((stat) => {
                const isHigh = stat.percentage >= 80;
                const isZero = stat.percentage === 0;
                return (
                  <td
                    key={stat.dateKey}
                    className="border-r border-zinc-900/50 py-3 text-xs text-center"
                  >
                    <span
                      className={`px-1.5 py-0.5 rounded-none font-black font-mono text-[11px] ${
                        isHigh
                          ? "text-orange-500 bg-orange-500/10 border border-orange-500/20"
                          : isZero
                          ? "text-zinc-650"
                          : "text-zinc-300"
                      }`}
                    >
                      {stat.percentage}%
                    </span>
                  </td>
                );
              })}
            </tr>

            {/* Bottom Progress Row 2: Done Count */}
            <tr className="bg-zinc-900/60 border-b border-zinc-900 font-mono text-center">
              <td className="sticky left-0 bg-zinc-900 font-sans font-bold text-zinc-400 border-r border-zinc-800 p-3 text-[10px] uppercase tracking-[0.2em] text-left">
                Done
              </td>
              {dayStats.map((stat) => (
                <td
                  key={stat.dateKey}
                  className="border-r border-zinc-900/50 py-2.5 text-xs text-zinc-100 font-black"
                >
                  {stat.doneCount}
                </td>
              ))}
            </tr>

            {/* Bottom Progress Row 3: Remaining / Not Done Count */}
            <tr className="bg-zinc-900/30 font-mono text-center">
              <td className="sticky left-0 bg-zinc-900 font-sans font-semibold text-zinc-500 border-r border-zinc-800 p-3 text-[10px] uppercase tracking-[0.2em] text-left">
                Not Done
              </td>
              {dayStats.map((stat) => {
                const rem = stat.totalCount - stat.doneCount;
                return (
                  <td
                    key={stat.dateKey}
                    className="border-r border-zinc-900/50 py-2.5 text-xs text-zinc-500"
                  >
                    {rem}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

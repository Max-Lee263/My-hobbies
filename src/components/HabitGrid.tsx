import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Trash2, Edit2, ChevronUp, ChevronDown, CheckSquare, Square, Check, RefreshCw, X, Minimize2, Maximize2, Plus } from "lucide-react";
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
  onAddHabitClick?: () => void;
}

const renderFormattedHabitName = (habit: Habit, isMinimized: boolean) => {
  const { name, subjectTag } = habit;
  const match = name.match(/^(.*?)\s*\(([^)]+)\)$/);
  const subject = match ? match[1].trim() : name.trim();
  const timeSlot = match ? match[2].trim() : "";

  const words = subject.split(/\s+/);
  if (words.length === 0) return null;

  const firstWord = words[0];
  const remainingWords = words.slice(1).join(" ");

  return (
    <div className="flex flex-col min-w-0 text-left leading-tight">
      <div className="flex flex-col md:flex-row md:items-baseline md:gap-x-1.5 gap-y-0.5">
        {/* First word: bold, larger, capitalized */}
        <span className={`font-black uppercase text-orange-500 tracking-wide select-none ${
          isMinimized ? "text-[12px]" : "text-[14px]"
        }`}>
          {firstWord}
        </span>
        {/* Remaining words: micro, muted */}
        {remainingWords && (
          <span className={`font-sans font-extrabold text-zinc-300 lowercase tracking-tight break-words whitespace-normal leading-normal max-w-[110px] ${
            isMinimized ? "text-[9.5px]" : "text-[11px]"
          }`}>
            {remainingWords}
          </span>
        )}
      </div>
      
      {/* Subject Tag Badge */}
      {subjectTag && (
        <span className="inline-flex mt-1 text-[8px] font-mono font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-1 py-0.5 max-w-max uppercase tracking-wider">
          🏷️ {subjectTag}
        </span>
      )}

      {/* Time Slot under it in extremely micro mono */}
      {timeSlot && (
        <span className="text-[8.5px] font-mono font-black text-zinc-500 uppercase tracking-wide mt-1 block truncate">
          🕒 {timeSlot}
        </span>
      )}
    </div>
  );
};

export default function HabitGrid({
  habits,
  days,
  logs,
  onToggleHabit,
  onEditHabit,
  onDeleteHabit,
  onMoveHabit,
  onQuickFillDay,
  onAddHabitClick,
}: HabitGridProps) {
  const weeks = groupDaysIntoWeeks(days);
  const [actionHabit, setActionHabit] = useState<Habit | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [selectedWeekIdx, setSelectedWeekIdx] = useState<number | "all">("all");

  // Sync week selection when month/days change: auto-select the week with today if present, else fallback to 'all'
  React.useEffect(() => {
    const todayIdx = weeks.findIndex((week) => week.some((d) => d.isToday));
    setSelectedWeekIdx(todayIdx !== -1 ? todayIdx : "all");
  }, [days]);

  const activeDays = selectedWeekIdx === "all"
    ? days
    : (weeks[selectedWeekIdx] ? weeks[selectedWeekIdx] : days);

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

  const activeDayStats = selectedWeekIdx === "all"
    ? dayStats
    : dayStats.filter((stat) => activeDays.some((ad) => ad.dateKey === stat.dateKey));

  return (
    <div className="w-full bg-zinc-950 border border-zinc-800 rounded-none shadow-2xl overflow-hidden">
      {/* Quick Tips */}
      <div className="bg-zinc-900/90 px-4 py-3 border-b border-zinc-800 flex flex-col xl:flex-row justify-between items-stretch xl:items-center text-xs text-zinc-400 gap-3.5 font-mono">
        <span className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-orange-500 animate-pulse shrink-0"></span>
          <span>Click checkboxes to log. Headers dynamically compute daily progress logs.</span>
        </span>
        <div className="flex flex-wrap items-center gap-2.5">
          {/* WEEK FOCUS CONTROLS FOR COMPACT/MOBILE VIEWPORTS */}
          <div className="flex items-center gap-1 bg-zinc-950 p-1 border border-zinc-800 text-[11px]">
            <span className="text-zinc-500 font-bold px-1.5 hidden sm:inline">VIEW:</span>
            <button
              onClick={() => setSelectedWeekIdx("all")}
              className={`px-2.5 py-1 font-bold uppercase transition-all cursor-pointer ${
                selectedWeekIdx === "all"
                  ? "bg-orange-500 text-black font-black"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-900/50"
              }`}
            >
              Month
            </button>
            {weeks.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedWeekIdx(idx)}
                className={`px-2 py-1 font-bold uppercase transition-all cursor-pointer ${
                  selectedWeekIdx === idx
                    ? "bg-orange-500 text-black font-black"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-900/50"
                }`}
                title={`Show only Week ${idx + 1} for comfortable mobile viewing`}
              >
                W{idx + 1}
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="text-[11px] bg-zinc-950 border border-zinc-800 px-3 py-1.5 text-zinc-300 hover:text-orange-500 hover:border-orange-500 transition-all font-bold flex items-center gap-1.5 cursor-pointer uppercase select-none"
            title="Minimize/Maximize all check points and columns"
          >
            {isMinimized ? <Maximize2 className="w-3.5 h-3.5 text-orange-500" /> : <Minimize2 className="w-3.5 h-3.5 text-orange-500" />}
            <span>{isMinimized ? "Normal" : "Minimize"}</span>
          </button>
          <span className="text-[11px] bg-zinc-950 border border-zinc-800 px-3 py-1.5 rounded-none text-orange-500 font-bold text-center">
            HABITS: {habits.length}
          </span>
        </div>
      </div>

      {/* Grid Scroll Wrapper */}
      <div className="overflow-x-auto custom-scrollbar">
        <table className={`w-full border-collapse text-left select-none ${
          selectedWeekIdx === "all" ? "min-w-[850px]" : "min-w-0"
        }`}>
          <thead>
            {/* Row 1: Weeks */}
            <tr className="bg-zinc-900/60 border-b border-zinc-800">
              <th className={`sticky left-0 bg-zinc-950 z-25 border-r border-zinc-800 font-mono font-black text-orange-500 uppercase tracking-wider ${
                selectedWeekIdx !== "all"
                  ? "w-[110px] min-w-[110px] max-w-[130px] p-2.5 text-[10px]"
                  : isMinimized
                    ? "w-[120px] min-w-[120px] max-w-[140px] p-2.5 text-[10px]"
                    : "w-[155px] min-w-[155px] max-w-[180px] p-4 text-[11px]"
              }`}>
                Habits Ledger
              </th>
              {selectedWeekIdx === "all" ? (
                weeks.map((week, weekIdx) => (
                  <th
                    key={weekIdx}
                    colSpan={week.length}
                    className={`border-r border-zinc-800 text-center font-black text-zinc-100 font-sans tracking-[0.2em] uppercase border-b border-zinc-800 bg-zinc-900/40 ${
                      isMinimized ? "py-2.5 text-xs" : "py-3.5 text-sm"
                    }`}
                  >
                    W{weekIdx + 1}
                  </th>
                ))
              ) : (
                <th
                  colSpan={activeDays.length}
                  className={`border-r border-zinc-800 text-center font-black text-zinc-100 font-sans tracking-[0.2em] uppercase border-b border-zinc-800 bg-zinc-900/40 ${
                    isMinimized ? "py-2.5 text-xs" : "py-3.5 text-sm"
                  }`}
                >
                  Week {selectedWeekIdx + 1} Focus
                </th>
              )}
            </tr>

            {/* Row 2: Days of the week (Sa, Su, Mo...) */}
            <tr className="bg-zinc-950 border-b border-zinc-800/80 text-center">
              <th className={`sticky left-0 bg-zinc-950 z-25 border-r border-zinc-800 ${
                selectedWeekIdx !== "all"
                  ? "w-[110px] min-w-[110px] max-w-[130px]"
                  : isMinimized
                    ? "w-[120px] min-w-[120px] max-w-[140px]"
                    : "w-[155px] min-w-[155px] max-w-[180px]"
              }`}></th>
              {activeDays.map((day) => {
                const isWeekend = day.dayOfWeekShort === "Sa" || day.dayOfWeekShort === "Su";
                return (
                  <th
                    key={day.dateKey}
                    className={`border-r border-zinc-850 text-center font-black font-mono tracking-wider ${
                      isMinimized ? "w-8 min-w-[32px] py-2 text-[11px]" : "w-14 min-w-[56px] py-3 text-sm"
                    } ${
                      day.isToday
                        ? "bg-orange-500 text-black font-black text-[13px]"
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
              <th className={`sticky left-0 bg-zinc-950 z-25 border-r border-zinc-800 ${
                selectedWeekIdx !== "all"
                  ? "w-[110px] min-w-[110px] max-w-[130px]"
                  : isMinimized
                    ? "w-[120px] min-w-[120px] max-w-[140px]"
                    : "w-[155px] min-w-[155px] max-w-[180px]"
              }`}></th>
              {activeDays.map((day) => (
                <th
                  key={day.dateKey}
                  className={`border-r border-zinc-850 relative group text-center ${
                    isMinimized ? "w-8 min-w-[32px] py-2" : "w-14 min-w-[56px] py-3"
                  } ${
                    day.isToday ? "bg-zinc-900/60 text-orange-500" : "text-zinc-400"
                  }`}
                >
                  <div className="flex flex-col items-center justify-center">
                    <span
                      className={`font-black font-mono flex items-center justify-center rounded-none ${
                        isMinimized ? "text-xs h-5 w-5" : "text-sm h-8 w-8"
                      } ${
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
            {habits.length === 0 ? (
              <tr>
                <td colSpan={activeDays.length + 1} className="py-12 px-6 text-center bg-zinc-900/10">
                  <div className="max-w-md mx-auto flex flex-col items-center justify-center gap-4">
                    <p className="text-xs font-mono text-zinc-500 uppercase tracking-wider">
                      No active habits logged on this ledger sheet.
                    </p>
                    {onAddHabitClick && (
                      <button
                        type="button"
                        onClick={onAddHabitClick}
                        className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-black text-xs font-black uppercase tracking-widest transition-all duration-300 shadow-[0_0_15px_rgba(249,115,22,0.35)] hover:shadow-[0_0_25px_rgba(249,115,22,0.6)] animate-pulse rounded-none flex items-center gap-2 cursor-pointer"
                      >
                        <Plus className="w-4 h-4 stroke-[3px]" />
                        <span>+ Add Your First Habit</span>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              habits.map((habit, hIdx) => (
                <tr
                  key={habit.id}
                  className="hover:bg-zinc-900/30 border-b border-zinc-900 group transition-colors"
                >
                  {/* Sticky Left Column: Habit details */}
                  <td 
                    onClick={() => setActionHabit(habit)}
                    className={`sticky left-0 bg-zinc-950 hover:bg-zinc-900 z-20 border-r border-zinc-800 transition-colors cursor-pointer select-none ${
                      selectedWeekIdx !== "all"
                        ? "w-[110px] min-w-[110px] max-w-[130px] p-2"
                        : isMinimized
                          ? "w-[120px] min-w-[120px] max-w-[140px] p-2"
                          : "w-[155px] min-w-[155px] max-w-[180px] p-3"
                    }`}
                    title="Click to Manage, Edit, or Move this item"
                  >
                    <div className="flex items-center justify-start gap-1.5 md:gap-2.5">
                      <span className={`flex-shrink-0 transition-transform duration-200 ${
                        isMinimized ? "text-sm" : "text-xl"
                      }`}>{habit.emoji}</span>
                      <div className="min-w-0 flex-1">
                        {renderFormattedHabitName(habit, isMinimized)}
                      </div>
                    </div>
                  </td>

                {/* Day checkbox cells */}
                {activeDays.map((day) => {
                  const isCompleted = logs[day.dateKey]?.includes(habit.id) || false;
                  return (
                    <td
                      key={day.dateKey}
                      onClick={() => onToggleHabit(habit.id, day.dateKey)}
                      className={`border-r border-zinc-900/50 p-0 text-center cursor-pointer transition-colors hover:bg-zinc-900/25 ${
                        day.isToday ? "bg-zinc-900/20" : ""
                      }`}
                    >
                      <div className={`flex items-center justify-center mx-auto ${
                        isMinimized ? "h-8 w-8" : "h-12 w-12"
                      }`}>
                        <motion.button
                          type="button"
                          whileTap={{ scale: 0.9 }}
                          animate={{
                            backgroundColor: isCompleted ? "var(--accent-color-500, #f97316)" : "transparent",
                            borderColor: isCompleted ? "var(--accent-color-500, #f97316)" : "#3f3f46",
                          }}
                          transition={{ duration: 0.1 }}
                          className={`border rounded-none flex items-center justify-center focus:outline-hidden relative cursor-pointer ${
                            isMinimized ? "w-[18px] h-[18px]" : "w-[26px] h-[26px]"
                          }`}
                        >
                          {isCompleted && (
                            <motion.div
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ type: "spring", damping: 12, stiffness: 200 }}
                            >
                              <Check className={`text-black ${
                                isMinimized ? "w-3.5 h-3.5 stroke-[4.5]" : "w-4.5 h-4.5 stroke-[4.5]"
                              }`} />
                            </motion.div>
                          )}
                        </motion.button>
                      </div>
                    </td>
                  );
                })}
              </tr>
            )))}

            {/* Bottom Progress Row 1: Percentage (%) */}
            <tr className="bg-zinc-900 border-t border-zinc-800 font-black font-mono text-center">
              <td className={`sticky left-0 bg-zinc-900 font-sans font-black text-orange-500 border-r border-zinc-800 uppercase tracking-wider text-left ${
                selectedWeekIdx !== "all"
                  ? "w-[110px] min-w-[110px] max-w-[130px] p-2 text-[10px]"
                  : isMinimized
                    ? "w-[120px] min-w-[120px] max-w-[140px] p-2 text-[10px]"
                    : "w-[155px] min-w-[155px] max-w-[180px] p-3 text-xs"
              }`}>
                Progress %
              </td>
              {activeDayStats.map((stat) => {
                const isHigh = stat.percentage >= 80;
                const isZero = stat.percentage === 0;
                return (
                  <td
                    key={stat.dateKey}
                    className={`border-r border-zinc-900/50 text-center ${
                      isMinimized ? "py-1 text-[10px]" : "py-3 text-xs"
                    }`}
                  >
                    <span
                      className={`px-1.5 py-0.5 rounded-none font-black font-mono ${
                        isMinimized ? "text-[9px] px-1 py-0" : "text-[11px]"
                      } ${
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
              <td className={`sticky left-0 bg-zinc-900 font-sans font-black text-zinc-400 border-r border-zinc-800 uppercase tracking-wider text-left ${
                selectedWeekIdx !== "all"
                  ? "w-[110px] min-w-[110px] max-w-[130px] p-2 text-[10px]"
                  : isMinimized
                    ? "w-[120px] min-w-[120px] max-w-[140px] p-2 text-[10px]"
                    : "w-[155px] min-w-[155px] max-w-[180px] p-3 text-xs"
              }`}>
                Done
              </td>
              {activeDayStats.map((stat) => (
                <td
                  key={stat.dateKey}
                  className={`border-r border-zinc-900/50 text-zinc-100 font-black ${
                    isMinimized ? "py-1 text-[10px]" : "py-2.5 text-xs"
                  }`}
                >
                  {stat.doneCount}
                </td>
              ))}
            </tr>

            {/* Bottom Progress Row 3: Remaining / Not Done Count */}
            <tr className="bg-zinc-900/30 font-mono text-center">
              <td className={`sticky left-0 bg-zinc-900 font-sans font-black text-zinc-500 border-r border-zinc-800 uppercase tracking-wider text-left ${
                selectedWeekIdx !== "all"
                  ? "w-[110px] min-w-[110px] max-w-[130px] p-2 text-[10px]"
                  : isMinimized
                    ? "w-[120px] min-w-[120px] max-w-[140px] p-2 text-[10px]"
                    : "w-[155px] min-w-[155px] max-w-[180px] p-3 text-xs"
              }`}>
                Not Done
              </td>
              {activeDayStats.map((stat) => {
                const rem = stat.totalCount - stat.doneCount;
                return (
                  <td
                    key={stat.dateKey}
                    className={`border-r border-zinc-900/50 text-zinc-500 ${
                      isMinimized ? "py-1 text-[10px]" : "py-2.5 text-xs"
                    }`}
                  >
                    {rem}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Interactive Actions Modal to delete or edit item upon clicking it */}
      <AnimatePresence>
        {actionHabit && (() => {
          const currentHIdx = habits.findIndex((h) => h.id === actionHabit.id);
          return (
            <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-zinc-950 border-2 border-zinc-800 w-full max-w-md p-6 relative shadow-2xl"
              >
                {/* Top orange line accent */}
                <div className="absolute top-0 left-0 w-full h-[3px] bg-orange-500"></div>
                
                <button
                  onClick={() => setActionHabit(null)}
                  className="absolute top-4 right-4 p-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-850 hover:border-zinc-700 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-mono font-black text-orange-500 uppercase tracking-[0.25em] block">
                      Manage Schedule Item
                    </span>
                    <h4 className="text-base font-sans font-black text-white flex items-center gap-2.5">
                      <span className="text-xl shrink-0">{actionHabit.emoji}</span>
                      <span className="truncate">{actionHabit.name}</span>
                    </h4>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono font-bold bg-zinc-900 text-zinc-400 border border-zinc-850 px-2 py-0.5 uppercase tracking-wide">
                        {actionHabit.category || "General Study"}
                      </span>
                    </div>
                  </div>

                  {/* Reordering Controls inside the popup */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-mono font-black text-orange-500 uppercase tracking-[0.25em] block">
                      Position / Reorder
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          if (currentHIdx > 0) {
                            onMoveHabit(currentHIdx, "up");
                          }
                        }}
                        disabled={currentHIdx <= 0}
                        className="py-2.5 bg-zinc-900 hover:bg-zinc-850 disabled:opacity-20 border border-zinc-800 text-zinc-300 hover:text-white disabled:hover:text-zinc-500 text-xs font-mono font-black uppercase tracking-widest transition-all duration-150 cursor-pointer flex items-center justify-center gap-2"
                      >
                        <ChevronUp className="w-4 h-4" />
                        <span>Move Up</span>
                      </button>
                      <button
                        onClick={() => {
                          if (currentHIdx < habits.length - 1) {
                            onMoveHabit(currentHIdx, "down");
                          }
                        }}
                        disabled={currentHIdx >= habits.length - 1}
                        className="py-2.5 bg-zinc-900 hover:bg-zinc-850 disabled:opacity-20 border border-zinc-800 text-zinc-300 hover:text-white disabled:hover:text-zinc-500 text-xs font-mono font-black uppercase tracking-widest transition-all duration-150 cursor-pointer flex items-center justify-center gap-2"
                      >
                        <ChevronDown className="w-4 h-4" />
                        <span>Move Down</span>
                      </button>
                    </div>
                  </div>

                  <div className="p-4 bg-zinc-900/50 border border-zinc-900 text-xs text-zinc-400 font-mono leading-relaxed">
                    Choose an action for this timetable item. Deleting it will permanently remove this entry and all its logs for this month.
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    <button
                      onClick={() => {
                        if (window.confirm(`Are you sure you want to delete "${actionHabit.name}"?`)) {
                          onDeleteHabit(actionHabit.id);
                          setActionHabit(null);
                        }
                      }}
                      className="w-full py-3 bg-red-950/20 hover:bg-red-600 border border-red-900/50 hover:border-red-500 text-red-400 hover:text-black text-xs font-mono font-black uppercase tracking-widest transition-all duration-150 cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete</span>
                    </button>

                    <button
                      onClick={() => {
                        onEditHabit(actionHabit);
                        setActionHabit(null);
                      }}
                      className="w-full py-3 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-orange-500 text-zinc-200 hover:text-white text-xs font-mono font-black uppercase tracking-widest transition-all duration-150 cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Edit2 className="w-4 h-4 text-orange-500" />
                      <span>Edit Details</span>
                    </button>
                  </div>
                  
                  <button
                    onClick={() => setActionHabit(null)}
                    className="w-full py-2 bg-zinc-950 hover:bg-zinc-900 text-zinc-500 hover:text-zinc-300 border border-zinc-900 text-[10px] font-mono uppercase tracking-widest cursor-pointer transition-colors"
                  >
                    Close Options
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}

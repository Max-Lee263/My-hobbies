import { useState, useMemo } from "react";
import { Flame, Trophy, CheckCircle, Search, ArrowUpDown, Sparkles, Plus, BarChart2, PieChart } from "lucide-react";
import { Habit, HabitLog } from "../types";
import { calculateHabitStreaks, MONTH_NAMES } from "../utils";

interface HabitStatsListProps {
  habits: Habit[];
  logs: HabitLog;
  currentYear: number;
  currentMonth: number;
  daysInMonthCount: number;
  onEditHabit: (habit: Habit) => void;
  onAddHabitClick?: () => void;
}

type SortOption = "name" | "streak" | "longest" | "completion";

export default function HabitStatsList({
  habits,
  logs,
  currentYear,
  currentMonth,
  daysInMonthCount,
  onEditHabit,
  onAddHabitClick,
}: HabitStatsListProps) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("name");

  // Interactive states for hover effects on charts
  const [hoveredLineIndex, setHoveredLineIndex] = useState<number | null>(null);
  const [hoveredPieIndex, setHoveredPieIndex] = useState<number | null>(null);

  // --- WEEKLY PROGRESS LINE CHART CALCULATIONS ---
  const last7DaysData = useMemo(() => {
    const dataPoints: {
      dateLabel: string;
      percent: number;
      completedCount: number;
      totalCount: number;
      x: number;
      y: number;
    }[] = [];

    const today = new Date();
    // Use either system today or the end of selected month if viewing a past month
    const isCurrentMonth =
      today.getFullYear() === currentYear && today.getMonth() === currentMonth;
    const endDay = isCurrentMonth
      ? Math.min(today.getDate(), daysInMonthCount)
      : daysInMonthCount;

    const startDay = Math.max(1, endDay - 6);

    // SVG coordinates configuration
    const svgWidth = 500;
    const svgHeight = 180;
    const paddingLeft = 45;
    const paddingRight = 20;
    const paddingTop = 25;
    const paddingBottom = 35;
    const plotWidth = svgWidth - paddingLeft - paddingRight;
    const plotHeight = svgHeight - paddingTop - paddingBottom;

    const daysCount = endDay - startDay + 1;

    for (let i = 0; i < daysCount; i++) {
      const d = startDay + i;
      const dayStr = String(d).padStart(2, "0");
      const monthStr = String(currentMonth + 1).padStart(2, "0");
      const dateKey = `${currentYear}-${monthStr}-${dayStr}`;

      const completedIds = logs[dateKey] || [];
      const totalHabitsCount = habits.length;
      const completedActiveCount = completedIds.filter((id) =>
        habits.some((h) => h.id === id)
      ).length;

      const percent = totalHabitsCount > 0 ? (completedActiveCount / totalHabitsCount) * 100 : 0;

      // Calculate SVG x, y positions
      const x = paddingLeft + (daysCount > 1 ? (i / (daysCount - 1)) * plotWidth : plotWidth / 2);
      const y = paddingTop + plotHeight - (percent / 100) * plotHeight;

      dataPoints.push({
        dateLabel: `${d} ${MONTH_NAMES[currentMonth]?.substring(0, 3) || ""}`,
        percent,
        completedCount: completedActiveCount,
        totalCount: totalHabitsCount,
        x,
        y,
      });
    }

    return dataPoints;
  }, [habits, logs, currentYear, currentMonth, daysInMonthCount]);

  // --- SUBJECT FOCUS PIE CHART CALCULATIONS ---
  const subjectFocusData = useMemo(() => {
    const counts: Record<string, number> = {};
    let totalTagged = 0;

    habits.forEach((habit) => {
      const tag = habit.subjectTag ? habit.subjectTag.trim().toUpperCase() : "GENERAL";
      counts[tag] = (counts[tag] || 0) + 1;
      totalTagged++;
    });

    const colors = [
      "var(--accent-color-500, #f97316)", // orange-500
      "#3b82f6", // blue-500
      "#10b981", // emerald-500
      "#a855f7", // purple-500
      "#ec4899", // pink-500
      "#eab308", // yellow-500
      "#14b8a6", // teal-500
      "#ef4444", // red-500
    ];

    let accumulatedPercentage = 0;

    const list = Object.entries(counts).map(([tag, count], index) => {
      const percent = totalTagged > 0 ? (count / totalTagged) * 100 : 0;
      const dataItem = {
        tag,
        count,
        percent,
        color: colors[index % colors.length],
        startPercent: accumulatedPercentage,
      };
      accumulatedPercentage += percent;
      return dataItem;
    });

    return list;
  }, [habits]);

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
        isStreakAtRisk: streaks.isStreakAtRisk,
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

  // Construct SVG path for line chart
  const linePathD = useMemo(() => {
    if (last7DaysData.length === 0) return "";
    return last7DaysData.map((pt, i) => `${i === 0 ? "M" : "L"} ${pt.x} ${pt.y}`).join(" ");
  }, [last7DaysData]);

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

      {/* --- VISUAL ANALYTICS PANELS --- */}
      {habits.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-5 bg-zinc-900/15 border border-zinc-850 rounded-none">
          
          {/* Panel A: Weekly Progress Line Chart */}
          <div className="bg-zinc-950 border border-zinc-900 p-4 relative overflow-hidden flex flex-col justify-between">
            {/* Design header lines */}
            <div className="absolute top-0 left-0 w-1.5 h-full bg-orange-500/80"></div>
            
            <div className="pl-3 mb-4">
              <div className="flex items-center gap-1.5 text-orange-500 font-mono text-[10px] font-black uppercase tracking-widest">
                <BarChart2 className="w-3.5 h-3.5" />
                <span>Weekly Progress Line Chart / साप्ताहिक सूचकांक</span>
              </div>
              <h4 className="text-xs font-black text-zinc-300 font-sans uppercase tracking-tight mt-0.5">
                Stability Index (Last 7 Active Days)
              </h4>
            </div>

            <div className="relative w-full h-[180px] bg-zinc-950 border border-zinc-900/50 p-1 flex items-center justify-center">
              {last7DaysData.length === 0 ? (
                <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">No active logs to chart</p>
              ) : (
                <svg viewBox="0 0 500 180" className="w-full h-full">
                  <defs>
                    <linearGradient id="chart-area-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent-color-500, #f97316)" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="var(--accent-color-500, #f97316)" stopOpacity="0" />
                    </linearGradient>
                    <filter id="orange-glow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                  </defs>

                  {/* Horizontal Y-Gridlines & Labels */}
                  {[0, 25, 50, 75, 100].map((val) => {
                    const y = 25 + (125 * (100 - val)) / 100;
                    return (
                      <g key={val} className="opacity-40">
                        <line
                          x1="45"
                          y1={y}
                          x2="480"
                          y2={y}
                          stroke="#27272a"
                          strokeWidth="1"
                          strokeDasharray="3 3"
                        />
                        <text
                          x="35"
                          y={y + 3}
                          fill="#71717a"
                          fontSize="8"
                          fontFamily="monospace"
                          textAnchor="end"
                        >
                          {val}%
                        </text>
                      </g>
                    );
                  })}

                  {/* Vertical Guidelines under hovered points */}
                  {hoveredLineIndex !== null && last7DaysData[hoveredLineIndex] && (
                    <line
                      x1={last7DaysData[hoveredLineIndex].x}
                      y1="25"
                      x2={last7DaysData[hoveredLineIndex].x}
                      y2="150"
                      stroke="var(--accent-color-500, #f97316)"
                      strokeWidth="1.5"
                      strokeDasharray="4 4"
                      className="opacity-60"
                    />
                  )}

                  {/* Area Under Curve Fill */}
                  {linePathD && (
                    <path
                      d={`${linePathD} L ${last7DaysData[last7DaysData.length - 1].x} 150 L ${last7DaysData[0].x} 150 Z`}
                      fill="url(#chart-area-grad)"
                    />
                  )}

                  {/* Main Line Stroke */}
                  {linePathD && (
                    <path
                      d={linePathD}
                      fill="none"
                      stroke="var(--accent-color-500, #f97316)"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      filter="url(#orange-glow)"
                    />
                  )}

                  {/* Points / Dots */}
                  {last7DaysData.map((pt, idx) => {
                    const isHovered = hoveredLineIndex === idx;
                    return (
                      <g key={idx}>
                        {/* Interactive Invisible Hover Zone */}
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r="15"
                          fill="transparent"
                          className="cursor-pointer"
                          onMouseEnter={() => setHoveredLineIndex(idx)}
                          onMouseLeave={() => setHoveredLineIndex(null)}
                        />
                        {/* Glow halo */}
                        {isHovered && (
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r="8"
                            fill="var(--accent-color-500, #f97316)"
                            className="opacity-30 animate-ping pointer-events-none"
                          />
                        )}
                        {/* Outer Ring */}
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={isHovered ? "5" : "3.5"}
                          fill="#09090b"
                          stroke="var(--accent-color-500, #f97316)"
                          strokeWidth={isHovered ? "2.5" : "1.5"}
                          className="transition-all duration-150 pointer-events-none"
                        />
                        {/* Day Text Label */}
                        <text
                          x={pt.x}
                          y="166"
                          fill={isHovered ? "var(--accent-color-500, #f97316)" : "#71717a"}
                          fontSize="9"
                          fontFamily="monospace"
                          fontWeight={isHovered ? "bold" : "normal"}
                          textAnchor="middle"
                          className="transition-colors pointer-events-none uppercase"
                        >
                          {pt.dateLabel}
                        </text>
                      </g>
                    );
                  })}

                  {/* Real-time Inline Hover Tooltip Box */}
                  {hoveredLineIndex !== null && last7DaysData[hoveredLineIndex] && (
                    <g className="pointer-events-none">
                      <rect
                        x={Math.max(50, Math.min(350, last7DaysData[hoveredLineIndex].x - 65))}
                        y={Math.max(10, last7DaysData[hoveredLineIndex].y - 45)}
                        width="130"
                        height="32"
                        fill="#09090b"
                        stroke="var(--accent-color-500, #f97316)"
                        strokeWidth="1.5"
                        rx="0"
                      />
                      <text
                        x={Math.max(50, Math.min(350, last7DaysData[hoveredLineIndex].x - 65)) + 65}
                        y={Math.max(10, last7DaysData[hoveredLineIndex].y - 45) + 13}
                        fill="var(--accent-color-500, #f97316)"
                        fontSize="9"
                        fontWeight="black"
                        fontFamily="monospace"
                        textAnchor="middle"
                      >
                        {last7DaysData[hoveredLineIndex].percent.toFixed(0)}% COMPLETION
                      </text>
                      <text
                        x={Math.max(50, Math.min(350, last7DaysData[hoveredLineIndex].x - 65)) + 65}
                        y={Math.max(10, last7DaysData[hoveredLineIndex].y - 45) + 24}
                        fill="#a1a1aa"
                        fontSize="8"
                        fontFamily="monospace"
                        textAnchor="middle"
                      >
                        Checked: {last7DaysData[hoveredLineIndex].completedCount} / {last7DaysData[hoveredLineIndex].totalCount} Habits
                      </text>
                    </g>
                  )}
                </svg>
              )}
            </div>
          </div>

          {/* Panel B: Subject Focus Pie/Donut Chart */}
          <div className="bg-zinc-950 border border-zinc-900 p-4 relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500/80"></div>
            
            <div className="pl-3 mb-4">
              <div className="flex items-center gap-1.5 text-blue-400 font-mono text-[10px] font-black uppercase tracking-widest">
                <PieChart className="w-3.5 h-3.5" />
                <span>Subject Focus Pie Chart / विषय विश्लेषण</span>
              </div>
              <h4 className="text-xs font-black text-zinc-300 font-sans uppercase tracking-tight mt-0.5">
                Active Routine Weight (by Subject Tag)
              </h4>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-around gap-4 min-h-[180px] bg-zinc-950/40 border border-zinc-900/50 p-3">
              {subjectFocusData.length === 0 ? (
                <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">No categorized tags available</p>
              ) : (
                <>
                  {/* SVG Donut */}
                  <div className="relative w-36 h-36 flex-shrink-0">
                    <svg viewBox="0 0 140 140" className="w-full h-full transform -rotate-90">
                      {subjectFocusData.map((seg, idx) => {
                        const radius = 45;
                        const circumference = 2 * Math.PI * radius; // ~282.74
                        const strokeDasharray = `${circumference} ${circumference}`;
                        const strokeDashoffset = circumference - (seg.percent / 100) * circumference;
                        const rotation = (seg.startPercent / 100) * 360;
                        const isHovered = hoveredPieIndex === idx;

                        return (
                          <circle
                            key={seg.tag}
                            cx="70"
                            cy="70"
                            r={radius}
                            fill="transparent"
                            stroke={seg.color}
                            strokeWidth={isHovered ? "16" : "11"}
                            strokeDasharray={strokeDasharray}
                            strokeDashoffset={strokeDashoffset}
                            transform={`rotate(${rotation} 70 70)`}
                            className="transition-all duration-200 cursor-pointer"
                            onMouseEnter={() => setHoveredPieIndex(idx)}
                            onMouseLeave={() => setHoveredPieIndex(null)}
                          />
                        );
                      })}
                    </svg>

                    {/* Donut Center Label Text */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                      {hoveredPieIndex !== null && subjectFocusData[hoveredPieIndex] ? (
                        <>
                          <span className="text-[8px] font-mono text-zinc-400 uppercase tracking-widest">
                            {subjectFocusData[hoveredPieIndex].tag.substring(0, 10)}
                          </span>
                          <span 
                            className="text-lg font-black font-sans leading-none mt-0.5"
                            style={{ color: subjectFocusData[hoveredPieIndex].color }}
                          >
                            {subjectFocusData[hoveredPieIndex].percent.toFixed(0)}%
                          </span>
                          <span className="text-[8px] text-zinc-550 font-mono uppercase mt-0.5">
                            {subjectFocusData[hoveredPieIndex].count} {subjectFocusData[hoveredPieIndex].count === 1 ? "Habit" : "Habits"}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest">
                            TOTAL
                          </span>
                          <span className="text-xl font-black text-zinc-100 font-sans leading-none mt-0.5">
                            {habits.length}
                          </span>
                          <span className="text-[7.5px] text-zinc-500 font-mono uppercase tracking-wider mt-0.5">
                            ACTIVE HABITS
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Interactive Legend List */}
                  <div className="flex flex-col gap-1.5 min-w-[130px] max-h-[160px] overflow-y-auto pr-1">
                    {subjectFocusData.map((seg, idx) => {
                      const isHovered = hoveredPieIndex === idx;
                      return (
                        <div
                          key={seg.tag}
                          onMouseEnter={() => setHoveredPieIndex(idx)}
                          onMouseLeave={() => setHoveredPieIndex(null)}
                          className={`flex items-center gap-2 p-1 border cursor-pointer transition-all ${
                            isHovered
                              ? "bg-zinc-900 border-zinc-700 translate-x-1"
                              : "bg-transparent border-transparent"
                          }`}
                        >
                          <span
                            className="w-2.5 h-2.5 shrink-0 block"
                            style={{ backgroundColor: seg.color }}
                          ></span>
                          <div className="flex flex-col min-w-0">
                            <span className="text-[10px] font-mono font-bold text-zinc-300 uppercase tracking-wide truncate">
                              {seg.tag}
                            </span>
                            <span className="text-[8px] text-zinc-500 font-mono">
                              {seg.count} {seg.count === 1 ? "habit" : "habits"} ({seg.percent.toFixed(0)}%)
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>

        </div>
      )}

      {filteredAndSortedStats.length === 0 ? (
        <div className="text-center py-12 bg-zinc-900/35 border border-dashed border-zinc-800 rounded-none flex flex-col items-center justify-center gap-4 px-4">
          <p className="text-sm text-zinc-500 font-mono">No habits found matching your filter</p>
          {onAddHabitClick && (
            <button
              onClick={onAddHabitClick}
              className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-black text-xs font-black uppercase tracking-widest transition-all duration-300 shadow-[0_0_15px_rgba(249,115,22,0.35)] hover:shadow-[0_0_25px_rgba(249,115,22,0.6)] animate-pulse rounded-none flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3px]" />
              <span>+ Add Your First Habit</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAndSortedStats.map(({ habit, currentStreak, longestStreak, monthlyCompletions, completionRate, isStreakAtRisk }) => (
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
                  className="flex items-start gap-2.5 truncate cursor-pointer hover:text-orange-500 group/statitem transition-colors duration-200 active:scale-98"
                  title="Click to edit habit"
                >
                  <span className="text-xl flex-shrink-0 group-hover/statitem:scale-110 transition-transform duration-200 mt-0.5">{habit.emoji}</span>
                  <div className="flex flex-col min-w-0">
                    <span className="font-black text-sm text-zinc-100 group-hover/statitem:text-orange-500 truncate font-sans uppercase tracking-tight transition-colors duration-200">
                      {habit.name}
                    </span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {habit.subjectTag && (
                        <span className="text-[9px] font-mono font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-1.5 py-0.5 rounded-none max-w-max uppercase tracking-wider">
                          🏷️ {habit.subjectTag}
                        </span>
                      )}
                      {isStreakAtRisk && (
                        <span className="text-[9px] font-mono font-bold text-red-500 bg-red-950/25 border border-red-900/50 px-1.5 py-0.5 rounded-none max-w-max uppercase tracking-wider animate-pulse">
                          ⚠️ STREAK AT RISK
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <span className="text-xs font-bold text-orange-500 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-none font-mono flex-shrink-0">
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

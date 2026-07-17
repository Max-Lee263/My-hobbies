import { TrendingUp, Award, Flame, CheckCircle2 } from "lucide-react";
import { motion } from "motion/react";

interface StatsGridProps {
  completionRate: number;
  perfectDaysCount: number;
  totalCompletions: number;
  longestStreak: number;
}

export default function StatsGrid({
  completionRate,
  perfectDaysCount,
  totalCompletions,
  longestStreak,
}: StatsGridProps) {
  const stats = [
    {
      title: "Monthly Rate",
      value: `${completionRate.toFixed(1)}%`,
      icon: TrendingUp,
      color: "bg-orange-500/10 text-orange-500 border-orange-500/20",
      description: "Average success of active habits",
    },
    {
      title: "Perfect Days",
      value: perfectDaysCount,
      icon: Award,
      color: "bg-orange-500/10 text-orange-500 border-orange-500/20",
      description: "Days with 100% habits checked",
    },
    {
      title: "Total Actions",
      value: totalCompletions,
      icon: CheckCircle2,
      color: "bg-orange-500/10 text-orange-500 border-orange-500/20",
      description: "Completed habit logs this month",
    },
    {
      title: "Top Habit Streak",
      value: `${longestStreak} Days`,
      icon: Flame,
      color: "bg-orange-500/10 text-orange-500 border-orange-500/20",
      description: "Longest active streak currently",
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="grid grid-cols-2 lg:grid-cols-4 gap-4"
    >
      {stats.map((stat, i) => (
        <motion.div
          key={i}
          variants={itemVariants}
          className="flex flex-col justify-between p-5 bg-zinc-900/60 border border-zinc-800 rounded-none shadow-xl hover:border-zinc-700 transition-all duration-300 relative group overflow-hidden"
        >
          {/* Decorative Corner Line for Tech/Brutalist feel */}
          <div className="absolute top-0 right-0 w-8 h-[1px] bg-orange-500/20 group-hover:bg-orange-500/60 transition-colors"></div>
          <div className="absolute top-0 right-0 w-[1px] h-8 bg-orange-500/20 group-hover:bg-orange-500/60 transition-colors"></div>

          <div className="flex justify-between items-start mb-2">
            <span className="text-[12px] font-mono font-black text-orange-500 uppercase tracking-widest">
              {stat.title}
            </span>
            <div className={`p-2 rounded-none border ${stat.color}`}>
              <stat.icon className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-4xl font-black text-white tracking-tighter uppercase font-sans">
              {stat.value}
            </span>
            <p className="text-[12px] text-zinc-400 mt-1.5 font-bold uppercase tracking-tight font-mono">
              {stat.description}
            </p>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}

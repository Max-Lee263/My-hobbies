import { useState, useEffect, useMemo } from "react";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Download,
  RefreshCw,
  Trash2,
  Sparkles,
  HelpCircle,
  TrendingUp,
  School,
  Mail,
  Phone,
  LogOut,
  User as UserIcon,
  Printer,
  LayoutGrid,
  Users,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import { Habit, HabitLog, User } from "./types";
import {
  DEFAULT_HABITS,
  MONTH_NAMES,
  getDaysInMonth,
  formatDateKey,
} from "./utils";
import StatsGrid from "./components/StatsGrid";
import HabitGrid from "./components/HabitGrid";
import HabitStatsList from "./components/HabitStatsList";
import AddEditHabitModal from "./components/AddEditHabitModal";
import AuthScreen from "./components/AuthScreen";
import SocialHub from "./components/SocialHub";
import PrintHabitsModal from "./components/PrintHabitsModal";
import AIPromptWidget from "./components/AIPromptWidget";
import HobbiesModal from "./components/HobbiesModal";
import TimeTableModal from "./components/TimeTableModal";

export default function App() {
  // --- USER AUTHENTICATION STATE ---
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const stored = localStorage.getItem("ledger_current_user");
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const [sessionKicked, setSessionKicked] = useState(false);

  // --- SESSION CONCURRENCY POLLING HOOK ---
  useEffect(() => {
    if (!currentUser) return;

    const interval = setInterval(async () => {
      const token = localStorage.getItem("ledger_session_token");
      if (!token) return;

      try {
        const response = await fetch(
          `/api/auth/check-session?userId=${encodeURIComponent(currentUser.id)}&sessionToken=${encodeURIComponent(token)}`
        );
        if (response.ok) {
          const data = await response.json();
          if (data.valid === false) {
            // Clear local storage session
            localStorage.removeItem("ledger_current_user");
            localStorage.removeItem("ledger_session_token");
            
            // Log out user & show modal
            setCurrentUser(null);
            setSessionKicked(true);
            clearInterval(interval);
          }
        }
      } catch (e) {
        console.error("Session concurrency check failed:", e);
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [currentUser]);

  // --- STATE ---
  const [currentYear, setCurrentYear] = useState(() => {
    const today = new Date();
    return today.getFullYear();
  });

  const [currentMonth, setCurrentMonth] = useState(() => {
    const today = new Date();
    return today.getMonth(); // 0-indexed
  });

  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog>({});

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isHobbiesModalOpen, setIsHobbiesModalOpen] = useState(false);
  const [isTimeTableModalOpen, setIsTimeTableModalOpen] = useState(false);
  const [habitToEdit, setHabitToEdit] = useState<Habit | null>(null);
  
  // Navigation / Workspace tab state
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<"ledger" | "ai_studio" | "social">("ledger");
  
  // AI Notification State
  const [aiSuccessMessage, setAiSuccessMessage] = useState<string | null>(null);

  const handleNotifySuccess = (msg: string) => {
    setAiSuccessMessage(msg);
    setTimeout(() => {
      setAiSuccessMessage(null);
    }, 6000);
  };

  const handleAddMultipleHabits = (newHabitsList: { name: string; emoji: string; category: string }[]) => {
    if (!currentUser) return;
    setHabits((prev) => {
      const habitsToAdd: Habit[] = newHabitsList.map((nh, idx) => ({
        id: `habit-${Date.now()}-${idx}`,
        name: nh.name,
        emoji: nh.emoji,
        category: nh.category || "Routine",
        createdAt: new Date().toISOString(),
      }));
      const updated = [...prev, ...habitsToAdd];
      const habitsKey = `habit_tracker_items_${currentUser.id}`;
      localStorage.setItem(habitsKey, JSON.stringify(updated));
      return updated;
    });
  };

  // Active selected tab / category
  const [selectedCategoryTab, setSelectedCategoryTab] = useState("All");

  // Extract all unique categories present in user's habits (or fallback to "Routine")
  const existingCategories = useMemo(() => {
    const cats = habits.map((h) => h.category || "Routine").filter(Boolean);
    return Array.from(new Set(["Routine", ...cats]));
  }, [habits]);

  // Combine All with other tabs
  const allTabs = useMemo(() => {
    return ["All", ...existingCategories];
  }, [existingCategories]);

  // Ensure selected tab is valid
  useEffect(() => {
    if (!allTabs.includes(selectedCategoryTab)) {
      setSelectedCategoryTab("All");
    }
  }, [allTabs, selectedCategoryTab]);

  // Filter habits based on the selected tab/category
  const filteredHabits = useMemo(() => {
    if (selectedCategoryTab === "All") {
      return habits;
    }
    return habits.filter((h) => (h.category || "Routine") === selectedCategoryTab);
  }, [habits, selectedCategoryTab]);

  // --- PARTITIONED DATA EFFECT ---
  useEffect(() => {
    if (!currentUser) {
      setHabits([]);
      setLogs({});
      return;
    }

    const habitsKey = `habit_tracker_items_${currentUser.id}`;
    const logsKey = `habit_tracker_logs_${currentUser.id}`;

    // Load habits for this specific user
    const storedHabits = localStorage.getItem(habitsKey);
    let loadedHabits: Habit[] = [];
    if (storedHabits) {
      try {
        loadedHabits = JSON.parse(storedHabits);
      } catch (e) {
        loadedHabits = DEFAULT_HABITS;
      }
    } else {
      // First time for this user: prefill with DEFAULT_HABITS
      loadedHabits = DEFAULT_HABITS;
      localStorage.setItem(habitsKey, JSON.stringify(DEFAULT_HABITS));
    }
    setHabits(loadedHabits);

    // Load logs for this specific user
    const storedLogs = localStorage.getItem(logsKey);
    if (storedLogs) {
      try {
        setLogs(JSON.parse(storedLogs));
      } catch (e) {
        setLogs({});
      }
    } else {
      setLogs({});
    }
  }, [currentUser]);

  // Logout Handler
  const handleLogout = () => {
    localStorage.removeItem("ledger_current_user");
    setCurrentUser(null);
  };


  // --- CALENDAR GENERATION ---
  const days = useMemo(() => {
    return getDaysInMonth(currentYear, currentMonth);
  }, [currentYear, currentMonth]);

  // --- MONTHLY METRIC CALCULATIONS ---
  const stats = useMemo(() => {
    const daysCount = days.length;
    if (daysCount === 0 || habits.length === 0) {
      return {
        completionRate: 0,
        perfectDaysCount: 0,
        totalCompletions: 0,
        longestStreak: 0,
      };
    }

    let totalCompletions = 0;
    let perfectDaysCount = 0;

    days.forEach((day) => {
      const completedOnDay = logs[day.dateKey]?.filter((id) =>
        habits.some((h) => h.id === id)
      ).length || 0;

      totalCompletions += completedOnDay;

      if (completedOnDay === habits.length && habits.length > 0) {
        perfectDaysCount++;
      }
    });

    const possibleLogsCount = habits.length * daysCount;
    const completionRate = (totalCompletions / possibleLogsCount) * 100;

    // Find the longest streak across all habits
    let maxStreak = 0;
    habits.forEach((habit) => {
      // Re-use helper to compute streaks
      const completedDates = Object.keys(logs)
        .filter((key) => logs[key]?.includes(habit.id))
        .map((key) => {
          const [y, m, d] = key.split("-").map(Number);
          return new Date(y, m - 1, d);
        })
        .sort((a, b) => a.getTime() - b.getTime());

      if (completedDates.length > 0) {
        let longest = 0;
        let temp = 0;
        let prev: Date | null = null;

        for (let i = 0; i < completedDates.length; i++) {
          const curr = completedDates[i];
          if (prev === null) {
            temp = 1;
          } else {
            const diff = Math.abs(curr.getTime() - prev.getTime());
            const diffDays = Math.ceil(diff / (1000 * 60 * 60 * 24));
            if (diffDays === 1) {
              temp++;
            } else if (diffDays > 1) {
              if (temp > longest) longest = temp;
              temp = 1;
            }
          }
          prev = curr;
        }
        if (temp > longest) longest = temp;
        if (longest > maxStreak) {
          maxStreak = longest;
        }
      }
    });

    return {
      completionRate,
      perfectDaysCount,
      totalCompletions,
      longestStreak: maxStreak,
    };
  }, [days, habits, logs]);

  // --- ACTIONS ---

  // Go to previous month
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  };

  // Go to next month
  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  };

  // Toggle checklist checkbox
  const handleToggleHabit = (habitId: string, dateKey: string) => {
    if (!currentUser) return;
    setLogs((prev) => {
      const currentList = prev[dateKey] ? [...prev[dateKey]] : [];
      const index = currentList.indexOf(habitId);

      if (index > -1) {
        // Remove habit ID
        currentList.splice(index, 1);
      } else {
        // Add habit ID
        currentList.push(habitId);
      }

      const updated = { ...prev };
      if (currentList.length === 0) {
        delete updated[dateKey];
      } else {
        updated[dateKey] = currentList;
      }
      
      // Auto-save synchronously
      const logsKey = `habit_tracker_logs_${currentUser.id}`;
      localStorage.setItem(logsKey, JSON.stringify(updated));
      return updated;
    });
  };

  // Open Add modal
  const handleOpenAddModal = () => {
    setHabitToEdit(null);
    setIsModalOpen(true);
  };

  // Open Edit modal
  const handleOpenEditModal = (habit: Habit) => {
    setHabitToEdit(habit);
    setIsModalOpen(true);
  };

  // Save new or edited habit
  const handleSaveHabit = (name: string, emoji: string, category: string) => {
    if (!currentUser) return;
    if (habitToEdit) {
      // Edit mode
      setHabits((prev) => {
        const updated = prev.map((h) =>
          h.id === habitToEdit.id ? { ...h, name, emoji, category } : h
        );
        const habitsKey = `habit_tracker_items_${currentUser.id}`;
        localStorage.setItem(habitsKey, JSON.stringify(updated));
        return updated;
      });
    } else {
      // Create mode
      const newHabit: Habit = {
        id: `habit-${Date.now()}`,
        name,
        emoji,
        category,
        createdAt: new Date().toISOString(),
      };
      setHabits((prev) => {
        const updated = [...prev, newHabit];
        const habitsKey = `habit_tracker_items_${currentUser.id}`;
        localStorage.setItem(habitsKey, JSON.stringify(updated));
        return updated;
      });
    }
    setIsModalOpen(false);
  };

  // Import selected study slots from Time Table preset list
  const handleImportTimeTables = (newTimeTables: Array<{ name: string; emoji: string; category: string }>) => {
    if (!currentUser) return;
    setHabits((prev) => {
      const generatedHabits: Habit[] = newTimeTables.map((item, idx) => ({
        id: `habit-timetable-${Date.now()}-${idx}`,
        name: item.name,
        emoji: item.emoji,
        category: item.category,
        createdAt: new Date().toISOString(),
      }));
      const updated = [...prev, ...generatedHabits];
      const habitsKey = `habit_tracker_items_${currentUser.id}`;
      localStorage.setItem(habitsKey, JSON.stringify(updated));
      return updated;
    });
    setAiSuccessMessage(`Successfully imported ${newTimeTables.length} study slots into your Daily Ledger!`);
  };

  // Delete habit
  const handleDeleteHabit = (habitId: string) => {
    if (!currentUser) return;
    if (window.confirm("Are you sure you want to delete this habit and all its logs?")) {
      setHabits((prev) => {
        const updated = prev.filter((h) => h.id !== habitId);
        const habitsKey = `habit_tracker_items_${currentUser.id}`;
        localStorage.setItem(habitsKey, JSON.stringify(updated));
        return updated;
      });
      // Clean up habit logs from all days
      setLogs((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((key) => {
          updated[key] = updated[key].filter((id) => id !== habitId);
          if (updated[key].length === 0) {
            delete updated[key];
          }
        });
        const logsKey = `habit_tracker_logs_${currentUser.id}`;
        localStorage.setItem(logsKey, JSON.stringify(updated));
        return updated;
      });
    }
  };

  // Move habit up/down in sequence
  const handleMoveHabit = (index: number, direction: "up" | "down") => {
    if (!currentUser) return;
    setHabits((prev) => {
      const updated = [...prev];
      if (direction === "up" && index > 0) {
        const temp = updated[index];
        updated[index] = updated[index - 1];
        updated[index - 1] = temp;
      } else if (direction === "down" && index < updated.length - 1) {
        const temp = updated[index];
        updated[index] = updated[index + 1];
        updated[index + 1] = temp;
      }
      const habitsKey = `habit_tracker_items_${currentUser.id}`;
      localStorage.setItem(habitsKey, JSON.stringify(updated));
      return updated;
    });
  };

  // Clear current month's checks only
  const handleClearMonthLogs = () => {
    if (!currentUser) return;
    if (
      window.confirm(
        `Are you sure you want to clear all logged habits for ${MONTH_NAMES[currentMonth]} ${currentYear}?`
      )
    ) {
      setLogs((prev) => {
        const updated = { ...prev };
        days.forEach((day) => {
          delete updated[day.dateKey];
        });
        const logsKey = `habit_tracker_logs_${currentUser.id}`;
        localStorage.setItem(logsKey, JSON.stringify(updated));
        return updated;
      });
    }
  };

  // Seed current month logs with mock data
  const handleSeedMonthLogs = () => {
    if (!currentUser) return;
    setLogs((prev) => {
      const updated = { ...prev };
      days.forEach((day) => {
        // Each day, complete some random habits (random 40% to 90% completion rate)
        const daySeedPercentage = 0.4 + Math.random() * 0.5;
        const checkedIds: string[] = [];
        habits.forEach((habit) => {
          if (Math.random() < daySeedPercentage) {
            checkedIds.push(habit.id);
          }
        });
        if (checkedIds.length > 0) {
          updated[day.dateKey] = checkedIds;
        } else {
          delete updated[day.dateKey];
        }
      });
      const logsKey = `habit_tracker_logs_${currentUser.id}`;
      localStorage.setItem(logsKey, JSON.stringify(updated));
      return updated;
    });
  };

  // Quick fill or clear for an individual entire day
  const handleQuickFillDay = (dateKey: string, action: "all" | "none") => {
    if (!currentUser) return;
    setLogs((prev) => {
      const updated = { ...prev };
      if (action === "all") {
        updated[dateKey] = habits.map((h) => h.id);
      } else {
        delete updated[dateKey];
      }
      const logsKey = `habit_tracker_logs_${currentUser.id}`;
      localStorage.setItem(logsKey, JSON.stringify(updated));
      return updated;
    });
  };

  // Sync state if habit is completed via Peer Quick Log
  const handleHabitCompletedExternally = (habitId: string) => {
    if (!currentUser) return;
    const logsKey = `habit_tracker_logs_${currentUser.id}`;
    const storedLogs = localStorage.getItem(logsKey);
    if (storedLogs) {
      try {
        setLogs(JSON.parse(storedLogs));
      } catch (e) {
        console.error("Error parsing logs", e);
      }
    }
  };

  // Export Month to CSV
  const handleExportCSV = () => {
    if (habits.length === 0) return;

    let csvContent = "data:text/csv;charset=utf-8,";
    // Header
    csvContent += "Date,Day,Habit,Emoji,Status\n";

    days.forEach((day) => {
      habits.forEach((habit) => {
        const isCompleted = logs[day.dateKey]?.includes(habit.id) ? "Completed" : "Pending";
        const row = `"${day.dateKey}","${day.dayOfWeekShort}","${habit.name.replace(/"/g, '""')}","${habit.emoji}","${isCompleted}"\n`;
        csvContent += row;
      });
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Habit_Tracker_${MONTH_NAMES[currentMonth]}_${currentYear}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!currentUser) {
    return (
      <div className="relative min-h-screen">
        <AuthScreen onLogin={setCurrentUser} />
        
        {/* Session Kicked Modal Overlay */}
        <AnimatePresence>
          {sessionKicked && (
            <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="max-w-md w-full bg-zinc-950 border-2 border-red-500 p-8 shadow-2xl relative"
              >
                {/* Visual Accent */}
                <div className="absolute top-0 left-0 w-full h-1 bg-red-500 animate-pulse"></div>
                
                <div className="text-center space-y-6 animate-fade-in">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-none bg-red-500/10 border border-red-500/30 text-red-500 text-3xl font-mono mb-2">
                    ⚠️
                  </div>
                  
                  <div className="space-y-2">
                    <h2 className="text-xl font-mono font-black text-red-500 uppercase tracking-wider">
                      Session Terminated
                    </h2>
                    <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                      Double-Device Login Detected
                    </p>
                  </div>
                  
                  <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                    This account was just logged in from another device or browser. To maintain record integrity and security, your previous session here has been automatically terminated.
                  </p>
                  
                  <div className="pt-4">
                    <button
                      onClick={() => setSessionKicked(false)}
                      className="w-full py-3 bg-red-500 hover:bg-red-600 text-black text-xs font-black uppercase tracking-widest transition-colors duration-200 cursor-pointer"
                    >
                      Acknowledge & Sign In
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f2f2f2] py-12 px-4 sm:px-6 lg:px-8 font-sans selection:bg-orange-500 selection:text-black">
      <div className="max-w-7xl mx-auto space-y-10">
        
        {/* --- INSTITUTIONAL / USER PROFILE BAR --- */}
        <div className="bg-zinc-950 border border-zinc-800 p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden">
          {/* Brutalist accents */}
          <div className="absolute top-0 right-0 w-16 h-[1px] bg-orange-500/20"></div>
          <div className="absolute top-0 right-0 w-[1px] h-16 bg-orange-500/20"></div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-12 h-12 bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-500 shrink-0">
              <School className="w-6 h-6 stroke-[2px]" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono font-bold text-orange-500 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 uppercase tracking-wider">
                  ACTIVE LEDGER ROOM
                </span>
                <span className="text-[9px] font-mono text-zinc-500">
                  ID: #{currentUser.id.slice(-6)}
                </span>
              </div>
              <h2 className="text-xl font-black text-white uppercase tracking-tight font-sans">
                {currentUser.name}
              </h2>
              {/* Interactive focus hobbies list & selector */}
              <div className="pt-1.5 space-y-1.5">
                <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 font-mono uppercase tracking-wider">
                  <span className="text-orange-500 font-black">Focus Hobbies & Subjects:</span>
                </div>
                <div className="flex flex-wrap gap-1.5 items-center">
                  {currentUser.hobbies ? (
                    currentUser.hobbies
                      .split(",")
                      .map(h => h.trim())
                      .filter(Boolean)
                      .map((hobby) => {
                        const isMock = hobby.includes("Mock Test");
                        return (
                          <span
                            key={hobby}
                            onClick={async (e) => {
                              e.stopPropagation();
                              const currentList = currentUser.hobbies
                                .split(",")
                                .map(h => h.trim())
                                .filter(Boolean);
                              const newList = currentList.filter(x => x !== hobby);
                              const joined = newList.join(", ");
                              
                              // Save locally
                              const updatedUser = { ...currentUser, hobbies: joined };
                              localStorage.setItem("ledger_current_user", JSON.stringify(updatedUser));
                              const cachedUsers = JSON.parse(localStorage.getItem("ledger_users") || "[]");
                              const updatedCached = cachedUsers.map((u: any) => u.id === currentUser.id ? updatedUser : u);
                              localStorage.setItem("ledger_users", JSON.stringify(updatedCached));
                              setCurrentUser(updatedUser);

                              // Save to server
                              try {
                                await fetch("/api/auth/update-hobbies", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ userId: currentUser.id, hobbies: joined })
                                });
                              } catch (err) {
                                console.error("Failed to sync removed hobby to server:", err);
                              }
                            }}
                            className={`inline-flex items-center gap-1.5 text-[10px] font-mono font-bold px-2 py-1.5 border transition-all cursor-pointer select-none ${
                              isMock
                                ? "bg-orange-500/10 text-orange-400 border-orange-500/30 hover:border-red-500/50 hover:bg-red-950/20 hover:text-red-400"
                                : "bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-red-500/50 hover:bg-red-950/20 hover:text-red-400"
                            }`}
                            title={`Click to remove "${hobby}"`}
                          >
                            <span>{hobby}</span>
                            <span
                              className="text-zinc-500 hover:text-red-500 font-bold transition-colors text-[10px]"
                            >
                              ×
                            </span>
                          </span>
                        );
                      })
                  ) : (
                    <span className="text-xs text-zinc-600 font-mono italic">No topics selected</span>
                  )}
                  <button
                    onClick={() => setIsHobbiesModalOpen(true)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-orange-500 hover:bg-orange-600 text-black border border-orange-500 text-[10px] font-mono font-bold uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    ＋ New Time Table
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 w-full md:w-auto justify-between md:justify-end border-t border-zinc-900 pt-4 md:pt-0 md:border-t-0">
            <div className="space-y-0.5 text-left md:text-right font-mono text-[11px] text-zinc-400">
              <div className="flex items-center gap-2 md:justify-end">
                <Mail className="w-3.5 h-3.5 text-zinc-500" />
                <span>{currentUser.email}</span>
              </div>
              {currentUser.mobile && (
                <div className="flex items-center gap-2 md:justify-end">
                  <Phone className="w-3.5 h-3.5 text-zinc-500" />
                  <span>+91 {currentUser.mobile}</span>
                </div>
              )}
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-red-950/20 border border-zinc-800 hover:border-red-500/30 text-zinc-400 hover:text-red-400 text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          </div>
        </div>

        {/* --- MAIN HEADER / HERO AREA (EDITORIAL DESIGN) --- */}
        <div className="text-center space-y-5">
          <div className="flex justify-center items-center gap-1.5 text-[10px] font-mono font-bold text-orange-500 uppercase tracking-[0.25em]">
            <Calendar className="w-3.5 h-3.5 text-orange-500" />
            <span>Monthly Accountability Ledger</span>
          </div>

          {/* Month Switcher & Visual Headline */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-3 border-y border-zinc-900">
            {/* Prev button */}
            <button
              onClick={handlePrevMonth}
              className="p-1.5 text-zinc-500 hover:text-orange-500 hover:bg-zinc-900 border border-transparent hover:border-zinc-800 rounded-none transition-all cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {/* Elegant Month Title exactly like user photo */}
            <div className="flex flex-col items-center">
              <h1 className="text-2xl sm:text-4xl md:text-5xl font-sans font-black text-white tracking-[0.12em] uppercase select-none leading-none">
                {MONTH_NAMES[currentMonth]}
              </h1>
              <div className="mt-2 flex items-center gap-3">
                {/* Year Dropdown */}
                <select
                  value={currentYear}
                  onChange={(e) => setCurrentYear(Number(e.target.value))}
                  className="bg-transparent border-0 font-mono text-[10px] font-bold text-zinc-400 hover:text-orange-500 cursor-pointer focus:outline-hidden text-center uppercase tracking-wider"
                >
                  {Array.from({ length: 11 }, (_, i) => 2020 + i).map((y) => (
                    <option key={y} value={y} className="bg-zinc-950 text-zinc-100 font-sans">
                      {y}
                    </option>
                  ))}
                </select>

                <span className="h-1 w-1 rounded-none bg-orange-500"></span>

                {/* Quick Month Jumper */}
                <select
                  value={currentMonth}
                  onChange={(e) => setCurrentMonth(Number(e.target.value))}
                  className="bg-transparent border-0 text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-orange-500 cursor-pointer focus:outline-hidden text-center"
                >
                  {MONTH_NAMES.map((name, idx) => (
                    <option key={name} value={idx} className="bg-zinc-950 text-zinc-100 font-sans">
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Next button */}
            <button
              onClick={handleNextMonth}
              className="p-1.5 text-zinc-500 hover:text-orange-500 hover:bg-zinc-900 border border-transparent hover:border-zinc-800 rounded-none transition-all cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* --- SYSTEMATIC WORKSPACE NAVIGATION TABS --- */}
        <div className="bg-zinc-950 border border-zinc-850 p-1.5 flex flex-col sm:flex-row gap-1.5 relative overflow-hidden">
          {/* Decorative left line */}
          <div className="absolute top-0 left-0 w-12 h-[2px] bg-orange-500"></div>
          
          <button
            onClick={() => setActiveWorkspaceTab("ledger")}
            className={`flex-1 py-3 text-xs font-mono font-black uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 border border-transparent cursor-pointer ${
              activeWorkspaceTab === "ledger"
                ? "bg-orange-500 text-black font-extrabold shadow-md"
                : "text-zinc-400 hover:text-white hover:bg-zinc-900 border-zinc-900 hover:border-zinc-800"
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>📊 Ledger Board</span>
          </button>
          
          <button
            onClick={() => setActiveWorkspaceTab("ai_studio")}
            className={`flex-1 py-3 text-xs font-mono font-black uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 border border-transparent cursor-pointer ${
              activeWorkspaceTab === "ai_studio"
                ? "bg-orange-500 text-black font-extrabold shadow-md"
                : "text-zinc-400 hover:text-white hover:bg-zinc-900 border-zinc-900 hover:border-zinc-800"
            }`}
          >
            <Sparkles className="w-4 h-4 animate-pulse" />
            <span>✨ AI Co-Processor</span>
          </button>

          <button
            onClick={() => setActiveWorkspaceTab("social")}
            className={`flex-1 py-3 text-xs font-mono font-black uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 border border-transparent cursor-pointer ${
              activeWorkspaceTab === "social"
                ? "bg-orange-500 text-black font-extrabold shadow-md"
                : "text-zinc-400 hover:text-white hover:bg-zinc-900 border-zinc-900 hover:border-zinc-800"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>👥 Peer Network</span>
          </button>
        </div>

        {/* --- AI SUCCESS TOAST NOTIFICATION --- */}
        <AnimatePresence>
          {aiSuccessMessage && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="p-4 bg-orange-500 text-black font-black uppercase text-xs tracking-wider flex items-center justify-between border-l-4 border-black shadow-lg"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 animate-bounce" />
                <span>{aiSuccessMessage}</span>
              </div>
              <button
                onClick={() => setAiSuccessMessage(null)}
                className="font-mono text-[10px] hover:underline cursor-pointer"
              >
                [DISMISS]
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* --- DYNAMIC WORKSPACE ROUTER VIEW --- */}
        <div className="space-y-10">
          <AnimatePresence mode="wait">
            {activeWorkspaceTab === "ledger" && (
              <motion.div
                key="ledger-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-10"
              >
                {/* --- STATS GRID PANEL --- */}
                <StatsGrid
                  completionRate={stats.completionRate}
                  perfectDaysCount={stats.perfectDaysCount}
                  totalCompletions={stats.totalCompletions}
                  longestStreak={stats.longestStreak}
                />

                {/* --- WORKSPACE ACTIONS BAR --- */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => setIsTimeTableModalOpen(true)}
                      className="flex items-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-black rounded-none text-xs font-black uppercase tracking-widest shadow-xl transition-all duration-300 hover:scale-[1.02] cursor-pointer"
                    >
                      <Plus className="w-4 h-4 stroke-[3px]" />
                      <span>Add New Time Table</span>
                    </button>

                    <button
                      onClick={handleExportCSV}
                      className="flex items-center gap-2 px-5 py-3 bg-zinc-950 border border-zinc-800 hover:border-orange-500 text-zinc-200 rounded-none text-xs font-black uppercase tracking-widest shadow-md transition-all duration-300 cursor-pointer"
                      title="Export tracking data of this month to CSV"
                    >
                      <Download className="w-4 h-4 text-orange-500" />
                      <span>Export CSV</span>
                    </button>

                    <button
                      onClick={() => setIsPrintModalOpen(true)}
                      className="flex items-center gap-2 px-5 py-3 bg-zinc-950 border border-zinc-800 hover:border-orange-500 text-zinc-200 rounded-none text-xs font-black uppercase tracking-widest shadow-md transition-all duration-300 cursor-pointer"
                      title="Print your Habits & Checklist or save as PDF"
                    >
                      <Printer className="w-4 h-4 text-orange-500" />
                      <span>Print / PDF</span>
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Seed mock data */}
                    <button
                      onClick={handleSeedMonthLogs}
                      className="flex items-center gap-1.5 px-3.5 py-2 text-[10px] font-mono font-bold text-zinc-500 hover:text-orange-500 hover:bg-zinc-900 border border-zinc-900 rounded-none transition-all cursor-pointer"
                      title="Populate this month with mock logs to see grid stats instantly"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Populate Logs</span>
                    </button>

                    {/* Clear logs */}
                    <button
                      onClick={handleClearMonthLogs}
                      className="flex items-center gap-1.5 px-3.5 py-2 text-[10px] font-mono font-bold text-zinc-500 hover:text-red-500 hover:bg-red-950/20 border border-transparent rounded-none transition-all cursor-pointer"
                      title="Reset all logged checkboxes for this month"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Wipe Month</span>
                    </button>
                  </div>
                </div>

                {/* --- HABIT CATEGORY TABS --- */}
                <div className="bg-zinc-950 border border-zinc-850 p-3 flex flex-wrap items-center gap-2 justify-between relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-16 h-[1px] bg-orange-500/40"></div>
                  
                  <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
                    <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase pr-2 select-none hidden sm:inline-block">
                      FILTER SHEETS:
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
                      {allTabs.map((tab) => {
                        const isActive = selectedCategoryTab === tab;
                        const count = tab === "All" 
                          ? habits.length 
                          : habits.filter(h => (h.category || "Routine") === tab).length;
                        
                        return (
                          <button
                            key={tab}
                            onClick={() => setSelectedCategoryTab(tab)}
                            className={`px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-wider transition-all duration-150 flex items-center gap-1.5 cursor-pointer border ${
                              isActive
                                ? "bg-orange-500 text-black border-orange-500 font-extrabold shadow-sm"
                                : "bg-zinc-900 text-zinc-400 hover:text-white border-zinc-800 hover:border-zinc-700"
                            }`}
                          >
                            <span>{tab}</span>
                            <span className={`text-[9px] font-sans px-1.5 py-0.2 select-none ${
                              isActive ? "bg-black/20 text-black font-black" : "bg-zinc-950 text-zinc-500 border border-zinc-850"
                            }`}>
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <p className="text-[10px] font-mono text-zinc-500 hidden md:block">
                    Showing <span className="text-orange-500 font-bold">{filteredHabits.length}</span> of {habits.length} habits
                  </p>
                </div>

                {/* --- CORE SPREADSHEET GRID COMPONENT --- */}
                <HabitGrid
                  habits={filteredHabits}
                  days={days}
                  logs={logs}
                  onToggleHabit={handleToggleHabit}
                  onEditHabit={handleOpenEditModal}
                  onDeleteHabit={handleDeleteHabit}
                  onMoveHabit={handleMoveHabit}
                  onQuickFillDay={handleQuickFillDay}
                />

                {/* --- STATS BREAKDOWN LISTS --- */}
                <HabitStatsList
                  habits={filteredHabits}
                  logs={logs}
                  currentYear={currentYear}
                  currentMonth={currentMonth}
                  daysInMonthCount={days.length}
                  onEditHabit={handleOpenEditModal}
                />
              </motion.div>
            )}

            {activeWorkspaceTab === "ai_studio" && (
              <motion.div
                key="ai-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {/* --- GOOGLE AI STUDIO PROMPT LINK ENGINE --- */}
                <AIPromptWidget
                  currentUser={currentUser}
                  onUpdateCurrentUser={setCurrentUser}
                  onAddHabits={handleAddMultipleHabits}
                  onNotifySuccess={handleNotifySuccess}
                />
              </motion.div>
            )}

            {activeWorkspaceTab === "social" && (
              <motion.div
                key="social-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {/* --- SOCIAL CO-WORKING FEED & CHAT ROOMS --- */}
                <SocialHub
                  currentUser={currentUser}
                  onUpdateCurrentUser={setCurrentUser}
                  currentYear={currentYear}
                  currentMonth={currentMonth}
                  onHabitCompletedExternally={handleHabitCompletedExternally}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* --- FOOTER EXPLANATION --- */}
        <div className="text-center text-xs text-zinc-600 font-mono border-t border-zinc-900 pt-8">
          <p className="flex items-center justify-center gap-2">
            <HelpCircle className="w-3.5 h-3.5 text-orange-500/50" />
            <span>Habit Tracker sheet inspired by traditional ledger formats. Data is stored safely in your browser.</span>
          </p>
        </div>

        {/* --- MODAL DIALOGS --- */}
        <AddEditHabitModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveHabit}
          habitToEdit={habitToEdit}
          existingCategories={existingCategories}
        />

        <PrintHabitsModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          currentUser={currentUser}
          habits={habits}
          days={days}
          logs={logs}
          currentMonth={currentMonth}
          currentYear={currentYear}
          stats={stats}
        />

        <HobbiesModal
          isOpen={isHobbiesModalOpen}
          onClose={() => setIsHobbiesModalOpen(false)}
          currentUser={currentUser}
          onUpdateCurrentUser={setCurrentUser}
        />

        <TimeTableModal
          isOpen={isTimeTableModalOpen}
          onClose={() => setIsTimeTableModalOpen(false)}
          onImport={handleImportTimeTables}
        />
      </div>
    </div>
  );
}

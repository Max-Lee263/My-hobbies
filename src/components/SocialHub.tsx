import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { User, ChatMessage, Habit, HabitLog } from "../types";
import { 
  Users, 
  UserPlus, 
  UserCheck, 
  UserX, 
  MessageSquare, 
  Send, 
  Flame, 
  TrendingUp, 
  CheckCircle2, 
  Sparkles, 
  Zap,
  Clock,
  ChevronRight,
  ShieldCheck,
  Search,
  Check
} from "lucide-react";
import { formatDateKey } from "../utils";

interface SocialHubProps {
  currentUser: User;
  onUpdateCurrentUser: (user: User) => void;
  currentYear: number;
  currentMonth: number;
  // Callback to force parent to trigger a state reload if a matching habit is completed
  onHabitCompletedExternally?: (habitId: string) => void;
}

export default function SocialHub({ 
  currentUser, 
  onUpdateCurrentUser,
  currentYear,
  currentMonth,
  onHabitCompletedExternally
}: SocialHubProps) {
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [chats, setChats] = useState<ChatMessage[]>([]);
  const [activeChatFriendId, setActiveChatFriendId] = useState<string | null>(null);
  const [newMessageText, setNewMessageText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSubTab, setActiveSubTab] = useState<"feed" | "friends" | "chat">("feed");
  const [selectedDiscoverIds, setSelectedDiscoverIds] = useState<string[]>([]);

  // Today's Date Key
  const todayDateKey = useMemo(() => {
    const today = new Date();
    return formatDateKey(today.getFullYear(), today.getMonth(), today.getDate());
  }, []);

  // Fetch all users and chats from server & localStorage
  const loadNetworkData = async () => {
    try {
      const response = await fetch("/api/auth/users");
      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.users)) {
          setAllUsers(data.users);
          localStorage.setItem("ledger_users", JSON.stringify(data.users));

          // Keep currentUser synchronized in case friend list was updated on server
          const freshSelf = data.users.find((u: any) => u.id === currentUser.id);
          if (freshSelf && JSON.stringify(freshSelf) !== JSON.stringify(currentUser)) {
            localStorage.setItem("ledger_current_user", JSON.stringify(freshSelf));
            onUpdateCurrentUser(freshSelf);
          }
        }
      }
    } catch (e) {
      console.error("Failed to load users from server, falling back to local:", e);
      const users: User[] = JSON.parse(localStorage.getItem("ledger_users") || "[]");
      setAllUsers(users);
    }

    const storedChats: ChatMessage[] = JSON.parse(localStorage.getItem("ledger_chats") || "[]");
    setChats(storedChats);
  };

  useEffect(() => {
    loadNetworkData();
    // Poll every 2 seconds to simulate high-fidelity multi-user updates
    const interval = setInterval(loadNetworkData, 2000);
    return () => clearInterval(interval);
  }, [currentUser.id]);

  // Handle Friend Request: Send
  const sendFriendRequest = async (targetUserId: string) => {
    try {
      await fetch("/api/auth/friend-request/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderId: currentUser.id, receiverId: targetUserId }),
      });
      loadNetworkData();
    } catch (e) {
      console.error("Failed to send friend request:", e);
    }
  };

  // Handle Multiple Friend Requests: Send
  const sendMultipleFriendRequests = async (targetUserIds: string[]) => {
    if (targetUserIds.length === 0) return;
    try {
      await fetch("/api/auth/friend-request/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderId: currentUser.id, receiverIds: targetUserIds }),
      });
      setSelectedDiscoverIds([]);
      loadNetworkData();
    } catch (e) {
      console.error("Failed to send multiple friend requests:", e);
    }
  };

  // Handle Friend Request: Accept
  const acceptFriendRequest = async (requesterId: string) => {
    try {
      await fetch("/api/auth/friend-request/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id, requesterId }),
      });
      loadNetworkData();
    } catch (e) {
      console.error("Failed to accept friend request:", e);
    }
  };

  // Handle Friend Request: Reject / Cancel
  const rejectFriendRequest = async (requesterId: string) => {
    try {
      await fetch("/api/auth/friend-request/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id, requesterId }),
      });
      loadNetworkData();
    } catch (e) {
      console.error("Failed to reject friend request:", e);
    }
  };

  // Send Chat message
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim() || !activeChatFriendId) return;

    const storedChats: ChatMessage[] = JSON.parse(localStorage.getItem("ledger_chats") || "[]");
    const newMessage: ChatMessage = {
      id: "chat-" + Date.now(),
      senderId: currentUser.id,
      receiverId: activeChatFriendId,
      text: newMessageText.trim(),
      timestamp: new Date().toISOString(),
    };

    const updatedChats = [...storedChats, newMessage];
    localStorage.setItem("ledger_chats", JSON.stringify(updatedChats));
    setChats(updatedChats);
    setNewMessageText("");
  };

  // Fetch accepted friends data
  const friends = useMemo(() => {
    const friendIds = currentUser.friendsList || [];
    return allUsers.filter(u => friendIds.includes(u.id));
  }, [allUsers, currentUser.friendsList]);

  // Fetch pending requests
  const pendingRequests = useMemo(() => {
    const recIds = currentUser.receivedRequests || [];
    return allUsers.filter(u => recIds.includes(u.id));
  }, [allUsers, currentUser.receivedRequests]);

  // Fetch other users (for discover section)
  const discoverUsers = useMemo(() => {
    const filtered = allUsers.filter(u => 
      u.id !== currentUser.id && 
      (searchQuery.trim() === "" || 
       u.name.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    // Sort online users first
    return [...filtered].sort((a, b) => {
      if (a.isOnline && !b.isOnline) return -1;
      if (!a.isOnline && b.isOnline) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [allUsers, currentUser.id, searchQuery]);

  // Load friends' active progress and identical habits comparison
  const friendComparisonData = useMemo(() => {
    const currentUsersHabits: Habit[] = JSON.parse(localStorage.getItem(`habit_tracker_items_${currentUser.id}`) || "[]");
    const currentUserTodayLogs: string[] = (JSON.parse(localStorage.getItem(`habit_tracker_logs_${currentUser.id}`) || "{}"))[todayDateKey] || [];

    return friends.map(friend => {
      const friendHabits: Habit[] = JSON.parse(localStorage.getItem(`habit_tracker_items_${friend.id}`) || "[]");
      const friendLogs: HabitLog = JSON.parse(localStorage.getItem(`habit_tracker_logs_${friend.id}`) || "{}");
      const friendTodayLogs = friendLogs[todayDateKey] || [];

      // Get all friend targets for today only
      const allTodayTargets = friendHabits.map(fh => ({
        id: fh.id,
        name: fh.name,
        emoji: fh.emoji,
        category: fh.category,
        completed: friendTodayLogs.includes(fh.id),
      }));

      // Find overlap/matching habits to compare
      const matchingComparisons = friendHabits.map(fh => {
        // Find if our current user has a similar habit name
        const myMatchingHabit = currentUsersHabits.find(h => 
          h.name.toLowerCase().trim() === fh.name.toLowerCase().trim()
        );

        if (myMatchingHabit) {
          const friendCompleted = friendTodayLogs.includes(fh.id);
          const iCompleted = currentUserTodayLogs.includes(myMatchingHabit.id);

          return {
            habitName: fh.name,
            emoji: fh.emoji,
            friendCompleted,
            iCompleted,
            myHabitId: myMatchingHabit.id,
          };
        }
        return null;
      }).filter(Boolean);

      // Compute general completion rate for friend today
      const totalFriendHabits = friendHabits.length;
      const completedFriendHabits = friendTodayLogs.length;
      const percentage = totalFriendHabits > 0 ? Math.round((completedFriendHabits / totalFriendHabits) * 100) : 0;

      return {
        friend,
        totalHabits: totalFriendHabits,
        completedHabits: completedFriendHabits,
        percentage,
        comparisons: matchingComparisons,
        allTodayTargets
      };
    });
  }, [friends, todayDateKey, currentUser.id]);

  // Filter messages for active chat
  const activeChatMessages = useMemo(() => {
    if (!activeChatFriendId) return [];
    return chats.filter(msg => 
      (msg.senderId === currentUser.id && msg.receiverId === activeChatFriendId) ||
      (msg.senderId === activeChatFriendId && msg.receiverId === currentUser.id)
    );
  }, [chats, currentUser.id, activeChatFriendId]);

  const activeChatFriend = useMemo(() => {
    return friends.find(f => f.id === activeChatFriendId);
  }, [friends, activeChatFriendId]);

  // Quick Action to log current user's matching habit
  const quickLogMyHabit = (myHabitId: string) => {
    const habitsKey = `habit_tracker_items_${currentUser.id}`;
    const logsKey = `habit_tracker_logs_${currentUser.id}`;
    
    const currentLogs = JSON.parse(localStorage.getItem(logsKey) || "{}");
    const todayList: string[] = currentLogs[todayDateKey] || [];

    if (!todayList.includes(myHabitId)) {
      currentLogs[todayDateKey] = [...todayList, myHabitId];
      localStorage.setItem(logsKey, JSON.stringify(currentLogs));
      
      // Call parent reload callback if defined
      if (onHabitCompletedExternally) {
        onHabitCompletedExternally(myHabitId);
      }
      loadNetworkData();
    }
  };

  return (
    <div className="bg-zinc-950 border border-zinc-800 p-6 relative overflow-hidden">
      {/* Brutalist accents */}
      <div className="absolute top-0 right-0 w-16 h-[1px] bg-orange-500/20"></div>
      <div className="absolute top-0 right-0 w-[1px] h-16 bg-orange-500/20"></div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-zinc-900">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1 bg-orange-500/10 border border-orange-500/20 text-orange-500 rounded-none shrink-0">
              <Users className="w-4 h-4" />
            </span>
            <span className="text-[10px] font-mono font-bold text-orange-500 uppercase tracking-widest">
              PEER-TO-PEER CO-WORKING ROOMS
            </span>
          </div>
          <h2 className="text-xl font-black text-white uppercase tracking-tight font-sans">
            Friend Accountability Network
          </h2>
        </div>

        {/* Action Tabs */}
        <div className="flex bg-zinc-900 border border-zinc-850 p-1">
          <button
            onClick={() => setActiveSubTab("feed")}
            className={`px-3 py-1.5 text-xs font-mono font-bold uppercase transition-all duration-150 flex items-center gap-1.5 ${
              activeSubTab === "feed" 
                ? "bg-orange-500 text-black font-extrabold" 
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            Live Comparison
          </button>
          
          <button
            onClick={() => setActiveSubTab("friends")}
            className={`px-3 py-1.5 text-xs font-mono font-bold uppercase transition-all duration-150 flex items-center gap-1.5 relative ${
              activeSubTab === "friends" 
                ? "bg-orange-500 text-black font-extrabold" 
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            Friends ({friends.length})
            {pendingRequests.length > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-orange-500 rounded-full ring-2 ring-zinc-950 animate-ping"></span>
            )}
          </button>

          <button
            onClick={() => setActiveSubTab("chat")}
            className={`px-3 py-1.5 text-xs font-mono font-bold uppercase transition-all duration-150 flex items-center gap-1.5 ${
              activeSubTab === "chat" 
                ? "bg-orange-500 text-black font-extrabold" 
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Chat Room
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* TAB 1: LIVE FEED & MATCHING HABITS COMPARISON */}
        {activeSubTab === "feed" && (
          <motion.div
            key="feed"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {friends.length === 0 ? (
              <div className="p-8 text-center bg-zinc-900/40 border border-dashed border-zinc-850">
                <Users className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-zinc-300 uppercase">No connected friends yet</h3>
                <p className="text-xs text-zinc-500 font-mono mt-1 max-w-sm mx-auto">
                  Go to the "Friends" tab to send a friend request to Delhi Public School, Green Valley, or other accounts!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Peer comparison stats list */}
                <div className="space-y-4">
                  <h3 className="text-xs font-mono font-black text-orange-400 uppercase tracking-wider">
                    ⚡ TODAY'S PROGRESS SCOREBOARD
                  </h3>
                  
                  <div className="space-y-3">
                    {friendComparisonData.map(({ friend, totalHabits, completedHabits, percentage, allTodayTargets }) => (
                      <div key={friend.id} className="p-4 bg-zinc-900/60 border border-zinc-850/80 hover:border-zinc-800 transition-colors">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div>
                            <h4 className="text-sm font-black text-zinc-200 uppercase tracking-tight">{friend.name}</h4>
                            <p className="text-[10px] font-mono text-zinc-400 mt-0.5">Focus Hobbies: <span className="text-orange-400 font-bold">{friend.hobbies || "Not specified"}</span></p>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-mono font-bold text-orange-500">{percentage}% DONE</span>
                            <p className="text-[9px] font-mono text-zinc-500 mt-0.5">{completedHabits}/{totalHabits} completed</p>
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div className="w-full bg-zinc-950 h-1 border border-zinc-850">
                          <div 
                            className="bg-orange-500 h-full transition-all duration-300"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>

                        {/* Present Day's Habits & Checkboxes List */}
                        <div className="bg-zinc-950 border border-zinc-900/80 p-2.5 mt-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest">
                              📅 Present Day Targets
                            </span>
                            <span className="text-[8px] font-mono font-bold bg-orange-500/10 text-orange-400 px-1.5 py-0.2 border border-orange-500/15 uppercase">
                              Today Only
                            </span>
                          </div>
                          
                          {allTodayTargets.length === 0 ? (
                            <p className="text-[9px] font-mono text-zinc-600 italic">No habits configured for this friend yet.</p>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                              {allTodayTargets.map((target, tIdx) => (
                                <div key={target.id || tIdx} className="flex items-center justify-between p-1.5 bg-zinc-900/40 border border-zinc-900 text-[10px]">
                                  <div className="flex items-center gap-1.5 truncate text-zinc-300">
                                    <span>{target.emoji}</span>
                                    <span className="truncate">{target.name}</span>
                                  </div>
                                  {target.completed ? (
                                    <span className="text-emerald-500 font-bold bg-emerald-950/20 px-1 border border-emerald-900/20 text-[8px] tracking-wide shrink-0">
                                      ✓ DONE
                                    </span>
                                  ) : (
                                    <span className="text-zinc-600 font-mono bg-zinc-900/50 px-1 border border-zinc-850 text-[8px] tracking-wide shrink-0">
                                      PENDING
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Direct shared habits accountability */}
                <div className="space-y-4">
                  <h3 className="text-xs font-mono font-black text-orange-400 uppercase tracking-wider">
                    🔥 SHARED HOBBIES & MATCHING TARGETS
                  </h3>

                  <div className="space-y-3">
                    {friendComparisonData.every(fd => fd.comparisons.length === 0) ? (
                      <div className="p-6 text-center bg-zinc-900/20 border border-zinc-850 text-zinc-500">
                        <Flame className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                        <p className="text-xs font-mono">No matching habit names found with friends.</p>
                        <p className="text-[10px] text-zinc-600 mt-1">
                          Create habits with identical names (e.g., "Workout" or "Skill Learning") to enable direct comparison tracking!
                        </p>
                      </div>
                    ) : (
                      friendComparisonData.map(fd => (
                        fd.comparisons.map((comp, idx) => {
                          if (!comp) return null;
                          return (
                            <div 
                              key={`${fd.friend.id}-${idx}`}
                              className="p-3 bg-zinc-900/80 border border-zinc-850 flex items-center justify-between gap-3 group"
                            >
                              <div className="flex items-center gap-2.5 truncate">
                                <span className="text-lg">{comp.emoji}</span>
                                <div className="truncate">
                                  <h4 className="text-xs font-bold text-zinc-200 uppercase truncate">
                                    {comp.habitName}
                                  </h4>
                                  <p className="text-[9px] font-mono text-zinc-500 truncate">
                                    With <span className="text-orange-400">{fd.friend.name}</span>
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-3 shrink-0">
                                {/* Friend Status */}
                                <div className="flex flex-col items-center">
                                  <span className="text-[8px] font-mono text-zinc-500 uppercase">Friend</span>
                                  {comp.friendCompleted ? (
                                    <span className="text-emerald-500 text-[10px] font-bold flex items-center gap-1 bg-emerald-950/20 px-1.5 py-0.5 border border-emerald-900/30">
                                      <Check className="w-3 h-3" /> DONE
                                    </span>
                                  ) : (
                                    <span className="text-zinc-500 text-[10px] font-bold flex items-center gap-1 bg-zinc-950 px-1.5 py-0.5 border border-zinc-850">
                                      PENDING
                                    </span>
                                  )}
                                </div>

                                {/* Divider */}
                                <span className="text-zinc-800">|</span>

                                {/* Mine Status */}
                                <div className="flex flex-col items-center">
                                  <span className="text-[8px] font-mono text-zinc-500 uppercase">Mine</span>
                                  {comp.iCompleted ? (
                                    <span className="text-emerald-500 text-[10px] font-bold flex items-center gap-1 bg-emerald-950/20 px-1.5 py-0.5 border border-emerald-900/30">
                                      <Check className="w-3 h-3" /> DONE
                                    </span>
                                  ) : (
                                    <button
                                      onClick={() => quickLogMyHabit(comp.myHabitId)}
                                      className="text-orange-500 text-[10px] font-bold flex items-center gap-1 bg-orange-500/10 hover:bg-orange-500 hover:text-black transition-all duration-150 px-1.5 py-0.5 border border-orange-500/20 hover:border-orange-500 cursor-pointer"
                                      title="Click to check off matching habit now!"
                                    >
                                      LOG NOW
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ))
                    )}
                  </div>
                </div>

              </div>
            )}
          </motion.div>
        )}

        {/* TAB 2: FRIENDS & DISCOVER */}
        {activeSubTab === "friends" && (
          <motion.div
            key="friends"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Friend Requests alerts */}
            {pendingRequests.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-mono font-black text-orange-400 uppercase tracking-wider flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-orange-500" />
                  <span>Incoming Friend Invitations</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {pendingRequests.map(reqUser => (
                    <div key={reqUser.id} className="p-3 bg-orange-500/5 border border-orange-500/20 flex items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-white uppercase">{reqUser.name}</span>
                          {reqUser.isOnline && (
                            <span className="flex h-1.5 w-1.5 relative">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                            </span>
                          )}
                        </div>
                        <p className="text-[9px] font-mono text-zinc-500">{reqUser.isOnline ? "Active Now" : "Offline"}</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => acceptFriendRequest(reqUser.id)}
                          className="p-1.5 bg-orange-500 hover:bg-orange-600 text-black cursor-pointer transition-colors"
                          title="Accept Request"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3px]" />
                        </button>
                        <button
                          onClick={() => rejectFriendRequest(reqUser.id)}
                          className="p-1.5 bg-zinc-900 hover:bg-red-950 border border-zinc-800 hover:border-red-900/40 text-zinc-400 hover:text-red-400 cursor-pointer transition-colors"
                          title="Decline Request"
                        >
                          <UserX className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Friends list */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Connected list */}
              <div className="space-y-4">
                <h3 className="text-xs font-mono font-black text-zinc-400 uppercase tracking-wider">
                  🤝 CONNECTED FRIENDS ({friends.length})
                </h3>

                {friends.length === 0 ? (
                  <p className="text-xs font-mono text-zinc-500 bg-zinc-900/20 p-4 border border-dashed border-zinc-850">
                    No connected friends yet. Add accounts from the Discover panel.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {friends.map(friend => (
                      <div key={friend.id} className="p-3.5 bg-zinc-900/40 border border-zinc-850 flex items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-sm font-black text-zinc-200 uppercase tracking-tight">{friend.name}</h4>
                            {friend.isOnline && (
                              <span className="flex h-1.5 w-1.5 relative animate-pulse shrink-0">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                              </span>
                            )}
                          </div>
                          <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider block mt-0.5">{friend.isOnline ? "Active Now" : "Offline"}</span>
                        </div>
                        
                        <button
                          onClick={() => {
                            setActiveChatFriendId(friend.id);
                            setActiveSubTab("chat");
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-orange-500/10 border border-zinc-800 hover:border-orange-500/30 text-zinc-400 hover:text-orange-500 text-xs font-mono font-bold uppercase tracking-wider transition-colors cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          Chat
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Discover Users list */}
              <div className="space-y-4">
                <h3 className="text-xs font-mono font-black text-zinc-400 uppercase tracking-wider">
                  🔍 ALL REGISTERED USERS & LOGINS
                </h3>

                {/* Search query box */}
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-600" />
                  <input
                    type="text"
                    placeholder="Search by username..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-zinc-900 border border-zinc-850 text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-orange-500 text-zinc-200 placeholder-zinc-600"
                  />
                </div>

                {discoverUsers.length === 0 ? (
                  <p className="text-xs font-mono text-zinc-600 p-4 bg-zinc-900/10 border border-zinc-900 text-center">
                    No other users registered or active on the platform.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {/* Bulk Actions Header */}
                    {(() => {
                      const selectableUsers = discoverUsers.filter(u => {
                        const isFriend = (currentUser.friendsList || []).includes(u.id);
                        const isSent = (currentUser.sentRequests || []).includes(u.id);
                        const isReceived = (currentUser.receivedRequests || []).includes(u.id);
                        return !isFriend && !isSent && !isReceived;
                      });

                      return (
                        <>
                          {selectableUsers.length > 0 && (
                            <div className="flex items-center justify-between p-2.5 bg-zinc-900/60 border border-zinc-850 text-xs">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    const selectableIds = selectableUsers.map(u => u.id);
                                    if (selectedDiscoverIds.length === selectableIds.length) {
                                      setSelectedDiscoverIds([]);
                                    } else {
                                      setSelectedDiscoverIds(selectableIds);
                                    }
                                  }}
                                  className="px-2 py-1 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-750 text-[10px] font-mono font-bold text-zinc-400 hover:text-zinc-200 uppercase transition-colors cursor-pointer"
                                >
                                  {selectedDiscoverIds.length === selectableUsers.length
                                    ? "Deselect All"
                                    : "Select All"}
                                </button>
                              </div>

                              <button
                                onClick={() => sendMultipleFriendRequests(selectedDiscoverIds)}
                                disabled={selectedDiscoverIds.length === 0}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono font-black uppercase tracking-wider transition-all cursor-pointer ${
                                  selectedDiscoverIds.length > 0
                                    ? "bg-orange-500 hover:bg-orange-600 text-black shadow-lg shadow-orange-500/15"
                                    : "bg-zinc-900 border border-zinc-850 text-zinc-600 cursor-not-allowed"
                                }`}
                              >
                                <UserPlus className="w-3.5 h-3.5" />
                                Add Selected ({selectedDiscoverIds.length})
                              </button>
                            </div>
                          )}

                          <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                            {discoverUsers.map(u => {
                              const isFriend = (currentUser.friendsList || []).includes(u.id);
                              const isSent = (currentUser.sentRequests || []).includes(u.id);
                              const isReceived = (currentUser.receivedRequests || []).includes(u.id);
                              const isSelected = selectedDiscoverIds.includes(u.id);
                              const canSelect = !isFriend && !isSent && !isReceived;

                              return (
                                <div 
                                  key={u.id} 
                                  onClick={() => {
                                    if (!canSelect) {
                                      if (isFriend) {
                                        // Open chat with friend on click!
                                        setActiveChatFriendId(u.id);
                                        setActiveSubTab("chat");
                                      }
                                      return;
                                    }
                                    if (isSelected) {
                                      setSelectedDiscoverIds(prev => prev.filter(id => id !== u.id));
                                    } else {
                                      setSelectedDiscoverIds(prev => [...prev, u.id]);
                                    }
                                  }}
                                  className={`p-3 border transition-all flex items-center justify-between gap-4 ${
                                    canSelect ? "cursor-pointer" : "cursor-default"
                                  } ${
                                    isSelected 
                                      ? "bg-orange-500/5 border-orange-500/40 shadow-inner" 
                                      : isFriend
                                        ? "bg-zinc-900/10 border-zinc-900 hover:bg-zinc-900/20 cursor-pointer"
                                        : "bg-zinc-900/40 border-zinc-850/80 hover:border-zinc-800"
                                  }`}
                                  title={isFriend ? "Click to open direct chat with friend" : undefined}
                                >
                                  <div className="flex items-center gap-2.5 truncate pr-1">
                                    {canSelect && (
                                      <div className={`w-4 h-4 border flex items-center justify-center shrink-0 transition-all ${
                                        isSelected 
                                          ? "bg-orange-500 border-orange-500 text-black" 
                                          : "border-zinc-700 bg-zinc-950 hover:border-zinc-600"
                                      }`}>
                                        {isSelected && <Check className="w-3 h-3 stroke-[3.5]" />}
                                      </div>
                                    )}
                                    
                                    <div className="truncate">
                                      <div className="flex items-center gap-1.5">
                                        <h4 className="text-xs font-black text-zinc-200 uppercase tracking-tight truncate">{u.name}</h4>
                                        {u.isOnline && (
                                          <span className="flex h-1.5 w-1.5 relative shrink-0">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider block mt-0.5">
                                        {u.isOnline ? "Active Now" : "Offline"}
                                      </p>
                                    </div>
                                  </div>

                                  {isFriend ? (
                                    <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/20 border border-emerald-900/20 px-2.5 py-1 select-none font-bold uppercase tracking-wider">
                                      ✓ Friends
                                    </span>
                                  ) : isSent ? (
                                    <span className="text-[9px] font-mono text-zinc-500 bg-zinc-950 border border-zinc-900 px-2 py-1 select-none uppercase tracking-wider">
                                      Sent Pending
                                    </span>
                                  ) : isReceived ? (
                                    <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                                      <button
                                        onClick={() => acceptFriendRequest(u.id)}
                                        className="px-2 py-1 bg-orange-500 hover:bg-orange-600 text-black text-[9px] font-mono font-black uppercase tracking-wider transition-colors cursor-pointer"
                                      >
                                        Accept
                                      </button>
                                      <button
                                        onClick={() => rejectFriendRequest(u.id)}
                                        className="px-2 py-1 bg-zinc-950 hover:bg-red-950 border border-zinc-800 text-zinc-500 hover:text-red-400 text-[9px] font-mono font-bold uppercase tracking-wider transition-colors cursor-pointer"
                                      >
                                        Decline
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        sendFriendRequest(u.id);
                                      }}
                                      className="flex items-center gap-1 px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 text-[9px] font-mono font-bold uppercase tracking-wider transition-colors cursor-pointer shrink-0"
                                    >
                                      <UserPlus className="w-3 h-3" /> Add Friend
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>

            </div>
          </motion.div>
        )}

        {/* TAB 3: CHAT ROOMS */}
        {activeSubTab === "chat" && (
          <motion.div
            key="chat"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[400px]"
          >
            {/* Friends Sidebar column */}
            <div className="bg-zinc-900/60 border border-zinc-850 p-3 overflow-y-auto space-y-2">
              <span className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-wider block mb-2 select-none">
                Select Active Workspace
              </span>

              {friends.length === 0 ? (
                <p className="text-xs font-mono text-zinc-600 p-2 text-center">No connected friends.</p>
              ) : (
                friends.map(friend => {
                  const isActive = activeChatFriendId === friend.id;
                  
                  // Count unread or last message
                  const friendMessages = chats.filter(msg => 
                    (msg.senderId === friend.id && msg.receiverId === currentUser.id)
                  );
                  const lastMessage = friendMessages[friendMessages.length - 1];

                  return (
                    <button
                      key={friend.id}
                      onClick={() => setActiveChatFriendId(friend.id)}
                      className={`w-full p-2.5 text-left flex flex-col gap-1 transition-all border cursor-pointer ${
                        isActive 
                          ? "bg-orange-500 text-black border-orange-500 font-extrabold" 
                          : "bg-zinc-950 text-zinc-400 border-zinc-850 hover:border-zinc-800"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className={`text-xs uppercase truncate font-bold ${isActive ? "text-black" : "text-zinc-200"}`}>
                          {friend.name}
                        </span>
                        <ChevronRight className="w-3 h-3 text-zinc-600 shrink-0" />
                      </div>
                      {lastMessage && (
                        <p className={`text-[10px] font-mono truncate w-full ${isActive ? "text-black/85" : "text-zinc-500"}`}>
                          {lastMessage.text}
                        </p>
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {/* Chat Box Panel Column */}
            <div className="md:col-span-2 bg-zinc-950 border border-zinc-850 flex flex-col justify-between h-[400px]">
              {activeChatFriend ? (
                <>
                  {/* Chat header */}
                  <div className="p-3 bg-zinc-900 border-b border-zinc-850 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black text-white uppercase">{activeChatFriend.name}</h4>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${activeChatFriend.isOnline ? "bg-emerald-500 animate-pulse" : "bg-zinc-600"}`}></span>
                        <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">
                          {activeChatFriend.isOnline ? "Active Now" : "Offline"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-[9px] font-mono font-bold text-orange-500 bg-orange-500/10 px-2 py-0.5 border border-orange-500/20">
                      <ShieldCheck className="w-3 h-3" /> SECURE LINK
                    </div>
                  </div>

                  {/* Message logs */}
                  <div className="flex-1 p-4 overflow-y-auto space-y-3 flex flex-col">
                    {activeChatMessages.length === 0 ? (
                      <div className="my-auto text-center space-y-2">
                        <MessageSquare className="w-8 h-8 text-zinc-700 mx-auto animate-pulse" />
                        <h5 className="text-xs font-bold text-zinc-500 uppercase">Start the conversation</h5>
                        <p className="text-[10px] font-mono text-zinc-600 max-w-xs mx-auto">
                          Send motivation, streak updates, or cheers to keep your teammate active!
                        </p>
                      </div>
                    ) : (
                      activeChatMessages.map(msg => {
                        const isMe = msg.senderId === currentUser.id;
                        
                        return (
                          <div 
                            key={msg.id}
                            className={`flex flex-col max-w-[80%] ${isMe ? "self-end items-end" : "self-start items-start"}`}
                          >
                            <div className={`px-3.5 py-2.5 text-xs font-sans rounded-none border ${
                              isMe 
                                ? "bg-orange-500 text-black border-orange-500 font-semibold" 
                                : "bg-zinc-900 text-zinc-200 border-zinc-800"
                            }`}>
                              {msg.text}
                            </div>
                            <span className="text-[8px] font-mono text-zinc-600 mt-1 uppercase">
                              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Chat Input form */}
                  <form onSubmit={handleSendMessage} className="p-3 border-t border-zinc-850 bg-zinc-900/40 flex gap-2">
                    <input
                      type="text"
                      placeholder={`Send message to ${activeChatFriend.name.split(" ")[0]}...`}
                      value={newMessageText}
                      onChange={(e) => setNewMessageText(e.target.value)}
                      className="flex-1 bg-zinc-950 border border-zinc-850 text-xs px-3 py-2 text-zinc-100 placeholder-zinc-600 focus:outline-hidden focus:ring-1 focus:ring-orange-500 rounded-none font-sans"
                      maxLength={150}
                    />
                    <button
                      type="submit"
                      disabled={!newMessageText.trim()}
                      className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-black font-black text-xs uppercase tracking-wider rounded-none flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Send</span>
                    </button>
                  </form>
                </>
              ) : (
                <div className="m-auto text-center p-6 space-y-3">
                  <MessageSquare className="w-12 h-12 text-zinc-800 mx-auto" />
                  <h4 className="text-sm font-black text-zinc-400 uppercase">No Chat Session Active</h4>
                  <p className="text-xs text-zinc-600 font-mono max-w-xs mx-auto">
                    Select a connected friend from the list on the left to start exchanging motivation and messages.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

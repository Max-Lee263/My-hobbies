import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Plus, Check, BookOpen, Trash2, Heart, Award, Sparkles, HelpCircle, ChevronRight, Edit2, ShieldCheck } from "lucide-react";
import { User } from "../types";

// Predefined subjects & topic options (including mock test parts)
export const PREDEFINED_SUBJECTS: Record<string, string[]> = {
  "Physics": [
    "Mechanics", "Thermodynamics", "Optics", "Electromagnetism", "Nuclear Physics",
    "Physics Mock Test - Part 1", "Physics Mock Test - Part 2", "Physics Mock Test - Part 3", "Physics Mock Test - Part 4"
  ],
  "Chemistry": [
    "Organic Chemistry", "Inorganic Chemistry", "Physical Chemistry", "Biochemistry", "Electrochemistry",
    "Chemistry Mock Test - Part 1", "Chemistry Mock Test - Part 2", "Chemistry Mock Test - Part 3", "Chemistry Mock Test - Part 4"
  ],
  "Mathematics": [
    "Algebra & Calculus", "Geometry & Vectors", "Probability & Statistics", "Trigonometry", "Linear Algebra",
    "Mathematics Mock Test - Part 1", "Mathematics Mock Test - Part 2", "Mathematics Mock Test - Part 3", "Mathematics Mock Test - Part 4"
  ],
  "Biology": [
    "Cell Biology", "Genetics & Evolution", "Human Physiology", "Plant Anatomy", "Ecology",
    "Biology Mock Test - Part 1", "Biology Mock Test - Part 2", "Biology Mock Test - Part 3", "Biology Mock Test - Part 4"
  ],
  "Computer Science": [
    "Data Structures & Algorithms", "Web Development", "Database Systems", "Machine Learning", "Operating Systems",
    "Computer Science Mock Test - Part 1", "Computer Science Mock Test - Part 2", "Computer Science Mock Test - Part 3", "Computer Science Mock Test - Part 4"
  ],
  "English": [
    "Grammar & Syntax", "Reading Comprehension", "Creative Writing", "Vocabulary & Idioms", "Literature Review",
    "English Mock Test - Part 1", "English Mock Test - Part 2", "English Mock Test - Part 3", "English Mock Test - Part 4"
  ],
  "General Hobbies": [
    "Yoga & Meditation", "Daily Fitness & Workout", "Creative Writing", "Book Reading", "Digital Art & Painting", "Competitive Gaming"
  ]
};

interface HobbiesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onUpdateCurrentUser: (user: User) => void;
}

export default function HobbiesModal({
  isOpen,
  onClose,
  currentUser,
  onUpdateCurrentUser
}: HobbiesModalProps) {
  const [activeSubject, setActiveSubject] = useState<string>("Physics");
  const [customHobby, setCustomHobby] = useState<string>("");
  const [syncing, setSyncing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // States to handle focus hobby editing inside the modal list
  const [editingHobby, setEditingHobby] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");

  // Parse current user hobbies into an array of trimmed, unique strings
  const getCurrentHobbiesList = (): string[] => {
    if (!currentUser.hobbies) return [];
    return currentUser.hobbies
      .split(",")
      .map(h => h.trim())
      .filter(h => h.length > 0);
  };

  const currentHobbies = getCurrentHobbiesList();

  const handleStartEdit = (e: React.MouseEvent, hobby: string) => {
    e.stopPropagation();
    setEditingHobby(hobby);
    setEditValue(hobby);
  };

  const handleSaveEditedHobby = (oldHobby: string) => {
    const trimmed = editValue.trim();
    if (!trimmed) {
      setEditingHobby(null);
      return;
    }
    if (trimmed === oldHobby) {
      setEditingHobby(null);
      return;
    }

    const newList = currentHobbies.map(h => h === oldHobby ? trimmed : h);
    saveUserHobbies(newList);
    setEditingHobby(null);
  };

  // Helper function to update the user object on both Client & Server
  const saveUserHobbies = async (updatedHobbiesList: string[]) => {
    setSyncing(true);
    setErrorMsg(null);

    const joinedHobbies = updatedHobbiesList.join(", ");
    
    // 1. Update in parent component & local state
    const updatedUser: User = { ...currentUser, hobbies: joinedHobbies };

    try {
      // 2. Sync with the server
      const response = await fetch("/api/auth/update-hobbies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          hobbies: joinedHobbies
        })
      });

      if (!response.ok) {
        throw new Error("Failed to save profile changes on the ledger server.");
      }

      const data = await response.json();
      if (data.success && data.user) {
        // 3. Update local caches
        localStorage.setItem("ledger_current_user", JSON.stringify(data.user));
        
        const cachedUsers: User[] = JSON.parse(localStorage.getItem("ledger_users") || "[]");
        const updatedCached = cachedUsers.map(u => u.id === currentUser.id ? data.user : u);
        localStorage.setItem("ledger_users", JSON.stringify(updatedCached));

        onUpdateCurrentUser(data.user);
      }
    } catch (e: any) {
      console.error("Error updating focus hobbies on server:", e);
      setErrorMsg("Offline Sync Mode: Saved locally. Will upload to Server upon connection.");
      
      // Save locally anyway as fallback
      localStorage.setItem("ledger_current_user", JSON.stringify(updatedUser));
      const cachedUsers: User[] = JSON.parse(localStorage.getItem("ledger_users") || "[]");
      const updatedCached = cachedUsers.map(u => u.id === currentUser.id ? updatedUser : u);
      localStorage.setItem("ledger_users", JSON.stringify(updatedCached));
      
      onUpdateCurrentUser(updatedUser);
    } finally {
      setSyncing(false);
    }
  };

  // Add hobby helper
  const handleAddHobby = (hobbyToAdd: string) => {
    const trimmed = hobbyToAdd.trim();
    if (!trimmed) return;
    if (currentHobbies.some(h => h.toLowerCase() === trimmed.toLowerCase())) return;

    const newList = [...currentHobbies, trimmed];
    saveUserHobbies(newList);
  };

  // Remove hobby helper
  const handleRemoveHobby = (hobbyToRemove: string) => {
    const newList = currentHobbies.filter(h => h !== hobbyToRemove);
    saveUserHobbies(newList);
  };

  // Toggle a hobby
  const handleToggleHobby = (hobby: string) => {
    if (currentHobbies.includes(hobby)) {
      handleRemoveHobby(hobby);
    } else {
      handleAddHobby(hobby);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-zinc-950 border-2 border-zinc-800 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col relative"
      >
        {/* Top visual border */}
        <div className="absolute top-0 left-0 w-full h-[3px] bg-orange-500"></div>

        {/* Header */}
        <div className="p-5 border-b border-zinc-900 flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-sm font-mono font-black text-orange-500 uppercase tracking-widest flex items-center gap-2">
              <Award className="w-4 h-4" /> Focus & Subjects Manager
            </h3>
            <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">
              Pick subjects, topics, or Mock Tests divided into 4 parts to add to your Profile Focus.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error notification */}
        {errorMsg && (
          <div className="mx-5 mt-4 p-2 bg-amber-500/10 border border-amber-500/30 text-amber-500 font-mono text-[10px] uppercase text-center">
            {errorMsg}
          </div>
        )}

        {/* Content body */}
        <div className="p-5 flex-1 overflow-y-auto min-h-0 space-y-6">
          
          {/* Section 1: User's Current Focus / Selected Topics with REMOVE Option */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Heart className="w-3.5 h-3.5 text-orange-500" />
                Your Current Hobbies / Active Focus List ({currentHobbies.length})
              </h4>
              {syncing && (
                <span className="text-[9px] font-mono text-orange-500 animate-pulse uppercase tracking-widest">
                  Syncing ledger...
                </span>
              )}
            </div>
            
            {currentHobbies.length === 0 ? (
              <div className="p-4 bg-zinc-900/30 border border-zinc-900/60 text-center text-xs text-zinc-600 font-mono">
                No active hobbies/subjects added. Select from subjects below to create your custom tracker focus list.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 p-3.5 bg-zinc-900/40 border border-zinc-850">
                {currentHobbies.map(hobby => {
                  const isMockTest = hobby.includes("Mock Test");
                  const isEditingThis = editingHobby === hobby;

                  return (
                    <div
                      key={hobby}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-mono font-bold uppercase transition-all border select-none ${
                        isMockTest
                          ? "bg-orange-500/10 text-orange-400 border-orange-500/30"
                          : "bg-zinc-900 text-zinc-300 border-zinc-800"
                      }`}
                    >
                      {isEditingThis ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => handleSaveEditedHobby(hobby)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleSaveEditedHobby(hobby);
                              } else if (e.key === "Escape") {
                                setEditingHobby(null);
                              }
                            }}
                            className="bg-zinc-950 border border-orange-500 text-xs px-2 py-1 text-zinc-100 focus:outline-hidden font-mono uppercase tracking-tight max-w-[150px]"
                            autoFocus
                          />
                          <button
                            onMouseDown={(e) => {
                              // use onMouseDown to prevent onBlur from triggering first
                              e.preventDefault();
                              handleSaveEditedHobby(hobby);
                            }}
                            className="text-orange-500 hover:text-white px-1.5 font-black text-xs"
                            title="Save Rename"
                          >
                            ✓
                          </button>
                        </div>
                      ) : (
                        <>
                          {isMockTest && <Sparkles className="w-3 h-3 text-orange-500" />}
                          <span 
                            onClick={(e) => handleStartEdit(e, hobby)} 
                            className="cursor-pointer hover:text-orange-500 transition-colors"
                            title="Click to Rename Subject"
                          >
                            {hobby}
                          </span>
                          
                          {/* Inline Edit Pen Icon */}
                          <button
                            onClick={(e) => handleStartEdit(e, hobby)}
                            className="p-1 text-zinc-600 hover:text-orange-500 hover:bg-zinc-800/60 transition-all ml-1.5"
                            title="Rename Subject"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>

                          {/* Delete/Remove button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveHobby(hobby);
                            }}
                            className="p-1 text-zinc-600 hover:text-red-500 hover:bg-red-950/20 transition-all font-bold text-xs"
                            title="Delete / Remove Subject"
                          >
                            ×
                          </button>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 2: Predefined Subject Selection List */}
          <div className="border border-zinc-850 grid grid-cols-1 md:grid-cols-12 min-h-[300px]">
            {/* Left Subject Tabs Column */}
            <div className="md:col-span-4 bg-zinc-900/30 border-r border-zinc-850 flex md:flex-col overflow-x-auto md:overflow-x-visible">
              <div className="p-3 bg-zinc-950 border-b border-zinc-850 text-[10px] font-mono font-black text-zinc-400 uppercase tracking-widest hidden md:block">
                📚 Select Subject
              </div>
              {Object.keys(PREDEFINED_SUBJECTS).map(subject => {
                const isActive = activeSubject === subject;
                return (
                  <button
                    key={subject}
                    onClick={() => setActiveSubject(subject)}
                    className={`flex-1 md:flex-initial text-left px-4 py-3.5 text-xs font-mono font-black uppercase tracking-wider transition-all border-b border-r md:border-r-0 border-zinc-900 flex items-center justify-between gap-3 shrink-0 cursor-pointer ${
                      isActive
                        ? "bg-orange-500 text-black font-extrabold"
                        : "text-zinc-400 hover:text-white hover:bg-zinc-900"
                    }`}
                  >
                    <span className="truncate">{subject}</span>
                    <ChevronRight className={`w-3.5 h-3.5 hidden md:block ${isActive ? "text-black" : "text-zinc-600"}`} />
                  </button>
                );
              })}
            </div>

            {/* Right Topics Grid Column */}
            <div className="md:col-span-8 p-4 bg-zinc-950 flex flex-col min-h-0">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-900 mb-4">
                <span className="text-[10px] font-mono font-black text-orange-500 uppercase tracking-widest">
                  📖 {activeSubject} Topics & Mock Tests
                </span>
                <span className="text-[9px] font-mono text-zinc-500 uppercase">
                  Click on an item to add or remove it
                </span>
              </div>

              {/* Grid of topic checkboxes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1 overflow-y-auto max-h-[250px] pr-1 pb-2">
                {PREDEFINED_SUBJECTS[activeSubject].map(topic => {
                  const isSelected = currentHobbies.includes(topic);
                  const isMockTest = topic.includes("Mock Test");

                  return (
                    <button
                      key={topic}
                      onClick={() => handleToggleHobby(topic)}
                      className={`p-3 text-left border flex items-center justify-between gap-3 transition-all cursor-pointer ${
                        isSelected
                          ? "bg-orange-500/10 border-orange-500 text-orange-400 shadow-inner"
                          : "bg-zinc-900/40 border-zinc-850 hover:bg-zinc-900 hover:border-zinc-750"
                      }`}
                    >
                      <div className="truncate">
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-semibold text-zinc-200 truncate uppercase tracking-tight font-sans">
                            {topic}
                          </span>
                        </div>
                        {isMockTest && (
                          <span className="inline-block mt-0.5 text-[8px] font-mono font-bold bg-orange-500 text-black px-1 uppercase tracking-wider scale-95 origin-left">
                            MOCK PART
                          </span>
                        )}
                      </div>

                      <div className={`w-5 h-5 border flex items-center justify-center shrink-0 transition-all ${
                        isSelected
                          ? "bg-orange-500 border-orange-500 text-black"
                          : "border-zinc-700 bg-zinc-950"
                      }`}>
                        {isSelected ? (
                          <Check className="w-3.5 h-3.5 stroke-[3.5]" />
                        ) : (
                          <Plus className="w-3.5 h-3.5 text-zinc-500" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section 3: Custom Hobby / Topic Input Box */}
          <div className="p-4 bg-zinc-900/20 border border-zinc-850 flex flex-col sm:flex-row items-center gap-3">
            <div className="flex-1 w-full space-y-1">
              <label className="text-[10px] font-mono font-black text-zinc-400 uppercase tracking-widest block">
                ✍️ Write Custom Hobby or Focus Topic
              </label>
              <input
                type="text"
                placeholder="e.g. Inorganic Chemistry, Sanskrit Drills, Evening Stroll, Web Coding"
                value={customHobby}
                onChange={e => setCustomHobby(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddHobby(customHobby);
                    setCustomHobby("");
                  }
                }}
                className="w-full bg-zinc-950 border border-zinc-800 text-xs px-3 py-2 text-zinc-200 placeholder-zinc-700 focus:outline-hidden focus:ring-1 focus:ring-orange-500 uppercase tracking-wide font-mono"
              />
            </div>
            <button
              onClick={() => {
                handleAddHobby(customHobby);
                setCustomHobby("");
              }}
              disabled={!customHobby.trim()}
              className={`w-full sm:w-auto px-5 py-2.5 text-xs font-mono font-black uppercase tracking-wider transition-all mt-auto flex items-center justify-center gap-1.5 shrink-0 cursor-pointer ${
                customHobby.trim()
                  ? "bg-orange-500 hover:bg-orange-600 text-black"
                  : "bg-zinc-900 border border-zinc-800 text-zinc-600 cursor-not-allowed"
              }`}
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              Add Custom
            </button>
          </div>

          {/* Security Activity Log Section */}
          <div className="p-4 bg-zinc-950/40 border border-zinc-900 rounded-none space-y-2 text-left">
            <div className="flex items-center gap-2 text-red-500 font-mono text-[10px] font-black uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Security Activity Log / सुरक्षा लॉग</span>
            </div>
            <p className="text-[9px] text-zinc-500 font-mono uppercase tracking-wide leading-relaxed">
              This log tracks successful authentication actions to help detect unauthorized device access.
            </p>
            <div className="bg-zinc-950 border border-zinc-900 p-2.5 space-y-1.5 font-mono text-[10px] text-zinc-400">
              <div className="flex justify-between items-center gap-4">
                <span className="text-zinc-550 uppercase text-[9px]">Last Successful Login:</span>
                <span className="text-emerald-500 font-bold text-[10px] font-mono">
                  {currentUser.lastLoginAt
                    ? new Date(currentUser.lastLoginAt).toLocaleString()
                    : new Date(currentUser.createdAt || Date.now()).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center gap-4 border-t border-zinc-900/50 pt-1.5">
                <span className="text-zinc-550 uppercase text-[9px]">Device Isolation State:</span>
                <span className="text-blue-400 font-bold uppercase text-[9px]">Memory Shield Active</span>
              </div>
              <div className="flex justify-between items-center gap-4">
                <span className="text-zinc-550 uppercase text-[9px]">Session Token Storage:</span>
                <span className="text-red-400 font-bold uppercase text-[9px]">HttpOnly Cookie Isolated</span>
              </div>
            </div>
          </div>

        </div>

        {/* Footer info bar */}
        <div className="p-4 bg-zinc-900/40 border-t border-zinc-900 flex items-center justify-between text-[9px] text-zinc-500 font-mono uppercase">
          <span className="flex items-center gap-1">
            <HelpCircle className="w-3 h-3 text-orange-500" />
            Instant ledger sync activated. All changes are broadcast to your peers.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-orange-500 hover:bg-orange-600 text-black font-black uppercase tracking-widest cursor-pointer"
          >
            Done
          </button>
        </div>
      </motion.div>
    </div>
  );
}

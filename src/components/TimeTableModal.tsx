import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Check, Clock, Plus, Trash2, Edit2, BookOpen, AlertCircle, HelpCircle, Save, Sparkles } from "lucide-react";
import { Habit } from "../types";

interface TimeTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  habits: Habit[];
  onAddHabit: (name: string, emoji: string, category: string) => void;
  onEditHabit: (id: string, name: string, emoji: string, category: string) => void;
  onDeleteHabit: (id: string) => void;
}

const STUDY_EMOJIS = [
  "📖", "📐", "🧪", "🌍", "💻", "✍️", "📚", "🧠", "🎨", "🧬", "⚡", "💼", "🧮", "⏰", "🎯", "📋"
];

const QUICK_TIMES = [
  "06:00 AM - 07:30 AM",
  "08:00 AM - 09:30 AM",
  "10:00 AM - 11:30 AM",
  "04:00 PM - 05:30 PM",
  "06:00 PM - 07:30 PM",
  "08:00 PM - 09:30 PM",
  "09:30 PM - 11:00 PM"
];

// Helper to parse "Subject (Time Slot)" back into parts
const parseHabitName = (fullName: string) => {
  const match = fullName.match(/^(.*?)\s*\(([^)]+)\)$/);
  if (match) {
    return {
      subject: match[1].trim(),
      timeSlot: match[2].trim(),
    };
  }
  return {
    subject: fullName,
    timeSlot: "",
  };
};

export default function TimeTableModal({
  isOpen,
  onClose,
  habits,
  onAddHabit,
  onEditHabit,
  onDeleteHabit
}: TimeTableModalProps) {
  // Form State
  const [subject, setSubject] = useState("");
  const [timeSlot, setTimeSlot] = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState("📖");
  const [category, setCategory] = useState("Study Timetable");
  
  // Edit State
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);

  // Search/Filter list of habits (showing mostly study-related categories by default, but customizable)
  const [searchTerm, setSearchTerm] = useState("");

  // Sync edit mode pre-fill
  const handleStartEdit = (habit: Habit) => {
    const parsed = parseHabitName(habit.name);
    setSubject(parsed.subject);
    setTimeSlot(parsed.timeSlot);
    setSelectedEmoji(habit.emoji);
    setCategory(habit.category || "Study Timetable");
    setEditingHabitId(habit.id);
  };

  const handleCancelEdit = () => {
    setSubject("");
    setTimeSlot("");
    setSelectedEmoji("📖");
    setCategory("Study Timetable");
    setEditingHabitId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) return;

    // Combine subject and time slot
    const fullName = timeSlot.trim() 
      ? `${subject.trim()} (${timeSlot.trim()})` 
      : subject.trim();

    const finalCategory = category.trim() || "Study Timetable";

    if (editingHabitId) {
      onEditHabit(editingHabitId, fullName, selectedEmoji, finalCategory);
      handleCancelEdit();
    } else {
      onAddHabit(fullName, selectedEmoji, finalCategory);
      setSubject("");
      setTimeSlot("");
    }
  };

  if (!isOpen) return null;

  // Filter study-related habits (e.g. contains parenthesis time, or in "Study" category, or search match)
  const filteredHabits = habits.filter(h => {
    const matchSearch = h.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        (h.category || "").toLowerCase().includes(searchTerm.toLowerCase());
    return matchSearch;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-zinc-950 border-2 border-zinc-800 w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col relative rounded-none shadow-2xl"
      >
        {/* Top Border Indicator */}
        <div className="absolute top-0 left-0 w-full h-[3px] bg-orange-500"></div>

        {/* Header */}
        <div className="p-5 border-b border-zinc-900 flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-sm font-mono font-black text-orange-500 uppercase tracking-widest flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-orange-500 animate-pulse" />
              <span>CUSTOM STUDY TIMETABLE BUILDER</span>
            </h3>
            <p className="text-[10px] text-zinc-450 font-mono uppercase tracking-wider">
              Create, edit, and arrange your custom subject study periods and daily ledger routines.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Multi-column Body Panel */}
        <div className="flex-1 overflow-y-auto min-h-0 grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-zinc-900">
          
          {/* Left Column: Interactive Form */}
          <div className="lg:col-span-5 p-5 space-y-5">
            <div className="bg-zinc-900/40 border border-zinc-850 p-4">
              <h4 className="text-xs font-mono font-black text-zinc-200 uppercase tracking-wider mb-3.5 flex items-center gap-2">
                <span className="w-1.5 h-3 bg-orange-500"></span>
                {editingHabitId ? "📝 EDIT STUDY SLOT" : "➕ CREATE CUSTOM STUDY SLOT"}
              </h4>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Subject name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-black text-orange-500 uppercase tracking-wider block">
                    Subject / Activity Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mathematics Practice, Physics Review"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-none text-zinc-100 placeholder-zinc-700 focus:outline-hidden focus:ring-1 focus:ring-orange-500 transition-all font-sans text-sm font-bold"
                    maxLength={35}
                    autoFocus
                  />
                </div>

                {/* Time slot & suggestions */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-black text-orange-500 uppercase tracking-wider flex justify-between">
                    <span>Study Time Slot</span>
                    <span className="text-zinc-500 lowercase italic">optional</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 06:00 AM - 07:30 AM, Morning, Night Session"
                    value={timeSlot}
                    onChange={(e) => setTimeSlot(e.target.value)}
                    className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-none text-zinc-100 placeholder-zinc-700 focus:outline-hidden focus:ring-1 focus:ring-orange-500 transition-all font-sans text-sm font-bold"
                    maxLength={30}
                  />

                  {/* Quick prefill times */}
                  <div className="pt-1.5">
                    <span className="text-[10px] font-mono text-zinc-400 font-bold uppercase block mb-1">Quick Slots:</span>
                    <div className="flex flex-wrap gap-1">
                      {QUICK_TIMES.map((time) => (
                        <button
                          key={time}
                          type="button"
                          onClick={() => setTimeSlot(time)}
                          className={`text-[10px] px-2 py-1 font-mono font-bold border transition-all cursor-pointer ${
                            timeSlot === time
                              ? "bg-orange-500/15 text-orange-400 border-orange-500 font-black"
                              : "bg-zinc-950 text-zinc-400 border-zinc-850 hover:border-zinc-700 hover:text-white"
                          }`}
                        >
                          {time.split(" ")[0]} {time.split(" ")[1]}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Tab Category */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-black text-orange-500 uppercase tracking-wider block">
                    Ledger Tab / Category
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Study Timetable"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-none text-zinc-100 placeholder-zinc-700 focus:outline-hidden focus:ring-1 focus:ring-orange-500 transition-all font-sans text-sm font-bold"
                    maxLength={15}
                  />
                </div>

                {/* Emoji Grid Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-black text-orange-500 uppercase tracking-wider block">
                    Choose Icon/Emoji
                  </label>
                  <div className="grid grid-cols-8 gap-1 bg-zinc-950 p-2 border border-zinc-850 max-h-32 overflow-y-auto">
                    {STUDY_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setSelectedEmoji(emoji)}
                        className={`flex items-center justify-center h-8 text-sm transition-all cursor-pointer ${
                          selectedEmoji === emoji
                            ? "bg-orange-500 text-black border border-orange-500 font-black"
                            : "bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold"
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Submit button block */}
                <div className="flex gap-2 pt-2">
                  {editingHabitId && (
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="flex-1 py-2 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs font-mono font-black uppercase tracking-wider cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={!subject.trim()}
                    className="flex-2 py-2 bg-orange-500 hover:bg-orange-600 text-black text-xs font-mono font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-1.5 disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {editingHabitId ? <Save className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5 stroke-[3]" />}
                    <span>{editingHabitId ? "SAVE CHANGES" : "ADD TO TIMETABLE"}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Quick tips */}
            <div className="bg-zinc-900/20 border border-zinc-900 p-3.5 text-[9px] text-zinc-500 font-mono uppercase space-y-1">
              <span className="flex items-center gap-1.5 text-orange-400 font-bold">
                <HelpCircle className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                HOW IT WORKS:
              </span>
              <p>1. Added slots instantly appear as trackable items on your monthly ledger board.</p>
              <p>2. Editing a slot modifies its description and logs seamlessly without wiping previous records.</p>
            </div>
          </div>

          {/* Right Column: Active Timetable Slots List */}
          <div className="lg:col-span-7 p-5 flex flex-col min-h-0">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pb-3 border-b border-zinc-900">
              <h4 className="text-xs font-mono font-black text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                <span>📚 ACTIVE TIMETABLE SLOTS ({filteredHabits.length})</span>
              </h4>
              <input
                type="text"
                placeholder="Search slot or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-none text-zinc-200 placeholder-zinc-600 focus:outline-hidden focus:ring-1 focus:ring-orange-500 text-[10px] font-mono uppercase tracking-wider w-full sm:w-48"
              />
            </div>

            {/* Scrollable list wrapper */}
            <div className="flex-1 overflow-y-auto mt-3 divide-y divide-zinc-900 max-h-[480px] custom-scrollbar pr-1">
              {filteredHabits.length === 0 ? (
                <div className="p-12 text-center text-xs text-zinc-600 font-mono italic">
                  {searchTerm ? "No slots match your search query." : "No study timetable slots added yet. Use the form on the left to start!"}
                </div>
              ) : (
                filteredHabits.map((habit) => {
                  const parsed = parseHabitName(habit.name);
                  const isCurrentlyEditing = editingHabitId === habit.id;
                  
                  return (
                    <div
                      key={habit.id}
                      className={`flex items-center justify-between py-3 px-2.5 transition-colors ${
                        isCurrentlyEditing 
                          ? "bg-orange-500/10 border-l-2 border-orange-500" 
                          : "hover:bg-zinc-900/40"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        {/* Emoji Circle */}
                        <div className="w-8 h-8 bg-zinc-900 border border-zinc-800 flex items-center justify-center text-sm shrink-0 font-sans">
                          {habit.emoji}
                        </div>
                        <div className="min-w-0">
                          <h5 className="text-xs font-sans font-extrabold text-zinc-100 truncate">
                            {parsed.subject}
                          </h5>
                          {parsed.timeSlot && (
                            <p className="text-[10px] font-mono text-zinc-500 uppercase flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3 text-orange-500 shrink-0" />
                              <span>{parsed.timeSlot}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right actions side */}
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-[8px] font-mono font-bold bg-zinc-900 text-zinc-400 border border-zinc-850 px-2 py-0.5 uppercase tracking-wider hidden sm:inline-block">
                          {habit.category || "Study"}
                        </span>

                        <div className="flex items-center gap-1.5">
                          {/* Edit button */}
                          <button
                            onClick={() => handleStartEdit(habit)}
                            className="p-1.5 bg-zinc-900 border border-zinc-850 hover:border-orange-500/50 hover:bg-orange-500/5 text-zinc-400 hover:text-orange-400 transition-colors cursor-pointer"
                            title="Edit study slot details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete button */}
                          <button
                            onClick={() => onDeleteHabit(habit.id)}
                            className="p-1.5 bg-zinc-900 border border-zinc-850 hover:border-red-500/50 hover:bg-red-500/5 text-zinc-400 hover:text-red-400 transition-colors cursor-pointer"
                            title="Delete slot from ledger"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

        {/* Footer info bar */}
        <div className="p-4 bg-zinc-900/60 border-t border-zinc-900 flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] text-zinc-500 font-mono uppercase">
          <span className="flex items-center gap-1 text-center sm:text-left">
            <Sparkles className="w-3.5 h-3.5 text-orange-500 shrink-0 animate-pulse" />
            <span>Successfully configure your personalized timeline slots for maximum study focus.</span>
          </span>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-mono font-black uppercase tracking-widest cursor-pointer text-center"
          >
            Close Planner
          </button>
        </div>
      </motion.div>
    </div>
  );
}

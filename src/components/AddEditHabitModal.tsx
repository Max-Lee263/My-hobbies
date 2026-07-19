import React, { useState, useEffect } from "react";
import { X, Check, Tags, Plus } from "lucide-react";
import { Habit } from "../types";

interface AddEditHabitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, emoji: string, category: string, subjectTag?: string) => void;
  habitToEdit?: Habit | null;
  existingCategories: string[];
  availableSubjects: string[];
}

const POPULAR_EMOJIS = [
  "⏰", "🏋️‍♂️", "🧘", "📋", "🎯", "🎬", "📚", "🚫", "🧹", "😴",
  "💧", "🍎", "🚶‍♂️", "📝", "💡", "💻", "🎧", "🗣️", "💵", "💊",
  "🌱", "🎨", "📖", "🦷", "🧘‍♀️", "🏃‍♂️", "🚴‍♂️", "🍵", "🤝", "❤️"
];

export default function AddEditHabitModal({
  isOpen,
  onClose,
  onSave,
  habitToEdit,
  existingCategories,
  availableSubjects,
}: AddEditHabitModalProps) {
  const [name, setName] = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState("✨");
  const [category, setCategory] = useState("Routine");
  const [customCategory, setCustomCategory] = useState("");
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [subjectTag, setSubjectTag] = useState("");

  useEffect(() => {
    if (habitToEdit) {
      setName(habitToEdit.name);
      setSelectedEmoji(habitToEdit.emoji);
      setSubjectTag(habitToEdit.subjectTag || "");
      const cat = habitToEdit.category || "Routine";
      if (existingCategories.includes(cat) && cat !== "All") {
        setCategory(cat);
        setIsCustomCategory(false);
      } else {
        setCategory("NEW_TAB");
        setCustomCategory(cat);
        setIsCustomCategory(true);
      }
    } else {
      setName("");
      setSelectedEmoji("⏰");
      setSubjectTag("");
      const defaultCat = existingCategories.filter(c => c !== "All")[0] || "Routine";
      setCategory(defaultCat);
      setCustomCategory("");
      setIsCustomCategory(false);
    }
  }, [habitToEdit, isOpen, existingCategories]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    const finalCategory = isCustomCategory 
      ? (customCategory.trim() || "Routine") 
      : category;

    onSave(name.trim(), selectedEmoji, finalCategory, subjectTag);
    setName("");
    setCustomCategory("");
    setSubjectTag("");
    onClose();
  };

  const categoriesToSelect = existingCategories.filter(c => c !== "All");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div 
        className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-none shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-850 bg-zinc-900">
          <h3 className="text-sm font-black text-white font-sans uppercase tracking-[0.15em]">
            {habitToEdit ? "Edit Habit Ledger" : "Create Habit Ledger"}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-none transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Name Input */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono font-bold text-orange-500 uppercase tracking-[0.2em]">
              Habit Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Drink 3L Water"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-none text-zinc-100 placeholder-zinc-650 focus:outline-hidden focus:ring-1 focus:ring-orange-500 transition-all font-sans text-sm"
              maxLength={40}
              autoFocus
            />
          </div>

          {/* Habit Tab / Category Organizer */}
          <div className="space-y-2">
            <label className="text-[10px] font-mono font-bold text-orange-500 uppercase tracking-[0.2em] flex items-center gap-1.5">
              <Tags className="w-3.5 h-3.5 text-orange-500" />
              <span>Organize under Tab / Category</span>
            </label>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-mono text-zinc-500 uppercase">Select Existing Tab</span>
                <select
                  value={isCustomCategory ? "NEW_TAB" : category}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "NEW_TAB") {
                      setIsCustomCategory(true);
                    } else {
                      setCategory(val);
                      setIsCustomCategory(false);
                    }
                  }}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-zinc-100 focus:outline-hidden focus:ring-1 focus:ring-orange-500 text-xs font-semibold font-sans uppercase tracking-wider"
                >
                  {categoriesToSelect.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                  <option value="NEW_TAB">+ Create New Tab</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-mono text-zinc-500 uppercase">Or Custom Tab Name</span>
                <input
                  type="text"
                  placeholder="e.g. Health, Sports, Study"
                  disabled={!isCustomCategory}
                  value={isCustomCategory ? customCategory : ""}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  className="w-full px-3 py-1.5 bg-zinc-900 disabled:bg-zinc-950 disabled:text-zinc-600 disabled:border-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:outline-hidden focus:ring-1 focus:ring-orange-500 text-xs font-semibold"
                  maxLength={15}
                />
              </div>
            </div>
            
            {isCustomCategory && (
              <p className="text-[10px] font-mono text-orange-400/80">
                ✨ A brand new tab will be generated for this habit on your board.
              </p>
            )}
          </div>

          {/* Connect with Focus Subject / Hobby */}
          <div className="space-y-2">
            <label className="text-[10px] font-mono font-bold text-orange-500 uppercase tracking-[0.2em] flex items-center gap-1.5">
              <span>Connect with Focus Subject / Hobby</span>
            </label>
            {availableSubjects.length === 0 ? (
              <p className="text-[10px] font-mono text-zinc-600 italic bg-zinc-900/50 p-2.5 border border-zinc-900">
                No focus subjects configured. Add subjects at the top of your ledger first!
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => setSubjectTag("")}
                  className={`px-2.5 py-1.5 text-[10px] font-mono font-bold border transition-all cursor-pointer ${
                    subjectTag === ""
                      ? "bg-orange-500 text-black border-orange-500"
                      : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white"
                  }`}
                >
                  None
                </button>
                {availableSubjects.map((sub) => {
                  const isSelected = subjectTag === sub;
                  return (
                    <button
                      key={sub}
                      type="button"
                      onClick={() => setSubjectTag(sub)}
                      className={`px-2.5 py-1.5 text-[10px] font-mono font-bold border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-orange-500 text-black border-orange-500"
                          : "bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-orange-500/50 hover:text-orange-400"
                      }`}
                    >
                      {sub}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Emoji Picker */}
          <div className="space-y-2">
            <label className="text-[10px] font-mono font-bold text-orange-500 uppercase tracking-[0.2em] flex justify-between">
              <span>Select Icon/Emoji</span>
              <span className="text-zinc-450">Selected: {selectedEmoji}</span>
            </label>
            <div className="grid grid-cols-6 gap-2 p-3 bg-zinc-900 border border-zinc-800 rounded-none max-h-40 overflow-y-auto custom-scrollbar">
              {POPULAR_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setSelectedEmoji(emoji)}
                  className={`flex items-center justify-center h-10 text-xl rounded-none transition-all cursor-pointer ${
                    selectedEmoji === emoji
                      ? "bg-orange-500 text-black scale-105 border border-orange-500 font-bold shadow-md"
                      : "bg-zinc-950 hover:bg-zinc-850 border border-zinc-900 text-zinc-300"
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-3 border-t border-zinc-850">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-black uppercase tracking-widest text-zinc-400 hover:text-white hover:bg-zinc-900 border border-transparent hover:border-zinc-800 rounded-none transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || (isCustomCategory && !customCategory.trim())}
              className="flex items-center gap-2 px-5 py-2 bg-orange-500 hover:bg-orange-600 text-black rounded-none text-xs font-black uppercase tracking-widest shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[3px]" />
              <span>{habitToEdit ? "Save Changes" : "Create Habit"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

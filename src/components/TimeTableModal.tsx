import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Check, Award, BookOpen, Clock, Plus, Sparkles, School, HelpCircle, GraduationCap } from "lucide-react";
import { Habit } from "../types";

interface TimeTablePreset {
  subject: string;
  timeSlot: string;
  emoji: string;
  category: string;
}

// Complete predefined subjects & timetables for Classes 5 to 12 (Assam Board SEBA/AHSEC)
export const CLASS_TIMETABLES: Record<string, Record<string, TimeTablePreset[]>> = {
  "Class 5": {
    "General": [
      { subject: "Assamese (MIL) Reading", timeSlot: "07:30 AM - 08:30 AM", emoji: "📖", category: "Class 5 Study" },
      { subject: "Primary Mathematics Practice", timeSlot: "09:00 AM - 10:00 AM", emoji: "📐", category: "Class 5 Study" },
      { subject: "English Prose & Spelling", timeSlot: "04:00 PM - 05:00 PM", emoji: "📚", category: "Class 5 Study" },
      { subject: "Environmental Studies (EVS)", timeSlot: "06:30 PM - 07:30 PM", emoji: "🌱", category: "Class 5 Study" },
      { subject: "Hindi/Sanskrit Basic Vocab", timeSlot: "08:00 PM - 08:45 PM", emoji: "✍️", category: "Class 5 Study" }
    ]
  },
  "Class 6": {
    "General": [
      { subject: "Mathematics - Fractions & Algebra", timeSlot: "07:00 AM - 08:15 AM", emoji: "📐", category: "Class 6 Study" },
      { subject: "General Science - Plants & Fun", timeSlot: "08:45 AM - 09:45 AM", emoji: "🧪", category: "Class 6 Study" },
      { subject: "Assamese (MIL) Grammar", timeSlot: "04:30 PM - 05:30 PM", emoji: "📖", category: "Class 6 Study" },
      { subject: "English Writing & Grammar", timeSlot: "06:30 PM - 07:30 PM", emoji: "✍️", category: "Class 6 Study" },
      { subject: "Social Science - History & Earth", timeSlot: "08:00 PM - 09:00 PM", emoji: "🌍", category: "Class 6 Study" }
    ]
  },
  "Class 7": {
    "General": [
      { subject: "Mathematics Problem Solving", timeSlot: "07:00 AM - 08:30 AM", emoji: "📐", category: "Class 7 Study" },
      { subject: "General Science Concepts", timeSlot: "09:00 AM - 10:15 AM", emoji: "🧪", category: "Class 7 Study" },
      { subject: "Social Science - Our Environment", timeSlot: "04:00 PM - 05:00 PM", emoji: "🌍", category: "Class 7 Study" },
      { subject: "Assamese MIL Poetry & Prose", timeSlot: "06:30 PM - 07:30 PM", emoji: "📖", category: "Class 7 Study" },
      { subject: "English Vocabulary & Reading", timeSlot: "08:00 PM - 09:00 PM", emoji: "📚", category: "Class 7 Study" }
    ]
  },
  "Class 8": {
    "General": [
      { subject: "Mathematics (Algebra, Exponents)", timeSlot: "06:30 AM - 08:00 AM", emoji: "📐", category: "Class 8 Study" },
      { subject: "Science (Chemicals & Metals)", timeSlot: "08:30 AM - 09:45 AM", emoji: "🧪", category: "Class 8 Study" },
      { subject: "Assamese MIL Essay & Composition", timeSlot: "04:30 PM - 05:30 PM", emoji: "✍️", category: "Class 8 Study" },
      { subject: "English Grammar & Synonyms", timeSlot: "06:30 PM - 07:45 PM", emoji: "📚", category: "Class 8 Study" },
      { subject: "Social Studies - Freedom Struggle", timeSlot: "08:15 PM - 09:30 PM", emoji: "🌍", category: "Class 8 Study" }
    ]
  },
  "Class 9": {
    "SEBA (Assam Board)": [
      { subject: "SEBA Mathematics (Linear Eq)", timeSlot: "06:00 AM - 07:30 AM", emoji: "📐", category: "Class 9 SEBA" },
      { subject: "General Science (Matter & Atoms)", timeSlot: "08:00 AM - 09:30 AM", emoji: "🧪", category: "Class 9 SEBA" },
      { subject: "SEBA Social Science (History/Geo)", timeSlot: "04:00 PM - 05:30 PM", emoji: "🌍", category: "Class 9 SEBA" },
      { subject: "Assamese MIL (Sahitya Chayan)", timeSlot: "06:30 PM - 07:45 PM", emoji: "📖", category: "Class 9 SEBA" },
      { subject: "English Grammar (Determiners & Tense)", timeSlot: "08:00 PM - 09:15 PM", emoji: "📚", category: "Class 9 SEBA" },
      { subject: "Advanced Maths / Computer Elective", timeSlot: "09:30 PM - 10:30 PM", emoji: "💻", category: "Class 9 SEBA" }
    ]
  },
  "Class 10": {
    "SEBA (Assam Board)": [
      { subject: "SEBA Class 10 Maths Drill", timeSlot: "06:00 AM - 07:45 AM", emoji: "📐", category: "Class 10 SEBA" },
      { subject: "SEBA General Science Review", timeSlot: "08:00 AM - 09:30 AM", emoji: "🧪", category: "Class 10 SEBA" },
      { subject: "Assamese MIL (Class 10 Board Spec)", timeSlot: "04:00 PM - 05:15 PM", emoji: "📖", category: "Class 10 SEBA" },
      { subject: "SEBA Social Science Revision", timeSlot: "05:30 PM - 07:00 PM", emoji: "🌍", category: "Class 10 SEBA" },
      { subject: "English Text & SEBA Board Grammar", timeSlot: "07:30 PM - 08:45 PM", emoji: "📚", category: "Class 10 SEBA" },
      { subject: "SEBA Advanced Maths / Elective", timeSlot: "09:00 PM - 10:15 PM", emoji: "💻", category: "Class 10 SEBA" }
    ]
  },
  "Class 11": {
    "AHSEC Science": [
      { subject: "AHSEC Physics - Kinematics/Laws", timeSlot: "06:00 AM - 07:45 AM", emoji: "⚡", category: "Class 11 Science" },
      { subject: "AHSEC Chemistry - Mole Concept", timeSlot: "08:00 AM - 09:30 AM", emoji: "🧪", category: "Class 11 Science" },
      { subject: "AHSEC Mathematics - Sets & Functions", timeSlot: "04:00 PM - 05:30 PM", emoji: "📐", category: "Class 11 Science" },
      { subject: "AHSEC Biology / Comp Science", timeSlot: "06:30 PM - 08:00 PM", emoji: "🧬", category: "Class 11 Science" },
      { subject: "Alternative English / Assamese MIL", timeSlot: "08:15 PM - 09:15 PM", emoji: "📚", category: "Class 11 Science" },
      { subject: "English Core Textbooks Study", timeSlot: "09:30 PM - 10:30 PM", emoji: "📖", category: "Class 11 Science" }
    ],
    "AHSEC Arts": [
      { subject: "AHSEC Political Science Principles", timeSlot: "07:00 AM - 08:30 AM", emoji: "⚖️", category: "Class 11 Arts" },
      { subject: "AHSEC History - Early Societies", timeSlot: "09:00 AM - 10:30 AM", emoji: "🏛️", category: "Class 11 Arts" },
      { subject: "AHSEC Education / Sociology", timeSlot: "04:00 PM - 05:30 PM", emoji: "🧠", category: "Class 11 Arts" },
      { subject: "AHSEC Economics Statistics", timeSlot: "06:30 PM - 08:00 PM", emoji: "📊", category: "Class 11 Arts" },
      { subject: "Assamese MIL / Swadesh Adhyayan", timeSlot: "08:15 PM - 09:15 PM", emoji: "📖", category: "Class 11 Arts" },
      { subject: "English Core Prose & Poetry", timeSlot: "09:30 PM - 10:30 PM", emoji: "📚", category: "Class 11 Arts" }
    ],
    "AHSEC Commerce": [
      { subject: "AHSEC Accountancy - Ledger Entries", timeSlot: "06:30 AM - 08:15 AM", emoji: "🧮", category: "Class 11 Commerce" },
      { subject: "AHSEC Business Studies Basics", timeSlot: "08:30 AM - 10:00 AM", emoji: "💼", category: "Class 11 Commerce" },
      { subject: "AHSEC Commercial Mathematics", timeSlot: "04:00 PM - 05:30 PM", emoji: "📐", category: "Class 11 Commerce" },
      { subject: "AHSEC Economics Principles", timeSlot: "06:30 PM - 08:00 PM", emoji: "📈", category: "Class 11 Commerce" },
      { subject: "AHSEC Alternative English / MIL", timeSlot: "08:15 PM - 09:15 PM", emoji: "📖", category: "Class 11 Commerce" },
      { subject: "English Core Writing Skills", timeSlot: "09:30 PM - 10:30 PM", emoji: "📚", category: "Class 11 Commerce" }
    ]
  },
  "Class 12": {
    "AHSEC Science": [
      { subject: "AHSEC Physics - Electrostatics & AC", timeSlot: "06:00 AM - 07:45 AM", emoji: "⚡", category: "Class 12 Science" },
      { subject: "AHSEC Chemistry - Organic / Electro", timeSlot: "08:00 AM - 09:30 AM", emoji: "🧪", category: "Class 12 Science" },
      { subject: "AHSEC Mathematics - Calculus & Matrix", timeSlot: "04:00 PM - 05:30 PM", emoji: "📐", category: "Class 12 Science" },
      { subject: "AHSEC Biology - Genetics & Biotech", timeSlot: "06:30 PM - 08:00 PM", emoji: "🧬", category: "Class 12 Science" },
      { subject: "AHSEC Assamese MIL / Adv English", timeSlot: "08:15 PM - 09:15 PM", emoji: "📚", category: "Class 12 Science" },
      { subject: "English Core - Board Prep Drill", timeSlot: "09:30 PM - 10:30 PM", emoji: "📖", category: "Class 12 Science" }
    ],
    "AHSEC Arts": [
      { subject: "AHSEC Pol Science - Global Politics", timeSlot: "07:00 AM - 08:30 AM", emoji: "⚖️", category: "Class 12 Arts" },
      { subject: "AHSEC History - Themes of India", timeSlot: "09:00 AM - 10:30 AM", emoji: "🏛️", category: "Class 12 Arts" },
      { subject: "AHSEC Education - Major Thinkers", timeSlot: "04:00 PM - 05:15 PM", emoji: "🧠", category: "Class 12 Arts" },
      { subject: "AHSEC Economics - Macroeconomics", timeSlot: "05:30 PM - 07:00 PM", emoji: "📊", category: "Class 12 Arts" },
      { subject: "AHSEC Assamese MIL Literary Studies", timeSlot: "07:30 PM - 08:45 PM", emoji: "📖", category: "Class 12 Arts" },
      { subject: "English Core Writing & Grammar", timeSlot: "09:00 PM - 10:15 PM", emoji: "📚", category: "Class 12 Arts" }
    ],
    "AHSEC Commerce": [
      { subject: "AHSEC Accountancy - Partnerships & Co", timeSlot: "06:00 AM - 07:45 AM", emoji: "🧮", category: "Class 12 Commerce" },
      { subject: "AHSEC Business Studies - Management", timeSlot: "08:00 AM - 09:30 AM", emoji: "💼", category: "Class 12 Commerce" },
      { subject: "AHSEC Banking / Commercial Maths", timeSlot: "04:00 PM - 05:15 PM", emoji: "💳", category: "Class 12 Commerce" },
      { subject: "AHSEC Economics - Indian Economy", timeSlot: "05:30 PM - 07:00 PM", emoji: "📈", category: "Class 12 Commerce" },
      { subject: "AHSEC MIL Literature / Alt English", timeSlot: "07:30 PM - 08:45 PM", emoji: "📖", category: "Class 12 Commerce" },
      { subject: "English Core Board Exam Revision", timeSlot: "09:00 PM - 10:15 PM", emoji: "📚", category: "Class 12 Commerce" }
    ]
  }
};

interface TimeTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (newHabits: Array<{ name: string; emoji: string; category: string }>) => void;
}

export default function TimeTableModal({
  isOpen,
  onClose,
  onImport
}: TimeTableModalProps) {
  const [selectedClass, setSelectedClass] = useState<string>("Class 10");
  
  // Available program streams for the selected class
  const streams = Object.keys(CLASS_TIMETABLES[selectedClass] || {});
  const [selectedStream, setSelectedStream] = useState<string>(streams[0] || "");

  // When class changes, adjust stream automatically
  const handleClassChange = (cls: string) => {
    setSelectedClass(cls);
    const availableStreams = Object.keys(CLASS_TIMETABLES[cls] || {});
    setSelectedStream(availableStreams[0] || "");
  };

  // Keep track of which presets are selected
  const activePresets = CLASS_TIMETABLES[selectedClass]?.[selectedStream] || [];
  const [selectedPresetNames, setSelectedPresetNames] = useState<Record<string, boolean>>({});

  // Initialize selected presets to true whenever class/stream changes
  React.useEffect(() => {
    const nextSelections: Record<string, boolean> = {};
    activePresets.forEach(preset => {
      nextSelections[preset.subject] = true;
    });
    setSelectedPresetNames(nextSelections);
  }, [selectedClass, selectedStream]);

  if (!isOpen) return null;

  const handleTogglePreset = (subject: string) => {
    setSelectedPresetNames(prev => ({
      ...prev,
      [subject]: !prev[subject]
    }));
  };

  const handleSelectAll = () => {
    const nextSelections: Record<string, boolean> = {};
    activePresets.forEach(preset => {
      nextSelections[preset.subject] = true;
    });
    setSelectedPresetNames(nextSelections);
  };

  const handleSelectNone = () => {
    const nextSelections: Record<string, boolean> = {};
    activePresets.forEach(preset => {
      nextSelections[preset.subject] = false;
    });
    setSelectedPresetNames(nextSelections);
  };

  const handleApply = () => {
    const toImport = activePresets
      .filter(preset => selectedPresetNames[preset.subject])
      .map(preset => ({
        name: `${preset.subject} (${preset.timeSlot})`,
        emoji: preset.emoji,
        category: preset.category
      }));

    if (toImport.length === 0) {
      alert("Please select at least one Time Table slot to add!");
      return;
    }

    onImport(toImport);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-zinc-950 border-2 border-zinc-800 w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col relative"
      >
        {/* Border accent */}
        <div className="absolute top-0 left-0 w-full h-[3px] bg-orange-500"></div>

        {/* Header */}
        <div className="p-5 border-b border-zinc-900 flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-sm font-mono font-black text-orange-500 uppercase tracking-widest flex items-center gap-2">
              <School className="w-4 h-4" /> Assam Board (SEBA/AHSEC) Daily Time Table
            </h3>
            <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">
              Instantly setup structured study timeslots for Class 5 to Class 12 standard subject timetables.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body content */}
        <div className="p-5 flex-1 overflow-y-auto min-h-0 space-y-6">
          
          {/* 1. Class selector horizontal badges */}
          <div className="space-y-2">
            <label className="text-[10px] font-mono font-black text-zinc-400 uppercase tracking-widest block">
              🎓 Select Academic Class
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
              {Object.keys(CLASS_TIMETABLES).map(cls => {
                const isSelected = selectedClass === cls;
                return (
                  <button
                    key={cls}
                    onClick={() => handleClassChange(cls)}
                    className={`py-2 text-xs font-mono font-bold uppercase transition-all border cursor-pointer text-center ${
                      isSelected
                        ? "bg-orange-500 text-black border-orange-500 font-black shadow-inner"
                        : "bg-zinc-900 text-zinc-400 border-zinc-850 hover:bg-zinc-850 hover:text-white"
                    }`}
                  >
                    {cls}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Stream selector if multiple exist */}
          {streams.length > 1 && (
            <div className="space-y-2">
              <label className="text-[10px] font-mono font-black text-zinc-400 uppercase tracking-widest block">
                🧬 Select Stream / Course
              </label>
              <div className="flex gap-2">
                {streams.map(str => {
                  const isSelected = selectedStream === str;
                  return (
                    <button
                      key={str}
                      onClick={() => setSelectedStream(str)}
                      className={`px-4 py-2 text-xs font-mono font-bold uppercase transition-all border cursor-pointer ${
                        isSelected
                          ? "bg-orange-500/10 text-orange-400 border-orange-500"
                          : "bg-zinc-900 text-zinc-400 border-zinc-850 hover:bg-zinc-850 hover:text-white"
                      }`}
                    >
                      {str}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. Subjects list preview */}
          <div className="border border-zinc-850 bg-zinc-900/30">
            <div className="p-3.5 bg-zinc-950 border-b border-zinc-850 flex items-center justify-between text-xs font-mono uppercase tracking-wider font-black">
              <span className="text-orange-500 flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-orange-500" />
                Timetable Preview: {selectedClass} ({selectedStream})
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSelectAll}
                  className="text-[9px] px-2 py-0.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-750 text-zinc-400 hover:text-zinc-200 uppercase tracking-wider cursor-pointer"
                >
                  Select All
                </button>
                <button
                  onClick={handleSelectNone}
                  className="text-[9px] px-2 py-0.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-750 text-zinc-400 hover:text-zinc-200 uppercase tracking-wider cursor-pointer"
                >
                  Clear All
                </button>
              </div>
            </div>

            <div className="divide-y divide-zinc-900 p-2 max-h-[280px] overflow-y-auto">
              {activePresets.length === 0 ? (
                <div className="p-8 text-center text-xs text-zinc-600 font-mono italic">
                  No predefined timetables available for this selection.
                </div>
              ) : (
                activePresets.map((preset) => {
                  const isChecked = !!selectedPresetNames[preset.subject];
                  return (
                    <div
                      key={preset.subject}
                      onClick={() => handleTogglePreset(preset.subject)}
                      className={`flex items-center justify-between p-3.5 hover:bg-zinc-900/50 cursor-pointer select-none transition-all ${
                        isChecked ? "bg-orange-500/5" : "opacity-60 hover:opacity-100"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Emoji */}
                        <div className="w-8 h-8 bg-zinc-950 border border-zinc-800 flex items-center justify-center text-sm shrink-0">
                          {preset.emoji}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-sans font-bold text-zinc-100 truncate">
                            {preset.subject}
                          </p>
                          <p className="text-[10px] font-mono text-zinc-500 uppercase flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3 text-orange-500 shrink-0" />
                            <span>{preset.timeSlot}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-[8px] font-mono font-bold bg-zinc-900 text-zinc-400 border border-zinc-800 px-1.5 py-0.5 uppercase tracking-wide">
                          {preset.category}
                        </span>

                        {/* Checkbox */}
                        <div className={`w-5 h-5 border flex items-center justify-center shrink-0 transition-all ${
                          isChecked
                            ? "bg-orange-500 border-orange-500 text-black"
                            : "border-zinc-750 bg-zinc-950"
                        }`}>
                          {isChecked && <Check className="w-3.5 h-3.5 stroke-[3.5]" />}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

        {/* Footer actions bar */}
        <div className="p-4 bg-zinc-900/40 border-t border-zinc-900 flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] text-zinc-500 font-mono uppercase">
          <span className="flex items-center gap-1">
            <HelpCircle className="w-3.5 h-3.5 text-orange-500 shrink-0" />
            Adds structured study tracker periods directly to your active habit lists.
          </span>
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-5 py-2.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white text-xs font-mono font-black uppercase tracking-widest cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="flex-1 sm:flex-none px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-black text-xs font-mono font-black uppercase tracking-widest cursor-pointer"
            >
              Apply & Import Time Table
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

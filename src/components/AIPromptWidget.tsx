import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Terminal, Check, AlertCircle, RefreshCw, Zap, Play } from "lucide-react";
import { User, Habit } from "../types";

interface AIPromptWidgetProps {
  currentUser: User;
  onUpdateCurrentUser: (user: User) => void;
  onAddHabits: (newHabits: { name: string; emoji: string; category: string }[]) => void;
  onNotifySuccess: (msg: string) => void;
}

export default function AIPromptWidget({
  currentUser,
  onUpdateCurrentUser,
  onAddHabits,
  onNotifySuccess
}: AIPromptWidgetProps) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<{
    updatedFocus: string;
    suggestedHabits: { name: string; emoji: string; category: string }[];
  } | null>(null);

  // Preset quick triggers for students
  const presets = [
    {
      label: "Web Developer Starter",
      text: "I want to learn Full Stack React Web Development. Set my focus and add 3 habits.",
    },
    {
      label: "Board Exam Prep Routine",
      text: "Optimize my routine for board exams. Add 1 hour Math practice, revise science, and set focus to Board Prep.",
    },
    {
      label: "Healthy Mind & Body",
      text: "Add daily workout, drink water, and practice meditation routines. Focus: Peak Fitness.",
    },
  ];

  const handleLinkAIStudio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    setError(null);
    setPreviewData(null);

    try {
      const response = await fetch("/api/gemini/update-habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          currentFocus: currentUser.hobbies,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "An error occurred while linking with AI Studio");
      }

      setPreviewData({
        updatedFocus: data.updatedFocus,
        suggestedHabits: data.suggestedHabits || [],
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to establish link with AI Studio developer engine");
    } finally {
      setLoading(false);
    }
  };

  const applyUpdates = () => {
    if (!previewData) return;

    // 1. Update Focus Hobbies of the user
    const users: User[] = JSON.parse(localStorage.getItem("ledger_users") || "[]");
    const updatedUsers = users.map((u) => {
      if (u.id === currentUser.id) {
        return { ...u, hobbies: previewData.updatedFocus };
      }
      return u;
    });
    localStorage.setItem("ledger_users", JSON.stringify(updatedUsers));
    
    // Sync current user state
    const matched = updatedUsers.find((u) => u.id === currentUser.id);
    if (matched) {
      onUpdateCurrentUser(matched);
    }

    // 2. Add habits to parent sheet state
    onAddHabits(previewData.suggestedHabits);

    // Notify success
    onNotifySuccess("AI Link successful! Habit Board and student Focus optimized successfully!");

    // Reset widget form
    setPrompt("");
    setPreviewData(null);
  };

  return (
    <div className="bg-zinc-950 border border-zinc-800 p-6 relative overflow-hidden">
      {/* Visual accents */}
      <div className="absolute top-0 left-0 w-16 h-[1px] bg-orange-500/20"></div>
      <div className="absolute top-0 left-0 w-[1px] h-16 bg-orange-500/20"></div>

      <div className="space-y-1 mb-5">
        <div className="flex items-center gap-2">
          <span className="p-1 bg-orange-500/10 border border-orange-500/20 text-orange-500 rounded-none shrink-0">
            <Sparkles className="w-4 h-4 animate-pulse" />
          </span>
          <span className="text-[10px] font-mono font-bold text-orange-500 uppercase tracking-widest">
            GOOGLE AI STUDIO CO-PROCESSOR
          </span>
        </div>
        <h2 className="text-xl font-black text-white uppercase tracking-tight font-sans">
          Developer Link Prompt Engine
        </h2>
        <p className="text-xs text-zinc-500 font-mono">
          Enter any natural language goal or routine instruction. Gemini will automatically rewrite your profile and setup optimized checkboxes on your ledger!
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Input prompt form */}
        <div className="lg:col-span-7 space-y-4">
          <form onSubmit={handleLinkAIStudio} className="space-y-3">
            <div className="relative">
              <textarea
                placeholder="Examples: 'Add a routine for organic chemistry revision and set my focus to NEET preparation' or 'Setup daily web programming practices...'"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={loading}
                className="w-full h-24 bg-zinc-900 border border-zinc-850 p-3 text-xs font-sans text-zinc-100 placeholder-zinc-600 focus:outline-hidden focus:ring-1 focus:ring-orange-500 resize-none"
                maxLength={250}
              />
              <div className="absolute bottom-2.5 right-3 text-[9px] font-mono text-zinc-600">
                {prompt.length}/250 chars
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              {/* Presets */}
              <div className="flex flex-wrap gap-1.5 max-w-full">
                {presets.map((preset, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setPrompt(preset.text)}
                    disabled={loading}
                    className="px-2 py-1 text-[9px] font-mono font-bold bg-zinc-900 hover:bg-zinc-850 border border-zinc-850 text-zinc-400 hover:text-orange-400 transition-all cursor-pointer rounded-none"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                disabled={loading || !prompt.trim()}
                className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-black font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shrink-0"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>LINKING...</span>
                  </>
                ) : (
                  <>
                    <Terminal className="w-3.5 h-3.5" />
                    <span>LINK & COMPILE</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Error Notice */}
          {error && (
            <div className="p-3 bg-red-950/20 border border-red-900/30 text-red-400 text-xs font-mono flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
              <div>
                <span className="font-bold uppercase block">AI Studio Link Error</span>
                <p className="text-[10px] text-zinc-500 mt-0.5">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Dynamic preview block */}
        <div className="lg:col-span-5 bg-zinc-900/40 border border-zinc-850 p-4 relative min-h-[140px] flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-8 h-[1px] bg-orange-500/10"></div>
          
          <AnimatePresence mode="wait">
            {previewData ? (
              <motion.div
                key="preview-active"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="space-y-4 flex-1 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5 text-[9px] font-mono font-bold text-orange-400 uppercase">
                    <Zap className="w-3.5 h-3.5 fill-orange-500/10" />
                    <span>LINK COMPILED SUCCESSFULLY</span>
                  </div>

                  {/* Focus update */}
                  <div className="space-y-1 bg-zinc-950 p-2.5 border border-zinc-900">
                    <span className="text-[8px] font-mono text-zinc-500 uppercase">Target Student Focus</span>
                    <p className="text-xs font-bold text-white uppercase">{previewData.updatedFocus}</p>
                  </div>

                  {/* Habits generated list */}
                  <div className="space-y-1.5">
                    <span className="text-[8px] font-mono text-zinc-500 uppercase block">Suggested Checkbox Routines</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {previewData.suggestedHabits.map((habit, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 p-1.5 bg-zinc-950/50 border border-zinc-900 text-[10px]">
                          <span className="text-xs">{habit.emoji}</span>
                          <div className="truncate">
                            <p className="font-bold text-zinc-200 truncate">{habit.name}</p>
                            <span className="text-[7px] font-mono text-zinc-500 uppercase">{habit.category}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  onClick={applyUpdates}
                  className="w-full py-2 bg-orange-500 hover:bg-orange-600 text-black font-extrabold text-xs uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2 mt-4"
                >
                  <Check className="w-4 h-4 stroke-[2.5px]" />
                  <span>ACCEPT & WRITE CHANGES</span>
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="preview-empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="my-auto text-center py-6 space-y-2"
              >
                <Terminal className="w-8 h-8 text-zinc-800 mx-auto" />
                <h4 className="text-xs font-black text-zinc-500 uppercase">Awaiting Link Stream</h4>
                <p className="text-[10px] text-zinc-600 font-mono max-w-xs mx-auto">
                  Type or click a quick preset on the left, then click "Link & Compile" to see updates before saving.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
}

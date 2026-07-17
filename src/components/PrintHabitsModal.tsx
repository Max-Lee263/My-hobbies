import React, { useState, useMemo } from "react";
import { X, Printer, CheckCircle2, FileText, Download, Star } from "lucide-react";
import { Habit, User } from "../types";
import { MONTH_NAMES, CalendarDay } from "../utils";

interface PrintHabitsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  habits: Habit[];
  days: CalendarDay[];
  logs: Record<string, string[]>;
  currentMonth: number;
  currentYear: number;
  stats: {
    completionRate: number;
    perfectDaysCount: number;
    totalCompletions: number;
    longestStreak: number;
  };
}

export default function PrintHabitsModal({
  isOpen,
  onClose,
  currentUser,
  habits,
  days,
  logs,
  currentMonth,
  currentYear,
  stats,
}: PrintHabitsModalProps) {
  const [printFormat, setPrintFormat] = useState<"summary" | "grid" | "all">("all");

  if (!isOpen) return null;

  // Calculate stats per habit for table display
  const habitStatsList = habits.map((habit) => {
    let completedCount = 0;
    days.forEach((day) => {
      if (logs[day.dateKey]?.includes(habit.id)) {
        completedCount++;
      }
    });
    const rate = days.length > 0 ? Math.round((completedCount / days.length) * 100) : 0;
    return {
      ...habit,
      completedCount,
      rate,
    };
  });

  const triggerPrint = () => {
    // Generate a temporary styling block to make printing pristine
    const style = document.createElement("style");
    style.id = "print-styles-temp";
    style.innerHTML = `
      @media print {
        body * {
          visibility: hidden !important;
        }
        #printable-area-preview, #printable-area-preview * {
          visibility: visible !important;
        }
        #printable-area-preview {
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          width: 100% !important;
          margin: 0 !important;
          padding: 20px !important;
          background: white !important;
          color: black !important;
          font-family: 'Inter', sans-serif !important;
        }
        .print-no-break {
          page-break-inside: avoid !important;
        }
        /* Ensure table borders and headers look crisp in print */
        table {
          border-collapse: collapse !important;
          width: 100% !important;
        }
        th, td {
          border: 1px solid #000 !important;
          padding: 8px !important;
          color: black !important;
        }
        th {
          background-color: #f3f4f6 !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        /* Style adjustments for light mode printing */
        .text-zinc-400, .text-zinc-500, .text-zinc-600 {
          color: #374151 !important;
        }
        .text-white {
          color: black !important;
        }
        .bg-zinc-900, .bg-zinc-950 {
          background: transparent !important;
          border-color: #000 !important;
        }
        .border-zinc-800, .border-zinc-850 {
          border-color: #ccc !important;
        }
        /* Hide UI modal wrappers and buttons */
        .no-print-element {
          display: none !important;
        }
      }
    `;
    document.head.appendChild(style);

    window.print();

    // Clean up temporary style block after print modal opens/closes
    setTimeout(() => {
      const el = document.getElementById("print-styles-temp");
      if (el) el.remove();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in no-print-element">
      <div className="bg-zinc-950 border border-zinc-800 w-full max-w-4xl max-h-[90vh] flex flex-col relative rounded-none shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-4 bg-zinc-900 border-b border-zinc-850 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1 bg-orange-500/10 border border-orange-500/20 text-orange-500">
              <Printer className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider font-mono">
                Print Ledger / Save PDF Preview
              </h3>
              <p className="text-[10px] font-mono text-zinc-500">
                Generate high-resolution printable cards & tracking sheets
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Configurations Bar */}
        <div className="p-4 bg-zinc-900/60 border-b border-zinc-850 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-zinc-400 uppercase">Select Format:</span>
            <div className="flex bg-zinc-950 border border-zinc-850 p-1">
              <button
                onClick={() => setPrintFormat("all")}
                className={`px-3 py-1 text-[11px] font-mono font-bold uppercase transition-all ${
                  printFormat === "all" ? "bg-orange-500 text-black font-extrabold" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Full Report
              </button>
              <button
                onClick={() => setPrintFormat("summary")}
                className={`px-3 py-1 text-[11px] font-mono font-bold uppercase transition-all ${
                  printFormat === "summary" ? "bg-orange-500 text-black font-extrabold" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Hobby Summary
              </button>
              <button
                onClick={() => setPrintFormat("grid")}
                className={`px-3 py-1 text-[11px] font-mono font-bold uppercase transition-all ${
                  printFormat === "grid" ? "bg-orange-500 text-black font-extrabold" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Blank Grid Sheet
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <p className="text-[10px] font-mono text-zinc-500 hidden md:block">
              💡 Tip: Choose "Save as PDF" as your printer destination to download a digital document.
            </p>
            <button
              onClick={triggerPrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-black text-xs font-black uppercase tracking-wider transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 stroke-[2.5px]" />
              <span>Launch Print / PDF</span>
            </button>
          </div>
        </div>

        {/* Printable Viewport Preview */}
        <div className="flex-1 overflow-y-auto p-6 bg-zinc-900/30 text-zinc-100 flex justify-center">
          
          <div 
            id="printable-area-preview"
            className="w-full max-w-[210mm] bg-white text-black p-8 font-sans shadow-md border border-zinc-200 text-[12px] leading-relaxed"
            style={{ minHeight: "297mm" }} // Standard A4 Aspect Ratio representation
          >
            {/* BRAND HEADER */}
            <div className="border-b-2 border-black pb-4 mb-6 flex justify-between items-end">
              <div>
                <h1 className="text-xl font-black uppercase tracking-widest font-sans m-0">
                  ACTIVE LEDGER
                </h1>
                <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest m-0 mt-1">
                  OFFICIAL HABITS & HOBBIES ACCOUNTABILITY BOARD
                </p>
              </div>
              <div className="text-right font-mono text-[9px] text-zinc-600">
                <span>Date Generated: {new Date().toLocaleDateString()}</span>
                <br />
                <span className="font-bold text-black">Active Room Period: {MONTH_NAMES[currentMonth]} {currentYear}</span>
              </div>
            </div>

            {/* MEMBER PROFILE */}
            <div className="grid grid-cols-2 gap-4 bg-zinc-50 border border-zinc-200 p-4 mb-6">
              <div>
                <span className="text-[8px] font-mono text-zinc-500 uppercase block">BOARD MEMBER</span>
                <span className="text-sm font-black uppercase text-black">{currentUser.name}</span>
                <span className="text-[10px] text-zinc-600 block mt-0.5">Email: {currentUser.email}</span>
                {currentUser.mobile && (
                  <span className="text-[10px] text-zinc-600 block">Mobile: +91 {currentUser.mobile}</span>
                )}
              </div>
              <div>
                <span className="text-[8px] font-mono text-zinc-500 uppercase block">FOCUS AREA / INTERESTS</span>
                <span className="text-[11px] font-bold text-zinc-800 block">
                  {currentUser.hobbies || "General Habit Tracking & Self Development"}
                </span>
                <span className="text-[8px] font-mono text-zinc-500 uppercase block mt-2">MONTHLY MILESTONES</span>
                <span className="text-[10px] text-zinc-700 block">
                  Completion Rate: <strong className="text-black">{Math.round(stats.completionRate)}%</strong> | Longest Streak: <strong className="text-black">{stats.longestStreak} days</strong>
                </span>
              </div>
            </div>

            {/* FORMAT 1: SUMMARY OF SET HOBBIES / HABITS */}
            {(printFormat === "all" || printFormat === "summary") && (
              <div className="mb-6 print-no-break">
                <h3 className="text-xs font-black uppercase tracking-wider mb-2 border-b border-black pb-1">
                  📋 SET HOBBIES & ROUTINES LIST
                </h3>
                
                <table className="w-full text-left text-[11px]">
                  <thead>
                    <tr className="bg-zinc-100 border-b border-zinc-300">
                      <th className="p-2 font-mono uppercase text-[9px] w-12 text-center">Icon</th>
                      <th className="p-2 font-mono uppercase text-[9px]">Hobby / Routine Title</th>
                      <th className="p-2 font-mono uppercase text-[9px] w-32">Tab Category</th>
                      <th className="p-2 font-mono uppercase text-[9px] w-28 text-center">This Month Check-ins</th>
                      <th className="p-2 font-mono uppercase text-[9px] w-24 text-center">Score Ratio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {habitStatsList.map((habit) => (
                      <tr key={habit.id} className="border-b border-zinc-200 hover:bg-zinc-50">
                        <td className="p-2 text-center text-lg">{habit.emoji}</td>
                        <td className="p-2 font-bold text-black">{habit.name}</td>
                        <td className="p-2 text-zinc-600 uppercase font-mono text-[9px]">{habit.category || "Routine"}</td>
                        <td className="p-2 text-center font-mono">{habit.completedCount} / {days.length} days</td>
                        <td className="p-2 text-center font-mono font-bold text-black">{habit.rate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* FORMAT 2: DYNAMIC GRID SHEET / PRINTABLE CALENDAR BOARD */}
            {(printFormat === "all" || printFormat === "grid") && (
              <div className="print-no-break">
                <h3 className="text-xs font-black uppercase tracking-wider mb-2 border-b border-black pb-1 flex justify-between items-center">
                  <span>📅 MONTHLY TRACKING SHEET & PROGRESS LEDGER</span>
                  <span className="text-[8px] font-mono text-zinc-500 normal-case">
                    {printFormat === "grid" ? "(Blank spaces for manual tracking / offline sheet)" : "(Pre-filled checkmark records)"}
                  </span>
                </h3>

                <table className="w-full text-left text-[9px] border-collapse">
                  <thead>
                    <tr className="bg-zinc-100">
                      <th className="p-1 border border-black font-mono uppercase text-[8px] w-16">Date</th>
                      <th className="p-1 border border-black font-mono uppercase text-[8px] w-10 text-center">Day</th>
                      {habits.map(h => (
                        <th key={h.id} className="p-1 border border-black font-mono uppercase text-[8px] text-center" style={{ maxWidth: "80px" }}>
                          <span className="block text-sm">{h.emoji}</span>
                          <span className="block truncate text-[7px]" title={h.name}>{h.name}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {days.map((day) => {
                      const completedIds = logs[day.dateKey] || [];

                      return (
                        <tr key={day.dateKey} className="border-b border-zinc-200">
                          <td className="p-1 border border-zinc-300 font-mono font-bold text-black">{day.dateKey.split("-")[2]} {MONTH_NAMES[currentMonth].slice(0, 3)}</td>
                          <td className="p-1 border border-zinc-300 font-mono text-zinc-500 text-center uppercase">{day.dayOfWeekShort}</td>
                          {habits.map((habit) => {
                            const isChecked = completedIds.includes(habit.id);
                            
                            return (
                              <td key={habit.id} className="p-1 border border-zinc-300 text-center">
                                {printFormat === "grid" ? (
                                  // Printable empty circles/boxes for offline handwriting
                                  <span className="inline-block w-3.5 h-3.5 border border-zinc-400 rounded-none bg-white"></span>
                                ) : (
                                  // Pre-filled status
                                  isChecked ? (
                                    <span className="font-bold text-emerald-600 text-xs">✓</span>
                                  ) : (
                                    <span className="text-zinc-200">-</span>
                                  )
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* OFF-LINE REFLECTIONS FOOTER */}
            <div className="mt-8 pt-6 border-t border-dashed border-zinc-400 print-no-break">
              <span className="text-[8px] font-mono text-zinc-500 uppercase block">OFFLINE NOTES & MONTHLY REFLECTIONS</span>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div className="border border-zinc-200 h-20 p-2 relative bg-zinc-50/50">
                  <span className="text-[8px] font-mono text-zinc-400">Wins & Completed Targets This Month:</span>
                  <div className="absolute bottom-1 right-2 text-[8px] font-mono text-zinc-300">Active Ledger Co.</div>
                </div>
                <div className="border border-zinc-200 h-20 p-2 relative bg-zinc-50/50">
                  <span className="text-[8px] font-mono text-zinc-400">Teammate Motivation / Habit Corrections needed:</span>
                  <div className="absolute bottom-1 right-2 text-[8px] font-mono text-zinc-300">Active Ledger Co.</div>
                </div>
              </div>

              <div className="flex justify-between items-center mt-6 text-[8px] font-mono text-zinc-400">
                <span>Certified by: {currentUser.name} ({currentUser.email})</span>
                <span>Active Ledger Accountability Engine v2.0 - Clean Print Format</span>
              </div>
            </div>

          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-zinc-900 border-t border-zinc-850 flex justify-end gap-3 no-print-element">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-black uppercase tracking-widest text-zinc-400 hover:text-white hover:bg-zinc-800 border border-transparent hover:border-zinc-850 rounded-none transition-colors cursor-pointer"
          >
            Close Preview
          </button>
          
          <button
            onClick={triggerPrint}
            className="flex items-center gap-2 px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-black text-xs font-black uppercase tracking-widest transition-all cursor-pointer shadow-md"
          >
            <Printer className="w-4 h-4 stroke-[2.5px]" />
            <span>Print or Save to PDF</span>
          </button>
        </div>

      </div>
    </div>
  );
}

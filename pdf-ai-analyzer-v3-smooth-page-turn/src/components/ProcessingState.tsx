import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { FileText, CheckCircle2, Sparkles, BrainCircuit } from "lucide-react";
import { ProcessingStep } from "../types";

interface ProcessingStateProps {
  filename: string;
  fileSize: number;
}

const STEPS: { key: ProcessingStep; title: string; detail: string }[] = [
  {
    key: "reading",
    title: "Reading your PDF...",
    detail: "Parsing document structure, text, and embedded tables",
  },
  {
    key: "understanding",
    title: "Understanding the document...",
    detail: "Analyzing core themes, context, and semantic meaning",
  },
  {
    key: "extracting",
    title: "Extracting important information...",
    detail: "Identifying key metrics, dates, and essential highlights",
  },
  {
    key: "preparing",
    title: "Preparing your AI assistant...",
    detail: "Finalizing summary and setting up your document workspace",
  },
];

export const ProcessingState: React.FC<ProcessingStateProps> = ({
  filename,
  fileSize,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentStepIndex((prev) => (prev < STEPS.length - 1 ? prev + 1 : prev));
    }, 1800);
    return () => clearInterval(timer);
  }, []);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const currentStep = STEPS[currentStepIndex];
  const progressPercent = ((currentStepIndex + 1) / STEPS.length) * 100;

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-16 sm:py-24 text-center">
      {/* File Card Preview */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="inline-flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white border border-slate-200 shadow-xs mb-8"
      >
        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
          <FileText className="w-4 h-4" />
        </div>
        <div className="text-left">
          <p className="text-sm font-semibold text-slate-800 truncate max-w-[260px] sm:max-w-xs">
            {filename}
          </p>
          <p className="text-xs text-slate-400">{formatSize(fileSize)}</p>
        </div>
      </motion.div>

      {/* Main Animated AI Icon */}
      <div className="relative w-20 h-20 mx-auto mb-8 flex items-center justify-center">
        <motion.div
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
          className="absolute inset-0 rounded-3xl bg-indigo-50 border border-indigo-100"
        />
        <BrainCircuit className="w-10 h-10 text-indigo-600 relative z-10" />
      </div>

      {/* Active Headline Transition */}
      <div className="h-16 mb-6 flex flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep.key}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
            className="space-y-1"
          >
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              {currentStep.title}
            </h2>
            <p className="text-sm text-slate-500">{currentStep.detail}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Subtle Progress Bar */}
      <div className="w-full max-w-md mx-auto mb-10">
        <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-indigo-600 rounded-full"
            initial={{ width: "15%" }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          />
        </div>
      </div>

      {/* Structured Checklist Steps */}
      <div className="max-w-md mx-auto space-y-2.5 text-left">
        {STEPS.map((step, idx) => {
          const isDone = idx < currentStepIndex;
          const isCurrent = idx === currentStepIndex;

          return (
            <div
              key={step.key}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl border transition-all duration-200 ${
                isCurrent
                  ? "bg-white border-indigo-200 shadow-xs text-slate-900"
                  : isDone
                  ? "bg-slate-50/80 border-slate-200 text-slate-700"
                  : "bg-transparent border-transparent text-slate-400"
              }`}
            >
              <div className="flex-shrink-0">
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                ) : isCurrent ? (
                  <Sparkles className="w-4 h-4 text-indigo-600 animate-pulse" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-slate-300" />
                )}
              </div>
              <span className="text-sm font-medium">{step.title}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

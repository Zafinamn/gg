import React, { useState } from "react";
import {
  Sparkles,
  CheckCircle2,
  Calendar,
  Hash,
  Copy,
  Check,
  Tag,
  BookOpen,
  Clock,
  Layers,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { DocumentAnalysis } from "../types";

interface AiOverviewProps {
  analysis: DocumentAnalysis;
  filename: string;
}

export const AiOverview: React.FC<AiOverviewProps> = ({ analysis, filename }) => {
  const [copied, setCopied] = useState(false);
  const [isSectionsExpanded, setIsSectionsExpanded] = useState(true);

  const handleCopySummary = () => {
    const textToCopy = `Document Summary: ${filename}\n\n${analysis.summary}\n\nKey Points:\n${analysis.keyPoints
      .map((kp) => `• ${kp}`)
      .join("\n")}`;

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div id="ai-document-overview" className="space-y-6">
      {/* Overview Header */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg text-white flex items-center justify-center shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Document Summary
            </h2>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="font-medium text-slate-700">{analysis.documentType || "Document"}</span>
              {analysis.readingTimeMinutes && (
                <>
                  <span className="text-slate-300">•</span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    ~{analysis.readingTimeMinutes} min read
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <button
          id="btn-copy-summary"
          type="button"
          onClick={handleCopySummary}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-600 transition-colors cursor-pointer"
          title="Copy summary to clipboard"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-emerald-700 font-semibold">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-slate-400" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Short Summary Description */}
      <div className="space-y-1">
        <p className="text-sm leading-relaxed text-slate-600 font-normal">
          {analysis.summary}
        </p>
      </div>

      {/* Key Insights (Matching Sleek Interface p-4 bg-indigo-50 border-l-4 border-indigo-500) */}
      {analysis.keyPoints && analysis.keyPoints.length > 0 && (
        <div className="p-4 bg-indigo-50 border-l-4 border-indigo-500 rounded-r-xl">
          <h3 className="text-sm font-bold text-indigo-900 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-indigo-600" />
            <span>Key Insights ({analysis.keyPoints.length})</span>
          </h3>
          <ul className="space-y-2.5">
            {analysis.keyPoints.map((point, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-sm text-slate-700 leading-relaxed">
                <span className="text-indigo-500 font-bold mt-0.5">•</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Important Numbers & Dates Grid (Matching Sleek Interface grid-cols-2 p-3 bg-slate-50 border border-slate-100 rounded-xl) */}
      {analysis.importantData && analysis.importantData.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Hash className="w-3.5 h-3.5 text-slate-400" />
            <span>Key Metrics & Critical Dates</span>
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {analysis.importantData.map((item, idx) => {
              const isDate = item.category?.toLowerCase() === "date";
              return (
                <div
                  key={idx}
                  className="p-3 bg-slate-50 border border-slate-100 rounded-xl shadow-2xs flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate" title={item.label}>
                      {isDate ? "Critical Date" : (item.label || "Key Number")}
                    </span>
                    {isDate ? (
                      <Calendar className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                    ) : (
                      <Hash className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                    )}
                  </div>
                  <div className="text-lg sm:text-xl font-bold text-slate-800 truncate" title={item.value}>
                    {item.value}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate mt-0.5" title={item.label}>
                    {item.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Important Sections */}
      {analysis.importantSections && analysis.importantSections.length > 0 && (
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={() => setIsSectionsExpanded(!isSectionsExpanded)}
            className="w-full flex items-center justify-between py-1 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-slate-700 cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              <span>Document Sections ({analysis.importantSections.length})</span>
            </div>
            {isSectionsExpanded ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {isSectionsExpanded && (
            <div className="space-y-2">
              {analysis.importantSections.map((sec, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-slate-50 border border-slate-100"
                >
                  <h4 className="text-xs font-bold text-slate-800 mb-1">
                    {sec.title}
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {sec.description}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main Topics tags */}
      {analysis.mainTopics && analysis.mainTopics.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-slate-400" />
            <span>Document Topics</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {analysis.mainTopics.map((topic, idx) => (
              <span
                key={idx}
                className="px-3 py-1 rounded-full border border-slate-200 text-xs font-medium text-slate-600 bg-white"
              >
                {topic}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

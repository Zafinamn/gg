import React from "react";
import { BookOpen, Moon, Sparkles, Sun, UploadCloud } from "lucide-react";
import { UploadedDocument } from "../types";
import { GGLogo } from "./GGLogo";

interface HeaderProps {
  currentDocument: UploadedDocument | null;
  onUploadNew: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentDocument, onUploadNew, isDarkMode, onToggleTheme }) => {
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <header
      className={`sticky top-0 z-40 w-full border-b px-4 py-3 backdrop-blur-xl transition-colors duration-300 sm:px-7 ${
        isDarkMode ? "border-white/10 bg-[#070b17]/85" : "border-slate-200/80 bg-white/85"
      }`}
    >
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border p-1.5 shadow-sm ${
              isDarkMode ? "border-white/10 bg-white/[0.06]" : "border-slate-200 bg-white"
            }`}
          >
            <GGLogo className="h-full w-full" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={`truncate text-base font-bold tracking-tight sm:text-lg ${isDarkMode ? "text-white" : "text-slate-900"}`}>GG</span>
              <span className={`hidden h-4 w-px sm:block ${isDarkMode ? "bg-white/15" : "bg-slate-200"}`} />
              <span className={`hidden truncate text-sm sm:block ${isDarkMode ? "text-slate-300" : "text-slate-500"}`}>PDF каталог үзүүлэгч</span>
            </div>
            <div className={`mt-0.5 flex items-center gap-1.5 text-[11px] font-medium ${isDarkMode ? "text-indigo-300" : "text-indigo-600"}`}>
              <Sparkles className="h-3 w-3" /> Ухаалаг PDF туршлага
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {currentDocument ? (
            <>
              <div className={`hidden items-center gap-2 rounded-full border px-3 py-1.5 text-xs md:flex ${isDarkMode ? "border-white/10 bg-white/[0.05] text-slate-300" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                <span className="max-w-[180px] truncate font-semibold">{currentDocument.name}</span>
                <span className={isDarkMode ? "text-slate-500" : "text-slate-400"}>{formatSize(currentDocument.size)}</span>
              </div>
              <button
                id="btn-header-upload-new"
                type="button"
                onClick={onUploadNew}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-3.5 py-2 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-500/15 active:scale-95 dark:text-indigo-200"
              >
                <UploadCloud className="h-4 w-4" />
                <span className="hidden sm:inline">Шинэ PDF оруулах</span>
                <span className="sm:hidden">Шинэ</span>
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <div className={`hidden items-center gap-2 rounded-full border px-3.5 py-2 text-xs sm:flex ${isDarkMode ? "border-white/10 bg-white/[0.04] text-slate-300" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
                <BookOpen className={`h-3.5 w-3.5 ${isDarkMode ? "text-indigo-300" : "text-indigo-500"}`} /> Интерактив каталог
              </div>
              <button
                type="button"
                onClick={onToggleTheme}
                aria-label={isDarkMode ? "Цайвар горимд шилжих" : "Харанхуй горимд шилжих"}
                title={isDarkMode ? "Цайвар горим" : "Харанхуй горим"}
                className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border transition ${
                  isDarkMode
                    ? "border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/20 hover:bg-white/[0.08]"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

import React from "react";
import { BookOpen, Moon, Sparkles, UploadCloud } from "lucide-react";
import { UploadedDocument } from "../types";
import { GGLogo } from "./GGLogo";

interface HeaderProps {
  currentDocument: UploadedDocument | null;
  onUploadNew: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentDocument, onUploadNew }) => {
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#070b17]/85 px-4 py-3 backdrop-blur-xl sm:px-7">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] p-1.5 shadow-[0_8px_30px_rgba(67,86,255,0.12)]">
            <GGLogo className="h-full w-full" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate text-base font-bold tracking-tight text-white sm:text-lg">GG</span>
              <span className="hidden h-4 w-px bg-white/15 sm:block" />
              <span className="hidden truncate text-sm text-slate-300 sm:block">PDF AI Analyzer · Каталог үзүүлэгч</span>
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-indigo-300/80">
              <Sparkles className="h-3 w-3" /> Ухаалаг PDF туршлага
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {currentDocument ? (
            <>
              <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs text-slate-300 md:flex">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                <span className="max-w-[180px] truncate font-semibold text-slate-200">{currentDocument.name}</span>
                <span className="text-slate-500">{formatSize(currentDocument.size)}</span>
              </div>
              <button
                id="btn-header-upload-new"
                type="button"
                onClick={onUploadNew}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-indigo-400/20 bg-indigo-500/15 px-3.5 py-2 text-xs font-semibold text-indigo-200 transition hover:border-indigo-300/30 hover:bg-indigo-500/25 active:scale-95"
              >
                <UploadCloud className="h-4 w-4" />
                <span className="hidden sm:inline">Каталог оруулах</span>
                <span className="sm:hidden">New</span>
              </button>
            </>
          ) : (
            <>
              <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs text-slate-300 sm:flex">
                <BookOpen className="h-3.5 w-3.5 text-indigo-300" /> Интерактив каталог
              </div>
              <button type="button" aria-label="Theme" className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-slate-300 transition hover:border-white/20 hover:bg-white/[0.08]">
                <Moon className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

import React, { useState, useRef } from "react";
import { AlertCircle, ArrowUpRight, BookOpen, FileSearch, FolderOpen, Maximize2, MousePointer2, Search, Sparkles, UploadCloud, Volume2 } from "lucide-react";
import { motion } from "motion/react";

interface UploadZoneProps {
  onFileSelected: (fileData: { base64: string; name: string; size: number }) => void;
  isUploading: boolean;
  uploadProgress?: number;
  errorMessage?: string | null;
  onClearError?: () => void;
  isDarkMode: boolean;
}

const features = [
  { icon: BookOpen, title: "Бодит хуудас эргүүлэх", text: "Каталогоо ном шиг үзээрэй." },
  { icon: Search, title: "Zoom & Loupe", text: "Жижиг деталиа ойртуулж харна." },
  { icon: FileSearch, title: "Ухаалаг хайлт", text: "PDF дотроос хэрэгтэй мэдээллээ олоорой." },
  { icon: Maximize2, title: "Дэлгэц дүүрэн", text: "Тухтай, цэвэр унших орчин." },
];

export const UploadZone: React.FC<UploadZoneProps> = ({ onFileSelected, isUploading, uploadProgress = 0, errorMessage, onClearError, isDarkMode }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeError = errorMessage || localError;

  const handleFile = (file: File) => {
    setLocalError(null);
    onClearError?.();
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) return setLocalError("Зөвхөн PDF файл оруулна уу.");
    const MAX_SIZE = 100 * 1024 * 1024;
    if (file.size > MAX_SIZE) return setLocalError("PDF файл 100MB-аас их байж болохгүй.");
    if (file.size === 0) return setLocalError("Сонгосон PDF файл хоосон байна.");

    const reader = new FileReader();
    reader.onload = () => onFileSelected({ base64: reader.result as string, name: file.name, size: file.size });
    reader.onerror = () => setLocalError("PDF файлыг уншихад алдаа гарлаа. Дахин оролдоно уу.");
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false); };
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false); if (e.dataTransfer.files?.length) handleFile(e.dataTransfer.files[0]); };
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files?.length) handleFile(e.target.files[0]); };

  const surface = isDarkMode ? "border-white/[0.08] bg-white/[0.025]" : "border-slate-200 bg-white";
  const muted = isDarkMode ? "text-slate-400" : "text-slate-500";
  const heading = isDarkMode ? "text-white" : "text-slate-900";

  return (
    <section className="relative mx-auto w-full max-w-[1440px] px-4 pb-8 pt-8 sm:px-7 sm:pb-10 sm:pt-12">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[620px] overflow-hidden">
        <div className="absolute left-[10%] top-0 h-80 w-80 rounded-full bg-indigo-600/10 blur-[110px]" />
        <div className="absolute right-[8%] top-24 h-96 w-96 rounded-full bg-violet-600/10 blur-[130px]" />
      </div>

      <div className="grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14 xl:gap-20">
        <div className="relative max-w-2xl">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
            <h1 className={`text-4xl font-extrabold leading-[1.05] tracking-[-0.035em] sm:text-5xl xl:text-6xl ${heading}`}>
              PDF файлаа
              <br />
              <span className="bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 bg-clip-text text-transparent">интерактив каталогоор</span>
              <br />
              хялбар үзээрэй
            </h1>
          </motion.div>

          <div className="mt-7 grid max-w-xl grid-cols-2 gap-3 sm:grid-cols-4">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div key={feature.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 * index, duration: 0.35 }} className={`rounded-2xl border p-3.5 transition ${surface}`}>
                  <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${isDarkMode ? "bg-indigo-500/10 text-indigo-300" : "bg-indigo-50 text-indigo-600"}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <p className={`text-[12px] font-semibold leading-5 ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>{feature.title}</p>
                  <p className={`mt-1 hidden text-[11px] leading-4 sm:block ${muted}`}>{feature.text}</p>
                </motion.div>
              );
            })}
          </div>

          <div className={`mt-7 hidden items-center gap-6 text-xs md:flex ${muted}`}>
            <span className="flex items-center gap-2"><MousePointer2 className="h-4 w-4 text-indigo-500" /> Чирж оруулах</span>
            <span className={`h-4 w-px ${isDarkMode ? "bg-white/10" : "bg-slate-200"}`} />
            <span className="flex items-center gap-2"><Volume2 className="h-4 w-4 text-indigo-500" /> Хуудасны дуу</span>
            <span className={`h-4 w-px ${isDarkMode ? "bg-white/10" : "bg-slate-200"}`} />
            <span className="flex items-center gap-2"><FolderOpen className="h-4 w-4 text-indigo-500" /> 100MB хүртэл</span>
          </div>
        </div>

        <motion.div initial={{ opacity: 0, x: 20, scale: 0.98 }} animate={{ opacity: 1, x: 0, scale: 1 }} transition={{ duration: 0.5, delay: 0.08 }} className="relative">
          <div className="absolute -inset-5 rounded-[34px] bg-gradient-to-br from-indigo-500/10 via-blue-500/5 to-violet-500/10 blur-2xl" />
          <div
            id="pdf-upload-card"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`group relative cursor-pointer rounded-[28px] border p-4 transition-all duration-300 sm:p-6 ${
              isDragOver
                ? "border-indigo-400 bg-indigo-500/[0.10] shadow-[0_0_60px_rgba(99,102,241,0.18)]"
                : isDarkMode
                  ? "border-white/[0.10] bg-[#0d1424]/85 shadow-[0_24px_80px_rgba(0,0,0,0.30)] backdrop-blur-2xl hover:border-indigo-400/30"
                  : "border-slate-200 bg-white/90 shadow-[0_24px_80px_rgba(30,41,59,0.10)] backdrop-blur-2xl hover:border-indigo-300"
            }`}
          >
            <input ref={fileInputRef} type="file" accept=".pdf,application/pdf" onChange={handleInputChange} className="hidden" id="pdf-file-input" />
            <div className={`rounded-[22px] border border-dashed px-5 py-10 text-center sm:px-8 sm:py-14 ${isDarkMode ? "border-indigo-300/25 bg-white/[0.02]" : "border-indigo-200 bg-indigo-50/30"}`}>
              <div className={`mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-[24px] border ${isDarkMode ? "border-indigo-300/15 bg-indigo-500/10 text-indigo-300" : "border-indigo-200 bg-white text-indigo-500 shadow-sm"} transition duration-300 group-hover:scale-105`}>
                <UploadCloud className="h-9 w-9" />
              </div>
              <p className={`text-xl font-bold tracking-tight sm:text-2xl ${heading}`}>PDF файлаа энд чирж оруулна уу</p>
              <p className={`mt-2 text-sm ${muted}`}>эсвэл төхөөрөмжөөсөө сонгоно уу</p>
              <button type="button" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }} className="mt-7 inline-flex cursor-pointer items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-400 px-7 py-3.5 text-sm font-bold text-white shadow-[0_10px_30px_rgba(79,70,229,0.22)] transition hover:-translate-y-0.5 active:translate-y-0">
                <FolderOpen className="h-4 w-4" /> PDF файл сонгох <ArrowUpRight className="h-4 w-4 opacity-70" />
              </button>
              <p className={`mt-4 text-xs ${muted}`}>Зөвхөн PDF файл · Дээд хэмжээ 100MB</p>
            </div>

            {isUploading && (
              <div className={`mt-5 rounded-2xl border p-4 ${isDarkMode ? "border-white/[0.06] bg-white/[0.025]" : "border-slate-200 bg-slate-50"}`}>
                <div className={`mb-2 flex justify-between text-xs font-medium ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}><span>Каталог ачаалж байна...</span><span>{Math.round(uploadProgress)}%</span></div>
                <div className={`h-2 overflow-hidden rounded-full ${isDarkMode ? "bg-white/[0.06]" : "bg-slate-200"}`}><div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-200" style={{ width: `${uploadProgress}%` }} /></div>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      <div className={`mt-12 grid grid-cols-2 divide-x border-y py-6 sm:mt-14 sm:grid-cols-2 ${isDarkMode ? "divide-white/[0.08] border-white/[0.07]" : "divide-slate-200 border-slate-200"}`}>
        <div className="text-center"><p className={`text-xl font-bold sm:text-2xl ${heading}`}>100MB</p><p className={`mt-1 text-[11px] ${muted}`}>Файлын дээд хэмжээ</p></div>
        <div className="text-center"><p className="text-xl font-bold text-indigo-500 sm:text-2xl">3D</p><p className={`mt-1 text-[11px] ${muted}`}>Интерактив каталог</p></div>
      </div>

      {activeError && (
        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className={`mx-auto mt-4 flex max-w-3xl items-start gap-3 rounded-2xl border p-4 text-sm ${isDarkMode ? "border-red-400/20 bg-red-500/10 text-red-200" : "border-red-200 bg-red-50 text-red-700"}`}>
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="font-medium">{activeError}</p>
        </motion.div>
      )}

      <footer className={`mt-8 flex flex-col items-center justify-between gap-2 text-[11px] sm:flex-row ${muted}`}>
        <span>© 2025 GG. Бүх эрх хуулиар хамгаалагдсан.</span>
      </footer>
    </section>
  );
};

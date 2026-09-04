import React, { useState, useRef } from "react";
import {
  AlertCircle,
  ArrowUpRight,
  BookOpen,
  BrainCircuit,
  FileSearch,
  FolderOpen,
  Maximize2,
  MousePointer2,
  Search,
  Sparkles,
  UploadCloud,
  Volume2,
} from "lucide-react";
import { motion } from "motion/react";

interface UploadZoneProps {
  onFileSelected: (fileData: { base64: string; name: string; size: number }) => void;
  isUploading: boolean;
  uploadProgress?: number;
  errorMessage?: string | null;
  onClearError?: () => void;
}

const features = [
  { icon: BookOpen, title: "Бодит хуудас эргүүлэлт", text: "Каталогоо жинхэнэ ном шиг үзээрэй." },
  { icon: Search, title: "Zoom & Loupe", text: "Бүтээгдэхүүн болон жижиг деталийг тодорхой харна." },
  { icon: BrainCircuit, title: "AI дүн шинжилгээ", text: "Баримтаас хэрэгтэй мэдээллийг хурдан гаргана." },
  { icon: FileSearch, title: "Ухаалаг хайлт", text: "PDF дотроос хэрэгтэй мэдээллээ хурдан олоорой." },
  { icon: Maximize2, title: "Дэлгэц дүүрэн харах", text: "Цэвэр, тухтай унших орчин." },
];

export const UploadZone: React.FC<UploadZoneProps> = ({
  onFileSelected,
  isUploading,
  uploadProgress = 0,
  errorMessage,
  onClearError,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeError = errorMessage || localError;

  const handleFile = (file: File) => {
    setLocalError(null);
    onClearError?.();

    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      setLocalError("Зөв PDF каталог файл оруулна уу. Бусад төрлийн баримтыг дэмжихгүй.");
      return;
    }
    const MAX_SIZE = 100 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setLocalError("Энэ PDF 100MB-ийн хязгаараас хэтэрсэн байна. Бага хэмжээтэй файл сонгоно уу.");
      return;
    }
    if (file.size === 0) {
      setLocalError("Сонгосон PDF файл хоосон байна. Өөр файл сонгоно уу.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      onFileSelected({ base64: reader.result as string, name: file.name, size: file.size });
    };
    reader.onerror = () => setLocalError("PDF файлыг уншихад алдаа гарлаа. Дахин оролдоно уу.");
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDragOver(false);
    if (e.dataTransfer.files?.length) handleFile(e.dataTransfer.files[0]);
  };
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) handleFile(e.target.files[0]);
  };

  return (
    <section className="relative mx-auto w-full max-w-[1440px] px-4 pb-8 pt-8 sm:px-7 sm:pb-10 sm:pt-12">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[620px] overflow-hidden">
        <div className="absolute left-[10%] top-0 h-80 w-80 rounded-full bg-indigo-600/15 blur-[110px]" />
        <div className="absolute right-[8%] top-24 h-96 w-96 rounded-full bg-violet-600/12 blur-[130px]" />
        <div className="absolute left-1/2 top-44 h-56 w-56 -translate-x-1/2 rounded-full bg-blue-500/10 blur-[100px]" />
      </div>

      <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.02fr] lg:gap-14 xl:gap-20">
        <div className="relative max-w-2xl">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-500/[0.08] px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.25em] text-indigo-300">
              <Sparkles className="h-3.5 w-3.5" /> Ухаалаг PDF туршлага
            </div>
            <h1 className="text-5xl font-black leading-[0.98] tracking-[-0.045em] text-white sm:text-6xl xl:text-[78px]">
              Таны PDF файлууд
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-violet-400 bg-clip-text text-transparent">Илүү ухаалаг, интерактив</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-slate-400 sm:text-lg">
              PDF файлаа байршуулж, дүн шинжилгээ хийж, урьд өмнөхөөс илүү хялбар судлаарай. Баримтаа интерактив каталог болгон ашиглаарай.
            </p>
          </motion.div>

          <div className="mt-8 grid max-w-xl grid-cols-2 gap-3 sm:grid-cols-5">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 * index, duration: 0.35 }}
                  className="group rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3 transition hover:border-indigo-400/20 hover:bg-white/[0.05]"
                >
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-300 ring-1 ring-inset ring-indigo-400/10">
                    <Icon className="h-4 w-4" />
                  </div>
                  <p className="text-[11px] font-bold leading-4 text-slate-200">{feature.title}</p>
                  <p className="mt-1 hidden text-[10px] leading-4 text-slate-500 sm:block">{feature.text}</p>
                </motion.div>
              );
            })}
          </div>

          <div className="mt-8 hidden items-center gap-7 text-sm text-slate-500 md:flex">
            <span className="flex items-center gap-2"><MousePointer2 className="h-4 w-4 text-indigo-300" /> Чирж оруулах</span>
            <span className="h-4 w-px bg-white/10" />
            <span className="flex items-center gap-2"><Volume2 className="h-4 w-4 text-indigo-300" /> Хуудас эргүүлэх дуу</span>
            <span className="h-4 w-px bg-white/10" />
            <span className="flex items-center gap-2"><FolderOpen className="h-4 w-4 text-indigo-300" /> 100MB хүртэл</span>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, x: 20, scale: 0.98 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.08 }}
          className="relative"
        >
          <div className="absolute -inset-5 rounded-[34px] bg-gradient-to-br from-indigo-500/15 via-blue-500/5 to-violet-500/15 blur-2xl" />
          <div
            id="pdf-upload-card"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`group relative cursor-pointer rounded-[28px] border p-5 transition-all duration-300 sm:p-7 ${
              isDragOver
                ? "border-indigo-400 bg-indigo-500/[0.10] shadow-[0_0_60px_rgba(99,102,241,0.18)]"
                : "border-white/[0.10] bg-[#0d1424]/80 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-2xl hover:border-indigo-400/30 hover:bg-[#10182a]"
            }`}
          >
            <input ref={fileInputRef} type="file" accept=".pdf,application/pdf" onChange={handleInputChange} className="hidden" id="pdf-file-input" />

            <div className="rounded-[22px] border border-dashed border-indigo-300/25 bg-gradient-to-b from-white/[0.035] to-transparent px-5 py-10 text-center sm:px-8 sm:py-14">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-[24px] border border-indigo-300/15 bg-gradient-to-br from-indigo-500/15 to-violet-500/10 text-indigo-300 shadow-[0_15px_45px_rgba(79,70,229,0.15)] transition duration-300 group-hover:scale-105 group-hover:border-indigo-300/30">
                <UploadCloud className="h-9 w-9" />
              </div>
              <p className="text-2xl font-bold tracking-tight text-white">PDF файлаа энд чирж оруулна уу</p>
              <p className="mt-2 text-sm text-slate-400">эсвэл төхөөрөмжөөсөө сонгоно уу</p>

              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                className="mt-7 inline-flex cursor-pointer items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-400 px-7 py-3.5 text-sm font-bold text-white shadow-[0_10px_30px_rgba(79,70,229,0.28)] transition hover:-translate-y-0.5 hover:shadow-[0_15px_40px_rgba(79,70,229,0.36)] active:translate-y-0"
              >
                <FolderOpen className="h-4 w-4" /> PDF файл сонгох <ArrowUpRight className="h-4 w-4 opacity-70" />
              </button>
              <p className="mt-4 text-xs text-slate-500">Зөвхөн PDF файл · Дээд хэмжээ 100MB</p>
            </div>

            {isUploading && (
              <div className="mt-5 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4">
                <div className="mb-2 flex justify-between text-xs font-medium text-slate-300"><span>Каталог ачаалж байна...</span><span>{Math.round(uploadProgress)}%</span></div>
                <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]"><div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-200" style={{ width: `${uploadProgress}%` }} /></div>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      <div className="mt-12 grid grid-cols-3 divide-x divide-white/[0.08] border-y border-white/[0.07] py-6 sm:mt-14">
        <div className="text-center"><p className="text-xl font-black text-white sm:text-2xl">100MB</p><p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-slate-500">PDF багтаамж</p></div>
        <div className="text-center"><p className="text-xl font-black text-indigo-300 sm:text-2xl">AI</p><p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-slate-500">Ухаалаг дүн шинжилгээ</p></div>
        <div className="text-center"><p className="text-xl font-black text-white sm:text-2xl">3D</p><p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-slate-500">Каталог үзэх</p></div>
      </div>

      {activeError && (
        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="mx-auto mt-4 flex max-w-3xl items-start gap-3 rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />
          <p className="font-medium">{activeError}</p>
        </motion.div>
      )}

      <footer className="mt-8 flex flex-col items-center justify-between gap-2 text-[11px] text-slate-600 sm:flex-row">
        <span>© 2025 GG. Бүх эрх хуулиар хамгаалагдсан.</span>
      </footer>
    </section>
  );
};

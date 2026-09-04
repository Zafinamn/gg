/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Header } from "./components/Header";
import { UploadZone } from "./components/UploadZone";
import { VirtualCatalogViewer } from "./components/VirtualCatalogViewer";
import { UploadedDocument } from "./types";

export default function App() {
  const [currentDoc, setCurrentDoc] = useState<UploadedDocument | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSharedView, setIsSharedView] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("pdf-ai-theme") !== "light";
  });

  useEffect(() => {
    localStorage.setItem("pdf-ai-theme", isDarkMode ? "dark" : "light");
    document.documentElement.style.colorScheme = isDarkMode ? "dark" : "light";
  }, [isDarkMode]);

  // Open shared catalog links directly at /share/:id. Shared viewers are read-only:
  // they do not expose the new-upload flow and can simply copy the current link.
  useEffect(() => {
    const match = window.location.pathname.match(/^\/share\/([^/]+)\/?$/);
    if (!match) return;

    const catalogId = decodeURIComponent(match[1]);
    setIsSharedView(true);
    setErrorMessage(null);
    setUploadProgress(35);

    let cancelled = false;
    let sharedBlobUrl = "";

    const loadSharedCatalog = async () => {
      try {
        const response = await fetch(`/api/catalogs/${encodeURIComponent(catalogId)}`);
        const data = await response.json();
        if (!response.ok || !data?.pdfBase64) {
          throw new Error(data?.error || "Каталогийн холбоос олдсонгүй.");
        }

        const cleanBase64 = String(data.pdfBase64).replace(/^data:application\/pdf;base64,/, "").trim();
        const binary = atob(cleanBase64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        sharedBlobUrl = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));

        if (cancelled) {
          URL.revokeObjectURL(sharedBlobUrl);
          return;
        }

        setCurrentDoc({
          id: data.id || catalogId,
          name: data.filename || "G&G Catalog.pdf",
          size: data.fileSize || Math.round(cleanBase64.length * 0.75),
          base64: `data:application/pdf;base64,${cleanBase64}`,
          blobUrl: sharedBlobUrl,
        });
        setUploadProgress(100);
      } catch (error: any) {
        if (cancelled) return;
        console.error("Failed to load shared catalog:", error);
        setUploadProgress(0);
        setErrorMessage(error?.message || "Каталогийг нээж чадсангүй.");
      }
    };

    loadSharedCatalog();
    return () => {
      cancelled = true;
      if (sharedBlobUrl) URL.revokeObjectURL(sharedBlobUrl);
    };
  }, []);

  const handleFileSelected = (fileData: { base64: string; name: string; size: number }) => {
    setErrorMessage(null);
    setUploadProgress(35);

    try {
      const cleanBase64 = fileData.base64.replace(/^data:application\/pdf;base64,/, "").trim();
      const binary = atob(cleanBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blobUrl = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));

      setUploadProgress(100);
      setCurrentDoc({
        id: `doc-${Date.now()}`,
        name: fileData.name,
        size: fileData.size,
        base64: fileData.base64,
        blobUrl,
      });
    } catch (err) {
      console.error("Failed to load PDF into virtual catalog:", err);
      setUploadProgress(0);
      setErrorMessage("PDF файлыг уншиж чадсангүй. Өөр файл сонгоно уу.");
    }
  };

  const handleUploadNew = () => {
    if (currentDoc?.blobUrl) URL.revokeObjectURL(currentDoc.blobUrl);
    setCurrentDoc(null);
    setUploadProgress(0);
    setErrorMessage(null);
  };

  return (
    <div
      className={`min-h-screen antialiased transition-colors duration-300 ${
        isDarkMode
          ? "bg-[#070b17] text-slate-100 selection:bg-indigo-500 selection:text-white"
          : "bg-[#f6f8fc] text-slate-900 selection:bg-indigo-200 selection:text-slate-900"
      }`}
    >
      <Header
        currentDocument={currentDoc}
        onUploadNew={handleUploadNew}
        isDarkMode={isDarkMode}
        onToggleTheme={() => setIsDarkMode((value) => !value)}
        isSharedView={isSharedView}
      />
      <main className="relative min-h-[calc(100vh-65px)] overflow-hidden">
        <AnimatePresence mode="wait">
          {!currentDoc && (
            <motion.div
              key="upload-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <UploadZone
                onFileSelected={handleFileSelected}
                isUploading={uploadProgress > 0 && uploadProgress < 100}
                uploadProgress={uploadProgress}
                errorMessage={errorMessage}
                onClearError={() => setErrorMessage(null)}
                isDarkMode={isDarkMode}
              />
            </motion.div>
          )}

          {currentDoc && (
            <motion.div
              key="catalog-view"
              initial={{ opacity: 0, scale: 0.99 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.99 }}
              transition={{ duration: 0.25 }}
              className="flex h-[calc(100vh-65px)] w-full flex-col p-2 sm:p-4"
            >
              <div className="flex h-full w-full flex-col">
                <VirtualCatalogViewer pdfBase64={currentDoc.base64} filename={currentDoc.name} isSharedView={isSharedView} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

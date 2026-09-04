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
import { AdminDashboard } from "./components/AdminDashboard";

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
    const shareParams = new URLSearchParams(window.location.search);
    const directBlobUrl = shareParams.get("src");
    setIsSharedView(true);
    setErrorMessage(null);
    setUploadProgress(35);

    let cancelled = false;

    const loadSharedCatalog = async () => {
      try {
        // Shared links are intentionally self-contained at the catalog ID level.
        // Resolve the actual public Blob URL server-side so the browser never
        // has to infer/validate a Blob hostname from a stale upload URL.
        let data: any = null;
        let lastError: any = null;
        for (let attempt = 0; attempt < 8; attempt++) {
          try {
            const response = await fetch(`/api/catalog?id=${encodeURIComponent(catalogId)}`, {
              cache: "no-store",
            });
            const json = await response.json().catch(() => ({}));
            if (response.ok && json?.url) {
              data = json;
              break;
            }
            lastError = new Error(json?.error || "Каталогийн холбоос олдсонгүй.");
          } catch (fetchError) {
            lastError = fetchError;
          }
          await new Promise((resolve) => window.setTimeout(resolve, 750));
        }

        if (!data?.url) {
          throw lastError || new Error("Каталогийн холбоос олдсонгүй.");
        }

        if (cancelled) return;
        setCurrentDoc({
          id: data.id || catalogId,
          name: data.filename || "G&G Catalog.pdf",
          size: data.fileSize || 0,
          base64: "",
          blobUrl: "",
          pdfUrl: data.url,
        });
        setUploadProgress(100);
        fetch("/api/analytics-open", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ catalogId: data.id || catalogId, filename: data.filename || "G&G Catalog.pdf" }),
          keepalive: true,
        }).catch(() => {});
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

  if (typeof window !== "undefined" && window.location.pathname === "/admin") {
    return <AdminDashboard />;
  }

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
                <VirtualCatalogViewer pdfBase64={currentDoc.base64} pdfUrl={currentDoc.pdfUrl} filename={currentDoc.name} isSharedView={isSharedView} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

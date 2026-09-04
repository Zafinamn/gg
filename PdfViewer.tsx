import React, { useEffect, useRef, useState, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Minimize2,
  Search,
  X,
  FileText,
  Loader2,
  AlertTriangle,
} from "lucide-react";

// Set worker source to CDN matching pdfjs-dist
if (typeof window !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || "4.10.38"}/pdf.worker.min.mjs`;
}

interface PdfViewerProps {
  pdfBase64: string;
  filename: string;
}

interface SearchMatch {
  page: number;
  snippet: string;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({ pdfBase64, filename }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [zoom, setZoom] = useState(1.0);
  const [isLoading, setIsLoading] = useState(true);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Search state
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchMatch[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);

  // Load PDF Document
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setRenderError(null);

    const loadPdf = async () => {
      try {
        const cleanBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, "").trim();
        const binaryString = atob(cleanBase64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        const loadingTask = pdfjsLib.getDocument({
          data: bytes,
          cMapUrl: "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/cmaps/",
          cMapPacked: true,
        });

        const doc = await loadingTask.promise;
        if (isMounted) {
          setPdfDoc(doc);
          setTotalPages(doc.numPages);
          setCurrentPage(1);
          setIsLoading(false);
        }
      } catch (err: any) {
        console.error("PDF load error:", err);
        if (isMounted) {
          setRenderError("Failed to render PDF preview. You can still ask questions with the AI assistant.");
          setIsLoading(false);
        }
      }
    };

    loadPdf();

    return () => {
      isMounted = false;
    };
  }, [pdfBase64]);

  // Render active page to canvas
  const renderPage = useCallback(
    async (pageNum: number, scaleFactor: number) => {
      if (!pdfDoc || !canvasRef.current) return;

      try {
        const page = await pdfDoc.getPage(pageNum);
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) return;

        // Determine base container width for responsive scaling
        const containerWidth = containerRef.current?.clientWidth || 600;
        const unscaledViewport = page.getViewport({ scale: 1.0 });
        const autoFitScale = (containerWidth - 48) / unscaledViewport.width;
        const effectiveScale = (autoFitScale > 0 ? autoFitScale : 1.0) * scaleFactor;

        // High DPI resolution adjustment
        const pixelRatio = window.devicePixelRatio || 1;
        const viewport = page.getViewport({ scale: effectiveScale });

        canvas.width = viewport.width * pixelRatio;
        canvas.height = viewport.height * pixelRatio;
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
          canvas: canvas,
        };

        await page.render(renderContext).promise;
      } catch (err: any) {
        console.error("Page render error:", err);
      }
    },
    [pdfDoc]
  );

  useEffect(() => {
    if (pdfDoc && !isLoading) {
      renderPage(currentPage, zoom);
    }
  }, [pdfDoc, currentPage, zoom, isLoading, renderPage]);

  // Resize listener to re-render nicely
  useEffect(() => {
    const handleResize = () => {
      if (pdfDoc && !isLoading) {
        renderPage(currentPage, zoom);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [pdfDoc, currentPage, zoom, isLoading, renderPage]);

  // Handle page navigation
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage((p) => p + 1);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((p) => p - 1);
    }
  };

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val) && val >= 1 && val <= totalPages) {
      setCurrentPage(val);
    }
  };

  // Zoom controls
  const zoomIn = () => setZoom((z) => Math.min(2.5, +(z + 0.15).toFixed(2)));
  const zoomOut = () => setZoom((z) => Math.max(0.6, +(z - 0.15).toFixed(2)));
  const resetZoom = () => setZoom(1.0);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // Search inside PDF
  const performSearch = async (query: string) => {
    if (!pdfDoc || !query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    const matches: SearchMatch[] = [];
    const lowerQuery = query.toLowerCase();

    for (let p = 1; p <= pdfDoc.numPages; p++) {
      try {
        const page = await pdfDoc.getPage(p);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(" ");

        if (pageText.toLowerCase().includes(lowerQuery)) {
          const idx = pageText.toLowerCase().indexOf(lowerQuery);
          const snippetStart = Math.max(0, idx - 20);
          const snippetEnd = Math.min(pageText.length, idx + query.length + 40);
          const snippet = pageText.substring(snippetStart, snippetEnd);
          matches.push({ page: p, snippet: snippet.trim() });
        }
      } catch {
        // continue
      }
    }

    setSearchResults(matches);
    setCurrentMatchIndex(0);
    setIsSearching(false);

    if (matches.length > 0) {
      setCurrentPage(matches[0].page);
    }
  };

  const nextMatch = () => {
    if (searchResults.length === 0) return;
    const nextIdx = (currentMatchIndex + 1) % searchResults.length;
    setCurrentMatchIndex(nextIdx);
    setCurrentPage(searchResults[nextIdx].page);
  };

  const prevMatch = () => {
    if (searchResults.length === 0) return;
    const prevIdx = (currentMatchIndex - 1 + searchResults.length) % searchResults.length;
    setCurrentMatchIndex(prevIdx);
    setCurrentPage(searchResults[prevIdx].page);
  };

  return (
    <div
      ref={containerRef}
      id="pdf-preview-container"
      className={`flex flex-col h-full bg-slate-100 rounded-2xl border border-slate-200 overflow-hidden relative ${
        isFullscreen ? "p-4 bg-slate-900" : ""
      }`}
    >
      {/* Top Toolbar (Sleek Interface style) */}
      <div className="h-12 bg-white/90 backdrop-blur px-5 sm:px-6 flex items-center justify-between border-b border-slate-200 text-sm flex-shrink-0 z-10">
        {/* Document Title & Pages Info */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <span className="text-xs font-bold text-slate-400 tracking-wider uppercase">File:</span>
          <span className="text-xs font-medium text-slate-700 truncate max-w-[160px] sm:max-w-[240px]" title={filename}>
            {filename}
          </span>
        </div>

        {/* Right Actions: Search & Fullscreen */}
        <div className="flex items-center gap-2 text-slate-600">
          {/* Search Toggle */}
          <button
            id="pdf-search-toggle-btn"
            type="button"
            onClick={() => setShowSearch(!showSearch)}
            className={`p-1.5 rounded hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer ${
              showSearch ? "bg-slate-100 text-indigo-600 font-semibold" : ""
            }`}
            title="Search inside PDF"
          >
            <Search className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-slate-300" />

          {/* Fullscreen Toggle */}
          <button
            id="pdf-fullscreen-btn"
            type="button"
            onClick={toggleFullscreen}
            className="p-1.5 rounded hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* In-Document Search Bar if active */}
      {showSearch && (
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border-b border-slate-200 text-xs flex-shrink-0 z-10">
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <input
            id="pdf-search-input"
            type="text"
            placeholder="Search text in PDF..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              performSearch(e.target.value);
            }}
            className="flex-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-indigo-500"
          />

          {isSearching && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />}

          {searchResults.length > 0 && (
            <div className="flex items-center gap-1.5 text-slate-600">
              <span className="font-medium">
                {currentMatchIndex + 1} of {searchResults.length}
              </span>
              <button
                type="button"
                onClick={prevMatch}
                className="p-1 rounded hover:bg-slate-200"
                title="Previous match"
              >
                <ChevronLeft className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={nextMatch}
                className="p-1 rounded hover:bg-slate-200"
                title="Next match"
              >
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          )}

          {searchQuery && searchResults.length === 0 && !isSearching && (
            <span className="text-slate-400">No matches found</span>
          )}

          <button
            type="button"
            onClick={() => {
              setShowSearch(false);
              setSearchQuery("");
              setSearchResults([]);
            }}
            className="p-1 text-slate-400 hover:text-slate-700"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Canvas PDF Viewer Stage */}
      <div className="flex-1 overflow-auto p-4 sm:p-8 flex items-center justify-center min-h-[420px] pb-20">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-3 text-slate-500 py-12">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            <p className="text-sm font-medium">Rendering document preview...</p>
          </div>
        ) : renderError ? (
          <div className="flex flex-col items-center justify-center gap-3 text-slate-600 text-center max-w-sm p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
            <AlertTriangle className="w-8 h-8 text-amber-500" />
            <p className="text-sm font-semibold text-slate-800">Preview Notice</p>
            <p className="text-xs text-slate-500">{renderError}</p>
          </div>
        ) : (
          <div className="relative shadow-xl rounded-sm overflow-hidden bg-white border border-slate-300 transform-gpu my-auto">
            <canvas ref={canvasRef} className="block mx-auto max-w-full" />
          </div>
        )}
      </div>

      {/* Floating Bottom Navigation Pill (Matching Sleek Interface mock: absolute bottom-6 rounded-full px-6 py-2) */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-md shadow-lg border border-slate-200 rounded-full px-4 sm:px-6 py-2 flex items-center gap-3 sm:gap-5 z-20">
        <button
          id="pdf-prev-page-btn"
          type="button"
          onClick={goToPrevPage}
          disabled={currentPage <= 1 || isLoading}
          className="text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:hover:text-slate-400 transition-colors cursor-pointer"
          title="Previous page"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <span className="text-xs sm:text-sm font-semibold text-slate-700 min-w-[70px] sm:min-w-[85px] text-center">
          Page {currentPage} of {totalPages}
        </span>

        <button
          id="pdf-next-page-btn"
          type="button"
          onClick={goToNextPage}
          disabled={currentPage >= totalPages || isLoading}
          className="text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:hover:text-slate-400 transition-colors cursor-pointer"
          title="Next page"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        <div className="h-5 w-px bg-slate-200" />

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            id="pdf-zoom-out-btn"
            type="button"
            onClick={zoomOut}
            className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer font-bold text-sm"
            title="Zoom out"
          >
            -
          </button>
          <span className="text-xs sm:text-sm font-medium text-slate-600 min-w-[38px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            id="pdf-zoom-in-btn"
            type="button"
            onClick={zoomIn}
            className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer font-bold text-sm"
            title="Zoom in"
          >
            +
          </button>
          <button
            id="pdf-zoom-reset-btn"
            type="button"
            onClick={resetZoom}
            className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer ml-1"
            title="Reset zoom"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

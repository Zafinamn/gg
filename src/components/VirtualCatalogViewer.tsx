import React, { useState, useEffect, useRef, useCallback } from "react";
import { upload } from "@vercel/blob/client";
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
  BookOpen,
  Volume2,
  VolumeX,
  Play,
  Pause,
  LayoutGrid,
  Bookmark,
  BookmarkCheck,
  SearchCode,
  Loader2,
  HelpCircle,
  FileText,
  Eye,
  SlidersHorizontal,
  MoveHorizontal,
  Hand,
  Share2,
  Link2,
  Check,
} from "lucide-react";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "motion/react";
import { soundEffects } from "../utils/soundEffects";
import { SpreadViewMode, CatalogBookmark } from "../types";
import { GGLogo } from "./GGLogo";

// Configure pdfjs worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

interface VirtualCatalogViewerProps {
  pdfBase64: string;
  pdfUrl?: string;
  filename: string;
  isSharedView?: boolean;
}

export const VirtualCatalogViewer: React.FC<VirtualCatalogViewerProps> = ({
  pdfBase64,
  pdfUrl,
  filename,
  isSharedView = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageViewportRef = useRef<HTMLDivElement>(null);
  const leftCanvasRef = useRef<HTMLCanvasElement>(null);
  const rightCanvasRef = useRef<HTMLCanvasElement>(null);
  const singleCanvasRef = useRef<HTMLCanvasElement>(null);
  const loupeCanvasRef = useRef<HTMLCanvasElement>(null);

  // Pre-rendered canvas references for interactive 3D drag & flip
  const nextRightCanvasRef = useRef<HTMLCanvasElement>(null);
  const nextLeftCanvasRef = useRef<HTMLCanvasElement>(null);
  const prevLeftCanvasRef = useRef<HTMLCanvasElement>(null);
  const prevRightCanvasRef = useRef<HTMLCanvasElement>(null);
  const coverNextCanvasRef = useRef<HTMLCanvasElement>(null);
  const coverBackCanvasRef = useRef<HTMLCanvasElement>(null);
  const singleNextCanvasRef = useRef<HTMLCanvasElement>(null);
  const singleBackCanvasRef = useRef<HTMLCanvasElement>(null);

  // Active rendering tasks map to prevent duplicate / overlapping render calls on the same canvas
  const activeRenderTasks = useRef<Map<HTMLCanvasElement, any>>(new Map());

  // PDF Document State
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [currentPage, setCurrentPage] = useState<number>(1); // In double mode, represents cover (1) or left page (even)
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);

  // Viewing Modes
  const [spreadMode, setSpreadMode] = useState<SpreadViewMode>("double");
  const [zoom, setZoom] = useState<number>(1.0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isFlipping, setIsFlipping] = useState<boolean>(false);
  const [flipDirection, setFlipDirection] = useState<"next" | "prev">("next");

  // Interactive Page Drag & Flip Gesture State
  // Display remains completely stationary, while grabbed page follows cursor in 3D:
  // "grab → drag → page дагаж хөдөлнө → release → flip"
  const [dragSide, setDragSide] = useState<"right" | "left" | "cover" | "backcover" | "single" | null>(null);
  const [isPageDragging, setIsPageDragging] = useState<boolean>(false);
  const [dragActiveDirection, setDragActiveDirection] = useState<"next" | "prev" | null>(null);
  const [showSwipeHint, setShowSwipeHint] = useState<boolean>(true);
  const dragPointerInfo = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startTime: number;
    pageWidth: number;
    side: "right" | "left" | "cover" | "backcover" | "single";
  } | null>(null);

  // Dedicated 3D transform values for smooth, independent leaf flips
  const coverRotateY = useMotionValue(0);
  const rightRotateY = useMotionValue(0);
  const leftRotateY = useMotionValue(0);
  const singleRotateY = useMotionValue(0);

  // Dynamic shadow projections for turning leaves
  const coverCurlShadow = useTransform(coverRotateY, [-180, -90, 0, 90, 180], [0, 0.75, 0, 0.75, 0]);
  const rightCurlShadow = useTransform(rightRotateY, [-180, -90, 0], [0, 0.75, 0]);
  const leftCurlShadow = useTransform(leftRotateY, [0, 90, 180], [0, 0.75, 0]);
  const singleCurlShadow = useTransform(singleRotateY, [-180, -90, 0, 90, 180], [0, 0.75, 0, 0.75, 0]);

  // Dynamic front/back face opacities and visibility per leaf
  const coverFrontOpacity = useTransform(coverRotateY, (v) => (Math.abs(v) > 90 ? 0 : 1));
  const coverBackOpacity = useTransform(coverRotateY, (v) => (Math.abs(v) > 90 ? 1 : 0));
  const coverFrontVisibility = useTransform(coverRotateY, (v) => (Math.abs(v) > 90 ? "hidden" : "visible"));
  const coverBackVisibility = useTransform(coverRotateY, (v) => (Math.abs(v) > 90 ? "visible" : "hidden"));

  const rightFrontOpacity = useTransform(rightRotateY, (v) => (v < -90 ? 0 : 1));
  const rightBackOpacity = useTransform(rightRotateY, (v) => (v < -90 ? 1 : 0));
  const rightFrontVisibility = useTransform(rightRotateY, (v) => (v < -90 ? "hidden" : "visible"));
  const rightBackVisibility = useTransform(rightRotateY, (v) => (v < -90 ? "visible" : "hidden"));

  const leftFrontOpacity = useTransform(leftRotateY, (v) => (v > 90 ? 0 : 1));
  const leftBackOpacity = useTransform(leftRotateY, (v) => (v > 90 ? 1 : 0));
  const leftFrontVisibility = useTransform(leftRotateY, (v) => (v > 90 ? "hidden" : "visible"));
  const leftBackVisibility = useTransform(leftRotateY, (v) => (v > 90 ? "visible" : "hidden"));

  const singleFrontOpacity = useTransform(singleRotateY, (v) => (Math.abs(v) > 90 ? 0 : 1));
  const singleBackOpacity = useTransform(singleRotateY, (v) => (Math.abs(v) > 90 ? 1 : 0));
  const singleFrontVisibility = useTransform(singleRotateY, (v) => (Math.abs(v) > 90 ? "hidden" : "visible"));
  const singleBackVisibility = useTransform(singleRotateY, (v) => (Math.abs(v) > 90 ? "visible" : "hidden"));

  // Interactive Tools
  const [isLoupeActive, setIsLoupeActive] = useState<boolean>(false);
  const [loupePos, setLoupePos] = useState<{ x: number; y: number; visible: boolean }>({
    x: 0,
    y: 0,
    visible: false,
  });
  const [isAutoPlay, setIsAutoPlay] = useState<boolean>(false);
  const [showThumbnails, setShowThumbnails] = useState<boolean>(false);
  const [showBookmarks, setShowBookmarks] = useState<boolean>(false);
  const [bookmarks, setBookmarks] = useState<CatalogBookmark[]>([]);

  // Search State
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<number[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Auto-switch to single page on very narrow viewports
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768 && spreadMode === "double") {
        setSpreadMode("single");
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [spreadMode]);

  // Load PDF Document
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setRenderError(null);

    const loadPdf = async () => {
      try {
        const loadingTask = pdfUrl
          ? pdfjsLib.getDocument({
              url: pdfUrl,
              cMapUrl: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/cmaps/`,
              cMapPacked: true,
            })
          : (() => {
              const cleanBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, "");
              const binaryString = atob(cleanBase64);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              return pdfjsLib.getDocument({
                data: bytes,
                cMapUrl: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/cmaps/`,
                cMapPacked: true,
              });
            })();

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
          setRenderError("Could not load catalog PDF. Please verify the document format.");
          setIsLoading(false);
        }
      }
    };

    loadPdf();
    return () => {
      isMounted = false;
    };
  }, [pdfBase64, pdfUrl]);

  // Helper to render a specific page on a canvas safely
  const renderPageToCanvas = useCallback(
    async (
      pageNum: number,
      canvas: HTMLCanvasElement | null,
      targetWidth: number,
      _targetHeight?: number
    ) => {
      if (!pdfDoc || !canvas || pageNum < 1 || pageNum > totalPages) return;

      // Cancel any ongoing render task on this specific canvas
      const prevTask = activeRenderTasks.current.get(canvas);
      if (prevTask) {
        try {
          prevTask.cancel();
        } catch {}
      }

      try {
        const page = await pdfDoc.getPage(pageNum);
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) return;

        const baseViewport = page.getViewport({ scale: 1.0 });
        const scale = (targetWidth / baseViewport.width) * zoom;
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2.5);
        const viewport = page.getViewport({ scale });

        canvas.width = viewport.width * pixelRatio;
        canvas.height = viewport.height * pixelRatio;
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

        const renderTask = page.render({
          canvasContext: context,
          viewport: viewport,
          canvas: canvas,
        });

        activeRenderTasks.current.set(canvas, renderTask);
        await renderTask.promise;
        activeRenderTasks.current.delete(canvas);
      } catch (err: any) {
        if (err?.name !== "RenderingCancelledException") {
          console.error(`Error rendering catalog page ${pageNum}:`, err);
        }
      }
    },
    [pdfDoc, totalPages, zoom]
  );

  // Render Spread or Single page when page/zoom changes, including preloading adjacent spread pages
  useEffect(() => {
    if (!pdfDoc || isLoading) return;

    const stageWidth = stageViewportRef.current?.clientWidth || containerRef.current?.clientWidth || 900;
    const stageHeight = stageViewportRef.current?.clientHeight || 620;
    // Size from the actual viewing stage, not the outer viewer. This keeps the
    // page proportions stable when switching between 2-page and 1-page modes.
    const usableWidth = Math.max(320, stageWidth - 48);
    const usableHeight = Math.max(320, stageHeight - 72);
    // PDF pages are rendered from their natural aspect ratio, so cap width by
    // the available height as well to prevent the single-page view from growing
    // vertically and appearing cropped after a mode switch.
    const pageAspect = 0.707; // safe A-series fallback; actual PDF ratio is preserved by PDF.js
    const maxWidthFromHeight = usableHeight * pageAspect;

    if (spreadMode === "double") {
      const isBackCoverView = totalPages >= 4 && totalPages % 2 === 0 && currentPage === totalPages;
      if (currentPage === 1) {
        // Front Cover view: single centered page
        const coverWidth = Math.min(Math.max(usableWidth * 0.48, 320), 540, maxWidthFromHeight);
        renderPageToCanvas(1, singleCanvasRef.current, coverWidth);

        // Preload inside cover (Page 2) for back of cover leaf
        if (totalPages >= 2) {
          renderPageToCanvas(2, coverBackCanvasRef.current, coverWidth);
        }
        // Preload Page 3 for revealed stationary sheet underneath
        if (totalPages >= 3) {
          renderPageToCanvas(3, coverNextCanvasRef.current, coverWidth);
        }
      } else if (isBackCoverView) {
        // Back Cover view (end of catalog): single centered page
        const coverWidth = Math.min(Math.max(usableWidth * 0.48, 320), 540, maxWidthFromHeight);
        renderPageToCanvas(totalPages, singleCanvasRef.current, coverWidth);

        // Preload inside back cover (Page totalPages - 1)
        if (totalPages - 1 >= 1) {
          renderPageToCanvas(totalPages - 1, coverBackCanvasRef.current, coverWidth);
        }
        // Preload previous page for stationary sheet underneath
        if (totalPages - 2 >= 1) {
          renderPageToCanvas(totalPages - 2, coverNextCanvasRef.current, coverWidth);
        }
      } else {
        // Double spread view
        const spreadPageWidth = Math.min(Math.max((usableWidth - 24) * 0.47, 280), 480, maxWidthFromHeight);
        const leftPageNum = currentPage % 2 === 0 ? currentPage : currentPage - 1;
        const rightPageNum = leftPageNum + 1;

        // 1. Current visible spread pages
        renderPageToCanvas(leftPageNum, leftCanvasRef.current, spreadPageWidth);
        if (rightPageNum <= totalPages) {
          renderPageToCanvas(rightPageNum, rightCanvasRef.current, spreadPageWidth);
        }

        // 2. Pre-render next spread pages (revealed when dragging right page forward)
        if (rightPageNum + 1 <= totalPages) {
          renderPageToCanvas(rightPageNum + 1, nextLeftCanvasRef.current, spreadPageWidth);
        }
        if (rightPageNum + 2 <= totalPages) {
          renderPageToCanvas(rightPageNum + 2, nextRightCanvasRef.current, spreadPageWidth);
        }

        // 3. Pre-render previous spread pages (revealed when dragging left page backward)
        if (leftPageNum - 1 >= 1) {
          renderPageToCanvas(leftPageNum - 1, prevRightCanvasRef.current, spreadPageWidth);
        }
        if (leftPageNum - 2 >= 1) {
          renderPageToCanvas(leftPageNum - 2, prevLeftCanvasRef.current, spreadPageWidth);
        }
      }
    } else {
      // Single page view
      const singleWidth = Math.min(Math.max(usableWidth * 0.72, 340), 680, maxWidthFromHeight);
      renderPageToCanvas(currentPage, singleCanvasRef.current, singleWidth);
      if (currentPage + 1 <= totalPages) {
        renderPageToCanvas(currentPage + 1, singleNextCanvasRef.current, singleWidth);
        renderPageToCanvas(currentPage + 1, singleBackCanvasRef.current, singleWidth);
      }
    }
  }, [pdfDoc, currentPage, spreadMode, zoom, isLoading, renderPageToCanvas, totalPages]);

  // Turn page forward with realistic 3D leaf flip and audio
  const turnPageForward = () => {
    if (isFlipping) return;
    setShowSwipeHint(false);

    if (soundEnabled) {
      soundEffects.playPageFlip();
    }

    if (spreadMode === "double") {
      const isBackCoverView = totalPages >= 4 && totalPages % 2 === 0 && currentPage === totalPages;
      if (currentPage === 1) {
        // Turning front cover open to page 2
        setIsFlipping(true);
        animate(coverRotateY, -180, {
          duration: 0.52,
          ease: [0.16, 1, 0.3, 1],
          onComplete: () => {
            coverRotateY.set(0);
            setIsFlipping(false);
            setCurrentPage(2);
          },
        });
      } else if (isBackCoverView) {
        // On back cover: loop back to front cover (Page 1)
        setIsFlipping(true);
        animate(coverRotateY, -180, {
          duration: 0.52,
          ease: [0.16, 1, 0.3, 1],
          onComplete: () => {
            coverRotateY.set(0);
            setIsFlipping(false);
            setCurrentPage(1);
          },
        });
      } else {
        const leftPageNum = currentPage % 2 === 0 ? currentPage : currentPage - 1;
        const nextLeft = leftPageNum + 2;

        if (nextLeft <= totalPages) {
          setIsFlipping(true);
          animate(rightRotateY, -180, {
            duration: 0.36,
            ease: [0.22, 1, 0.36, 1],
            onComplete: () => {
              rightRotateY.set(0);
              setIsFlipping(false);
              setCurrentPage(nextLeft);
            },
          });
        } else {
          // Reached the end of the catalog: flip to back cover or loop to front
          setIsFlipping(true);
          animate(rightRotateY, -180, {
            duration: 0.36,
            ease: [0.22, 1, 0.36, 1],
            onComplete: () => {
              rightRotateY.set(0);
              setIsFlipping(false);
              setCurrentPage(1);
            },
          });
        }
      }
    } else {
      // Single page mode
      if (currentPage < totalPages) {
        setIsFlipping(true);
        animate(singleRotateY, -180, {
          duration: 0.48,
          ease: [0.16, 1, 0.3, 1],
          onComplete: () => {
            singleRotateY.set(0);
            setIsFlipping(false);
            setCurrentPage(currentPage + 1);
          },
        });
      } else {
        // Loop back to Page 1
        setIsFlipping(true);
        animate(singleRotateY, -180, {
          duration: 0.48,
          ease: [0.16, 1, 0.3, 1],
          onComplete: () => {
            singleRotateY.set(0);
            setIsFlipping(false);
            setCurrentPage(1);
          },
        });
      }
    }
  };

  // Turn page backward with realistic 3D leaf flip and audio
  const turnPageBackward = () => {
    if (isFlipping) return;
    setShowSwipeHint(false);

    if (soundEnabled) {
      soundEffects.playPageFlip();
    }

    if (spreadMode === "double") {
      const isBackCoverView = totalPages >= 4 && totalPages % 2 === 0 && currentPage === totalPages;
      if (currentPage <= 2) {
        // On pages 2 & 3: turn back to front cover (Page 1)
        setIsFlipping(true);
        animate(leftRotateY, 180, {
          duration: 0.52,
          ease: [0.16, 1, 0.3, 1],
          onComplete: () => {
            leftRotateY.set(0);
            setIsFlipping(false);
            setCurrentPage(1);
          },
        });
      } else if (isBackCoverView) {
        // On back cover: turn back to the last open spread
        setIsFlipping(true);
        animate(coverRotateY, 180, {
          duration: 0.52,
          ease: [0.16, 1, 0.3, 1],
          onComplete: () => {
            coverRotateY.set(0);
            setIsFlipping(false);
            setCurrentPage(Math.max(1, totalPages - 2));
          },
        });
      } else {
        const leftPageNum = currentPage % 2 === 0 ? currentPage : currentPage - 1;
        const prevLeft = leftPageNum - 2;
        setIsFlipping(true);
        animate(leftRotateY, 180, {
          duration: 0.52,
          ease: [0.16, 1, 0.3, 1],
          onComplete: () => {
            leftRotateY.set(0);
            setIsFlipping(false);
            setCurrentPage(prevLeft <= 1 ? 1 : prevLeft);
          },
        });
      }
    } else {
      if (currentPage > 1) {
        setIsFlipping(true);
        animate(singleRotateY, 180, {
          duration: 0.48,
          ease: [0.16, 1, 0.3, 1],
          onComplete: () => {
            singleRotateY.set(0);
            setIsFlipping(false);
            setCurrentPage(currentPage - 1);
          },
        });
      }
    }
  };

  // Direct turn to page (for bookmarks, search, thumbnails)
  const turnToPage = (newPage: number, direction: "next" | "prev" = "next") => {
    if (newPage < 1 || newPage > totalPages) return;
    if (isFlipping) return;
    setFlipDirection(direction);
    setIsFlipping(true);
    setShowSwipeHint(false);

    if (soundEnabled) {
      soundEffects.playPageFlip();
    }

    setTimeout(() => {
      setCurrentPage(newPage);
      setIsFlipping(false);
    }, 260);
  };

  // Switch view mode without carrying an incompatible spread position or
  // in-progress 3D transform into the new layout. In double mode, page 1 is
  // the cover and interior spreads start on even pages; in single mode the
  // selected page remains the selected page.
  const switchSpreadMode = (mode: SpreadViewMode) => {
    if (mode === spreadMode) return;

    // Finish/clear any visual leaf transforms before changing the layout.
    coverRotateY.set(0);
    leftRotateY.set(0);
    rightRotateY.set(0);
    singleRotateY.set(0);
    setIsPageDragging(false);
    setDragSide(null);
    setDragActiveDirection(null);
    setIsFlipping(false);

    if (mode === "double") {
      // Preserve the currently viewed single page, but snap interior pages to
      // a valid left-hand spread. Page 1 stays the front cover.
      setCurrentPage((page) => {
        if (page <= 1) return 1;
        if (page >= totalPages) return totalPages % 2 === 0 ? totalPages : Math.max(2, totalPages - 1);
        return page % 2 === 0 ? page : Math.max(2, page - 1);
      });
    } else {
      // Keep the exact current page when going from a spread to single-page
      // view, rather than jumping to the spread's left page.
      setCurrentPage((page) => Math.min(Math.max(page, 1), totalPages));
    }

    setSpreadMode(mode);
  };

  const handleNext = () => {
    turnPageForward();
  };

  const handlePrev = () => {
    turnPageBackward();
  };

  // Interactive page grab & drag handlers:
  // "grab → drag → page дагаж хөдөлнө → release → flip"
  // The catalog stage stays completely stationary; only the grabbed page turns in 3D.
  const handleStartPageDrag = (
    e: React.PointerEvent,
    side: "right" | "left" | "cover" | "backcover" | "single"
  ) => {
    if (isLoupeActive || isFlipping) return;
    if (e.button !== 0) return; // primary mouse button or touch only
    setShowSwipeHint(false);

    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const pageWidth = rect.width || 380;

    try {
      target.setPointerCapture(e.pointerId);
    } catch {}

    dragPointerInfo.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startTime: Date.now(),
      pageWidth,
      side,
    };
    setDragSide(side);
    setIsPageDragging(true);

    if (side === "cover" || side === "backcover") coverRotateY.set(0);
    else if (side === "right") rightRotateY.set(0);
    else if (side === "left") leftRotateY.set(0);
    else if (side === "single") singleRotateY.set(0);
  };

  const handlePagePointerMove = (e: React.PointerEvent) => {
    if (!dragPointerInfo.current || !isPageDragging) return;
    const { startX, pageWidth, side } = dragPointerInfo.current;
    const deltaX = e.clientX - startX;

    if (side === "cover") {
      if (deltaX < 0) {
        const distance = -deltaX;
        const progress = Math.min(1, Math.max(0, distance / Math.max(pageWidth * 1.05, 180)));
        coverRotateY.set(-progress * 180);
        setDragActiveDirection(progress > 0.08 ? "next" : null);
      } else {
        const progress = Math.min(0.08, deltaX / (pageWidth * 4));
        coverRotateY.set(progress * 30);
        setDragActiveDirection(null);
      }
    } else if (side === "backcover") {
      if (deltaX > 0) {
        const distance = deltaX;
        const progress = Math.min(1, Math.max(0, distance / Math.max(pageWidth * 1.05, 180)));
        coverRotateY.set(progress * 180);
        setDragActiveDirection(progress > 0.08 ? "prev" : null);
      } else {
        const progress = Math.min(0.08, -deltaX / (pageWidth * 4));
        coverRotateY.set(-progress * 30);
        setDragActiveDirection(null);
      }
    } else if (side === "right") {
      if (deltaX < 0) {
        const distance = -deltaX;
        const progress = Math.min(1, Math.max(0, distance / Math.max(pageWidth * 1.05, 180)));
        rightRotateY.set(-progress * 180);
        setDragActiveDirection(progress > 0.08 ? "next" : null);
      } else {
        const progress = Math.min(0.08, deltaX / (pageWidth * 4));
        rightRotateY.set(progress * 30);
        setDragActiveDirection(null);
      }
    } else if (side === "left") {
      if (deltaX > 0) {
        const distance = deltaX;
        const progress = Math.min(1, Math.max(0, distance / Math.max(pageWidth * 1.05, 180)));
        leftRotateY.set(progress * 180);
        setDragActiveDirection(progress > 0.08 ? "prev" : null);
      } else {
        const progress = Math.min(0.08, -deltaX / (pageWidth * 4));
        leftRotateY.set(-progress * 30);
        setDragActiveDirection(null);
      }
    } else if (side === "single") {
      if (deltaX < 0) {
        const progress = Math.min(1, Math.max(0, -deltaX / Math.max(pageWidth * 0.9, 180)));
        singleRotateY.set(-progress * 180);
        setDragActiveDirection(progress > 0.08 ? "next" : null);
      } else {
        const progress = Math.min(1, Math.max(0, deltaX / Math.max(pageWidth * 0.9, 180)));
        singleRotateY.set(progress * 180);
        setDragActiveDirection(progress > 0.08 ? "prev" : null);
      }
    }
  };

  const handlePagePointerUp = (e: React.PointerEvent) => {
    if (!dragPointerInfo.current) return;
    const { startX, startTime, side } = dragPointerInfo.current;
    const deltaX = e.clientX - startX;
    const deltaTime = Math.max(1, Date.now() - startTime);
    const absDelta = Math.abs(deltaX);
    const velocity = absDelta / deltaTime;

    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}

    const isQuickClick = absDelta < 6 && deltaTime < 350;

    if (isQuickClick) {
      if (side === "cover" || side === "backcover") coverRotateY.set(0);
      else if (side === "right") rightRotateY.set(0);
      else if (side === "left") leftRotateY.set(0);
      else if (side === "single") singleRotateY.set(0);

      setIsPageDragging(false);
      setDragSide(null);
      dragPointerInfo.current = null;
      setDragActiveDirection(null);

      if (side === "right" || side === "cover") {
        turnPageForward();
      } else if (side === "left" || side === "backcover") {
        turnPageBackward();
      } else if (side === "single") {
        turnPageForward();
      }
      return;
    }

    const activeMotion =
      side === "cover" || side === "backcover"
        ? coverRotateY
        : side === "right"
        ? rightRotateY
        : side === "left"
        ? leftRotateY
        : singleRotateY;

    const currentAngle = activeMotion.get();
    const currentAbsAngle = Math.abs(currentAngle);
    // If dragged past 35 deg or flick velocity > 0.3 px/ms, complete the flip ("release → flip")
    const isFlip = currentAbsAngle > 35 || (velocity > 0.3 && currentAbsAngle > 15);

    if (isFlip) {
      const targetAngle = currentAngle < 0 ? -180 : 180;
      if (soundEnabled) {
        soundEffects.playPageFlip();
      }

      animate(activeMotion, targetAngle, {
        duration: 0.42,
        ease: [0.16, 1, 0.3, 1],
        onComplete: () => {
          activeMotion.set(0);
          setIsPageDragging(false);
          setDragSide(null);
          dragPointerInfo.current = null;
          setDragActiveDirection(null);

          if (side === "cover") {
            setCurrentPage(2);
          } else if (side === "backcover") {
            setCurrentPage(Math.max(1, totalPages - 2));
          } else if (side === "right") {
            const leftPageNum = currentPage % 2 === 0 ? currentPage : currentPage - 1;
            const nextLeft = leftPageNum + 2;
            if (nextLeft <= totalPages) {
              setCurrentPage(nextLeft);
            } else {
              setCurrentPage(1);
            }
          } else if (side === "left") {
            if (currentPage <= 2) {
              setCurrentPage(1);
            } else {
              const leftPageNum = currentPage % 2 === 0 ? currentPage : currentPage - 1;
              const prevLeft = leftPageNum - 2;
              setCurrentPage(prevLeft <= 1 ? 1 : prevLeft);
            }
          } else if (side === "single") {
            if (currentAngle < 0) {
              if (currentPage < totalPages) setCurrentPage(currentPage + 1);
              else setCurrentPage(1);
            } else {
              if (currentPage > 1) setCurrentPage(currentPage - 1);
            }
          }
        },
      });
    } else {
      animate(activeMotion, 0, {
        duration: 0.28,
        ease: [0.16, 1, 0.3, 1],
        onComplete: () => {
          activeMotion.set(0);
          setIsPageDragging(false);
          setDragSide(null);
          dragPointerInfo.current = null;
          setDragActiveDirection(null);
        },
      });
    }
  };

  const handlePagePointerCancel = (e: React.PointerEvent) => {
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
    coverRotateY.set(0);
    rightRotateY.set(0);
    leftRotateY.set(0);
    singleRotateY.set(0);
    setIsPageDragging(false);
    setDragSide(null);
    dragPointerInfo.current = null;
    setDragActiveDirection(null);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") {
        e.preventDefault();
        handleNext();
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        handlePrev();
      } else if (e.key === "m" || e.key === "M") {
        setIsLoupeActive((prev) => !prev);
      } else if (e.key === "f" || e.key === "F") {
        toggleFullscreen();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentPage, totalPages, spreadMode, soundEnabled]);

  // Auto-play / Presentation mode timer
  useEffect(() => {
    if (!isAutoPlay) return;

    const timer = setInterval(() => {
      if (spreadMode === "double") {
        const currentLeft = currentPage === 1 ? 1 : currentPage % 2 === 0 ? currentPage : currentPage - 1;
        if (currentLeft + 2 > totalPages) {
          turnToPage(1, "next"); // loop to cover
        } else {
          handleNext();
        }
      } else {
        if (currentPage >= totalPages) {
          turnToPage(1, "next");
        } else {
          handleNext();
        }
      }
    }, 4500);

    return () => clearInterval(timer);
  }, [isAutoPlay, currentPage, totalPages, spreadMode]);

  // Magnifier / Loupe mouse movement handler
  const handleMouseMoveLoupe = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isLoupeActive) return;

    const stage = e.currentTarget;
    const rect = stage.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setLoupePos({ x, y, visible: true });

    // Draw magnified snapshot to loupeCanvas
    const loupeCanvas = loupeCanvasRef.current;
    if (!loupeCanvas) return;
    const loupeCtx = loupeCanvas.getContext("2d");
    if (!loupeCtx) return;

    // Detect which underlying canvas we are over
    const targetCanvas =
      singleCanvasRef.current ||
      (x < rect.width / 2 ? leftCanvasRef.current : rightCanvasRef.current);

    if (targetCanvas) {
      const targetRect = targetCanvas.getBoundingClientRect();
      const canvasX = (e.clientX - targetRect.left) * (targetCanvas.width / targetRect.width);
      const canvasY = (e.clientY - targetRect.top) * (targetCanvas.height / targetRect.height);

      loupeCtx.clearRect(0, 0, loupeCanvas.width, loupeCanvas.height);
      loupeCtx.save();
      loupeCtx.beginPath();
      loupeCtx.arc(100, 100, 100, 0, Math.PI * 2);
      loupeCtx.clip();

      const sourceSize = 90;
      loupeCtx.drawImage(
        targetCanvas,
        canvasX - sourceSize / 2,
        canvasY - sourceSize / 2,
        sourceSize,
        sourceSize,
        0,
        0,
        200,
        200
      );
      loupeCtx.restore();
    }
  };

  const handleMouseLeaveLoupe = () => {
    setLoupePos((prev) => ({ ...prev, visible: false }));
  };

  // Bookmark toggle for current view
  const isCurrentBookmarked = bookmarks.some((b) => b.pageNumber === currentPage);
  const toggleBookmark = () => {
    if (isCurrentBookmarked) {
      setBookmarks((prev) => prev.filter((b) => b.pageNumber !== currentPage));
    } else {
      const newBm: CatalogBookmark = {
        id: `bm-${Date.now()}`,
        pageNumber: currentPage,
        title:
          currentPage === 1
            ? "Catalog Cover"
            : spreadMode === "double"
            ? `Pages ${currentPage % 2 === 0 ? currentPage : currentPage - 1}-${
                (currentPage % 2 === 0 ? currentPage : currentPage - 1) + 1
              }`
            : `Page ${currentPage}`,
        createdAt: Date.now(),
      };
      setBookmarks((prev) => [...prev, newBm]);
    }
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Search inside PDF
  const handlePerformSearch = async (query: string) => {
    if (!pdfDoc || !query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    const matches: number[] = [];
    const normalizedQuery = query.toLowerCase();

    try {
      for (let i = 1; i <= totalPages; i++) {
        const page = await pdfDoc.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str || "")
          .join(" ")
          .toLowerCase();

        if (pageText.includes(normalizedQuery)) {
          matches.push(i);
        }
      }
      setSearchResults(matches);
      if (matches.length > 0) {
        turnToPage(matches[0], "next");
      }
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setIsSearching(false);
    }
  };

  // Copy during a direct user click. For the initial Share action, the PDF upload
  // is asynchronous, so we show the generated URL and let the user press the
  // explicit Copy button; this preserves browser user-gesture clipboard rules.
  const copyTextSynchronously = (text: string): boolean => {
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.readOnly = true;
      textarea.setAttribute("aria-hidden", "true");
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      textarea.style.top = "0";
      textarea.style.width = "1px";
      textarea.style.height = "1px";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.focus({ preventScroll: true });
      textarea.select();
      textarea.setSelectionRange(0, text.length);
      const copied = document.execCommand("copy");
      textarea.remove();
      return copied;
    } catch {
      return false;
    }
  };

  const copyShareUrlNow = (url: string) => {
    // Use the synchronous browser copy command first because it runs directly
    // inside the user's click event and does not lose the user activation.
    if (copyTextSynchronously(url)) {
      showShareCopied();
      return;
    }

    if (window.isSecureContext && navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(url)
        .then(() => showShareCopied())
        .catch(() => {
          setShareError("Холбоосыг clipboard-д хуулж чадсангүй. Доорх холбоосыг гараар хуулна уу.");
        });
      return;
    }

    setShareError("Холбоосыг clipboard-д хуулж чадсангүй. Доорх холбоосыг гараар хуулна уу.");
  };

  const showShareCopied = () => {
    setShareError(null);
    setShareCopied(true);
    window.setTimeout(() => setShareCopied(false), 2200);
  };

  const handleCopyCurrentShareLink = () => {
    const currentUrl = window.location.href;
    copyShareUrlNow(currentUrl);
  };

  const handleCopyGeneratedShareUrl = () => {
    if (!shareUrl) return;
    copyShareUrlNow(shareUrl);
  };

  const handleShareCatalog = async () => {
    if (isSharing) return;
    setIsSharing(true);
    setShareError(null);
    setShareCopied(false);
    try {
      if (!pdfBase64) throw new Error("Энэ каталогийг дахин хуваалцах боломжгүй байна.");

      const cleanBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, "");
      const binaryString = atob(cleanBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
      const pdfBlob = new Blob([bytes], { type: "application/pdf" });
      const catalogId = crypto.randomUUID();
      const pathname = `catalogs/${catalogId}.pdf`;
      const useMultipart = pdfBlob.size > 4 * 1024 * 1024;

      const blob = await Promise.race([
        upload(pathname, pdfBlob, {
          access: "public",
          handleUploadUrl: "/api/blob-upload",
          multipart: useMultipart,
          contentType: "application/pdf",
        }),
        new Promise<never>((_, reject) =>
          window.setTimeout(() => reject(new Error("PDF-г хадгалахад хугацаа хэтэрлээ. Интернэтээ шалгаад дахин оролдоно уу.")), 120000),
        ),
      ]);

      if (!blob?.url) throw new Error("Share холбоос үүссэнгүй.");

      const newShareUrl = new URL(`/share/${catalogId}`, window.location.origin).toString();
      setShareUrl(newShareUrl);
      setShowShareModal(true);
      setShareError(null);
    } catch (error: any) {
      console.error("Share catalog error:", error);
      setShareError(error?.message || "Хуваалцах холбоос үүсгэж чадсангүй.");
    } finally {
      setIsSharing(false);
    }
  };

  const isCover = spreadMode === "double" && currentPage === 1;
  const isBackCover = spreadMode === "double" && totalPages >= 4 && totalPages % 2 === 0 && currentPage === totalPages;
  const leftPageNumber = currentPage % 2 === 0 ? currentPage : currentPage - 1;
  const rightPageNumber = leftPageNumber + 1;
  const spreadLabel = isCover
    ? "Нүүр хуудас 1"
    : isBackCover
    ? `Арын нүүр ${totalPages}`
    : spreadMode === "double"
    ? `Хуудас ${leftPageNumber} – ${Math.min(rightPageNumber, totalPages)} of ${totalPages}`
    : `Хуудас ${currentPage} / ${totalPages}`;

  return (
    <div
      ref={containerRef}
      id="virtual-catalog-viewer"
      className={`relative flex flex-col h-full bg-slate-900 text-slate-100 rounded-3xl overflow-hidden select-none border border-slate-800 shadow-2xl ${
        isFullscreen ? "fixed inset-0 z-50 rounded-none border-none" : "min-h-[640px]"
      }`}
    >
      {/* Top Floating Catalog Status & Quick Tools Bar */}
      <div className="h-14 px-5 sm:px-6 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 flex items-center justify-between text-xs z-30">
        {/* Left: Document Identity & View Mode Indicator */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center p-1 shadow-sm flex-shrink-0">
            <GGLogo className="w-full h-full" />
          </div>
          <div className="min-w-0">
            <div className="flex min-w-0 max-w-[68vw] items-center gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent pb-0.5">
              <span className="font-bold text-slate-200 truncate max-w-[180px] sm:max-w-[280px]">
                {filename}
              </span>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-md bg-slate-800 text-cyan-400 font-semibold text-[10px] tracking-wider uppercase">
                G&G Олон улсын каталог
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate">{spreadLabel}</p>
          </div>
        </div>

        {/* Right Tools: Spread Mode, Loupe, Sound, Search, AI, Fullscreen */}
        <div className="flex items-center gap-2">
          {/* Spread View Mode Toggle */}
          <div className="hidden sm:flex items-center bg-slate-900 border border-slate-800 p-0.5 rounded-xl">
            <button
              type="button"
              onClick={() => switchSpreadMode("double")}
              className={`px-2.5 py-1 rounded-lg font-semibold text-xs transition-colors cursor-pointer ${
                spreadMode === "double"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="2 хуудаст харах"
            >
              2-Page Spread
            </button>
            <button
              type="button"
              onClick={() => switchSpreadMode("single")}
              className={`px-2.5 py-1 rounded-lg font-semibold text-xs transition-colors cursor-pointer ${
                spreadMode === "single"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="Single Page View"
            >
              1-Page
            </button>
          </div>

          {/* Loupe / Magnifier Lens Toggle */}
          <button
            type="button"
            onClick={() => setIsLoupeActive(!isLoupeActive)}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              isLoupeActive
                ? "bg-indigo-600 text-white border-indigo-500 shadow-sm"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
            }`}
            title="Interactive Magnifier Lens (Press M)"
          >
            <Eye className="w-4 h-4" />
          </button>

          {/* Sound FX Toggle */}
          <button
            type="button"
            onClick={() => {
              const nextState = !soundEnabled;
              setSoundEnabled(nextState);
              soundEffects.enabled = nextState;
              if (nextState) soundEffects.playPageFlip();
            }}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              soundEnabled
                ? "bg-slate-900 border-slate-800 text-indigo-400 hover:text-indigo-300"
                : "bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300"
            }`}
            title={soundEnabled ? "Page Flip Sound: ON" : "Page Flip Sound: OFF"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Auto-play Showroom Toggle */}
          <button
            type="button"
            onClick={() => setIsAutoPlay(!isAutoPlay)}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              isAutoPlay
                ? "bg-emerald-600 text-white border-emerald-500 shadow-sm animate-pulse"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
            }`}
            title={isAutoPlay ? "Pause Auto-Showroom" : "Play Auto-Showroom (Slideshow)"}
          >
            {isAutoPlay ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>

          {/* Search Toggle */}
          <button
            type="button"
            onClick={() => setShowSearch(!showSearch)}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              showSearch
                ? "bg-indigo-600 text-white border-indigo-500"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
            }`}
            title="Бүтээгдэхүүн болон текст хайх"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Bookmarks Toggle */}
          <button
            type="button"
            onClick={() => setShowBookmarks(!showBookmarks)}
            className={`p-2 rounded-xl border transition-all cursor-pointer relative ${
              showBookmarks || isCurrentBookmarked
                ? "bg-amber-500/20 border-amber-500/40 text-amber-400"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
            }`}
            title="Хадгалсан хавчуурга"
          >
            <Bookmark className="w-4 h-4" />
            {bookmarks.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-slate-950 font-bold text-[9px] flex items-center justify-center">
                {bookmarks.length}
              </span>
            )}
          </button>

          {/* Share / Export Link */}
          <button
            type="button"
            onClick={isSharedView ? handleCopyCurrentShareLink : handleShareCatalog}
            disabled={isSharing}
            aria-label={isSharedView ? "Каталогийн холбоос хуулах" : "Каталог хуваалцах холбоос үүсгэх"}
            className={`shrink-0 p-2 rounded-xl border transition-all cursor-pointer ${
              shareCopied
                ? "bg-emerald-600 text-white border-emerald-500"
                : "bg-indigo-600/15 border-indigo-500/40 text-indigo-300 hover:bg-indigo-600/25 hover:text-white hover:border-indigo-400"
            } disabled:opacity-60`}
            title={isSharedView ? "Холбоос хуулах" : "Каталогийн холбоос үүсгэх"}
          >
            {shareCopied ? <Check className="w-4 h-4" /> : isSharedView ? <Link2 className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
          </button>

          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-colors cursor-pointer"
            title={isFullscreen ? "Дэлгэцээс гарах (F)" : "Дэлгэц дүүрэн (F)"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {(shareCopied || shareError || isSharing) && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`absolute right-5 top-16 z-50 rounded-xl border px-3 py-2 text-xs font-semibold shadow-xl backdrop-blur-xl ${
              shareError
                ? "border-red-400/20 bg-red-950/90 text-red-200"
                : "border-emerald-400/20 bg-emerald-950/90 text-emerald-200"
            }`}
          >
            {isSharing ? "Холбоос үүсгэж байна…" : shareError || "Холбоос clipboard-д хууллаа."}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showShareModal && shareUrl && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setShowShareModal(false);
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              className="w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-950 p-5 shadow-2xl"
            >
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-base font-semibold text-white">Каталогийн холбоос</h3>
                  <p className="mt-1 text-sm text-slate-400">Холбоос бэлэн боллоо. Copy дээр дарж clipboard-д хуулна уу.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowShareModal(false)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
                  aria-label="Хаах"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  value={shareUrl}
                  readOnly
                  onFocus={(event) => event.currentTarget.select()}
                  className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-200 outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopyGeneratedShareUrl}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
                >
                  {shareCopied ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
                  {shareCopied ? "Хуулсан" : "Хуулах"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* In-Catalog Search Bar Overlay */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="px-6 py-2.5 bg-slate-950 border-b border-slate-800 flex items-center gap-3 text-xs z-30"
          >
            <Search className="w-4 h-4 text-indigo-400 flex-shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handlePerformSearch(searchQuery);
              }}
              placeholder="Search products, prices, model numbers, or keywords in this catalog..."
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-1.5 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="button"
              onClick={() => handlePerformSearch(searchQuery)}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg transition-colors cursor-pointer"
            >
              {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Search"}
            </button>
            {searchResults.length > 0 && (
              <span className="text-emerald-400 font-medium">
                Found on page(s): {searchResults.join(", ")}
              </span>
            )}
            {searchQuery && searchResults.length === 0 && !isSearching && (
              <span className="text-slate-500">No matches found</span>
            )}
            <button
              type="button"
              onClick={() => setShowSearch(false)}
              className="p-1 text-slate-500 hover:text-slate-300 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bookmarks Drawer Overlay */}
      <AnimatePresence>
        {showBookmarks && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="absolute top-14 right-4 w-72 bg-slate-950/95 backdrop-blur-xl border border-slate-800 rounded-2xl p-4 shadow-2xl z-40 text-xs"
          >
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-800 mb-3">
              <span className="font-bold text-slate-200 flex items-center gap-1.5">
                <Bookmark className="w-3.5 h-3.5 text-amber-400" />
                Catalog Bookmarks ({bookmarks.length})
              </span>
              <button
                type="button"
                onClick={() => setShowBookmarks(false)}
                className="text-slate-500 hover:text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {bookmarks.length === 0 ? (
              <p className="text-slate-500 text-center py-4">
                No saved pages yet. Click the bookmark ribbon to save favorite catalog spreads.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {bookmarks.map((bm) => (
                  <div
                    key={bm.id}
                    onClick={() => {
                      turnToPage(bm.pageNumber, "next");
                      setShowBookmarks(false);
                    }}
                    className="p-2 rounded-xl bg-slate-900 hover:bg-indigo-950/50 border border-slate-800 hover:border-indigo-500/50 cursor-pointer flex items-center justify-between transition-colors"
                  >
                    <span className="font-semibold text-slate-300">{bm.title}</span>
                    <span className="text-[10px] text-indigo-400 font-bold">Jump →</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Virtual Catalog Stage */}
      <div
        id="catalog-stage-viewport"
        onMouseMove={handleMouseMoveLoupe}
        onMouseLeave={handleMouseLeaveLoupe}
        ref={stageViewportRef}
        className="relative flex-1 overflow-auto flex items-center justify-center p-4 sm:p-10 perspective-[2000px] bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 min-h-[460px] pb-24 select-none touch-none"
      >
        {/* Swipe & Gesture Hint Pill */}
        <AnimatePresence>
          {showSwipeHint && !isLoading && !renderError && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ delay: 0.3, duration: 0.3 }}
              className="absolute top-4 left-1/2 -translate-x-1/2 px-3.5 py-1.5 rounded-full bg-slate-950/80 border border-slate-700/70 text-slate-300 text-xs font-medium backdrop-blur-md shadow-xl flex items-center gap-2 pointer-events-auto z-30"
            >
              <MoveHorizontal className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
              <span>Grab & drag page with Mouse 1 to flip</span>
              <button
                type="button"
                onClick={() => setShowSwipeHint(false)}
                className="ml-1 text-slate-500 hover:text-slate-300 cursor-pointer"
                title="Dismiss"
              >
                <X className="w-3 h-3" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-3 text-slate-400 py-16">
            <Loader2 className="w-10 h-10 animate-spin text-cyan-500" />
            <p className="text-sm font-semibold tracking-wide">G&G каталоги нээгдэж байна...</p>
            <p className="text-xs text-slate-600">Generating 3D book spreads and textures</p>
          </div>
        ) : renderError ? (
          <div className="p-8 bg-slate-950 border border-slate-800 rounded-2xl text-center max-w-md">
            <p className="text-amber-400 font-semibold mb-2">Virtual Viewer Notice</p>
            <p className="text-xs text-slate-400 mb-4">{renderError}</p>
          </div>
        ) : (
          <div className="relative flex items-center justify-center">
            {/* Double-Page Spread View */}
            {spreadMode === "double" ? (
              isCover ? (
                /* Cover Page: Stationary stage with physical 3D turning cover leaf */
                <div
                  style={{ perspective: 1600 }}
                  className="relative flex items-center justify-center select-none"
                >
                  {/* Stacked Pages Shadow Behind Right Edge */}
                  <div className="absolute top-2 -right-3 bottom-2 w-3 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-400 rounded-r-md shadow-md opacity-75 transform skew-y-1 pointer-events-none" />
                  <div className="absolute top-4 -right-5 bottom-4 w-2.5 bg-gradient-to-r from-slate-300 to-slate-500 rounded-r-sm shadow-sm opacity-60 transform skew-y-2 pointer-events-none" />

                  {/* Stationary Inside Spread Underneath Cover (Revealed when cover is peeled/dragged) */}
                  <div className="absolute inset-0 bg-white rounded-r-2xl rounded-l-sm border-r-2 border-t border-b border-slate-200 shadow-md pointer-events-none overflow-hidden">
                    {totalPages >= 3 ? (
                      <div className="relative w-full h-full">
                        <canvas ref={coverNextCanvasRef} className="block mx-auto max-w-full" />
                        <div className="absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-black/20 via-black/05 to-transparent pointer-events-none" />
                        <div className="absolute bottom-3 left-4 text-[11px] font-semibold text-slate-400 pointer-events-none">
                          3
                        </div>
                      </div>
                    ) : (
                      <div className="text-center p-6 text-slate-400 h-full flex flex-col items-center justify-center">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-500/80">Каталогийн агуулга</p>
                        <p className="text-sm font-semibold text-slate-600 mt-1">Spread Pages 2 & 3</p>
                      </div>
                    )}
                  </div>

                  {/* Physical 3D Cover Leaf - Turns when dragged */}
                  <motion.div
                    onPointerDown={(e) => handleStartPageDrag(e, "cover")}
                    onPointerMove={handlePagePointerMove}
                    onPointerUp={handlePagePointerUp}
                    onPointerCancel={handlePagePointerCancel}
                    style={{
                      rotateY: coverRotateY,
                      transformOrigin: "left center",
                      transformStyle: "preserve-3d",
                      zIndex: 25,
                    }}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.25 }}
                    className="relative cursor-grab active:cursor-grabbing select-none"
                    title="Grab with Mouse 1 & drag left to open, or click to turn"
                  >
                    {/* Front Face: Catalog Cover */}
                    <motion.div
                      style={{
                        opacity: coverFrontOpacity,
                        visibility: coverFrontVisibility,
                        backfaceVisibility: "hidden",
                        WebkitBackfaceVisibility: "hidden",
                      }}
                      className="relative bg-white rounded-r-2xl rounded-l-sm overflow-hidden shadow-2xl border-r-2 border-t border-b border-slate-200/80 w-full h-full"
                    >
                      <canvas ref={singleCanvasRef} className="block mx-auto max-w-full" />

                      {/* Book Spine Crease on Left Edge */}
                      <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-black/25 via-black/10 to-transparent pointer-events-none" />

                      {/* Dynamic curl shadow during drag */}
                      <motion.div
                        style={{ opacity: coverCurlShadow }}
                        className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-black/40 via-black/10 to-transparent pointer-events-none"
                      />

                      {/* Interactive Dog-Ear Corner Peel on bottom right */}
                      <div
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          handleStartPageDrag(e, "cover");
                        }}
                        className="absolute bottom-0 right-0 w-12 h-12 group/peel cursor-grab active:cursor-grabbing z-20 pointer-events-auto"
                        title="Peel corner to open"
                      >
                        <div className="absolute bottom-0 right-0 w-8 h-8 group-hover/peel:w-11 group-hover/peel:h-11 transition-all duration-200 overflow-hidden">
                          <div className="w-full h-full bg-gradient-to-tl from-slate-200 via-white to-slate-100 shadow-[-3px_-3px_8px_rgba(0,0,0,0.35)] transform origin-bottom-right rotate-45 translate-x-1/2 translate-y-1/2 border-t border-l border-slate-300/80" />
                        </div>
                        <div className="absolute bottom-0 right-0 w-10 h-10 group-hover/peel:w-14 group-hover/peel:h-14 bg-black/25 blur-xs -z-10 transition-all duration-200 pointer-events-none" />
                      </div>

                      {/* Open Prompt Badge */}
                      <div className="absolute bottom-6 right-6 px-4 py-2 rounded-full bg-slate-950/80 backdrop-blur-md text-white font-semibold text-xs border border-white/20 flex items-center gap-2 group-hover:scale-105 transition-transform shadow-lg pointer-events-none">
                        <span>Каталог нээх</span>
                        <ChevronRight className="w-4 h-4 text-indigo-400 animate-pulse" />
                      </div>
                    </motion.div>

                    {/* Back Face: Inside Cover (Visible when turned past 90 degrees) */}
                    <motion.div
                      style={{
                        opacity: coverBackOpacity,
                        visibility: coverBackVisibility,
                        transform: "rotateY(180deg)",
                        backfaceVisibility: "hidden",
                        WebkitBackfaceVisibility: "hidden",
                      }}
                      className="absolute inset-0 bg-white rounded-l-2xl border-t border-b border-l border-slate-200 overflow-hidden shadow-2xl w-full h-full"
                    >
                      {totalPages >= 2 ? (
                        <div className="relative w-full h-full">
                          <canvas ref={coverBackCanvasRef} className="block mx-auto max-w-full" />
                          <div className="absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-black/20 to-transparent pointer-events-none" />
                          <div className="absolute bottom-3 right-4 text-[11px] font-semibold text-slate-400 pointer-events-none">
                            2
                          </div>
                        </div>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center p-6 text-slate-400 pointer-events-none">
                          <span className="text-xs uppercase tracking-widest font-bold text-slate-400">Inside Cover</span>
                        </div>
                      )}
                    </motion.div>
                  </motion.div>
                </div>
              ) : isBackCover ? (
                /* Арын нүүр (Каталогийн төгсгөл): Physical 3D turning back cover leaf matching the front */
                <div
                  style={{ perspective: 1600 }}
                  className="relative flex items-center justify-center select-none"
                >
                  {/* Stacked Pages Shadow Behind Left Edge (Closed Book Back) */}
                  <div className="absolute top-2 -left-3 bottom-2 w-3 bg-gradient-to-l from-slate-200 via-slate-300 to-slate-400 rounded-l-md shadow-md opacity-75 transform -skew-y-1 pointer-events-none" />
                  <div className="absolute top-4 -left-5 bottom-4 w-2.5 bg-gradient-to-l from-slate-300 to-slate-500 rounded-l-sm shadow-sm opacity-60 transform -skew-y-2 pointer-events-none" />

                  {/* Stationary Inside Page Underneath Back Cover (Revealed when peeled backward) */}
                  <div className="absolute inset-0 bg-white rounded-l-2xl rounded-r-sm border-l-2 border-t border-b border-slate-200 shadow-md pointer-events-none overflow-hidden flex items-center justify-center">
                    {totalPages - 1 >= 1 ? (
                      <div className="relative w-full h-full">
                        <canvas ref={coverNextCanvasRef} className="block mx-auto max-w-full" />
                        <div className="absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-black/20 via-black/05 to-transparent pointer-events-none" />
                        <div className="absolute bottom-3 right-4 text-[11px] font-semibold text-slate-400 pointer-events-none">
                          {totalPages - 1}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center p-6 text-slate-400 h-full flex flex-col items-center justify-center">
                        <span className="text-xs uppercase tracking-widest font-semibold">Каталогийн төгсгөл</span>
                      </div>
                    )}
                  </div>

                  {/* Physical 3D Back Cover Leaf - Turns when dragged */}
                  <motion.div
                    onPointerDown={(e) => handleStartPageDrag(e, "backcover")}
                    onPointerMove={handlePagePointerMove}
                    onPointerUp={handlePagePointerUp}
                    onPointerCancel={handlePagePointerCancel}
                    style={{
                      rotateY: coverRotateY,
                      transformOrigin: "right center",
                      transformStyle: "preserve-3d",
                      zIndex: 25,
                    }}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.25 }}
                    className="relative cursor-grab active:cursor-grabbing select-none"
                    title="Grab with Mouse 1 & drag right to open previous page, or click to turn"
                  >
                    {/* Outside Face: Catalog Back Cover */}
                    <motion.div
                      style={{
                        opacity: coverFrontOpacity,
                        visibility: coverFrontVisibility,
                        backfaceVisibility: "hidden",
                        WebkitBackfaceVisibility: "hidden",
                      }}
                      className="relative bg-white rounded-l-2xl rounded-r-sm overflow-hidden shadow-2xl border-l-2 border-t border-b border-slate-200/80 w-full h-full"
                    >
                      <canvas ref={singleCanvasRef} className="block mx-auto max-w-full" />

                      {/* Book Spine Crease on Right Edge */}
                      <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-black/25 via-black/10 to-transparent pointer-events-none" />

                      {/* Dynamic curl shadow during drag */}
                      <motion.div
                        style={{ opacity: coverCurlShadow }}
                        className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-black/40 via-black/10 to-transparent pointer-events-none"
                      />

                      {/* Interactive Dog-Ear Corner Peel on bottom left */}
                      <div
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          handleStartPageDrag(e, "backcover");
                        }}
                        className="absolute bottom-0 left-0 w-12 h-12 group/peel cursor-grab active:cursor-grabbing z-20 pointer-events-auto"
                        title="Peel corner to flip back"
                      >
                        <div className="absolute bottom-0 left-0 w-8 h-8 group-hover/peel:w-11 group-hover/peel:h-11 transition-all duration-200 overflow-hidden">
                          <div className="w-full h-full bg-gradient-to-tr from-slate-200 via-white to-slate-100 shadow-[3px_-3px_8px_rgba(0,0,0,0.35)] transform origin-bottom-left -rotate-45 -translate-x-1/2 translate-y-1/2 border-t border-r border-slate-300/80" />
                        </div>
                        <div className="absolute bottom-0 left-0 w-10 h-10 group-hover/peel:w-14 group-hover/peel:h-14 bg-black/25 blur-xs -z-10 transition-all duration-200 pointer-events-none" />
                      </div>

                      {/* Return Badge */}
                      <div className="absolute bottom-6 left-6 px-4 py-2 rounded-full bg-slate-950/80 backdrop-blur-md text-white font-semibold text-xs border border-white/20 flex items-center gap-2 group-hover:scale-105 transition-transform shadow-lg pointer-events-none">
                        <ChevronLeft className="w-4 h-4 text-indigo-400" />
                        <span>Back Cover · Turn to Open</span>
                      </div>

                      <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-slate-900/60 backdrop-blur-sm text-slate-300 font-semibold text-[11px] border border-white/10 pointer-events-none">
                        Каталогийн төгсгөл (Page {totalPages})
                      </div>
                    </motion.div>

                    {/* Inside Face: Inside Back Cover (Revealed when turned > 90 deg) */}
                    <motion.div
                      style={{
                        opacity: coverBackOpacity,
                        visibility: coverBackVisibility,
                        transform: "rotateY(180deg)",
                        backfaceVisibility: "hidden",
                        WebkitBackfaceVisibility: "hidden",
                      }}
                      className="absolute inset-0 bg-white rounded-r-2xl border-t border-b border-r border-slate-200 overflow-hidden shadow-2xl w-full h-full"
                    >
                      {totalPages - 1 >= 1 ? (
                        <div className="relative w-full h-full">
                          <canvas ref={coverBackCanvasRef} className="block mx-auto max-w-full" />
                          <div className="absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-black/20 to-transparent pointer-events-none" />
                          <div className="absolute bottom-3 left-4 text-[11px] font-semibold text-slate-400 pointer-events-none">
                            {totalPages - 1}
                          </div>
                        </div>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center p-6 text-slate-400 pointer-events-none">
                          <span className="text-xs uppercase tracking-widest font-bold text-slate-400">Inside Back Cover</span>
                        </div>
                      )}
                    </motion.div>
                  </motion.div>
                </div>
              ) : (
                /* Two-Page Open Book Spread: Stationary display, individual 3D pages follow cursor */
                <div
                  key={`spread-${leftPageNumber}`}
                  style={{
                    perspective: 1600,
                    transformStyle: "preserve-3d",
                  }}
                  className="relative flex items-center justify-center shadow-2xl rounded-xl overflow-visible max-w-full select-none"
                >
                  {/* Background Book Depth Shadow */}
                  <div className="absolute -inset-4 bg-black/60 blur-2xl rounded-3xl -z-10 pointer-events-none" />

                  {/* Stationary Left Backing Sheet (Stationary background underneath left page) */}
                  <div
                    style={{ right: "calc(50% + 3px)", zIndex: 0 }}
                    className="absolute left-0 top-0 bottom-0 bg-white rounded-l-2xl border-t border-b border-l border-slate-200 overflow-hidden shadow-md pointer-events-none flex items-center justify-end"
                  >
                    {leftPageNumber - 2 >= 1 ? (
                      <div className="relative w-full h-full">
                        <canvas ref={prevLeftCanvasRef} className="block max-w-full" />
                        <div className="absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-black/20 via-black/05 to-transparent pointer-events-none" />
                        <div className="absolute bottom-3 right-4 text-[11px] font-semibold text-slate-400 pointer-events-none">
                          {leftPageNumber - 2}
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-50 text-slate-400">
                        <span className="text-xs uppercase tracking-widest font-semibold">Inside Front Cover</span>
                      </div>
                    )}
                  </div>

                  {/* Stationary Right Backing Sheet (Stationary background underneath right page) */}
                  <div
                    style={{ left: "calc(50% + 3px)", zIndex: 0 }}
                    className="absolute right-0 top-0 bottom-0 bg-white rounded-r-2xl border-t border-b border-r border-slate-200 overflow-hidden shadow-md pointer-events-none flex items-center justify-start"
                  >
                    {rightPageNumber + 2 <= totalPages ? (
                      <div className="relative w-full h-full">
                        <canvas ref={nextRightCanvasRef} className="block max-w-full" />
                        <div className="absolute top-1 -right-2 bottom-1 w-2 bg-gradient-to-r from-slate-200 to-slate-400 rounded-r-sm shadow-xs opacity-80 pointer-events-none" />
                        <div className="absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-black/20 via-black/05 to-transparent pointer-events-none" />
                        <div className="absolute bottom-3 left-4 text-[11px] font-semibold text-slate-400 pointer-events-none">
                          {rightPageNumber + 2}
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-50 text-slate-400">
                        <span className="text-xs uppercase tracking-widest font-semibold">Каталогийн төгсгөл</span>
                      </div>
                    )}
                  </div>

                  {/* Physical Left Page Sheet (Turns backward around center spine) */}
                  <motion.div
                    onPointerDown={(e) => handleStartPageDrag(e, "left")}
                    onPointerMove={handlePagePointerMove}
                    onPointerUp={handlePagePointerUp}
                    onPointerCancel={handlePagePointerCancel}
                    style={{
                      transformOrigin: "right center",
                      transformStyle: "preserve-3d",
                      rotateY: leftRotateY,
                      zIndex: dragSide === "left" ? 30 : 10,
                    }}
                    className="relative cursor-grab active:cursor-grabbing select-none"
                    title="Grab with Mouse 1 & drag right to flip back, or click to turn"
                  >
                    {/* Front Face: Current Left Page */}
                    <motion.div
                      style={{
                        opacity: leftFrontOpacity,
                        visibility: leftFrontVisibility,
                        backfaceVisibility: "hidden",
                        WebkitBackfaceVisibility: "hidden",
                      }}
                      className="relative bg-white rounded-l-2xl overflow-hidden border-t border-b border-l border-slate-200 shadow-xl group w-full h-full"
                    >
                      <canvas ref={leftCanvasRef} className="block max-w-full" />

                      {/* Spine Seam Shadow (Right Edge of Left Page) */}
                      <div className="absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-black/20 via-black/05 to-transparent pointer-events-none" />

                      {/* Dynamic curl shadow during rightward drag */}
                      <motion.div
                        style={{ opacity: leftCurlShadow }}
                        className="absolute inset-y-0 left-0 w-28 bg-gradient-to-r from-black/35 via-black/10 to-transparent pointer-events-none"
                      />

                      {/* Left Page Turn Hover Hint */}
                      <div className="absolute bottom-3 left-4 opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 rounded-md bg-slate-900/70 text-[10px] text-white backdrop-blur-xs flex items-center gap-1 pointer-events-none">
                        <ChevronLeft className="w-3 h-3" />
                        <span>Flip Back</span>
                      </div>

                      {/* Left Page Number Badge */}
                      <div className="absolute bottom-3 right-4 text-[11px] font-semibold text-slate-400 pointer-events-none">
                        {leftPageNumber}
                      </div>

                      {/* Interactive Dog-Ear Corner Peel (Bottom Left - Prev Page) */}
                      <div
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          handleStartPageDrag(e, "left");
                        }}
                        className="absolute bottom-0 left-0 w-12 h-12 group/peel cursor-grab active:cursor-grabbing z-20 pointer-events-auto"
                        title="Peel to flip back"
                      >
                        <div className="absolute bottom-0 left-0 w-8 h-8 group-hover/peel:w-11 group-hover/peel:h-11 transition-all duration-200 overflow-hidden">
                          <div className="w-full h-full bg-gradient-to-tr from-slate-200 via-white to-slate-100 shadow-[3px_-3px_8px_rgba(0,0,0,0.35)] transform origin-bottom-left -rotate-45 -translate-x-1/2 translate-y-1/2 border-t border-r border-slate-300/80" />
                        </div>
                        <div className="absolute bottom-0 left-0 w-10 h-10 group-hover/peel:w-14 group-hover/peel:h-14 bg-black/25 blur-xs -z-10 transition-all duration-200 pointer-events-none" />
                      </div>
                    </motion.div>

                    {/* Back Face: Visible when turned > 90 degrees */}
                    <motion.div
                      style={{
                        opacity: leftBackOpacity,
                        visibility: leftBackVisibility,
                        transform: "rotateY(180deg)",
                        backfaceVisibility: "hidden",
                        WebkitBackfaceVisibility: "hidden",
                      }}
                      className="absolute inset-0 bg-white rounded-r-2xl border-t border-b border-r border-slate-200 overflow-hidden shadow-2xl w-full h-full flex items-center justify-center"
                    >
                      {leftPageNumber - 1 >= 1 ? (
                        <div className="relative w-full h-full">
                          <canvas ref={prevRightCanvasRef} className="block max-w-full" />
                          <div className="absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-black/20 via-black/05 to-transparent pointer-events-none" />
                          <div className="absolute bottom-3 left-4 text-[11px] font-semibold text-slate-400 pointer-events-none">
                            {leftPageNumber - 1}
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-50 text-slate-400">
                          <span className="text-xs uppercase tracking-widest font-semibold">Cover</span>
                        </div>
                      )}
                    </motion.div>
                  </motion.div>

                  {/* Central Spine Seam Shadow Divider */}
                  <div className="w-1.5 self-stretch bg-gradient-to-r from-slate-300 via-slate-500 to-slate-300 shadow-inner z-20 pointer-events-none" />

                  {/* Physical Right Page Sheet (Turns forward around center spine) */}
                  <motion.div
                    onPointerDown={(e) => handleStartPageDrag(e, "right")}
                    onPointerMove={handlePagePointerMove}
                    onPointerUp={handlePagePointerUp}
                    onPointerCancel={handlePagePointerCancel}
                    style={{
                      transformOrigin: "left center",
                      transformStyle: "preserve-3d",
                      rotateY: rightRotateY,
                      zIndex: dragSide === "right" ? 30 : 10,
                    }}
                    className="relative cursor-grab active:cursor-grabbing select-none"
                    title="Grab with Mouse 1 & drag left to flip forward, or click to turn"
                  >
                    {/* Front Face: Current Right Page */}
                    <motion.div
                      style={{
                        opacity: rightFrontOpacity,
                        visibility: rightFrontVisibility,
                        backfaceVisibility: "hidden",
                        WebkitBackfaceVisibility: "hidden",
                      }}
                      className="relative bg-white rounded-r-2xl overflow-hidden border-t border-b border-r border-slate-200 shadow-xl group w-full h-full"
                    >
                      {rightPageNumber <= totalPages ? (
                        <canvas ref={rightCanvasRef} className="block max-w-full" />
                      ) : (
                        <div className="w-full h-full min-h-[380px] flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 text-slate-700 p-8 text-center">
                          <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-3 shadow-sm">
                            <BookOpen className="w-7 h-7" />
                          </div>
                          <span className="text-xs uppercase tracking-widest font-bold text-indigo-600">Каталогийн төгсгөл</span>
                          <p className="text-xs text-slate-500 mt-2 max-w-[200px]">
                            Drag or click to flip back to cover
                          </p>
                        </div>
                      )}

                      {/* Spine Seam Shadow (Left Edge of Right Page) */}
                      <div className="absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-black/20 via-black/05 to-transparent pointer-events-none" />

                      {/* Right Page Stack Depth (Stacked pages on the right) */}
                      <div className="absolute top-1 -right-2 bottom-1 w-2 bg-gradient-to-r from-slate-200 to-slate-400 rounded-r-sm shadow-xs pointer-events-none opacity-80" />

                      {/* Dynamic curl shadow during leftward drag */}
                      <motion.div
                        style={{ opacity: rightCurlShadow }}
                        className="absolute inset-y-0 right-0 w-28 bg-gradient-to-l from-black/35 via-black/10 to-transparent pointer-events-none"
                      />

                      {/* Right Page Turn Hover Hint */}
                      <div className="absolute bottom-3 right-4 opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 rounded-md bg-slate-900/70 text-[10px] text-white backdrop-blur-xs flex items-center gap-1 pointer-events-none">
                        <span>Next Page</span>
                        <ChevronRight className="w-3 h-3" />
                      </div>

                      {/* Right Page Number Badge */}
                      <div className="absolute bottom-3 left-4 text-[11px] font-semibold text-slate-400 pointer-events-none">
                        {Math.min(rightPageNumber, totalPages)}
                      </div>

                      {/* Interactive Dog-Ear Corner Peel (Bottom Right - Next Page) */}
                      <div
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          handleStartPageDrag(e, "right");
                        }}
                        className="absolute bottom-0 right-0 w-12 h-12 group/peel cursor-grab active:cursor-grabbing z-20 pointer-events-auto"
                        title="Peel to flip forward"
                      >
                        <div className="absolute bottom-0 right-0 w-8 h-8 group-hover/peel:w-11 group-hover/peel:h-11 transition-all duration-200 overflow-hidden">
                          <div className="w-full h-full bg-gradient-to-tl from-slate-200 via-white to-slate-100 shadow-[-3px_-3px_8px_rgba(0,0,0,0.35)] transform origin-bottom-right rotate-45 translate-x-1/2 translate-y-1/2 border-t border-l border-slate-300/80" />
                        </div>
                        <div className="absolute bottom-0 right-0 w-10 h-10 group-hover/peel:w-14 group-hover/peel:h-14 bg-black/25 blur-xs -z-10 transition-all duration-200 pointer-events-none" />
                      </div>
                    </motion.div>

                    {/* Back Face: Visible when turned > 90 degrees */}
                    <motion.div
                      style={{
                        opacity: rightBackOpacity,
                        visibility: rightBackVisibility,
                        transform: "rotateY(180deg)",
                        backfaceVisibility: "hidden",
                        WebkitBackfaceVisibility: "hidden",
                      }}
                      className="absolute inset-0 bg-white rounded-l-2xl border-t border-b border-l border-slate-200 overflow-hidden shadow-2xl w-full h-full flex items-center justify-center"
                    >
                      {rightPageNumber + 1 <= totalPages ? (
                        <div className="relative w-full h-full">
                          <canvas ref={nextLeftCanvasRef} className="block max-w-full" />
                          <div className="absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-black/20 via-black/05 to-transparent pointer-events-none" />
                          <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-black/15 to-transparent pointer-events-none" />
                          <div className="absolute bottom-3 right-4 text-[11px] font-semibold text-slate-400 pointer-events-none">
                            {rightPageNumber + 1}
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-full min-h-[380px] flex flex-col items-center justify-center bg-gradient-to-bl from-slate-50 to-slate-100 text-slate-700 p-8 text-center">
                          <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 mb-2">
                            <RotateCcw className="w-6 h-6 text-indigo-500" />
                          </div>
                          <span className="text-xs uppercase tracking-widest font-bold text-slate-600">Каталогийн төгсгөл</span>
                          <p className="text-xs text-slate-400 mt-1">Flip forward to restart</p>
                        </div>
                      )}

                      {/* Dynamic curl shadow */}
                      <motion.div
                        style={{ opacity: rightCurlShadow }}
                        className="absolute inset-y-0 left-0 w-28 bg-gradient-to-r from-black/35 via-black/10 to-transparent pointer-events-none"
                      />
                    </motion.div>
                  </motion.div>

                  {/*
                    The physical page sheets above already perform the real 3D flip.
                    Do not render a second synthetic gray turning-leaf overlay: it can
                    cover one side of the spread during the animation and look like a
                    blank/gray page.
                  */}
                  {/* Bookmark Ribbon on top of spread */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleBookmark();
                    }}
                    className={`absolute -top-3 right-8 w-7 h-10 flex items-center justify-center transition-transform hover:scale-110 cursor-pointer z-20 ${
                      isCurrentBookmarked
                        ? "text-amber-400 drop-shadow-md"
                        : "text-slate-600 hover:text-amber-400"
                    }`}
                    title={isCurrentBookmarked ? "Remove Bookmark" : "Bookmark this spread"}
                  >
                    <Bookmark className="w-6 h-8 fill-current" />
                  </button>
                </div>
              )
            ) : (
              /* Single-Page Mode with stationary sheet underneath and physical 3D turning leaf */
              <div
                key={`single-${currentPage}`}
                style={{ perspective: 1600 }}
                className="relative flex items-center justify-center select-none"
              >
                {/* Stationary backing sheet underneath (Pre-rendered next page) */}
                <div className="absolute inset-0 bg-white rounded-2xl overflow-hidden shadow-md border border-slate-200 pointer-events-none flex items-center justify-center">
                  {currentPage + 1 <= totalPages ? (
                    <div className="relative w-full h-full">
                      <canvas ref={singleNextCanvasRef} className="block mx-auto max-w-full" />
                      <div className="absolute bottom-3 right-4 text-[11px] font-semibold text-slate-400">
                        Page {currentPage + 1} of {totalPages}
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-50 text-slate-400">
                      <span className="text-xs uppercase tracking-widest font-semibold">Каталогийн төгсгөл</span>
                    </div>
                  )}
                </div>

                {/* Active turning leaf */}
                <motion.div
                  onPointerDown={(e) => handleStartPageDrag(e, "single")}
                  onPointerMove={handlePagePointerMove}
                  onPointerUp={handlePagePointerUp}
                  onPointerCancel={handlePagePointerCancel}
                  style={{
                    rotateY: singleRotateY,
                    transformOrigin: dragActiveDirection === "prev" ? "right center" : "left center",
                    transformStyle: "preserve-3d",
                    zIndex: 25,
                  }}
                  className="relative cursor-grab active:cursor-grabbing select-none"
                  title="Grab with Mouse 1 & drag to flip page"
                >
                  {/* Front Face: Current page */}
                  <motion.div
                    style={{
                      opacity: singleFrontOpacity,
                      visibility: singleFrontVisibility,
                      backfaceVisibility: "hidden",
                      WebkitBackfaceVisibility: "hidden",
                    }}
                    className="relative bg-white rounded-2xl overflow-hidden shadow-2xl border border-slate-200 w-full h-full"
                  >
                    <canvas ref={singleCanvasRef} className="block mx-auto max-w-full" />

                    {/* Dynamic curl shadow */}
                    <motion.div
                      style={{ opacity: singleCurlShadow }}
                      className="absolute inset-y-0 right-0 w-28 bg-gradient-to-l from-black/35 via-black/10 to-transparent pointer-events-none"
                    />

                    {/* Interactive corner peels */}
                    <div
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        handleStartPageDrag(e, "single");
                      }}
                      className="absolute bottom-0 right-0 w-10 h-10 group/peel cursor-grab active:cursor-grabbing z-20 pointer-events-auto"
                      title="Next page"
                    >
                      <div className="absolute bottom-0 right-0 w-7 h-7 group-hover/peel:w-9 group-hover/peel:h-9 transition-all duration-200 overflow-hidden">
                        <div className="w-full h-full bg-gradient-to-tl from-slate-200 via-white to-slate-100 shadow-[-3px_-3px_8px_rgba(0,0,0,0.35)] transform origin-bottom-right rotate-45 translate-x-1/2 translate-y-1/2 border-t border-l border-slate-300/80" />
                      </div>
                    </div>

                    <div className="absolute bottom-3 right-4 text-[11px] font-semibold text-slate-400 pointer-events-none">
                      Page {currentPage} of {totalPages}
                    </div>
                  </motion.div>

                  {/* Back Face: Turned next page */}
                  <motion.div
                    style={{
                      opacity: singleBackOpacity,
                      visibility: singleBackVisibility,
                      transform: "rotateY(180deg)",
                      backfaceVisibility: "hidden",
                      WebkitBackfaceVisibility: "hidden",
                    }}
                    className="absolute inset-0 bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xl w-full h-full flex items-center justify-center"
                  >
                    {currentPage + 1 <= totalPages ? (
                      <div className="relative w-full h-full">
                        <canvas ref={singleBackCanvasRef} className="block mx-auto max-w-full" />
                        <div className="absolute bottom-3 left-4 text-[11px] font-semibold text-slate-400 pointer-events-none">
                          Page {currentPage + 1} of {totalPages}
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-50 text-slate-400">
                        <span className="text-xs uppercase tracking-widest font-semibold">Каталогийн төгсгөл</span>
                      </div>
                    )}
                  </motion.div>
                </motion.div>
              </div>
            )}

            {/* Dynamic Drag/Swipe Feedback HUD ("release -> flip") */}
            <AnimatePresence>
              {isPageDragging && dragActiveDirection && (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.9 }}
                  className="absolute -bottom-14 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-indigo-600/95 text-white backdrop-blur-md text-xs font-bold shadow-2xl flex items-center gap-2 pointer-events-none z-30 tracking-wide"
                >
                  {dragActiveDirection === "next" ? (
                    <>
                      <span>Release to flip next</span>
                      <ChevronRight className="w-4 h-4 animate-pulse" />
                    </>
                  ) : (
                    <>
                      <ChevronLeft className="w-4 h-4 animate-pulse" />
                      <span>Release to flip back</span>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Quick Turn Arrow Controls on Sides */}
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentPage <= 1}
              className="absolute left-2 sm:-left-14 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-slate-950/80 backdrop-blur-md border border-slate-800 text-slate-300 hover:text-white hover:bg-indigo-600 hover:border-indigo-500 disabled:opacity-20 disabled:hover:bg-slate-950 transition-all flex items-center justify-center shadow-xl cursor-pointer z-20"
              title="Previous Page / Spread (Left Arrow)"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <button
              type="button"
              onClick={handleNext}
              disabled={
                spreadMode === "double"
                  ? currentPage + 1 >= totalPages
                  : currentPage >= totalPages
              }
              className="absolute right-2 sm:-right-14 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-slate-950/80 backdrop-blur-md border border-slate-800 text-slate-300 hover:text-white hover:bg-indigo-600 hover:border-indigo-500 disabled:opacity-20 disabled:hover:bg-slate-950 transition-all flex items-center justify-center shadow-xl cursor-pointer z-20"
              title="Next Page / Spread (Right Arrow)"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        )}

        {/* Loupe / Magnifier Lens Overlay Follower */}
        {isLoupeActive && loupePos.visible && (
          <div
            className="pointer-events-none fixed w-[200px] h-[200px] rounded-full border-4 border-indigo-500/80 shadow-2xl overflow-hidden z-50 bg-white"
            style={{
              left: `${loupePos.x - 100}px`,
              top: `${loupePos.y - 100}px`,
            }}
          >
            <canvas ref={loupeCanvasRef} width={200} height={200} className="w-full h-full" />
            <div className="absolute inset-0 rounded-full border border-black/10 pointer-events-none" />
            <div className="absolute top-1.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-indigo-600/90 text-[9px] font-bold text-white uppercase tracking-wider">
              2.5x Loupe
            </div>
          </div>
        )}
      </div>

      {/* Floating Bottom Navigation Pill Toolbar */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 bg-slate-950/90 backdrop-blur-xl border border-slate-800/90 rounded-full px-4 sm:px-6 py-2 flex items-center gap-3 sm:gap-5 shadow-2xl z-30">
        {/* Prev Page Button */}
        <button
          type="button"
          onClick={handlePrev}
          disabled={currentPage <= 1 || isLoading}
          className="text-slate-400 hover:text-white disabled:opacity-25 transition-colors cursor-pointer"
          title="Previous Spread"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Spread Navigation Input */}
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
          <input
            type="number"
            min={1}
            max={totalPages}
            value={currentPage}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              if (!isNaN(val) && val >= 1 && val <= totalPages) {
                turnToPage(val, "next");
              }
            }}
            className="w-9 text-center bg-slate-900 border border-slate-800 rounded-lg px-1 py-1 text-xs text-white focus:outline-indigo-500 font-mono font-bold"
          />
          <span className="text-slate-500">/</span>
          <span className="text-slate-400">{totalPages}</span>
        </div>

        {/* Next Page Button */}
        <button
          type="button"
          onClick={handleNext}
          disabled={
            spreadMode === "double"
              ? currentPage + 1 >= totalPages
              : currentPage >= totalPages
          }
          className="text-slate-400 hover:text-white disabled:opacity-25 transition-colors cursor-pointer"
          title="Next Spread"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        <div className="h-5 w-px bg-slate-800" />

        {/* Zoom Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setZoom((prev) => Math.max(0.75, +(prev - 0.15).toFixed(2)))}
            className="w-7 h-7 rounded-full bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 flex items-center justify-center font-bold text-sm cursor-pointer"
            title="Zoom Out"
          >
            -
          </button>
          <span className="text-xs font-semibold text-slate-300 min-w-[40px] text-center font-mono">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoom((prev) => Math.min(2.5, +(prev + 0.15).toFixed(2)))}
            className="w-7 h-7 rounded-full bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 flex items-center justify-center font-bold text-sm cursor-pointer"
            title="Zoom In"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => setZoom(1.0)}
            className="p-1 rounded text-slate-400 hover:text-white cursor-pointer ml-0.5"
            title="Reset Zoom"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="h-5 w-px bg-slate-800 hidden sm:block" />

        {/* Thumbnails Filmstrip Toggle */}
        <button
          type="button"
          onClick={() => setShowThumbnails(!showThumbnails)}
          className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
            showThumbnails
              ? "bg-indigo-600 text-white"
              : "bg-slate-900 text-slate-400 hover:text-slate-200"
          }`}
          title="Toggle Thumbnail Filmstrip"
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          <span>Pages</span>
        </button>
      </div>

      {/* Slide-Up Thumbnail Filmstrip Gallery */}
      <AnimatePresence>
        {showThumbnails && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="absolute bottom-16 inset-x-6 bg-slate-950/95 backdrop-blur-xl border border-slate-800 rounded-2xl p-4 shadow-2xl z-40"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-3 text-xs">
              <span className="font-bold text-slate-200">Каталогийн хуудас</span>
              <button
                type="button"
                onClick={() => setShowThumbnails(false)}
                className="text-slate-500 hover:text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Thumbnail items */}
            <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-thin">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pNum) => {
                const isActive =
                  spreadMode === "double"
                    ? pNum === currentPage ||
                      (currentPage > 1 &&
                        (pNum === leftPageNumber || pNum === rightPageNumber))
                    : pNum === currentPage;

                return (
                  <button
                    key={pNum}
                    type="button"
                    onClick={() => {
                      turnToPage(pNum, pNum > currentPage ? "next" : "prev");
                    }}
                    className={`flex-shrink-0 flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all cursor-pointer ${
                      isActive
                        ? "bg-indigo-950/60 border-indigo-500 shadow-md scale-105"
                        : "bg-slate-900 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="w-16 h-22 bg-slate-800 rounded-md border border-slate-700/60 flex flex-col items-center justify-center text-slate-400 font-mono text-xs shadow-inner">
                      <FileText className="w-4 h-4 mb-1 text-slate-500" />
                      <span className="font-bold">{pNum}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {pNum === 1 ? "Cover" : `Page ${pNum}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type LightboxImage = {
  url: string;
  alt?: string;
};

type PhotoLightboxProps = {
  images: LightboxImage[];
  initialIndex?: number;
  className?: string;
  imageClassName?: string;
};

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const SWIPE_THRESHOLD = 50;

export default function PhotoLightbox({
  images,
  initialIndex = 0,
  className = "",
  imageClassName = "",
}: PhotoLightboxProps) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [mounted, setMounted] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const currentImage = images[index] ?? images[0];

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const scrollY = window.scrollY;
    const body = document.body;
    const html = document.documentElement;
    const previousBodyOverflow = body.style.overflow;
    const previousBodyPosition = body.style.position;
    const previousBodyTop = body.style.top;
    const previousBodyWidth = body.style.width;
    const previousHtmlOverflow = html.style.overflow;

    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";
    body.style.overflow = "hidden";
    html.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      } else if (event.key === "ArrowLeft" && images.length > 1) {
        setIndex((current) => (current === 0 ? images.length - 1 : current - 1));
        setZoom(1);
      } else if (event.key === "ArrowRight" && images.length > 1) {
        setIndex((current) => (current === images.length - 1 ? 0 : current + 1));
        setZoom(1);
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      body.style.overflow = previousBodyOverflow;
      body.style.position = previousBodyPosition;
      body.style.top = previousBodyTop;
      body.style.width = previousBodyWidth;
      html.style.overflow = previousHtmlOverflow;
      window.scrollTo(0, scrollY);
    };
  }, [open, images.length]);

  useEffect(() => {
    if (open) setZoom(1);
  }, [index, open]);

  useEffect(() => {
    if (index >= images.length && images.length > 0) {
      setIndex(images.length - 1);
    }
  }, [images.length, index]);

  if (images.length === 0 || !currentImage) return null;

  function openViewer() {
    setIndex(Math.min(Math.max(initialIndex, 0), images.length - 1));
    setZoom(1);
    setOpen(true);
  }

  function closeViewer() {
    setOpen(false);
  }

  function showPrevious() {
    setIndex((current) => (current === 0 ? images.length - 1 : current - 1));
  }

  function showNext() {
    setIndex((current) => (current === images.length - 1 ? 0 : current + 1));
  }

  function changeZoom(amount: number) {
    setZoom((current) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, current + amount)));
  }

  function handleTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    if (zoom > MIN_ZOOM || images.length < 2) return;
    const touch = event.changedTouches[0];
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
  }

  function handleTouchEnd(event: React.TouchEvent<HTMLDivElement>) {
    if (zoom > MIN_ZOOM || images.length < 2 || touchStartX.current === null || touchStartY.current === null) return;

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStartX.current;
    const deltaY = touch.clientY - touchStartY.current;
    touchStartX.current = null;
    touchStartY.current = null;

    if (Math.abs(deltaX) < SWIPE_THRESHOLD || Math.abs(deltaX) <= Math.abs(deltaY)) return;
    if (deltaX < 0) showNext();
    else showPrevious();
  }

  const viewer = open && mounted
    ? createPortal(
        <div
          className="fixed inset-0 z-[2147483647] flex h-[100dvh] w-screen items-center justify-center overflow-hidden bg-black/96 p-3 backdrop-blur-xl sm:p-5"
          role="dialog"
          aria-modal="true"
          aria-label="Full screen photo viewer"
          style={{
            paddingTop: "max(0.75rem, env(safe-area-inset-top))",
            paddingRight: "max(0.75rem, env(safe-area-inset-right))",
            paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
            paddingLeft: "max(0.75rem, env(safe-area-inset-left))",
          }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeViewer();
          }}
          onWheel={(event) => {
            event.preventDefault();
            changeZoom(event.deltaY > 0 ? -0.25 : 0.25);
          }}
        >
          <button
            type="button"
            onClick={closeViewer}
            className="absolute left-3 top-3 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/80 text-2xl leading-none text-white shadow-xl backdrop-blur-xl transition hover:bg-white/10 hover:text-white sm:left-5 sm:top-5"
            aria-label="Close photo viewer"
          >
            ×
          </button>

          <div className="absolute bottom-3 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full border border-white/10 bg-black/80 p-1 shadow-xl backdrop-blur-xl sm:bottom-5">
            <button
              type="button"
              onClick={() => changeZoom(-0.5)}
              disabled={zoom <= MIN_ZOOM}
              className="flex h-9 w-9 items-center justify-center rounded-full text-lg text-white/75 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Zoom out"
            >
              −
            </button>
            <span className="min-w-12 text-center text-[10px] font-semibold text-white/55">{Math.round(zoom * 100)}%</span>
            <button
              type="button"
              onClick={() => changeZoom(0.5)}
              disabled={zoom >= MAX_ZOOM}
              className="flex h-9 w-9 items-center justify-center rounded-full text-lg text-white/75 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Zoom in"
            >
              +
            </button>
            {zoom > MIN_ZOOM && (
              <button
                type="button"
                onClick={() => setZoom(1)}
                className="ml-1 rounded-full px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-white/45 transition hover:bg-white/10 hover:text-white"
              >
                Reset
              </button>
            )}
          </div>

          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={showPrevious}
                className="absolute left-2 top-1/2 z-50 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/80 text-2xl text-white/75 shadow-xl backdrop-blur-xl transition hover:bg-white/10 hover:text-white sm:left-5"
                aria-label="Previous photo"
              >
                ←
              </button>
              <button
                type="button"
                onClick={showNext}
                className="absolute right-2 top-1/2 z-50 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/80 text-2xl text-white/75 shadow-xl backdrop-blur-xl transition hover:bg-white/10 hover:text-white sm:right-5"
                aria-label="Next photo"
              >
                →
              </button>
            </>
          )}

          <div
            className="flex h-full w-full min-h-0 min-w-0 items-center justify-center overflow-hidden px-12 py-14 sm:px-16 sm:py-16"
            style={{ touchAction: zoom > MIN_ZOOM ? "none" : "pan-y" }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <img
              src={currentImage.url}
              alt={currentImage.alt ?? "Vehicle photo"}
              draggable={false}
              className="block max-h-full max-w-full select-none rounded-xl object-contain shadow-2xl sm:rounded-2xl"
              style={{
                maxHeight: "calc(100dvh - 7rem)",
                maxWidth: "calc(100vw - 6rem)",
                transform: `scale(${zoom})`,
                transformOrigin: "center center",
                transition: "transform 180ms ease-out",
                cursor: zoom > 1 ? "zoom-out" : "zoom-in",
              }}
              onClick={() => changeZoom(zoom > 1 ? -0.5 : 0.5)}
            />
          </div>

          {images.length > 1 && (
            <div className="absolute right-3 top-3 z-40 rounded-full border border-white/10 bg-black/75 px-3 py-1.5 text-xs text-white/60 backdrop-blur-xl sm:right-5 sm:top-5">
              {index + 1} / {images.length}
            </div>
          )}
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <button
        type="button"
        onClick={openViewer}
        className={`group relative block h-full w-full cursor-zoom-in overflow-hidden ${className}`}
        aria-label="Open photo full screen"
      >
        <img
          src={currentImage.url}
          alt={currentImage.alt ?? "Vehicle photo"}
          className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02] ${imageClassName}`}
        />
        <span className="pointer-events-none absolute inset-x-3 bottom-3 flex justify-center opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <span className="rounded-full border border-white/10 bg-black/65 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/80 backdrop-blur-xl">
            View full screen
          </span>
        </span>
      </button>

      {viewer}
    </>
  );
}

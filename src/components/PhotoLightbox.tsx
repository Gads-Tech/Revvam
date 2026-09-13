"use client";

import { useEffect, useState } from "react";

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

export default function PhotoLightbox({
  images,
  initialIndex = 0,
  className = "",
  imageClassName = "",
}: PhotoLightboxProps) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(initialIndex);

  const currentImage = images[index] ?? images[0];

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      } else if (event.key === "ArrowLeft" && images.length > 1) {
        setIndex((current) =>
          current === 0 ? images.length - 1 : current - 1
        );
      } else if (event.key === "ArrowRight" && images.length > 1) {
        setIndex((current) =>
          current === images.length - 1 ? 0 : current + 1
        );
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, images.length]);

  if (images.length === 0 || !currentImage) {
    return null;
  }

  function openViewer() {
    setIndex(Math.min(initialIndex, images.length - 1));
    setOpen(true);
  }

  function showPrevious() {
    setIndex((current) =>
      current === 0 ? images.length - 1 : current - 1
    );
  }

  function showNext() {
    setIndex((current) =>
      current === images.length - 1 ? 0 : current + 1
    );
  }

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

      {open && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 p-3 backdrop-blur-xl sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label="Full screen photo viewer"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setOpen(false);
            }
          }}
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-black/70 text-xl text-white/70 backdrop-blur-xl transition hover:bg-white/10 hover:text-white"
            aria-label="Close photo viewer"
          >
            ×
          </button>

          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={showPrevious}
                className="absolute left-3 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/70 text-2xl text-white/75 backdrop-blur-xl transition hover:bg-white/10 hover:text-white sm:left-6"
                aria-label="Previous photo"
              >
                ←
              </button>
              <button
                type="button"
                onClick={showNext}
                className="absolute right-3 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/70 text-2xl text-white/75 backdrop-blur-xl transition hover:bg-white/10 hover:text-white sm:right-6"
                aria-label="Next photo"
              >
                →
              </button>
            </>
          )}

          <div className="flex h-full w-full items-center justify-center">
            <img
              src={currentImage.url}
              alt={currentImage.alt ?? "Vehicle photo"}
              className="max-h-[90vh] max-w-[92vw] rounded-2xl object-contain shadow-2xl sm:max-h-[88vh] sm:max-w-[88vw]"
            />
          </div>

          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-black/70 px-3 py-1.5 text-xs text-white/55 backdrop-blur-xl">
              {index + 1} / {images.length}
            </div>
          )}
        </div>
      )}
    </>
  );
}

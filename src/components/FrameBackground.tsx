"use client";

import { useEffect, useRef, useState } from "react";

const FRAME_COUNT = 165;

interface FrameBackgroundProps {
  className?: string;
  overlay?: boolean;
  children?: React.ReactNode;
}

export default function FrameBackground({
  className = "",
  overlay = true,
  children,
}: FrameBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const [frame, setFrame] = useState(1);

  useEffect(() => {
    const images: HTMLImageElement[] = [];

    for (let i = 1; i <= FRAME_COUNT; i++) {
      const image = new Image();

      const frameNumber = String(i).padStart(3, "0");

      image.src =
        `/frames/ezgif-frame-${frameNumber}.jpg`;

      images.push(image);
    }

    let animationFrame = 0;

    const updateFrame = () => {
      if (!containerRef.current) return;

      const rect =
        containerRef.current.getBoundingClientRect();

      const scrollDistance =
        containerRef.current.offsetHeight -
        window.innerHeight;

      const scrolled = Math.min(
        Math.max(-rect.top, 0),
        scrollDistance
      );

      const progress =
        scrollDistance > 0
          ? scrolled / scrollDistance
          : 0;

      const nextFrame = Math.min(
        FRAME_COUNT,
        Math.max(
          1,
          Math.floor(
            progress * (FRAME_COUNT - 1)
          ) + 1
        )
      );

      setFrame((current) =>
        current === nextFrame
          ? current
          : nextFrame
      );

      animationFrame =
        requestAnimationFrame(updateFrame);
    };

    animationFrame =
      requestAnimationFrame(updateFrame);

    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, []);

  const frameNumber =
    String(frame).padStart(3, "0");

  return (
    <div
      ref={containerRef}
      className={`
        relative
        h-[300vh]
        ${className}
      `}
    >
      <div
        className="
          sticky
          top-0
          h-screen
          w-full
          overflow-hidden
        "
      >

        <img
          src={`/frames/ezgif-frame-${frameNumber}.jpg`}
          alt=""
          aria-hidden="true"
          className="
            absolute
            inset-0
            h-full
            w-full
            scale-[1.08]
            object-cover
          "
        />

        {overlay && (
          <>
            <div
              className="
                absolute
                inset-0
                bg-black/50
              "
            />

            <div
              className="
                pointer-events-none
                absolute
                inset-0
                bg-[radial-gradient(circle_at_50%_45%,rgba(220,38,38,0.20),transparent_60%)]
              "
            />

            <div
              className="
                pointer-events-none
                absolute
                inset-x-0
                bottom-0
                h-80
                bg-gradient-to-t
                from-black
                via-black/60
                to-transparent
              "
            />
          </>
        )}

        {children}

      </div>
    </div>
  );
}
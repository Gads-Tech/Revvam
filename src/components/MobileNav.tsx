"use client";

import { useState } from "react";

export default function MobileNav() {
  const [mobileNavOpen, setMobileNavOpen] =
    useState(true);

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = "/";
    }
  };

  return (
    <div
      className={`
        fixed
        bottom-4
        left-4
        right-4
        z-[9999]
        flex
        justify-center
        md:hidden
        transition-transform
        duration-500
        ease-[cubic-bezier(0.22,1,0.36,1)]
        ${
          mobileNavOpen
            ? "translate-y-0"
            : "translate-y-[calc(100%-22px)]"
        }
      `}
    >
      <div
        className="
          relative
          w-full
          max-w-md
          rounded-[28px]
          border
          border-white/[0.13]
          bg-black/[0.68]
          px-4
          pb-4
          pt-8
          shadow-[0_10px_50px_rgba(0,0,0,0.60)]
          backdrop-blur-2xl
        "
      >
        {/* Toggle handle */}
        <button
          type="button"
          onClick={() =>
            setMobileNavOpen(
              (open) => !open
            )
          }
          aria-label={
            mobileNavOpen
              ? "Hide navigation"
              : "Show navigation"
          }
          className="
            absolute
            left-1/2
            top-2
            flex
            h-5
            w-16
            -translate-x-1/2
            cursor-pointer
            items-center
            justify-center
            rounded-full
          "
        >
          <span
            className={`
              h-1
              w-10
              rounded-full
              transition-all
              duration-300
              ${
                mobileNavOpen
                  ? "bg-white/30 hover:bg-white/60"
                  : "bg-red-500/80 hover:bg-red-400"
              }
            `}
          />
        </button>

        {/* Navigation */}
        <div
          className="
            grid
            grid-cols-5
            gap-1
          "
        >
          <MobileNavItem
            icon="←"
            label="Back"
            onClick={handleBack}
          />

          <MobileNavItem
            icon="⌂"
            label="Discover"
            href="#"
          />

          <MobileNavItem
            icon="🔧"
            label="Mechanics"
            href="#"
          />

          <MobileNavItem
            icon="🚗"
            label="Dealers"
            href="#"
          />

          <MobileNavItem
            icon="📍"
            label="Events"
            href="#"
          />
        </div>

        {/* Get started */}
        <button
          type="button"
          className="
            mt-3
            w-full
            rounded-2xl
            border
            border-red-400/30
            bg-red-600/[0.30]
            px-5
            py-3.5
            text-sm
            font-semibold
            text-white
            backdrop-blur-xl
            transition-all
            duration-300
            hover:border-red-300/40
            hover:bg-red-500/[0.45]
            active:scale-[0.98]
          "
        >
          Get Started
        </button>
      </div>
    </div>
  );
}


/* ============================================================
   MOBILE NAV ITEM
============================================================ */

function MobileNavItem({
  icon,
  label,
  href,
  onClick,
}: {
  icon: string;
  label: string;
  href?: string;
  onClick?: () => void;
}) {
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="
          flex
          flex-col
          items-center
          justify-center
          gap-1.5
          rounded-2xl
          border
          border-transparent
          px-2
          py-2.5
          text-white/50
          transition-all
          duration-300
          hover:border-white/[0.08]
          hover:bg-white/[0.06]
          hover:text-white
          active:scale-95
          touch-manipulation
        "
      >
        <span
          className="
            flex
            h-7
            items-center
            justify-center
            text-xl
            leading-none
          "
        >
          {icon}
        </span>

        <span
          className="
            text-[10px]
            font-medium
            tracking-wide
          "
        >
          {label}
        </span>
      </button>
    );
  }

  return (
    <a
      href={href}
      className="
        flex
        flex-col
        items-center
        justify-center
        gap-1.5
        rounded-2xl
        border
        border-transparent
        px-2
        py-2.5
        text-white/50
        transition-all
        duration-300
        hover:border-white/[0.08]
        hover:bg-white/[0.06]
        hover:text-white
        active:scale-95
        touch-manipulation
      "
    >
      <span
        className="
          flex
          h-7
          items-center
          justify-center
          text-lg
        "
      >
        {icon}
      </span>

      <span
        className="
          text-[10px]
          font-medium
          tracking-wide
        "
      >
        {label}
      </span>
    </a>
  );
}
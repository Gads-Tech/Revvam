"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

export default function MobileNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(true);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleBack = () => {
    if (window.history.length > 1) router.back();
    else router.push("/home");
  };

  const handleLogout = async () => {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: {
          Accept: "application/json",
        },
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "Logout failed");
      }

      setProfileMenuOpen(false);
      router.replace("/login");
      router.refresh();
    } catch (error) {
      console.error("Mobile logout error:", error);
      setLoggingOut(false);
    }
  };

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-[2147483647] px-3 pb-[max(8px,env(safe-area-inset-bottom))] md:hidden transition-transform duration-300 ease-out ${
        mobileNavOpen ? "translate-y-0" : "translate-y-[calc(100%-14px)]"
      }`}
      style={{
        WebkitTapHighlightColor: "transparent",
        pointerEvents: "auto",
        touchAction: "manipulation",
        isolation: "isolate",
      }}
    >
      <div className="relative mx-auto w-full max-w-[520px]">
        {profileMenuOpen && mobileNavOpen && (
          <div className="absolute bottom-[74px] right-0 z-50 w-[190px] overflow-hidden rounded-2xl border border-white/[0.10] bg-[#090909]/[0.97] p-1.5 shadow-[0_18px_50px_rgba(0,0,0,0.75)] backdrop-blur-2xl">
            <Link
              href="/profile"
              onClick={() => setProfileMenuOpen(false)}
              className="flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold text-white/75 transition-colors active:bg-white/[0.08] active:text-white"
              style={{ touchAction: "manipulation" }}
            >
              <span className="mr-3 text-white/40">◉</span>
              View profile
            </Link>

            <div className="my-1 border-t border-white/[0.07]" />

            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex min-h-11 w-full items-center rounded-xl px-3 text-left text-sm font-semibold text-red-300 transition-colors active:bg-red-500/[0.12] active:text-red-200 disabled:opacity-50"
              style={{ touchAction: "manipulation" }}
            >
              <span className="mr-3 text-red-400/70">↪</span>
              {loggingOut ? "Logging out…" : "Log out"}
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            setMobileNavOpen((open) => !open);
            if (mobileNavOpen) setProfileMenuOpen(false);
          }}
          aria-label={mobileNavOpen ? "Hide navigation" : "Show navigation"}
          className="absolute left-1/2 top-[-9px] z-50 flex h-5 w-12 -translate-x-1/2 items-center justify-center rounded-full border border-white/[0.10] bg-[#101010] shadow-[0_4px_18px_rgba(0,0,0,0.55)] backdrop-blur-xl"
          style={{
            WebkitTapHighlightColor: "transparent",
            touchAction: "manipulation",
          }}
        >
          <span
            className={`h-1 w-6 rounded-full transition-all duration-200 ${
              mobileNavOpen ? "bg-white/35" : "bg-red-400/80"
            }`}
          />
        </button>

        <nav
          aria-label="Mobile navigation"
          className="relative z-40 flex h-16 w-full flex-row items-stretch overflow-hidden rounded-[20px] border border-white/[0.10] bg-[#080808]/[0.96] p-1 shadow-[0_10px_40px_rgba(0,0,0,0.65)] backdrop-blur-2xl"
          style={{
            WebkitTapHighlightColor: "transparent",
            WebkitBackfaceVisibility: "hidden",
            pointerEvents: "auto",
            touchAction: "manipulation",
          }}
        >
          <MobileNavItem icon="←" label="Back" onClick={handleBack} />
          <MobileNavItem
            icon="⌂"
            label="Discover"
            href="/home"
            active={pathname === "/home"}
          />
          <MobileNavItem icon="⌕" label="Mechanics" href="#" />
          <MobileNavItem icon="▣" label="Dealers" href="#" />
          <MobileNavItem icon="•" label="Events" href="#" />

          <button
            type="button"
            onClick={() => setProfileMenuOpen((open) => !open)}
            aria-expanded={profileMenuOpen}
            aria-label="Profile menu"
            className={`flex h-full min-w-0 flex-1 touch-manipulation flex-col items-center justify-center rounded-[15px] px-0.5 py-1 transition-all active:scale-[0.96] ${
              pathname?.startsWith("/profile") || profileMenuOpen
                ? "bg-red-500/[0.10] text-red-300"
                : "text-white/50 active:bg-white/[0.05]"
            }`}
            style={{
              WebkitTapHighlightColor: "transparent",
              touchAction: "manipulation",
            }}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full border border-current/20 bg-white/[0.05] text-[10px] font-bold leading-none">
              ◉
            </span>
            <span className="mt-1 w-full truncate text-center text-[9px] font-medium leading-none tracking-tight">
              Profile
            </span>
          </button>
        </nav>
      </div>
    </div>
  );
}

function MobileNavItem({
  icon,
  label,
  href,
  onClick,
  active = false,
}: {
  icon: string;
  label: string;
  href?: string;
  onClick?: () => void;
  active?: boolean;
}) {
  const className = `flex h-full min-w-0 flex-1 touch-manipulation flex-col items-center justify-center rounded-[15px] px-0.5 py-1 transition-all active:scale-[0.96] ${
    active
      ? "bg-red-500/[0.10] text-red-300"
      : "text-white/50 active:bg-white/[0.05]"
  }`;

  const content = (
    <>
      <span className="flex h-5 items-center justify-center text-[14px] leading-none">
        {icon}
      </span>
      <span className="mt-1 w-full truncate text-center text-[8px] font-medium leading-none tracking-tight sm:text-[9px]">
        {label}
      </span>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={className}
        style={{
          WebkitTapHighlightColor: "transparent",
          touchAction: "manipulation",
        }}
      >
        {content}
      </button>
    );
  }

  return (
    <Link
      href={href ?? "#"}
      className={className}
      style={{
        WebkitTapHighlightColor: "transparent",
        touchAction: "manipulation",
      }}
    >
      {content}
    </Link>
  );
}

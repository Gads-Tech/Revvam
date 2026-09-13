"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { useState, useSyncExternalStore } from "react";

const subscribeToMount = () => () => {};
const getClientMountSnapshot = () => true;
const getServerMountSnapshot = () => false;

export default function MobileNav() {
  const router = useRouter();
  const pathname = usePathname();
  const mounted = useSyncExternalStore(
    subscribeToMount,
    getClientMountSnapshot,
    getServerMountSnapshot
  );
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

  // The first client render intentionally matches the server. React then
  // mounts this portal without a hydration mismatch or a reload race.
  if (!mounted) return null;

  return createPortal(
    <>
      <div
        className={`mobile-nav-root fixed inset-x-0 bottom-0 z-[2147483646] px-3 pb-[max(8px,env(safe-area-inset-bottom))] transition-transform duration-300 ease-out ${
          mobileNavOpen ? "translate-y-0" : "translate-y-full"
        }`}
        style={{
          WebkitTapHighlightColor: "transparent",
          // The full-width wrapper must never block the page. Only the visible
          // navigation and its controls are allowed to receive touch events.
          pointerEvents: "none",
          touchAction: "manipulation",
          isolation: "isolate",
          zIndex: 2147483646,
        }}
      >
        <div className="relative mx-auto w-full max-w-[520px]">
          {profileMenuOpen && mobileNavOpen && (
            <div
              className="absolute bottom-[74px] right-0 z-[2147483647] w-[190px] overflow-hidden rounded-2xl border border-white/[0.12] bg-[#080808] p-1.5 shadow-[0_18px_50px_rgba(0,0,0,0.9)]"
              style={{ pointerEvents: "auto", touchAction: "manipulation" }}
            >
              <Link
                href="/profile"
                onClick={() => setProfileMenuOpen(false)}
                className="flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold text-white/80 transition-colors active:bg-white/[0.08] active:text-white"
              style={{ touchAction: "manipulation" }}
            >
                <span className="mr-3 text-white/50">◉</span>
                View profile
              </Link>

              <div className="my-1 border-t border-white/[0.08]" />

              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="flex min-h-11 w-full items-center rounded-xl px-3 text-left text-sm font-semibold text-red-300 transition-colors active:bg-red-500/[0.12] active:text-red-200 disabled:opacity-50"
                style={{ touchAction: "manipulation" }}
              >
                <span className="mr-3 text-red-400/80">↪</span>
                {loggingOut ? "Logging out…" : "Log out"}
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              setProfileMenuOpen(false);
              setMobileNavOpen(false);
            }}
            aria-label="Hide navigation"
            className="absolute -top-11 left-1/2 z-[2147483647] flex h-11 w-14 -translate-x-1/2 items-center justify-center rounded-t-2xl border border-b-0 border-white/[0.14] bg-[#080808] text-sm text-white/65 shadow-[0_-5px_22px_rgba(0,0,0,0.6)] active:bg-red-500/15 active:text-white"
            style={{
              WebkitTapHighlightColor: "transparent",
              pointerEvents: "auto",
              touchAction: "manipulation",
            }}
          >
            ↓
          </button>

          <nav
            aria-label="Mobile navigation"
            className="relative z-[2147483647] flex h-16 w-full flex-row items-stretch overflow-hidden rounded-[20px] border border-white/[0.12] bg-[#080808] p-1 shadow-[0_10px_40px_rgba(0,0,0,0.9)]"
            style={{
              WebkitTapHighlightColor: "transparent",
              pointerEvents: "auto",
              touchAction: "manipulation",
              zIndex: 2147483647,
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

      {!mobileNavOpen && (
        <button
          type="button"
          onClick={() => setMobileNavOpen(true)}
          aria-label="Show navigation"
          className="mobile-nav-root fixed bottom-[max(12px,env(safe-area-inset-bottom))] right-4 z-[2147483647] flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.14] bg-[#080808]/95 text-sm text-white/65 shadow-[0_8px_30px_rgba(0,0,0,0.8)] backdrop-blur-xl transition-all active:scale-95 active:bg-red-500/15 active:text-white"
          style={{
            WebkitTapHighlightColor: "transparent",
            pointerEvents: "auto",
            touchAction: "manipulation",
            zIndex: 2147483647,
          }}
        >
          ↑
        </button>
      )}
    </>,
    document.body
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

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
        headers: { Accept: "application/json" },
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "Logout failed");
      }

      router.replace("/login");
      router.refresh();
    } catch (error) {
      console.error("Mobile logout error:", error);
      setLoggingOut(false);
    }
  };

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-[9999] px-3 pb-[max(8px,env(safe-area-inset-bottom))] md:hidden pointer-events-none transition-transform duration-300 ease-out ${
        mobileNavOpen ? "translate-y-0" : "translate-y-[calc(100%-18px)]"
      }`}
    >
      <div className="pointer-events-auto relative mx-auto w-full max-w-[480px] rounded-[22px] bg-[#090909]/95 p-1.5 shadow-[0_10px_40px_rgba(0,0,0,0.65)] backdrop-blur-2xl">
        <button
          type="button"
          onClick={() => setMobileNavOpen((open) => !open)}
          aria-label={mobileNavOpen ? "Hide navigation" : "Show navigation"}
          className="absolute left-1/2 top-[-5px] flex h-4 w-12 -translate-x-1/2 items-center justify-center touch-manipulation"
        >
          <span
            className={`h-1 w-7 rounded-full transition-colors ${
              mobileNavOpen ? "bg-white/20" : "bg-red-500/80"
            }`}
          />
        </button>

        <nav className="grid grid-cols-6 items-stretch" aria-label="Mobile navigation">
          <MobileNavItem icon="←" label="Back" onClick={handleBack} />
          <MobileNavItem icon="⌂" label="Discover" href="/home" active={pathname === "/home"} />
          <MobileNavItem icon="🔧" label="Mechanics" href="#" />
          <MobileNavItem icon="🚗" label="Dealers" href="#" />
          <MobileNavItem icon="📍" label="Events" href="#" />
          <button
            type="button"
            onClick={() => setProfileMenuOpen((open) => !open)}
            aria-expanded={profileMenuOpen}
            className={`flex min-w-0 flex-col items-center justify-center rounded-[16px] px-0.5 py-1.5 transition-all active:scale-95 touch-manipulation ${
              pathname.startsWith("/profile") || profileMenuOpen
                ? "bg-red-500/[0.10] text-red-300"
                : "text-white/45 active:bg-white/[0.05]"
            }`}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/[0.07] text-[10px] font-bold text-white/65">
              ◉
            </span>
            <span className="mt-0.5 text-[8px] font-medium leading-none tracking-wide">
              Profile
            </span>
          </button>
        </nav>

        {profileMenuOpen && (
          <div className="absolute bottom-[calc(100%+8px)] right-1.5 w-[150px] overflow-hidden rounded-2xl bg-[#0b0b0b]/98 p-1.5 shadow-[0_12px_35px_rgba(0,0,0,0.7)] backdrop-blur-2xl">
            <Link
              href="/profile"
              onClick={() => setProfileMenuOpen(false)}
              className="flex min-h-10 items-center rounded-xl px-3 text-xs font-semibold text-white/70 transition-colors active:bg-white/[0.08]"
            >
              View profile
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex min-h-10 w-full items-center rounded-xl px-3 text-left text-xs font-semibold text-red-300 transition-colors active:bg-red-500/[0.12] disabled:opacity-50"
            >
              {loggingOut ? "Logging out…" : "Log out"}
            </button>
          </div>
        )}
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
  const className = `flex min-w-0 flex-col items-center justify-center rounded-[16px] px-0.5 py-1.5 transition-all active:scale-95 touch-manipulation ${
    active
      ? "bg-red-500/[0.10] text-red-300"
      : "text-white/45 active:bg-white/[0.05]"
  }`;

  const content = (
    <>
      <span className="text-[15px] leading-5">{icon}</span>
      <span className="mt-0.5 max-w-full truncate text-[8px] font-medium leading-none tracking-[0.01em]">
        {label}
      </span>
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {content}
      </button>
    );
  }

  return (
    <Link href={href ?? "#"} className={className}>
      {content}
    </Link>
  );
}

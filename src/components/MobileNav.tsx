"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

export default function MobileNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(true);
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

      window.location.replace("/login");
    } catch (error) {
      console.error("Mobile logout error:", error);
      setLoggingOut(false);
    }
  };

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-[9999] px-3 pb-[max(10px,env(safe-area-inset-bottom))] pt-2 md:hidden pointer-events-none transition-transform duration-300 ease-out ${
        mobileNavOpen ? "translate-y-0" : "translate-y-[calc(100%-22px)]"
      }`}
    >
      <div className="pointer-events-auto relative mx-auto w-full max-w-[420px] rounded-[20px] border border-white/[0.11] bg-black/[0.92] px-2 pb-2 pt-7 shadow-[0_12px_45px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
        <button
          type="button"
          onClick={() => setMobileNavOpen((open) => !open)}
          aria-label={mobileNavOpen ? "Hide navigation" : "Show navigation"}
          className="absolute left-1/2 top-1 flex h-6 w-14 -translate-x-1/2 items-center justify-center touch-manipulation"
        >
          <span
            className={`h-1 w-8 rounded-full transition-colors ${
              mobileNavOpen ? "bg-white/25" : "bg-red-500/80"
            }`}
          />
        </button>

        <div className="grid grid-cols-5 gap-0.5">
          <MobileNavItem icon="←" label="Back" onClick={handleBack} />
          <MobileNavItem icon="⌂" label="Discover" href="/home" active={pathname === "/home"} />
          <MobileNavItem icon="🔧" label="Mechanics" href="#" />
          <MobileNavItem icon="🚗" label="Dealers" href="#" />
          <MobileNavItem icon="📍" label="Events" href="#" />
        </div>

        <div className="mt-1.5 grid grid-cols-2 gap-1.5">
          <Link
            href="/profile"
            className="flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-white/[0.07] bg-white/[0.035] px-2 py-2 text-[11px] font-semibold text-white/60 transition-colors active:bg-white/[0.08]"
          >
            <span>◉</span> Profile
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-red-400/15 bg-red-600/[0.09] px-2 py-2 text-[11px] font-semibold text-red-300 transition-colors active:bg-red-500/[0.16] disabled:opacity-50"
          >
            <span>{loggingOut ? "…" : "↪"}</span>
            {loggingOut ? "Logging out" : "Log out"}
          </button>
        </div>
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
  const className = `flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-2 transition-all active:scale-95 touch-manipulation ${
    active
      ? "bg-red-500/[0.10] text-red-300"
      : "text-white/45 active:bg-white/[0.05]"
  }`;

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        <span className="text-base leading-5">{icon}</span>
        <span className="text-[8px] font-medium tracking-wide">{label}</span>
      </button>
    );
  }

  return (
    <Link href={href ?? "#"} className={className}>
      <span className="text-base leading-5">{icon}</span>
      <span className="text-[8px] font-medium tracking-wide">{label}</span>
    </Link>
  );
}

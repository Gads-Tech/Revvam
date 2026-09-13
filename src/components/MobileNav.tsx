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
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/home");
    }
  };

  const handleLogout = async () => {
    if (loggingOut) return;

    try {
      setLoggingOut(true);

      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Logout failed");
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
      className={`fixed bottom-4 left-4 right-4 z-[9999] flex justify-center transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] md:hidden ${
        mobileNavOpen ? "translate-y-0" : "translate-y-[calc(100%-22px)]"
      }`}
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-white/[0.13] bg-black/[0.78] px-3 pb-3 pt-8 shadow-[0_18px_70px_rgba(0,0,0,0.70)] backdrop-blur-2xl">
        <button
          type="button"
          onClick={() => setMobileNavOpen((open) => !open)}
          aria-label={mobileNavOpen ? "Hide navigation" : "Show navigation"}
          className="absolute left-1/2 top-2 flex h-5 w-16 -translate-x-1/2 items-center justify-center rounded-full"
        >
          <span
            className={`h-1 w-10 rounded-full transition-all duration-300 ${
              mobileNavOpen ? "bg-white/30" : "bg-red-500/80"
            }`}
          />
        </button>

        <div className="grid grid-cols-5 gap-1">
          <MobileNavItem icon="←" label="Back" onClick={handleBack} />
          <MobileNavItem icon="⌂" label="Discover" href="/home" active={pathname === "/home"} />
          <MobileNavItem icon="🔧" label="Mechanics" href="#" />
          <MobileNavItem icon="🚗" label="Dealers" href="#" />
          <MobileNavItem icon="📍" label="Events" href="#" />
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2">
          <Link
            href="/profile"
            className="flex items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.035] px-4 py-3 text-xs font-semibold text-white/55 transition-all hover:border-white/[0.15] hover:bg-white/[0.07] hover:text-white active:scale-[0.98]"
          >
            <span>◉</span>
            Profile
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center justify-center gap-2 rounded-2xl border border-red-400/20 bg-red-600/[0.10] px-4 py-3 text-xs font-semibold text-red-300 transition-all hover:border-red-400/35 hover:bg-red-500/[0.18] hover:text-red-200 active:scale-[0.98] disabled:cursor-wait disabled:opacity-50"
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
  const className = `flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl border px-1 py-2.5 transition-all duration-300 active:scale-95 touch-manipulation ${
    active
      ? "border-red-400/20 bg-red-500/[0.10] text-red-300"
      : "border-transparent text-white/45 hover:border-white/[0.08] hover:bg-white/[0.06] hover:text-white"
  }`;

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        <span className="flex h-6 items-center justify-center text-lg leading-none">{icon}</span>
        <span className="text-[9px] font-medium tracking-wide">{label}</span>
      </button>
    );
  }

  return (
    <Link href={href ?? "#"} className={className}>
      <span className="flex h-6 items-center justify-center text-lg leading-none">{icon}</span>
      <span className="text-[9px] font-medium tracking-wide">{label}</span>
    </Link>
  );
}

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { useEffect, useState, useSyncExternalStore } from "react";
import DiscoverLink from "@/components/DiscoverLink";

const subscribeToMount = () => () => {};
const getClientMountSnapshot = () => true;
const getServerMountSnapshot = () => false;

function Badge({ count }: { count: number }) {
  if (!count) return null;
  return <span className="ml-auto rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-black leading-none text-white">{count > 99 ? "99+" : count}</span>;
}

export default function MobileNav() {
  const router = useRouter();
  const pathname = usePathname();
  const mounted = useSyncExternalStore(subscribeToMount, getClientMountSnapshot, getServerMountSnapshot);
  const [mobileNavOpen, setMobileNavOpen] = useState(true);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [messageCount, setMessageCount] = useState(0);

  async function refreshIndicators(signal?: AbortSignal) {
    try {
      const response = await fetch(`/api/social/unread?_=${Date.now()}`, {
        credentials: "include",
        cache: "no-store",
        headers: { Accept: "application/json", "Cache-Control": "no-cache" },
        signal,
      });

      if (!response.ok) return;
      const data = await response.json().catch(() => null);
      if (!data?.success || signal?.aborted) return;

      setNotificationCount(Number(data.unreadNotifications) || 0);
      setMessageCount(Number(data.unreadMessages) || 0);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    refreshIndicators(controller.signal);

    const timer = window.setInterval(() => {
      refreshIndicators(controller.signal);
    }, 3000);

    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [pathname]);

  useEffect(() => {
    if (!profileMenuOpen) return;
    const closeOnOutsideTap = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest("[data-revvam-profile-menu], [data-revvam-profile-toggle]")) setProfileMenuOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideTap);
    return () => document.removeEventListener("pointerdown", closeOnOutsideTap);
  }, [profileMenuOpen]);

  const handleBack = () => {
    if (window.history.length > 1) router.back();
    else router.push("/home");
  };

  const toggleMobileNav = () => {
    setProfileMenuOpen(false);
    setMobileNavOpen((open) => !open);
  };

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST", credentials: "include", cache: "no-store", headers: { Accept: "application/json" } });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) throw new Error(data?.error || "Logout failed");
      setProfileMenuOpen(false);
      // Logged-out users belong on the public Explore/Landing page.
      router.replace("/");
      router.refresh();
    } catch (error) {
      console.error("Mobile logout error:", error);
      setLoggingOut(false);
    }
  };

  if (!mounted) return null;

  const combinedCount = notificationCount + messageCount;

  return createPortal(
    <>
      <button type="button" onClick={toggleMobileNav} aria-label={mobileNavOpen ? "Hide navigation" : "Show navigation"} aria-expanded={mobileNavOpen} className={`mobile-nav-root fixed left-1/2 z-[2147483647] flex h-6 w-16 -translate-x-1/2 items-center justify-center rounded-full border border-white/[0.14] bg-[#080808] shadow-[0_8px_30px_rgba(0,0,0,0.85)] transition-[bottom] duration-300 ease-out active:bg-red-500/15 ${mobileNavOpen ? "bottom-[max(72px,calc(72px+env(safe-area-inset-bottom)))]" : "bottom-[max(12px,env(safe-area-inset-bottom))]"}`} style={{ pointerEvents: "auto", touchAction: "manipulation", zIndex: 2147483647, WebkitTapHighlightColor: "transparent" }}><span aria-hidden="true" className="block h-0.5 w-5 rounded-full bg-white/65" /></button>
      <div className={`mobile-nav-root fixed inset-x-0 bottom-0 z-[2147483646] px-3 pb-[max(8px,env(safe-area-inset-bottom))] transition-transform duration-300 ease-out ${mobileNavOpen ? "translate-y-0" : "translate-y-full"}`} style={{ pointerEvents: mobileNavOpen ? "auto" : "none", touchAction: "manipulation", isolation: "isolate", zIndex: 2147483646 }}>
        <div className="relative mx-auto w-full max-w-[520px]">
          {profileMenuOpen && mobileNavOpen && <div data-revvam-profile-menu className="absolute bottom-[74px] right-0 z-[2147483647] w-[230px] overflow-hidden rounded-2xl border border-white/[0.12] bg-[#080808] p-1.5 shadow-[0_18px_50px_rgba(0,0,0,0.9)]" style={{ pointerEvents: "auto", touchAction: "manipulation" }}>
            <Link href="/profile" onClick={() => setProfileMenuOpen(false)} className="flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold text-white/80 active:bg-white/[0.08]" style={{ touchAction: "manipulation" }}><span className="mr-3 text-white/50">◉</span>View profile</Link>
            <Link href="/profile/notifications" onClick={() => setProfileMenuOpen(false)} className="flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold text-white/80 active:bg-white/[0.08]" style={{ touchAction: "manipulation" }}><span className="mr-3 text-red-400/80">●</span><span>Notifications</span><Badge count={notificationCount} /></Link>
            <Link href="/messages" onClick={() => setProfileMenuOpen(false)} className="flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold text-white/80 active:bg-white/[0.08]" style={{ touchAction: "manipulation" }}><span className="mr-3 text-white/50">✉</span><span>Messages</span><Badge count={messageCount} /></Link>
            <Link href="/profile/avatar" onClick={() => setProfileMenuOpen(false)} className="flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold text-white/80 active:bg-white/[0.08]" style={{ touchAction: "manipulation" }}><span className="mr-3 text-white/50">◌</span>Profile photo</Link>
            <div className="my-1 border-t border-white/[0.08]" />
            <button type="button" onClick={handleLogout} disabled={loggingOut} className="flex min-h-11 w-full items-center rounded-xl px-3 text-left text-sm font-semibold text-red-300 active:bg-red-500/[0.12] disabled:opacity-50" style={{ touchAction: "manipulation" }}><span className="mr-3 text-red-400/80">↪</span>{loggingOut ? "Logging out…" : "Log out"}</button>
          </div>}

          <nav aria-label="Mobile navigation" className="relative z-[2147483647] flex h-16 w-full flex-row items-stretch overflow-hidden rounded-[20px] border border-white/[0.12] bg-[#080808] p-1 shadow-[0_10px_40px_rgba(0,0,0,0.9)]" style={{ pointerEvents: "auto", touchAction: "manipulation", zIndex: 2147483647 }}>
            <MobileNavItem icon="←" label="Back" onClick={handleBack} />
            <DiscoverLink className={`flex h-full min-w-0 flex-1 touch-manipulation flex-col items-center justify-center rounded-[15px] px-0.5 py-1 transition-all active:scale-[0.96] ${pathname === "/home" ? "bg-red-500/[0.10] text-red-300" : "text-white/50 active:bg-white/[0.05]"}`}>
              <span className="flex h-5 items-center justify-center text-[14px] leading-none">⌂</span>
              <span className="mt-1 w-full truncate text-center text-[8px] font-medium leading-none tracking-tight sm:text-[9px]">Discover</span>
            </DiscoverLink>
            <MobileNavItem icon="⌕" label="Mechanics" href="#" />
            <MobileNavItem icon="▣" label="Dealers" href="#" />
            <MobileNavItem icon="•" label="Events" href="#" />
            <button data-revvam-profile-toggle type="button" onClick={() => setProfileMenuOpen((open) => !open)} aria-expanded={profileMenuOpen} aria-label={`Profile menu${combinedCount ? `, ${combinedCount} unread` : ""}`} className={`relative flex h-full min-w-0 flex-1 touch-manipulation flex-col items-center justify-center rounded-[15px] px-0.5 py-1 transition-all active:scale-[0.96] ${pathname?.startsWith("/profile") || profileMenuOpen ? "bg-red-500/[0.10] text-red-300" : "text-white/50 active:bg-white/[0.05]"}`} style={{ WebkitTapHighlightColor: "transparent", touchAction: "manipulation" }}>
              <span className="relative flex h-5 w-5 items-center justify-center rounded-full border border-current/20 bg-white/[0.05] text-[10px] font-bold leading-none">◉{combinedCount > 0 && <span className="absolute -right-3 -top-2 min-w-4 rounded-full bg-red-500 px-1 text-center text-[8px] font-black leading-4 text-white">{combinedCount > 99 ? "99+" : combinedCount}</span>}</span>
              <span className="mt-1 w-full truncate text-center text-[9px] font-medium leading-none tracking-tight">Profile</span>
            </button>
          </nav>
        </div>
      </div>
    </>, document.body
  );
}

function MobileNavItem({ icon, label, href, onClick, active = false }: { icon: string; label: string; href?: string; onClick?: () => void; active?: boolean }) {
  const className = `flex h-full min-w-0 flex-1 touch-manipulation flex-col items-center justify-center rounded-[15px] px-0.5 py-1 transition-all active:scale-[0.96] ${active ? "bg-red-500/[0.10] text-red-300" : "text-white/50 active:bg-white/[0.05]"}`;
  const content = <><span className="flex h-5 items-center justify-center text-[14px] leading-none">{icon}</span><span className="mt-1 w-full truncate text-center text-[8px] font-medium leading-none tracking-tight sm:text-[9px]">{label}</span></>;
  if (onClick) return <button type="button" onClick={onClick} className={className} style={{ WebkitTapHighlightColor: "transparent", touchAction: "manipulation" }}>{content}</button>;
  return <Link href={href ?? "#"} className={className} style={{ WebkitTapHighlightColor: "transparent", touchAction: "manipulation" }}>{content}</Link>;
}

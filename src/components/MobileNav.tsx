"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { useEffect, useState, useSyncExternalStore } from "react";
import DiscoverLink from "@/components/DiscoverLink";
import { BackIcon, BellIcon, CarIcon, LocationIcon, MessageIcon, SearchIcon, UserIcon, PlusIcon, MoreIcon } from "@/components/icons";

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
  const [emergencyCount, setEmergencyCount] = useState(0);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);

  useEffect(() => {
    const updateCommentsState = () => setCommentsOpen(document.documentElement.dataset.revvamCommentsOpen === "true");
    updateCommentsState();
    const observer = new MutationObserver(updateCommentsState);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-revvam-comments-open"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const updateKeyboardState = () => {
      const covered = window.innerHeight - viewport.height - viewport.offsetTop > 120;
      setKeyboardOpen(covered);
    };
    updateKeyboardState();
    viewport.addEventListener("resize", updateKeyboardState);
    viewport.addEventListener("scroll", updateKeyboardState);
    return () => {
      viewport.removeEventListener("resize", updateKeyboardState);
      viewport.removeEventListener("scroll", updateKeyboardState);
    };
  }, []);

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
      try {
        const emergencyResponse = await fetch(`/api/emergencies/help?_=${Date.now()}`, {
          credentials: "include",
          cache: "no-store",
          headers: { Accept: "application/json", "Cache-Control": "no-cache" },
          signal,
        });
        const emergencyData = await emergencyResponse.json().catch(() => null);
        if (emergencyResponse.ok && emergencyData?.success && !signal?.aborted) {
          const items = Array.isArray(emergencyData.emergencies) ? emergencyData.emergencies : [];
          let viewed = new Set<string>();
          try {
            viewed = new Set(JSON.parse(localStorage.getItem("revvam-viewed-emergencies") || "[]"));
          } catch {}
          const unseen = items.filter((item: { id?: string }) => item.id && !viewed.has(item.id)).length;
          setEmergencyCount(unseen);
        }
      } catch {}
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
    if (!pathname?.startsWith("/profile/notifications")) return;
    const markEmergencyAlertsViewed = async () => {
      try {
        const response = await fetch("/api/emergencies/help?_=" + Date.now(), {
          credentials: "include",
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        const data = await response.json().catch(() => null);
        if (!response.ok || !data?.success || !Array.isArray(data.emergencies)) return;
        const ids = data.emergencies.map((item: { id?: string }) => item.id).filter(Boolean);
        let existing: string[] = [];
        try { existing = JSON.parse(localStorage.getItem("revvam-viewed-emergencies") || "[]"); } catch {}
        const merged = Array.from(new Set([...existing, ...ids])).slice(-100);
        localStorage.setItem("revvam-viewed-emergencies", JSON.stringify(merged));
        setEmergencyCount(0);
      } catch {}
    };
    void markEmergencyAlertsViewed();
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

  if (!mounted || keyboardOpen || commentsOpen) return null;

  const combinedCount = notificationCount + messageCount;

  return createPortal(
    <>
      <button type="button" onClick={toggleMobileNav} aria-label={mobileNavOpen ? "Hide navigation" : "Show navigation"} aria-expanded={mobileNavOpen} className={`mobile-nav-root fixed left-1/2 z-[2147483647] flex h-6 w-16 -translate-x-1/2 items-center justify-center rounded-full border border-white/[0.14] bg-[#080808] shadow-[0_8px_30px_rgba(0,0,0,0.85)] transition-[bottom] duration-300 ease-out active:bg-red-500/15 ${mobileNavOpen ? "bottom-[max(72px,calc(72px+env(safe-area-inset-bottom)))]" : "bottom-[max(12px,env(safe-area-inset-bottom))]"}`} style={{ pointerEvents: "auto", touchAction: "manipulation", zIndex: 2147483647, WebkitTapHighlightColor: "transparent" }}><span aria-hidden="true" className="block h-0.5 w-5 rounded-full bg-white/65" /></button>
      <div className={`mobile-nav-root fixed inset-x-0 bottom-0 z-[2147483646] px-3 pb-[max(8px,env(safe-area-inset-bottom))] transition-transform duration-300 ease-out ${mobileNavOpen ? "translate-y-0" : "translate-y-full"}`} style={{ pointerEvents: mobileNavOpen ? "auto" : "none", touchAction: "manipulation", isolation: "isolate", zIndex: 2147483646 }}>
        <div className="relative mx-auto w-full max-w-[520px]">
          {profileMenuOpen && mobileNavOpen && <div data-revvam-profile-menu className="absolute bottom-[74px] right-0 z-[2147483647] w-[230px] overflow-hidden rounded-2xl border border-white/[0.12] bg-[#080808] p-1.5 shadow-[0_18px_50px_rgba(0,0,0,0.9)]" style={{ pointerEvents: "auto", touchAction: "manipulation" }}>
            <Link href="/profile" onClick={() => setProfileMenuOpen(false)} className="flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold text-white/80 active:bg-white/[0.08]" style={{ touchAction: "manipulation" }}><UserIcon className="mr-3 h-4 w-4 text-white/50" />View profile</Link>
            <Link href="/profile/notifications" onClick={() => setProfileMenuOpen(false)} className="flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold text-white/80 active:bg-white/[0.08]" style={{ touchAction: "manipulation" }}><BellIcon className="mr-3 h-4 w-4 text-red-400/80" /><span>Notifications</span><Badge count={notificationCount} /></Link>
            <Link href="/messages" onClick={() => setProfileMenuOpen(false)} className="flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold text-white/80 active:bg-white/[0.08]" style={{ touchAction: "manipulation" }}><MessageIcon className="mr-3 h-4 w-4 text-white/50" /><span>Messages</span><Badge count={messageCount} /></Link>
            <div className="my-1 border-t border-white/[0.08]" />
            <button type="button" onClick={handleLogout} disabled={loggingOut} className="flex min-h-11 w-full items-center rounded-xl px-3 text-left text-sm font-semibold text-red-300 active:bg-red-500/[0.12] disabled:opacity-50" style={{ touchAction: "manipulation" }}><BackIcon className="mr-3 h-4 w-4 rotate-180 text-red-400/80" />{loggingOut ? "Logging out…" : "Log out"}</button>
          </div>}

          <nav aria-label="Mobile navigation" className="relative z-[2147483647] flex h-16 w-full items-stretch overflow-hidden rounded-[22px] border border-white/[0.12] bg-[#080808]/95 p-1 shadow-[0_10px_40px_rgba(0,0,0,0.9)] backdrop-blur-xl" style={{ pointerEvents: "auto", touchAction: "manipulation", zIndex: 2147483647 }}>
            <MobileNavItem icon={<SearchIcon className="h-4 w-4" />} label="Discover" href="/home" active={pathname === "/home"} />
            <MobileNavItem icon={<LocationIcon className="h-4 w-4" />} label="Map" href="/map" active={pathname === "/map"} />
            <Link href="/emergency" aria-label="Revvam emergency" className="flex h-full min-w-0 flex-1 items-center justify-center px-1">
              <span className="flex h-12 w-12 items-center justify-center rounded-full border border-red-500/45 bg-black shadow-[0_0_28px_rgba(239,68,68,.18)]">
                <img src="/logo_mark.svg" alt="Revvam" className="h-8 w-8 object-contain" />
              </span>
            </Link>
            <MobileNavItem icon={<BellIcon className="h-4 w-4" />} label="Alerts" href="/profile/notifications" active={pathname?.startsWith("/profile/notifications")} badge={notificationCount + emergencyCount} />
            <MobileNavItem icon={<MessageIcon className="h-4 w-4" />} label="Messages" href="/messages" active={pathname?.startsWith("/messages")} badge={messageCount} />
          </nav>
        </div>
      </div>
    </>, document.body
  );
}

function MobileNavItem({ icon, label, href, onClick, active = false, badge = 0 }: { icon: React.ReactNode; label: string; href?: string; onClick?: () => void; active?: boolean; badge?: number }) {
  const className = `flex h-full min-w-0 flex-1 touch-manipulation flex-col items-center justify-center rounded-[15px] px-0.5 py-1 transition-all active:scale-[0.96] ${active ? "bg-red-500/[0.10] text-red-300" : "text-white/50 active:bg-white/[0.05]"}`;
  const content = <><span className="relative flex h-5 items-center justify-center">{icon}{badge > 0 && <span className="absolute -right-2 -top-2 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-red-500 px-1 text-[7px] font-black text-white">{badge > 99 ? "99+" : badge}</span>}</span><span className="mt-1 w-full truncate text-center text-[8px] font-medium leading-none tracking-tight sm:text-[9px]">{label}</span></>;
  if (onClick) return <button type="button" onClick={onClick} className={className} style={{ WebkitTapHighlightColor: "transparent", touchAction: "manipulation" }}>{content}</button>;
  return <Link href={href ?? "#"} className={className} style={{ WebkitTapHighlightColor: "transparent", touchAction: "manipulation" }}>{content}</Link>;
}

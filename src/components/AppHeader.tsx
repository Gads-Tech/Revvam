"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import LiveSocialActions from "@/components/LiveSocialActions";
import Logo from "@/components/Logo";

type Profile = {
  name: string;
  username: string;
  image: string | null;
};

const links = [
  { href: "/home", label: "Discover" },
  { href: "/map", label: "Map" },
  { href: "/profile/mechanic", label: "Mechanics" },
  { href: "/map", label: "Dealerships" },
  { href: "/map", label: "Events" },
];

export default function AppHeader() {
  const pathname = usePathname();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [emergencyCount, setEmergencyCount] = useState(0);

  useEffect(() => {
    let active = true;

    fetch("/api/profile", { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (!active || !data?.success || !data.user) return;

        setProfile({
          name: data.user.name,
          username: data.user.username,
          image: data.user.image ?? null,
        });
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const check = async () => {
      try {
        const response = await fetch("/api/emergencies/help", {
          credentials: "include",
          cache: "no-store",
        });
        const data = await response.json();

        if (active && response.ok && typeof data?.count === "number") {
          setEmergencyCount(data.count);
        }
      } catch {}
    };

    check();
    const timer = window.setInterval(check, 3000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-black/80 backdrop-blur-2xl">
      <div className="mx-auto flex h-[76px] max-w-[1480px] items-center justify-between px-5 sm:px-6 xl:px-8">
        <Link href="/home" aria-label="Revvam Discover" className="shrink-0">
          <Logo className="h-10 w-auto scale-[1.55] transform-gpu sm:h-11" />
        </Link>

        <nav aria-label="Primary navigation" className="hidden h-full items-center gap-8 md:flex">
          {links.map((link) => {
            const active =
              link.href === "/home"
                ? pathname === "/home"
                : link.href === "/map"
                  ? pathname === "/map"
                  : link.href === "/messages"
                    ? pathname.startsWith("/messages")
                    : link.href === "/profile/mechanic"
                      ? pathname.startsWith("/profile/mechanic")
                      : false;

            return (
              <Link
                key={link.label}
                href={link.href}
                className={`relative flex h-full items-center text-sm font-semibold transition ${active ? "text-white after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-red-500" : "text-white/40 hover:text-white"}`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          {emergencyCount > 0 && (
            <Link
              href="/emergency/nearby"
              className="flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-red-200 shadow-[0_0_24px_rgba(239,68,68,.12)] transition hover:bg-red-500/15"
              title="Active emergency help requests"
            >
              <span className="flex h-2 w-2 animate-pulse rounded-full bg-red-400" />
              Emergency Help {emergencyCount}
            </Link>
          )}

          <div className="hidden md:block">
            <LiveSocialActions />
          </div>

          <Link
            href="/profile"
            aria-label={profile ? `Open @${profile.username} profile` : "Open profile"}
            className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.025] px-1.5 py-1.5 transition hover:border-red-400/25"
          >
            <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-red-500/10 text-xs font-bold text-red-300">
              {profile?.image ? (
                <img src={profile.image} alt="" className="h-full w-full object-cover" />
              ) : (
                profile?.name?.charAt(0).toUpperCase() || "R"
              )}
            </span>
            {profile && (
              <span className="hidden max-w-28 text-left lg:block">
                <span className="block truncate text-xs font-semibold">{profile.name}</span>
                <span className="block truncate text-[9px] text-white/30">@{profile.username}</span>
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}

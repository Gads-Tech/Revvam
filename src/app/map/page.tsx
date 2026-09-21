"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import RevvamMap from "@/components/RevvamMap";
import MobileNav from "@/components/MobileNav";
import AppHeader from "@/components/AppHeader";
import LiveSocialActions from "@/components/LiveSocialActions";

type Emergency = {
  id: string;
  type: string;
  status: string;
  description: string;
  photo: string | null;
  latitude: number;
  longitude: number;
  liveLatitude: number | null;
  liveLongitude: number | null;
  radiusMeters: number;
  ghostMode: boolean;
  exactLocation: boolean;
  locationLabel: string | null;
  createdAt: string;
  driver: { id: string; name: string; username: string; image: string | null };
};

type Mechanic = {
  id: string;
  name: string;
  username: string;
  image: string | null;
  headline: string | null;
  skills: string[];
};

const labels: Record<string, string> = {
  BREAKDOWN: "Breakdown",
  OVERHEATING: "Overheating",
  FLAT_TYRE: "Flat tyre",
  DEAD_BATTERY: "Dead battery",
  ENGINE_PROBLEM: "Engine problem",
  ACCIDENT: "Accident",
  FUEL_PROBLEM: "Fuel problem",
  OTHER: "Other",
};

export default function MapPage() {
  const [emergencies, setEmergencies] = useState<Emergency[]>([]);
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [tab, setTab] = useState<"live" | "mechanics" | "dealerships">("live");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const [emergencyResponse, eventResponse, profileResponse] = await Promise.all([
        fetch("/api/emergencies", { credentials: "include", cache: "no-store" }),
        fetch("/api/profile", { credentials: "include", cache: "no-store" }),
      ]);
      const emergencyData = await emergencyResponse.json().catch(() => null);
      const profileData = await profileResponse.json().catch(() => null);
      if (emergencyData?.success) setEmergencies(emergencyData.emergencies || []);
      if (profileData?.success) setProfileImage(profileData.user?.image || null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 5000);
    if (!navigator.geolocation) return () => window.clearInterval(timer);
    const watch = navigator.geolocation.watchPosition(
      p => setLocation({ latitude: p.coords.latitude, longitude: p.coords.longitude }),
      () => undefined,
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    );
    return () => {
      navigator.geolocation.clearWatch(watch);
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    fetch("/api/mechanics", { credentials: "include", cache: "no-store" })
      .then(r => r.json())
      .then(data => setMechanics(data?.mechanics || []))
      .catch(() => undefined);
  }, []);

  const filteredEmergencies = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return emergencies;
    return emergencies.filter(e =>
      [labels[e.type] || e.type, e.description, e.locationLabel || "", e.driver.username]
        .join(" ").toLowerCase().includes(q),
    );
  }, [emergencies, search]);

  const filteredEvents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return events;
    return events.filter(e => [e.title, e.description || "", e.locationLabel || "", e.host.username].join(" ").toLowerCase().includes(q));
  }, [events, search]);

  const markers = [
    ...filteredEmergencies.map(e => ({
    id: e.id,
    latitude: e.ghostMode ? e.latitude : (e.liveLatitude ?? e.latitude),
    longitude: e.ghostMode ? e.longitude : (e.liveLongitude ?? e.longitude),
    title: labels[e.type] || e.type,
    description: e.description,
    radiusMeters: e.radiusMeters,
    exactLocation: e.exactLocation,
    ghostMode: e.ghostMode,
    kind: "emergency" as const,
  })),
    ...filteredEvents.map(e => ({
      id: "event-" + e.id,
      latitude: e.latitude,
      longitude: e.longitude,
      title: e.title,
      description: e.description || "Revvam event",
      kind: "event" as const,
      eventLocation: e.locationLabel || undefined,
      eventStartsAt: e.startsAt,
    })),
  ];

  const distance = (lat: number, lng: number) => {
    if (!location) return null;
    const R = 6371;
    const dLat = (lat - location.latitude) * Math.PI / 180;
    const dLng = (lng - location.longitude) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(location.latitude * Math.PI / 180) * Math.cos(lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  async function offerHelp(id: string) {
    await fetch(`/api/emergencies/${id}/offers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ message: "I can help with this roadside issue." }),
    });
    await load();
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#030303] text-white">
      <AppHeader />


      <div className="mx-auto max-w-[1500px] px-4 pb-28 pt-5 lg:px-7 lg:pb-8">
        <div className="grid gap-5 lg:grid-cols-[330px_minmax(0,1fr)_350px]">
          <aside className="space-y-5">
            <section className="rounded-[1.5rem] border border-white/[.08] bg-[#090909] p-4 shadow-2xl">
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold"><span className="text-red-400">◈</span> Map View</div>
              <div className="mb-3 grid grid-cols-3 rounded-2xl bg-white/[.025] p-1">
                {(["live","mechanics","dealerships"] as const).map(item => (
                  <button key={item} type="button" onClick={() => setTab(item)} className={`rounded-xl px-2 py-3 text-xs font-semibold capitalize transition ${tab === item ? "bg-red-600 text-white shadow-lg" : "text-white/45 hover:text-white"}`}>{item}</button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-1 rounded-2xl border border-white/[.06] bg-black/30 p-1">
                {(["both", "emergencies", "events"] as const).map(item => (
                  <button key={item} type="button" onClick={() => setContentMode(item)} className={`rounded-xl px-2 py-2.5 text-[10px] font-bold capitalize transition ${contentMode === item ? "bg-white/[.10] text-white" : "text-white/35 hover:text-white"}`}>
                    {item === "both" ? "Both" : item === "emergencies" ? "Emergencies" : "Events"}
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-[1.5rem] border border-white/[.08] bg-[#090909] p-5">
              <div className="mb-5 flex items-center justify-between"><h2 className="text-sm font-bold">Filters</h2><button type="button" onClick={() => setSearch("")} className="text-xs text-white/35 hover:text-white">Reset</button></div>
              <div className="mb-5 rounded-2xl border border-red-500/15 bg-red-500/[.04] p-3">
                <div className="text-[9px] font-bold uppercase tracking-[.18em] text-white/30">What's happening in Revvam</div>
                <p className="mt-1 text-xs leading-5 text-white/45">Switch between live roadside emergencies, upcoming events, or both on the map.</p>
              </div>
              <div className="space-y-2">
                <button type="button" onClick={() => setContentMode(contentMode === "emergencies" ? "both" : "emergencies")} className={`flex w-full items-center justify-between rounded-xl border px-3 py-3 text-sm transition ${contentMode !== "events" ? "border-red-500/20 bg-red-500/[.06] text-white" : "border-white/[.06] bg-white/[.02] text-white/45"}`}>
                  <span className="flex items-center gap-3"><span className="text-red-400">⚠</span> Emergencies</span><span className="rounded-full bg-red-500/15 px-2 py-1 text-[9px] font-bold text-red-300">{filteredEmergencies.length}</span>
                </button>
                <button type="button" onClick={() => setContentMode(contentMode === "events" ? "both" : "events")} className={`flex w-full items-center justify-between rounded-xl border px-3 py-3 text-sm transition ${contentMode !== "emergencies" ? "border-purple-400/20 bg-purple-400/[.05] text-white" : "border-white/[.06] bg-white/[.02] text-white/45"}`}>
                  <span className="flex items-center gap-3"><span className="text-purple-300">▦</span> Events</span><span className="rounded-full bg-purple-400/10 px-2 py-1 text-[9px] font-bold text-purple-200">{filteredEvents.length}</span>
                </button>
              </div>
              {[
                ["Mechanic Shops", "🔧"],
                ["Dealerships", "▣"],
                ["Events", "▦"],
              ].map(([name, icon]) => <div key={name} className="flex items-center justify-between border-t border-white/[.06] py-4 text-sm text-white/55"><span className="flex items-center gap-3"><span>{icon}</span>{name}</span><span className="h-5 w-9 rounded-full bg-white/15 p-1"><span className="block h-3 w-3 rounded-full bg-white/75" /></span></div>)}
              <div className="border-t border-white/[.06] pt-4"><div className="mb-2 text-[10px] font-bold uppercase tracking-[.18em] text-white/25">Search area</div><div className="relative"><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search location or issue" className="w-full rounded-xl border border-white/10 bg-black px-3 py-2.5 text-xs outline-none placeholder:text-white/25 focus:border-red-500/40" /></div></div>
            </section>

            <section className="rounded-[1.5rem] border border-red-500/25 bg-gradient-to-br from-red-950/45 to-black p-5">
              <div className="mb-3 text-2xl">🚗</div><h2 className="text-lg font-bold">Need Help on the Road?</h2><p className="mt-2 text-sm leading-5 text-white/40">Report a live issue and get nearby support fast.</p><Link href="/emergency" className="mt-5 flex h-11 items-center justify-center rounded-xl border border-red-500 bg-red-600/15 text-sm font-semibold text-red-100 hover:bg-red-600/25">Report Issue</Link>
            </section>
          </aside>

          <section className="min-w-0">
            <div className="relative overflow-hidden rounded-[2rem] border border-red-500/35 bg-[#05070b] shadow-[0_30px_90px_rgba(0,0,0,.55)]">
              <div className="absolute left-5 top-5 z-20 flex w-[285px] items-center gap-3 rounded-full border border-white/10 bg-black/75 px-4 py-3 backdrop-blur-xl">
                <span className="text-white/60">⌕</span><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search location..." className="w-full bg-transparent text-sm outline-none placeholder:text-white/45" />
              </div>
              <RevvamMap
                userLocation={location}
                userImage={profileImage}
                markers={markers.filter(m => contentMode === "both" || (contentMode === "emergencies" ? m.kind === "emergency" : m.kind === "event"))}
                onOfferHelp={offerHelp}
              />
              <div className="pointer-events-none absolute bottom-5 left-5 z-20 rounded-full border border-white/10 bg-black/80 px-4 py-2 text-xs font-semibold backdrop-blur-xl"><span className="mr-2 inline-block h-2 w-2 rounded-full bg-red-500" />{contentMode === "events" ? "Events" : contentMode === "emergencies" ? "Live issues" : "Live in Revvam"} <b>{contentMode === "events" ? filteredEvents.length : contentMode === "emergencies" ? filteredEmergencies.length : filteredEmergencies.length + filteredEvents.length}</b></div>
            </div>
            <p className="mt-2 px-2 text-[10px] text-white/20">Live location is only exposed according to the emergency's privacy/acceptance rules.</p>
          </section>

          <aside className="space-y-5">
            <section className="rounded-[1.5rem] border border-white/[.08] bg-[#090909] p-4">
              <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-bold"><span className="mr-2 inline-block h-2 w-2 rounded-full bg-red-500" />Live on Map</h2><span className="text-xs font-semibold text-red-500">{filteredEmergencies.length ? "View All" : ""}</span></div>
              <div className="divide-y divide-white/[.06]">
                {loading ? <div className="py-8 text-center text-xs text-white/25">Loading live issues…</div> : filteredEmergencies.slice(0, 4).map(e => {
                  const km = distance(e.latitude, e.longitude);
                  return <button key={e.id} type="button" onClick={() => document.getElementById(`emergency-${e.id}`)?.scrollIntoView({ behavior: "smooth" })} className="flex w-full gap-3 py-4 text-left">
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-red-500/30 bg-white/[.03]">{e.photo ? <img src={e.photo} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-red-400">⚠</div>}</div>
                    <div className="min-w-0 flex-1"><div className="truncate text-sm font-bold">{labels[e.type] || e.type}</div><div className="mt-1 truncate text-xs text-white/35">{e.description}</div><div className="mt-2 flex items-center gap-2 text-[10px]"><span className="rounded-full bg-red-500 px-2 py-1 font-bold">Live</span><span className="text-white/35">{km == null ? "Nearby" : `${km.toFixed(1)} km`}</span></div></div><span className="self-center text-white/25">›</span>
                  </button>;
                })}
                {!loading && filteredEmergencies.length === 0 && <div className="py-8 text-center text-xs text-white/25">No live issues in view.</div>}
              </div>
            </section>

            <section className="rounded-[1.5rem] border border-white/[.08] bg-[#090909] p-4">
              <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-bold">Nearby Mechanics</h2><Link href="#" className="text-xs font-semibold text-red-500">View All</Link></div>
              {mechanics.slice(0, 4).map(m => <div key={m.id} className="flex items-center gap-3 border-t border-white/[.06] py-3"><div className="h-10 w-10 overflow-hidden rounded-xl border border-white/10 bg-white/[.04]">{m.image ? <img src={m.image} alt="" className="h-full w-full object-cover" /> : <span className="grid h-full place-items-center text-xs">{m.name[0]}</span>}</div><div className="min-w-0"><div className="truncate text-xs font-semibold">{m.name}</div><div className="truncate text-[10px] text-white/30">{m.headline || m.skills.slice(0,2).join(" · ") || "Roadside support"}</div></div><span className="ml-auto text-green-400">●</span></div>)}
              {mechanics.length === 0 && <div className="py-6 text-xs text-white/25">Mechanic profiles will appear here as they register.</div>}
            </section>

            <section className="rounded-[1.5rem] border border-white/[.08] bg-[#090909] p-4">
              <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-bold">Nearby Dealerships</h2><Link href="#" className="text-xs font-semibold text-red-500">View All</Link></div>
              <div className="rounded-xl border border-white/[.06] bg-white/[.015] p-4 text-xs leading-5 text-white/30">Dealership discovery is ready for the next location data layer. The map already supports the same card/filter pattern.</div>
            </section>
          </aside>
        </div>
      </div>
      <div className="md:hidden"><MobileNav /></div>
    </main>
  );
}

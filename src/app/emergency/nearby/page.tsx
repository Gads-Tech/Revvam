"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BackIcon, CarIcon, LocationIcon, WarningIcon } from "@/components/icons";
import RevvamMap from "@/components/RevvamMap";
import LiveSocialActions from "@/components/LiveSocialActions";
import MobileNav from "@/components/MobileNav";

type Emergency = {
  id: string;
  type: string;
  status: string;
  description: string;
  photo: string | null;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  ghostMode: boolean;
  exactLocation: boolean;
  locationLabel: string | null;
  createdAt: string;
  driver: { id: string; name: string; username: string; image: string | null };
  vehicle: { make: string; model: string; year: number | null } | null;
  offers: { id: string; status: string; message: string | null; mechanic: { id: string; name: string; username: string; image: string | null; role: string } }[];
};

type RevvamEvent = {
  id: string;
  title: string;
  description: string | null;
  latitude: number;
  longitude: number;
  locationLabel: string | null;
  startsAt: string;
  endsAt: string | null;
  image: string | null;
  host: { id: string; name: string; username: string; image: string | null };
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

type Mode = "both" | "emergencies" | "events";

export default function NearbyEmergencyPage() {
  const [emergencies, setEmergencies] = useState<Emergency[]>([]);
  const [events, setEvents] = useState<RevvamEvent[]>([]);
  const [mode, setMode] = useState<Mode>("both");
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [offeringId, setOfferingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  async function load() {
    try {
      const [emergencyResponse, eventResponse, profileResponse] = await Promise.all([
        fetch("/api/emergencies", { credentials: "include", cache: "no-store" }),
        fetch("/api/events", { credentials: "include", cache: "no-store" }),
        fetch("/api/profile", { credentials: "include", cache: "no-store" }),
      ]);
      const emergencyData = await emergencyResponse.json().catch(() => null);
      const eventData = await eventResponse.json().catch(() => null);
      const profileData = await profileResponse.json().catch(() => null);
      if (!emergencyResponse.ok || !emergencyData?.success) throw new Error(emergencyData?.error || "Unable to load emergencies.");
      setEmergencies(emergencyData.emergencies || []);
      if (eventData?.success) setEvents(eventData.events || []);
      if (profileData?.success) {
        setProfileImage(profileData.user?.image || null);
        setCurrentUserId(profileData.user?.id || null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load Revvam World.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 4000);
    if (!navigator.geolocation) return () => window.clearInterval(timer);
    const watchId = navigator.geolocation.watchPosition(
      p => setLocation({ latitude: p.coords.latitude, longitude: p.coords.longitude }),
      () => undefined,
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    );
    return () => {
      navigator.geolocation.clearWatch(watchId);
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!currentUserId || !navigator.geolocation) return;
    const owned = emergencies.filter(e => currentUserId === e.driver.id && !["COMPLETED", "CANCELLED"].includes(e.status));
    if (!owned.length) return;
    const watchId = navigator.geolocation.watchPosition(position => {
      owned.forEach(emergency => {
        fetch("/api/emergencies/" + emergency.id, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            action: "update_location",
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }),
        }).catch(() => undefined);
      });
    }, () => undefined, { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 });
    return () => navigator.geolocation.clearWatch(watchId);
  }, [currentUserId, emergencies]);

  const distance = (lat: number, lng: number) => {
    if (!location) return null;
    const R = 6371;
    const dLat = ((lat - location.latitude) * Math.PI) / 180;
    const dLng = ((lng - location.longitude) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(location.latitude * Math.PI / 180) * Math.cos(lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const filteredEmergencies = useMemo(() => {
    const q = search.trim().toLowerCase();
    return emergencies.filter(e => !q || [labels[e.type], e.description, e.locationLabel, e.driver.username].some(v => v?.toLowerCase().includes(q)));
  }, [emergencies, search]);

  const filteredEvents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return events.filter(e => !q || [e.title, e.description, e.locationLabel, e.host.username].some(v => v?.toLowerCase().includes(q)));
  }, [events, search]);

  const mapMarkers = useMemo(() => {
    const emergencyMarkers = mode === "events" ? [] : filteredEmergencies.filter(e => !e.ghostMode).map(e => ({
      id: e.id,
      latitude: e.exactLocation && e.liveLatitude !== undefined && e.liveLatitude !== null ? e.liveLatitude : e.latitude,
      longitude: e.exactLocation && e.liveLongitude !== undefined && e.liveLongitude !== null ? e.liveLongitude : e.longitude,
      title: labels[e.type] || e.type,
      radiusMeters: e.radiusMeters,
      exactLocation: e.exactLocation,
      description: e.description,
      ghostMode: e.ghostMode,
      kind: "emergency" as const,
    }));
    const eventMarkers = mode === "emergencies" ? [] : filteredEvents.map(e => ({
      id: e.id,
      latitude: e.latitude,
      longitude: e.longitude,
      title: e.title,
      description: e.description || "Revvam event",
      kind: "event" as const,
      eventLocation: e.locationLabel || "Event location",
      eventStartsAt: e.startsAt,
    }));
    return [...emergencyMarkers, ...eventMarkers];
  }, [filteredEmergencies, filteredEvents, mode]);

  async function offerHelp(emergencyId: string) {
    setOfferingId(emergencyId);
    setError("");
    try {
      const response = await fetch("/api/emergencies/" + emergencyId + "/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: "I can help with this roadside issue." }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) throw new Error(data?.error || "Unable to send your help request.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to send your help request.");
    } finally {
      setOfferingId(null);
    }
  }

  async function acceptOffer(emergencyId: string, offerId: string) {
    setOfferingId(offerId);
    try {
      const response = await fetch("/api/emergencies/" + emergencyId, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "accept_offer", offerId }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) throw new Error(data?.error || "Unable to accept this offer.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to accept this offer.");
    } finally {
      setOfferingId(null);
    }
  }

  async function editEmergency(emergency: Emergency) {
    const description = window.prompt("Update the emergency description:", emergency.description);
    if (description === null) return;
    const response = await fetch("/api/emergencies/" + emergency.id, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ action: "update", description, radiusMeters: emergency.radiusMeters }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.success) { setError(data?.error || "Unable to update the emergency."); return; }
    await load();
  }

  async function deleteEmergency(emergency: Emergency) {
    if (!window.confirm("Delete this emergency request?")) return;
    const response = await fetch("/api/emergencies/" + emergency.id, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ action: "delete" }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.success) { setError(data?.error || "Unable to delete the emergency."); return; }
    await load();
  }

  const activeCount = emergencies.filter(e => !["COMPLETED", "CANCELLED"].includes(e.status)).length;

  return (
    <main className="min-h-screen bg-[#030303] text-white">
      <div className="mx-auto max-w-[1500px] px-4 pb-28 pt-5 sm:px-6 lg:px-8">
        <div className="mb-5 flex items-center justify-between gap-3">
          <Link href="/emergency" className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white">
            <BackIcon className="h-4 w-4" /> Request help
          </Link>
          <div className="flex items-center gap-2">
            <div className="hidden md:block"><LiveSocialActions /></div>
            <span className="hidden rounded-full border border-red-500/25 bg-red-500/[.06] px-3 py-2 text-[9px] font-black uppercase tracking-[.18em] text-red-300 sm:inline-flex">● Live Revvam World</span>
          </div>
        </div>

        <header className="mb-6">
          <p className="text-[10px] font-black uppercase tracking-[.28em] text-red-400">Revvam World</p>
          <div className="mt-1 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black tracking-[-.05em] sm:text-5xl">What&apos;s happening in Revvam?</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/35">See live roadside emergencies and Revvam events around you. Use the map to discover what is happening now.</p>
            </div>
            <Link href="/emergency" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs font-bold text-red-100 hover:bg-red-500/20">+ Report issue</Link>
          </div>
        </header>

        <div className="mb-5 flex flex-wrap items-center gap-2">
          {([
            ["both", "◉", "Both"],
            ["emergencies", "⚠", "Emergencies"],
            ["events", "✦", "Events"],
          ] as const).map(([value, icon, label]) => (
            <button key={value} type="button" onClick={() => setMode(value)} className={"rounded-full border px-4 py-2.5 text-xs font-bold transition " + (mode === value ? (value === "events" ? "border-purple-400/50 bg-purple-500/15 text-purple-100" : "border-red-500/50 bg-red-500/15 text-white") : "border-white/[.08] bg-white/[.025] text-white/45 hover:text-white")}>
              <span className={value === "events" ? "text-purple-300" : "text-red-400"}>{icon}</span> {label}
            </button>
          ))}
          <div className="ml-auto flex min-w-[220px] flex-1 sm:max-w-xs">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search location, event or issue..." className="w-full rounded-full border border-white/[.08] bg-white/[.025] px-4 py-2.5 text-xs text-white outline-none placeholder:text-white/25 focus:border-red-500/40" />
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="overflow-hidden rounded-[2rem] border border-white/[.09] bg-[#080808] shadow-[0_30px_100px_rgba(0,0,0,.45)]">
            <div className="flex items-center justify-between border-b border-white/[.07] px-4 py-4 sm:px-5">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[.2em] text-red-400/70">Live network</p>
                <h2 className="mt-1 text-base font-bold">Live map</h2>
              </div>
              <span className="rounded-full border border-white/[.08] bg-white/[.03] px-3 py-1.5 text-[9px] font-bold uppercase tracking-[.14em] text-white/40">
                {mode === "both" ? "Everything" : mode === "events" ? "Events only" : "Emergencies only"}
              </span>
            </div>
            <div className="p-2 sm:p-3">
              <RevvamMap userLocation={location} userImage={profileImage} markers={mapMarkers} onOfferHelp={offerHelp} />
            </div>
            <div className="flex flex-wrap items-center gap-4 border-t border-white/[.06] px-4 py-3 text-[9px] text-white/30">
              <span><b className="text-red-400">!</b> Emergency</span>
              <span><b className="text-purple-300">✦</b> Event</span>
              <span>Map updates automatically</span>
            </div>
          </section>

          <aside className="space-y-5">
            <section className="rounded-[1.6rem] border border-white/[.08] bg-[#080808] p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-bold">Live on Map</h2>
                <span className="text-[10px] font-bold text-red-400">{activeCount} active</span>
              </div>
              {mode !== "events" && filteredEmergencies.length > 0 && (
                <div className="space-y-2">
                  {filteredEmergencies.slice(0, 5).map(e => {
                    const km = distance(e.latitude, e.longitude);
                    return (
                      <div key={e.id} className="flex items-center gap-3 rounded-2xl border border-white/[.06] bg-white/[.02] p-2.5">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-red-500/25 bg-red-500/10">
                          {e.photo ? <img src={e.photo} alt="" className="h-full w-full object-cover" /> : <WarningIcon className="h-5 w-5 text-red-400" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-bold">{labels[e.type] || e.type}</p>
                          <p className="truncate text-[10px] text-white/30">{e.locationLabel || "Location shared"}</p>
                        </div>
                        <span className="shrink-0 text-[9px] font-semibold text-white/35">{km == null ? "Live" : km < 1 ? "<1 km" : km.toFixed(1) + " km"}</span>
                      </div>
                    );
                  })}
                </div>
              )}
              {mode !== "emergencies" && filteredEvents.length > 0 && (
                <div className={(mode !== "events" && filteredEmergencies.length > 0 ? "mt-3 pt-3 border-t border-white/[.06] " : "") + "space-y-2"}>
                  {filteredEvents.slice(0, 5).map(e => (
                    <div key={e.id} className="flex items-center gap-3 rounded-2xl border border-purple-400/10 bg-purple-400/[.03] p-2.5">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-purple-400/20 bg-purple-500/10">
                        {e.image ? <img src={e.image} alt="" className="h-full w-full object-cover" /> : <span className="text-lg text-purple-300">✦</span>}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold">{e.title}</p>
                        <p className="truncate text-[10px] text-white/30">{e.locationLabel || "Event location"}</p>
                      </div>
                      <span className="text-[9px] font-semibold text-purple-200/60">{new Date(e.startsAt).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              )}
              {((mode === "events" && !filteredEvents.length) || (mode === "emergencies" && !filteredEmergencies.length) || (mode === "both" && !filteredEvents.length && !filteredEmergencies.length)) && (
                <div className="rounded-2xl border border-white/[.06] bg-white/[.02] p-6 text-center text-xs text-white/30">Nothing live here right now.</div>
              )}
            </section>

            <section className="rounded-[1.6rem] border border-white/[.08] bg-[#080808] p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-bold">Map filters</h2>
                <button type="button" onClick={() => setMode("both")} className="text-[10px] text-white/30 hover:text-white">Reset</button>
              </div>
              <button type="button" onClick={() => setMode(mode === "emergencies" ? "both" : "emergencies")} className={"mb-2 flex w-full items-center justify-between rounded-xl border px-3 py-3 text-xs font-semibold " + (mode !== "events" ? "border-red-500/20 bg-red-500/[.05]" : "border-white/[.06] bg-white/[.02] text-white/40")}>
                <span><span className="mr-2 text-red-400">⚠</span> Emergencies</span><span className="rounded-full bg-red-500/10 px-2 py-1 text-[9px] text-red-300">{filteredEmergencies.length}</span>
              </button>
              <button type="button" onClick={() => setMode(mode === "events" ? "both" : "events")} className={"flex w-full items-center justify-between rounded-xl border px-3 py-3 text-xs font-semibold " + (mode !== "emergencies" ? "border-purple-400/20 bg-purple-400/[.04]" : "border-white/[.06] bg-white/[.02] text-white/40")}>
                <span><span className="mr-2 text-purple-300">✦</span> Events</span><span className="rounded-full bg-purple-400/10 px-2 py-1 text-[9px] text-purple-200">{filteredEvents.length}</span>
              </button>
            </section>

            <Link href="/events" className="block rounded-[1.6rem] border border-purple-400/20 bg-gradient-to-br from-purple-950/40 to-black p-5 transition hover:border-purple-300/30">
              <p className="text-[9px] font-black uppercase tracking-[.2em] text-purple-300/70">Revvam events</p>
              <h3 className="mt-2 text-lg font-black">See what the community is hosting.</h3>
              <p className="mt-2 text-xs leading-5 text-white/35">Discover meets, drives and car events on the live map.</p>
            </Link>
          </aside>
        </div>

        {error && <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/[.07] p-4 text-sm text-red-100/80">{error}</div>}

        {mode !== "events" && (
          <section className="mt-5">
            <div className="mb-3 flex items-center justify-between">
              <div><p className="text-[9px] font-black uppercase tracking-[.2em] text-red-400/70">Roadside network</p><h2 className="mt-1 text-xl font-black">Emergency requests</h2></div>
              <span className="text-xs text-white/30">{filteredEmergencies.length} active</span>
            </div>
            {loading ? <div className="rounded-3xl border border-white/[.07] bg-white/[.02] p-10 text-center text-sm text-white/30">Loading Revvam World…</div> :
              filteredEmergencies.length === 0 ? <div className="rounded-3xl border border-white/[.07] bg-white/[.02] p-10 text-center text-sm text-white/30">No open emergencies to show.</div> :
              <div className="grid gap-4 lg:grid-cols-2">
                {filteredEmergencies.map(e => {
                  const isMine = currentUserId === e.driver.id;
                  return <article key={e.id} className="overflow-hidden rounded-[1.5rem] border border-white/[.07] bg-white/[.02]">
                    {e.photo && <img src={e.photo} alt="" className="h-40 w-full object-cover" />}
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3"><div><span className="rounded-full bg-red-500/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[.12em] text-red-300">{labels[e.type] || e.type}</span><h3 className="mt-3 font-bold">{e.description}</h3></div><span className="text-[9px] text-white/30">{e.radiusMeters >= 1000 ? e.radiusMeters / 1000 + " km" : e.radiusMeters + "m"} radius</span></div>
                      <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-white/35"><span className="rounded-full bg-white/[.035] px-2.5 py-1.5">{e.locationLabel || "Location shared"}</span>{e.vehicle && <span className="rounded-full bg-white/[.035] px-2.5 py-1.5">{e.vehicle.make} {e.vehicle.model}</span>}{e.ghostMode && <span className="rounded-full bg-purple-500/10 px-2.5 py-1.5 text-purple-200/70">Ghost mode</span>}</div>
                      <div className="mt-4 flex items-center justify-between border-t border-white/[.06] pt-3"><span className="text-[10px] text-white/35">@{e.driver.username}</span>
                        {!isMine && ["OPEN", "OFFERS_RECEIVED"].includes(e.status) && <button type="button" onClick={() => offerHelp(e.id)} disabled={offeringId === e.id} className="rounded-xl bg-red-500/10 px-3 py-2 text-[9px] font-bold uppercase text-red-200 disabled:opacity-50">{offeringId === e.id ? "Sending..." : "Offer help"}</button>}
                        {isMine && <div className="flex gap-2"><button type="button" onClick={() => editEmergency(e)} className="rounded-xl bg-white/[.04] px-3 py-2 text-[9px] font-bold uppercase text-white/55">Edit</button><button type="button" onClick={() => deleteEmergency(e)} className="rounded-xl bg-red-500/[.06] px-3 py-2 text-[9px] font-bold uppercase text-red-300">Delete</button></div>}
                      </div>
                      {isMine && e.offers.length > 0 && <div className="mt-3 space-y-2 border-t border-white/[.06] pt-3"><p className="text-[9px] font-bold uppercase tracking-[.16em] text-white/25">People offering help</p>{e.offers.map(o => <div key={o.id} className="flex items-center justify-between rounded-xl bg-white/[.02] p-2.5"><span className="text-xs">{o.mechanic.name}</span>{o.status === "PENDING" ? <button type="button" onClick={() => acceptOffer(e.id,o.id)} disabled={offeringId===o.id} className="rounded-lg bg-red-500/10 px-3 py-1.5 text-[9px] font-bold text-red-200">{offeringId===o.id?"...":"Accept"}</button> : <span className="text-[9px] text-white/30">{o.status}</span>}</div>)}</div>}
                    </div>
                  </article>;
                })}
              </div>}
          </section>
        )}

        {mode !== "emergencies" && (
          <section className="mt-7">
            <div className="mb-3 flex items-center justify-between"><div><p className="text-[9px] font-black uppercase tracking-[.2em] text-purple-300/70">Community calendar</p><h2 className="mt-1 text-xl font-black">Upcoming events</h2></div><span className="text-xs text-white/30">{filteredEvents.length} events</span></div>
            {filteredEvents.length === 0 ? <div className="rounded-3xl border border-white/[.07] bg-white/[.02] p-10 text-center text-sm text-white/30">No upcoming events on the map.</div> :
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{filteredEvents.slice(0,6).map(e => <article key={e.id} className="overflow-hidden rounded-[1.5rem] border border-purple-400/10 bg-white/[.02]">{e.image ? <img src={e.image} alt="" className="h-40 w-full object-cover" /> : <div className="flex h-40 items-center justify-center bg-purple-950/20 text-4xl text-purple-300">✦</div>}<div className="p-4"><p className="text-[9px] font-black uppercase tracking-[.16em] text-purple-300/70">{new Date(e.startsAt).toLocaleString()}</p><h3 className="mt-2 font-bold">{e.title}</h3><p className="mt-1 text-xs text-white/35">{e.locationLabel || "Location on Revvam map"}</p><p className="mt-3 text-[10px] text-white/30">Hosted by @{e.host.username}</p></div></article>)}</div>}
          </section>
        )}
      </div>
      <MobileNav />
    </main>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BackIcon, CarIcon, LocationIcon, NavigationIcon, WarningIcon } from "@/components/icons";
import EmergencyMap from "@/components/EmergencyMap";

type Emergency = {
  id: string;
  type: string;
  description: string;
  photo: string | null;
  latitude: number;
  longitude: number;
  locationLabel: string | null;
  createdAt: string;
  driver: { name: string; username: string; image: string | null };
  vehicle: { make: string; model: string; year: number | null } | null;
  offers: { id: string; status: string }[];
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

export default function NearbyEmergencyPage() {
  const [emergencies, setEmergencies] = useState<Emergency[]>([]);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function load() {
    try {
      const response = await fetch("/api/emergencies", { credentials: "include", cache: "no-store" });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) throw new Error(data?.error || "Unable to load nearby emergencies.");
      setEmergencies(data.emergencies || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load nearby emergencies.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (p) => setLocation({ latitude: p.coords.latitude, longitude: p.coords.longitude }),
      () => undefined,
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    );

    fetch("/api/profile", { credentials: "include", cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        if (data?.success) setProfileImage(data.user?.image || null);
      })
      .catch(() => undefined);

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const mapMarkers = useMemo(
    () =>
      emergencies.map((emergency) => ({
        id: emergency.id,
        latitude: emergency.latitude,
        longitude: emergency.longitude,
        title: labels[emergency.type] || emergency.type,
        description: emergency.vehicle
          ? `${emergency.vehicle.make} ${emergency.vehicle.model} · @${emergency.driver.username}`
          : `@${emergency.driver.username}`,
      })),
    [emergencies],
  );

  const distance = (lat: number, lng: number) => {
    if (!location) return null;
    const R = 6371;
    const dLat = ((lat - location.latitude) * Math.PI) / 180;
    const dLng = ((lng - location.longitude) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(location.latitude * Math.PI / 180) * Math.cos(lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="relative mx-auto max-w-6xl px-5 pb-24 pt-7 sm:px-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <Link href="/emergency" className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white"><BackIcon className="h-4 w-4" /> Request help</Link>
          <div className="inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/[0.07] px-3.5 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-red-300"><WarningIcon className="h-3.5 w-3.5" /> Nearby emergency</div>
        </div>

        <header className="mb-7">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-red-400/70">Roadside network</p>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] sm:text-4xl">Nearby emergencies</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/35">Drivers who need roadside assistance appear here. Mechanics and shops can use this view to discover requests close to them.</p>
        </header>

        <section className="mb-7 overflow-hidden rounded-[2rem] border border-white/[0.08] bg-white/[0.025]">
          <div className="border-b border-white/[0.07] px-5 py-4 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-400/70">Live network</p>
                <h2 className="mt-1 text-lg font-bold">Nearby emergency map</h2>
              </div>
              <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-white/30">Google Maps</span>
            </div>
          </div>
          <EmergencyMap
            userLocation={location}
            userImage={profileImage}
            markers={mapMarkers}
          />
          <div className="border-t border-white/[0.07] px-5 py-3 text-[10px] text-white/25 sm:px-6">
            Red markers are active roadside requests. Your blue marker appears when location permission is available.
          </div>
        </section>

        {error && <div className="mb-5 rounded-2xl border border-red-500/20 bg-red-500/[0.07] p-4 text-sm text-red-100/80">{error}</div>}

        {loading ? (
          <div className="rounded-3xl border border-white/[0.07] bg-white/[0.02] p-10 text-center text-sm text-white/30">Loading nearby requests…</div>
        ) : emergencies.length === 0 ? (
          <div className="rounded-3xl border border-white/[0.07] bg-white/[0.02] p-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04] text-white/25"><CarIcon className="h-7 w-7" /></div>
            <h2 className="mt-4 text-lg font-bold">No open emergencies nearby</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/30">When a driver posts a roadside emergency, it will appear here for eligible helpers.</p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {emergencies.map((emergency) => {
              const km = distance(emergency.latitude, emergency.longitude);
              return (
                <article key={emergency.id} className="overflow-hidden rounded-[1.7rem] border border-white/[0.08] bg-white/[0.025]">
                  {emergency.photo && <div className="h-48 bg-black"><img src={emergency.photo} alt="" className="h-full w-full object-cover" /></div>}
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <span className="inline-flex rounded-full border border-red-500/20 bg-red-500/[0.08] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-red-300">{labels[emergency.type] || emergency.type}</span>
                        <h2 className="mt-3 text-lg font-bold">{emergency.description}</h2>
                      </div>
                      {km !== null && <span className="shrink-0 text-xs font-semibold text-white/35">{km < 1 ? "<1 km" : `${km.toFixed(1)} km`}</span>}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/35">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.035] px-3 py-1.5"><LocationIcon className="h-3.5 w-3.5" /> {emergency.locationLabel || "Location shared"}</span>
                      {emergency.vehicle && <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.035] px-3 py-1.5"><CarIcon className="h-3.5 w-3.5" /> {emergency.vehicle.make} {emergency.vehicle.model}</span>}
                    </div>
                    <div className="mt-5 flex items-center justify-between border-t border-white/[0.07] pt-4">
                      <div className="flex items-center gap-2 text-xs text-white/35"><div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-white/[0.06]">{emergency.driver.image ? <img src={emergency.driver.image} alt="" className="h-full w-full object-cover" /> : emergency.driver.name.charAt(0)}</div>@{emergency.driver.username}</div>
                      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/20">{emergency.offers.length ? `${emergency.offers.length} offer${emergency.offers.length === 1 ? "" : "s"}` : "Awaiting help"}</span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

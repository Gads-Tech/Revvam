"use client";

import Link from "next/link";
import LiveSocialActions from "@/components/LiveSocialActions";
import MobileNav from "@/components/MobileNav";
import { useRef, useState } from "react";
import {
  BackIcon,
  CameraIcon,
  CarIcon,
  CheckIcon,
  LocationIcon,
  NavigationIcon,
  WarningIcon,
} from "@/components/icons";

const EMERGENCY_TYPES = [
  ["BREAKDOWN", "Breakdown", "Car has stopped or will not move."],
  ["OVERHEATING", "Overheating", "Engine temperature is too high."],
  ["FLAT_TYRE", "Flat tyre", "Puncture, damaged tyre or wheel issue."],
  ["DEAD_BATTERY", "Dead battery", "Car will not start or battery is flat."],
  ["ENGINE_PROBLEM", "Engine problem", "Engine warning, failure or unusual noise."],
  ["ACCIDENT", "Accident", "You need roadside assistance after an accident."],
  ["FUEL_PROBLEM", "Fuel problem", "Out of fuel or fuel-system trouble."],
  ["OTHER", "Other", "Something else is preventing you from driving."],
] as const;

type Vehicle = { id: string; make: string; model: string; year: number | null };

export default function EmergencyPage() {
  const [type, setType] = useState("BREAKDOWN");
  const [description, setDescription] = useState("");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleId, setVehicleId] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [location, setLocation] = useState<{ latitude: number; longitude: number; label: string | null } | null>(null);
  const [locating, setLocating] = useState(false);
  const [radiusMeters, setRadiusMeters] = useState(500);
  const [ghostMode, setGhostMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function loadVehicles() {
    try {
      const response = await fetch("/api/vehicles", { credentials: "include", cache: "no-store" });
      const data = await response.json().catch(() => null);
      if (response.ok && data?.success) {
        const list = Array.isArray(data.vehicles) ? data.vehicles : [];
        setVehicles(list);
        if (list.length === 1) setVehicleId(list[0].id);
      }
    } catch {
      // Vehicle selection is optional.
    }
  }

  async function getLocation() {
    setMessage("");
    if (!navigator.geolocation) {
      setMessage("Location is not supported by this browser.");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;

        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          setLocating(false);
          setMessage("We could not get a valid location. Please try again.");
          return;
        }

        setLocation({
          latitude,
          longitude,
          label: null,
        });
        setLocating(false);
        setMessage(
          Number.isFinite(accuracy)
            ? `Location shared (about ${Math.round(accuracy)}m accuracy).`
            : "Your current location is ready to share with nearby helpers.",
        );
      },
      (error) => {
        setLocating(false);

        if (error.code === 1) {
          setMessage("Location permission was denied. Allow location access for localhost in your browser, then tap Share location again.");
        } else if (error.code === 2) {
          setMessage("Your location could not be determined. Check that Location Services are enabled, then try again.");
        } else if (error.code === 3) {
          setMessage("Location lookup timed out. Make sure Location Services are enabled and try Share location again.");
        } else {
          setMessage("We could not get your location. Please try again.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 0,
      },
    );
  }

  function selectPhoto(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMessage("Please choose an image.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setMessage("Photo must be 8MB or smaller.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setPhoto(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
  }

  async function submitEmergency() {
    if (submitting) return;
    if (!location) {
      setMessage("Share your location first so nearby mechanics can find you.");
      return;
    }
    if (description.trim().length < 8) {
      setMessage("Tell nearby helpers what is happening with the car.");
      return;
    }

    setSubmitting(true);
    setMessage("");

    try {
      const response = await fetch("/api/emergencies", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          type,
          description: description.trim(),
          vehicleId: vehicleId || null,
          photo,
          latitude: location.latitude,
          longitude: location.longitude,
          locationLabel: location.label,
          radiusMeters,
          ghostMode,
        }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) throw new Error(data?.error || "Unable to post your emergency.");

      window.location.href = "/emergency/nearby";
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to post your emergency.");
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="pointer-events-none fixed left-1/2 top-[-260px] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-red-600/[0.08] blur-[150px]" />
      <div className="relative mx-auto max-w-5xl px-5 pb-24 pt-7 sm:px-8">
        <div className="mb-8 flex items-center justify-between">
          <Link href="/home" className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white">
            <BackIcon className="h-4 w-4" /> Back to Discover
          </Link>
          <div className="flex items-center gap-2">
            <div className="hidden md:block"><LiveSocialActions /></div>
            <Link href="/emergency/nearby" className="inline-flex items-center gap-2 rounded-full border border-white/[0.09] bg-white/[0.03] px-4 py-2 text-xs font-semibold text-white/55 hover:border-red-500/20 hover:text-white">
            <NavigationIcon className="h-3.5 w-3.5" /> Nearby emergencies
            </Link>
          </div>
        </div>

        <section className="overflow-hidden rounded-[2rem] border border-red-500/20 bg-gradient-to-br from-red-600/[0.12] via-white/[0.03] to-transparent shadow-2xl shadow-red-950/10">
          <div className="border-b border-white/[0.07] p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-red-400/20 bg-red-500/10 text-red-300">
                <WarningIcon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-red-400/75">Roadside assistance</p>
                <h1 className="mt-1 text-3xl font-black tracking-[-0.04em] sm:text-4xl">Need help with your car?</h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-white/40">Tell nearby mechanics what happened. Your request appears on the nearby emergency map so a verified helper can offer assistance.</p>
              </div>
            </div>
          </div>

          <div className="space-y-8 p-6 sm:p-8">
            <div>
              <div className="mb-3 flex items-end justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/25">01 · What happened?</p>
                  <h2 className="mt-1 text-lg font-bold">Choose the problem</h2>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {EMERGENCY_TYPES.map(([value, title, copy]) => (
                  <button key={value} type="button" onClick={() => setType(value)} className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition ${type === value ? "border-red-500/35 bg-red-500/[0.10]" : "border-white/[0.07] bg-white/[0.025] hover:border-white/[0.13]"}`}>
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${type === value ? "bg-red-500/15 text-red-300" : "bg-white/[0.04] text-white/35"}`}>
                      {value === "FLAT_TYRE" ? <CarIcon className="h-4 w-4" /> : <WarningIcon className="h-4 w-4" />}
                    </span>
                    <span className="min-w-0"><span className="block text-sm font-semibold">{title}</span><span className="mt-0.5 block text-xs text-white/30">{copy}</span></span>
                    {type === value && <CheckIcon className="ml-auto h-4 w-4 shrink-0 text-red-300" />}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/25">02 · Explain the situation</p>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1500} rows={5} placeholder="Example: My car suddenly stopped near the roadside. The engine turns over but the car will not move..." className="mt-3 w-full resize-none rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 text-sm leading-6 text-white outline-none placeholder:text-white/20 focus:border-red-500/30" />
              <p className="mt-2 text-right text-[10px] text-white/20">{description.length}/1500</p>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/25">03 · Your vehicle</p>
              <div className="mt-3">
                <select onFocus={loadVehicles} value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} className="w-full rounded-2xl border border-white/[0.08] bg-[#090909] px-4 py-3.5 text-sm text-white/70 outline-none focus:border-red-500/30">
                  <option value="">No specific vehicle selected</option>
                  {vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.make} {vehicle.model}{vehicle.year ? ` · ${vehicle.year}` : ""}</option>)}
                </select>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/25">04 · Help radius</p>
              <p className="mt-2 text-xs leading-5 text-white/30">Choose how widely your emergency should appear. Your exact position stays private until someone accepts your request.</p>
              <div className="mt-3 grid grid-cols-4 gap-2">
                {[500, 1000, 2500, 5000].map((value) => (
                  <button key={value} type="button" onClick={() => setRadiusMeters(value)} className={`rounded-xl border px-2 py-3 text-xs font-bold transition ${radiusMeters === value ? "border-red-500/40 bg-red-500/10 text-red-100" : "border-white/[.08] bg-white/[.025] text-white/35 hover:text-white"}`}>
                    {value >= 1000 ? `${value / 1000} km` : `${value} m`}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-white/[0.08] bg-white/[0.025] p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/25">05 · Privacy mode</p>
                  <h2 className="mt-1 text-base font-bold">Ghost mode</h2>
                  <p className="mt-2 max-w-xl text-xs leading-5 text-white/30">Hide your live position from the emergency map. Your request will appear as a written roadside alert so members can still offer help.</p>
                </div>
                <button type="button" aria-pressed={ghostMode} onClick={() => setGhostMode((value) => !value)} className={"relative h-7 w-12 shrink-0 rounded-full border transition " + (ghostMode ? "border-red-400/40 bg-red-500/30" : "border-white/10 bg-white/[.05]")}>
                  <span className={"absolute top-1 h-5 w-5 rounded-full bg-white transition " + (ghostMode ? "left-6" : "left-1")} />
                </button>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/25">05 · Add evidence</p>
              <div className="mt-3 flex flex-wrap gap-3">
                <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.025] px-4 py-3 text-sm font-semibold text-white/55 hover:border-red-500/20 hover:text-white">
                  <CameraIcon className="h-4 w-4" /> {photo ? "Change photo" : "Add photo"}
                </button>
                <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => selectPhoto(e.target.files?.[0])} />
                {photo && <div className="h-12 w-20 overflow-hidden rounded-xl border border-white/[0.08]"><img src={photo} alt="Emergency preview" className="h-full w-full object-cover" /></div>}
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-white/[0.08] bg-white/[0.025] p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${location ? "bg-emerald-500/10 text-emerald-300" : "bg-red-500/10 text-red-300"}`}>
                    {location ? <CheckIcon className="h-5 w-5" /> : <LocationIcon className="h-5 w-5" />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{location ? "Location ready" : "Location required"}</p>
                    <p className="mt-1 text-xs leading-5 text-white/30">{location ? "Nearby helpers will be able to see where assistance is needed." : "Your exact location is only shared as part of the emergency assistance flow."}</p>
                  </div>
                </div>
                <button type="button" onClick={getLocation} disabled={locating} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-2.5 text-xs font-bold text-red-100 hover:bg-red-500/15 disabled:opacity-50">
                  <LocationIcon className="h-4 w-4" /> {locating ? "Finding you…" : location ? "Update location" : "Share location"}
                </button>
              </div>
            </div>

            {message && <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.07] px-4 py-3 text-sm leading-6 text-red-100/80">{message}</div>}

            <button type="button" onClick={submitEmergency} disabled={submitting} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-4 text-sm font-black shadow-lg shadow-red-950/30 transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50">
              <WarningIcon className="h-5 w-5" /> {submitting ? "Posting emergency…" : "Post emergency request"}
            </button>
          </div>
        </section>
      </div>
      <MobileNav />
    </main>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import MobileNav from "@/components/MobileNav";
import { BackIcon, CarIcon, MechanicIcon, PlusIcon } from "@/components/icons/RevvamIcons";

type Profile = {
  headline: string | null;
  about: string | null;
  skills: string[];
  services: string[];
  yearsExperience: number | null;
};
type Vehicle = { id: string; make: string; model: string; year: number | null; image: string | null; isFeatured: boolean; photos?: { url: string }[] };

const skillOptions = ["Diagnostics","Engine repair","Electrical","Brakes","Suspension","Transmission","AC & cooling","Tyres & wheels","Battery & charging","Oil & maintenance","Bodywork","Performance tuning","Auto electronics","Roadside assistance"];
const serviceOptions = ["Breakdown help","Battery jump-start","Battery replacement","Flat tyre help","Engine diagnostics","General servicing","Electrical troubleshooting","Brake service","Pre-purchase inspection","Mobile mechanic","Performance work"];

export default function MechanicProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    try {
      const [p, v] = await Promise.all([
        fetch("/api/mechanic-profile", { credentials: "include", cache: "no-store" }),
        fetch("/api/vehicles", { credentials: "include", cache: "no-store" }),
      ]);
      const pd = await p.json();
      const vd = await v.json();
      if (pd?.success) setProfile(pd.profile);
      if (vd?.success) setVehicles(vd.vehicles || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function save(next: Partial<Profile>) {
    if (!profile) return;
    const updated = { ...profile, ...next };
    setProfile(updated);
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/mechanic-profile", {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) {
        setMessage(data?.error || "Could not save changes.");
        return;
      }
      setProfile(data.profile);
      setMessage("Saved");
      window.setTimeout(() => setMessage(""), 1500);
    } catch {
      setMessage("Could not save changes.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <main className="min-h-screen bg-black p-10 text-white/30">Loading mechanic profile...</main>;
  if (!profile) return <main className="min-h-screen bg-black px-5 py-12 text-white"><div className="mx-auto max-w-3xl"><p className="text-red-300">Mechanic profile not found.</p><Link className="mt-4 inline-block text-sm text-white/50" href="/profile/setup">Choose profile type</Link></div></main>;

  const toggleItem = (key: "skills" | "services", item: string) => {
    const current = profile[key];
    const next = current.includes(item) ? current.filter((x) => x !== item) : [...current, item];
    save({ [key]: next });
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#030303] px-5 pb-32 pt-7 text-white sm:px-8">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(220,38,38,.10),transparent_34%)]" />
      <div className="relative z-10 mx-auto w-full max-w-6xl">
        <div className="mb-8 flex items-center justify-between gap-3">
          <Link href="/profile" className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white"><BackIcon className="h-4 w-4" /> Profile</Link>
          <span className="text-[10px] font-bold uppercase tracking-[.2em] text-red-400/70">{saving ? "Saving..." : message || "Mechanic profile"}</span>
        </div>

        <section className="overflow-hidden rounded-[2rem] border border-red-500/15 bg-gradient-to-br from-red-600/[.10] via-white/[.025] to-transparent shadow-[0_25px_80px_rgba(0,0,0,.35)]">
          <div className="h-32 bg-gradient-to-r from-red-700/[.18] to-transparent sm:h-40" />
          <div className="relative px-5 pb-7 sm:px-8">
            <div className="-mt-10 flex flex-col gap-5 sm:-mt-12 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-end gap-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-[1.6rem] border-4 border-black bg-red-500/[.10] text-red-300 shadow-xl"><MechanicIcon className="h-9 w-9" /></div>
                <div className="pb-1"><p className="text-[10px] font-bold uppercase tracking-[.22em] text-red-400/75">Mechanic garage</p><h1 className="mt-1 text-3xl font-black tracking-[-.045em]">Your mechanic profile</h1></div>
              </div>
              <Link href="/profile/edit" className="rounded-xl border border-white/[.09] bg-white/[.035] px-4 py-2.5 text-xs font-semibold text-white/60 hover:text-white">Edit account</Link>
            </div>
            <div className="mt-7 grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
              <div>
                <h2 className="text-xl font-bold">{profile.headline || "Automotive specialist"}</h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-white/40">{profile.about || "Tell drivers what you specialise in and how you help."}</p>
              </div>
              <div className="rounded-2xl border border-white/[.07] bg-black/20 p-5"><p className="text-[10px] uppercase tracking-[.18em] text-white/25">Experience</p><p className="mt-2 text-3xl font-black">{profile.yearsExperience ?? "—"}<span className="ml-2 text-sm font-medium text-white/25">{profile.yearsExperience === 1 ? "year" : "years"}</span></p></div>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-[2rem] border border-white/[.08] bg-white/[.025] p-5 sm:p-7">
          <div className="mb-5"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-red-400/70">Expertise</p><h2 className="mt-1 text-xl font-bold">Your skills</h2><p className="mt-1 text-sm text-white/30">Tap a skill to add or remove it from your mechanic profile.</p></div>
          <div className="flex flex-wrap gap-2.5">
            {skillOptions.map((item) => <button key={item} type="button" disabled={saving} onClick={() => toggleItem("skills", item)} className={`rounded-full border px-4 py-2.5 text-sm transition ${profile.skills.includes(item) ? "border-red-500/40 bg-red-500/[.11] text-red-100" : "border-white/[.08] bg-white/[.02] text-white/35 hover:text-white"}`}>{profile.skills.includes(item) ? "✓ " : "+ "}{item}</button>)}
          </div>
        </section>

        <section className="mt-6 rounded-[2rem] border border-white/[.08] bg-white/[.025] p-5 sm:p-7">
          <div className="mb-5"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-red-400/70">Services</p><h2 className="mt-1 text-xl font-bold">What you do</h2><p className="mt-1 text-sm text-white/30">Keep your emergency-help capabilities clear.</p></div>
          <div className="flex flex-wrap gap-2.5">
            {serviceOptions.map((item) => <button key={item} type="button" disabled={saving} onClick={() => toggleItem("services", item)} className={`rounded-full border px-4 py-2.5 text-sm transition ${profile.services.includes(item) ? "border-red-500/40 bg-red-500/[.11] text-red-100" : "border-white/[.08] bg-white/[.02] text-white/35 hover:text-white"}`}>{profile.services.includes(item) ? "✓ " : "+ "}{item}</button>)}
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-[2rem] border border-white/[.08] bg-white/[.025]">
          <div className="flex items-center justify-between border-b border-white/[.07] px-5 py-5 sm:px-7">
            <div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-red-400/70">Garage</p><h2 className="mt-1 text-xl font-bold">Your cars</h2><p className="mt-1 text-sm text-white/30">Post the cars you own and let the community see your garage.</p></div>
            <Link href="/profile/cars/add" className="inline-flex items-center gap-2 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-2.5 text-xs font-semibold text-red-100 hover:bg-red-500/15"><PlusIcon className="h-4 w-4" /> Add car</Link>
          </div>
          {vehicles.length === 0 ? <div className="px-6 py-12 text-center"><CarIcon className="mx-auto h-10 w-10 text-white/15" /><p className="mt-4 text-sm text-white/35">No cars posted yet.</p><Link href="/profile/cars/add" className="mt-5 inline-flex rounded-xl border border-white/[.08] bg-white/[.035] px-4 py-2.5 text-xs text-white/60">Add your first car</Link></div> :
          <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">{vehicles.map((vehicle) => { const image = vehicle.image || vehicle.photos?.[0]?.url; return <Link key={vehicle.id} href={`/profile/cars/${vehicle.id}`} className="group overflow-hidden rounded-3xl border border-white/[.08] bg-black/20 hover:border-red-500/20"><div className="h-44 bg-white/[.03]">{image ? <img src={image} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : <div className="flex h-full items-center justify-center"><CarIcon className="h-12 w-12 text-white/10" /></div>}</div><div className="p-4"><p className="text-[10px] uppercase tracking-[.16em] text-red-400/60">{vehicle.year ?? "Year unknown"}</p><h3 className="mt-1 font-semibold">{vehicle.make} {vehicle.model}</h3></div></Link>; })}</div>}
        </section>
      </div>
      <MobileNav />
    </main>
  );
}

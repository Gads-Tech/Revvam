"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MobileNav from "@/components/MobileNav";
import { MechanicIcon, CarIcon, CheckIcon } from "@/components/icons/RevvamIcons";

const skillOptions = [
  "Diagnostics", "Engine repair", "Electrical", "Brakes", "Suspension",
  "Transmission", "AC & cooling", "Tyres & wheels", "Battery & charging",
  "Oil & maintenance", "Bodywork", "Performance tuning", "Auto electronics",
  "Roadside assistance",
];

const serviceOptions = [
  "Breakdown help", "Battery jump-start", "Battery replacement",
  "Flat tyre help", "Engine diagnostics", "General servicing",
  "Electrical troubleshooting", "Brake service", "Pre-purchase inspection",
  "Mobile mechanic", "Performance work",
];

export default function MechanicSetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [skills, setSkills] = useState<string[]>([]);
  const [services, setServices] = useState<string[]>([]);
  const [headline, setHeadline] = useState("");
  const [about, setAbout] = useState("");
  const [yearsExperience, setYearsExperience] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [checkingAccess, setCheckingAccess] = useState(true);

  useEffect(() => {
    let active = true;
    async function guard() {
      try {
        const [profileResponse, mechanicResponse] = await Promise.all([
          fetch("/api/profile", { credentials: "include", cache: "no-store" }),
          fetch("/api/mechanic-profile", { credentials: "include", cache: "no-store" }),
        ]);
        const profileData = await profileResponse.json().catch(() => null);
        const mechanicData = await mechanicResponse.json().catch(() => null);
        if (!active) return;
        if (!profileData?.success) {
          router.replace("/login");
          return;
        }
        if (profileData.user.role !== "MECHANIC") {
          router.replace("/profile");
          return;
        }
        if (mechanicData?.success && mechanicData.profile) {
          router.replace("/profile/mechanic");
          return;
        }
        setCheckingAccess(false);
      } catch {
        router.replace("/profile");
      }
    }
    void guard();
    return () => { active = false; };
  }, [router]);

  function toggle(list: string[], value: string, setter: (v: string[]) => void) {
    setter(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
    setError("");
  }

  function next() {
    setError("");
    if (step === 1 && skills.length === 0) {
      setError("Choose at least one skill so people know what you can do.");
      return;
    }
    if (step === 2 && services.length === 0) {
      setError("Choose at least one service you can help with.");
      return;
    }
    setStep((current) => current + 1);
  }

  async function finish() {
    if (!headline.trim()) {
      setError("Add a short headline for your mechanic profile.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/mechanic-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ headline, about, yearsExperience, skills, services }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) {
        setError(data?.error || "Unable to save your mechanic profile.");
        return;
      }
      router.push("/profile/mechanic");
      router.refresh();
    } catch {
      setError("Unable to connect to Revvam. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-black px-5 py-10 pb-28 text-white sm:px-6">
      <div className="pointer-events-none fixed left-1/2 top-[-260px] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-red-600/[0.08] blur-[150px]" />
      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-2xl items-center">
        <div className="w-full">
          <div className="mb-10">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-red-400/70">Mechanic setup</p>
              <p className="text-xs text-white/25">{step}/3</p>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-white/[0.06]">
              <div className="h-full rounded-full bg-red-500 transition-all duration-500" style={{ width: `${(step / 3) * 100}%` }} />
            </div>
          </div>

          {step === 1 && (
            <section>
              <div className="mb-8">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/[0.08] text-red-300"><MechanicIcon className="h-7 w-7" /></div>
                <h1 className="text-4xl font-black tracking-[-0.045em] sm:text-5xl">What can you fix?</h1>
                <p className="mt-4 max-w-lg text-sm leading-6 text-white/40 sm:text-base">Build your mechanic identity around the skills you actually use. You can add or remove these later.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                {skillOptions.map((item) => {
                  const selected = skills.includes(item);
                  return <button key={item} type="button" onClick={() => toggle(skills, item, setSkills)} className={`rounded-full border px-4 py-2.5 text-sm transition ${selected ? "border-red-500/50 bg-red-500/[0.12] text-red-100" : "border-white/[0.09] bg-white/[0.025] text-white/50 hover:border-white/[0.18] hover:text-white"}`}>{selected && "✓ "}{item}</button>;
                })}
              </div>
            </section>
          )}

          {step === 2 && (
            <section>
              <div className="mb-8">
                <p className="mb-3 text-4xl">🛠️</p>
                <h1 className="text-4xl font-black tracking-[-0.045em] sm:text-5xl">How do you help?</h1>
                <p className="mt-4 max-w-lg text-sm leading-6 text-white/40 sm:text-base">These services help drivers understand what they can ask you for, especially during an emergency.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                {serviceOptions.map((item) => {
                  const selected = services.includes(item);
                  return <button key={item} type="button" onClick={() => toggle(services, item, setServices)} className={`rounded-full border px-4 py-2.5 text-sm transition ${selected ? "border-red-500/50 bg-red-500/[0.12] text-red-100" : "border-white/[0.09] bg-white/[0.025] text-white/50 hover:border-white/[0.18] hover:text-white"}`}>{selected && "✓ "}{item}</button>;
                })}
              </div>
            </section>
          )}

          {step === 3 && (
            <section>
              <div className="mb-8">
                <p className="mb-3 text-4xl">👨🏾‍🔧</p>
                <h1 className="text-4xl font-black tracking-[-0.045em] sm:text-5xl">Tell people about you.</h1>
                <p className="mt-4 max-w-lg text-sm leading-6 text-white/40 sm:text-base">Give drivers a quick reason to trust your profile. You can still post your cars and update your skills later.</p>
              </div>
              <div className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-medium text-white/60">Profile headline</label>
                  <input value={headline} onChange={(e) => { setHeadline(e.target.value); setError(""); }} maxLength={100} placeholder="e.g. Mobile mechanic · diagnostics & roadside help" className="h-14 w-full rounded-2xl border border-white/[0.10] bg-white/[0.04] px-5 text-white outline-none placeholder:text-white/20 focus:border-red-500/50" />
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-white/60">Years of experience</label>
                    <input type="number" min="0" max="80" value={yearsExperience} onChange={(e) => setYearsExperience(e.target.value)} placeholder="e.g. 8" className="h-14 w-full rounded-2xl border border-white/[0.10] bg-white/[0.04] px-5 text-white outline-none placeholder:text-white/20 focus:border-red-500/50" />
                  </div>
                  <div className="flex items-end rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 text-sm text-white/35"><CarIcon className="mr-3 h-5 w-5 shrink-0 text-red-300/70" /> Your existing garage can be used on this profile.</div>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-white/60">About your work</label>
                  <textarea value={about} onChange={(e) => setAbout(e.target.value)} maxLength={1000} rows={5} placeholder="Tell the Revvam community what you specialise in..." className="w-full rounded-2xl border border-white/[0.10] bg-white/[0.04] px-5 py-4 text-white outline-none placeholder:text-white/20 focus:border-red-500/50" />
                </div>
              </div>
            </section>
          )}

          {error && <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-sm text-red-300">{error}</div>}

          <div className="mt-8 flex gap-3">
            {step > 1 && <button type="button" onClick={() => setStep((current) => current - 1)} disabled={saving} className="h-14 rounded-2xl border border-white/[0.10] bg-white/[0.025] px-6 text-sm font-medium text-white/60 hover:text-white">Back</button>}
            {step < 3 ? (
              <button type="button" onClick={next} disabled={saving} className="h-14 flex-1 rounded-2xl border border-red-400/30 bg-red-600/[0.30] text-sm font-semibold hover:bg-red-500/[0.45]">Continue</button>
            ) : (
              <button type="button" onClick={finish} disabled={saving} className="h-14 flex-1 rounded-2xl border border-red-400/30 bg-red-600/[0.30] text-sm font-semibold hover:bg-red-500/[0.45]">{saving ? "Saving..." : "Create mechanic profile"}</button>
            )}
          </div>
          <p className="mt-5 text-center text-[10px] uppercase tracking-[0.25em] text-white/15">You can manage your skills and garage later</p>
        </div>
      </div>
      <MobileNav />
    </main>
  );
}

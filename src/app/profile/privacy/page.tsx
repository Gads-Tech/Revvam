"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import MobileNav from "@/components/MobileNav";
import BackButton from "@/components/BackButton";

type PresenceSettings = {
  showOnlineStatus: boolean;
  showLastSeen: boolean;
};

function Toggle({ enabled, disabled, onClick }: { enabled: boolean; disabled: boolean; onClick: () => void }) {
  const track = enabled ? "bg-red-500" : "bg-white/15";
  const knob = enabled ? "left-6" : "left-1";

  return (
    <button type="button" disabled={disabled} onClick={onClick} aria-pressed={enabled} className={"relative h-7 w-12 shrink-0 rounded-full transition " + track + " disabled:opacity-50"}>
      <span className={"absolute top-1 h-5 w-5 rounded-full bg-white transition " + knob} />
    </button>
  );
}

export default function PrivacySettingsPage() {
  const [settings, setSettings] = useState<PresenceSettings | null>(null);
  const [saving, setSaving] = useState<"online" | "lastSeen" | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/presence/settings", { credentials: "include", cache: "no-store" })
      .then(async (response) => {
        const data = await response.json().catch(() => null);
        if (!response.ok || !data?.success) throw new Error(data?.error || "Unable to load privacy settings.");
        setSettings({
          showOnlineStatus: Boolean(data.showOnlineStatus),
          showLastSeen: Boolean(data.showLastSeen),
        });
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Unable to load privacy settings."));
  }, []);

  async function update(field: keyof PresenceSettings) {
    if (!settings || saving) return;

    const nextValue = !settings[field];
    setSaving(field === "showOnlineStatus" ? "online" : "lastSeen");
    setError("");

    try {
      const response = await fetch("/api/presence/settings", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: nextValue }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) throw new Error(data?.error || "Unable to update privacy settings.");

      setSettings({
        showOnlineStatus: Boolean(data.showOnlineStatus),
        showLastSeen: Boolean(data.showLastSeen),
      });
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unable to update privacy settings.");
    } finally {
      setSaving(null);
    }
  }

  const mode = settings
    ? settings.showOnlineStatus && settings.showLastSeen
      ? "Online + last seen"
      : settings.showOnlineStatus
        ? "Online only"
        : settings.showLastSeen
          ? "Last seen only"
          : "Neither"
    : "Loading...";

  return (
    <main className="min-h-screen bg-black px-4 py-6 pb-28 text-white sm:px-6 sm:py-8">
      <div className="mx-auto max-w-3xl">
        <BackButton />
        <div className="mt-6 rounded-[2rem] border border-white/[0.08] bg-white/[0.025] p-5 sm:p-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-red-400/75">Privacy</p>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.045em]">Online & last seen</h1>
          <p className="mt-3 text-sm leading-6 text-white/35">
            Choose what other Revvam members can see about your presence. These settings work independently, so you can show that you are online without showing your last seen time.
          </p>

          <div className="mt-5 rounded-2xl border border-red-500/15 bg-red-500/[0.045] p-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-red-300/70">Current visibility</p>
            <p className="mt-1 text-sm font-semibold text-white/80">{mode}</p>
          </div>

          {error && <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-sm text-red-300">{error}</div>}

          <div className="mt-6 space-y-3">
            <section className="flex items-center gap-4 rounded-2xl border border-white/[0.08] bg-black/25 p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/10"><span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /></div>
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold">Show when I&apos;m online</h2>
                <p className="mt-1 text-xs leading-5 text-white/30">Let other members see your online indicator and include you in the online members list.</p>
              </div>
              <Toggle enabled={Boolean(settings?.showOnlineStatus)} disabled={!settings || saving !== null} onClick={() => void update("showOnlineStatus")} />
            </section>

            <section className="flex items-center gap-4 rounded-2xl border border-white/[0.08] bg-black/25 p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.06]"><span className="h-2.5 w-2.5 rounded-full bg-white/40" /></div>
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold">Show my last seen</h2>
                <p className="mt-1 text-xs leading-5 text-white/30">Let other members see when you were last active. If online visibility is off, your current online state is never shown.</p>
              </div>
              <Toggle enabled={Boolean(settings?.showLastSeen)} disabled={!settings || saving !== null} onClick={() => void update("showLastSeen")} />
            </section>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <Link href="/profile" className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-xs font-semibold text-white/50 hover:text-white">Back to profile</Link>
            <Link href="/messages/settings" className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-xs font-semibold text-white/50 hover:text-white">Read receipts</Link>
          </div>
        </div>
      </div>
      <MobileNav />
    </main>
  );
}

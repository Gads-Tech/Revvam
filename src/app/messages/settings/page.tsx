"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import MobileNav from "@/components/MobileNav";

type Person = { id: string; name: string; username: string; image: string | null };
type Override = { targetId: string; enabled: boolean; user: Person };

export default function ReadReceiptSettingsPage() {
  const [enabled, setEnabled] = useState(true);
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [users, setUsers] = useState<Person[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const response = await fetch("/api/messages/read-receipts", { credentials: "include", cache: "no-store" });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.error || "Unable to load settings.");
    setEnabled(Boolean(data.enabled));
    setOverrides(data.overrides ?? []);
    setUsers(data.users ?? []);
  }

  useEffect(() => { load().catch((e) => setError(e instanceof Error ? e.message : "Unable to load settings.")); }, []);

  async function updateGlobal(value: boolean) {
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/messages/read-receipts", { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scope: "global", enabled: value }) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Unable to update settings.");
      setEnabled(value);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to update settings."); }
    finally { setSaving(false); }
  }

  async function updatePerson(username: string, value: boolean) {
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/messages/read-receipts", { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scope: "user", username, enabled: value }) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Unable to update setting.");
      setOverrides((current) => { const found = current.find((item) => item.user.username === username); return found ? current.map((item) => item.user.username === username ? { ...item, enabled: value } : item) : [...current, { targetId: data.targetId ?? username, enabled: value, user: users.find((item) => item.username === username)! }]; });
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to update setting."); }
    finally { setSaving(false); }
  }

  function effective(person: Person) { return overrides.find((item) => item.user.id === person.id)?.enabled ?? enabled; }

  return (
    <main className="min-h-screen bg-black px-4 py-6 pb-28 text-white sm:px-6 sm:py-8">
      <div className="mx-auto max-w-3xl">
        <Link href="/messages" className="text-sm text-white/35 hover:text-white">← Back to messages</Link>
        <div className="mt-7 rounded-[2rem] border border-white/[0.08] bg-white/[0.025] p-5 sm:p-8">
          <p className="text-xs uppercase tracking-[0.22em] text-red-400/70">Privacy</p>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.045em]">Read receipts</h1>
          <p className="mt-3 text-sm leading-6 text-white/35">Control whether people can see that you opened their messages. You can use one setting for everyone or override it for individual people.</p>
          {error && <div className="mt-5 rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-sm text-red-300">{error}</div>}

          <section className="mt-7 rounded-2xl border border-white/[0.08] bg-black/25 p-5">
            <div className="flex items-center justify-between gap-4"><div><h2 className="font-semibold">Read receipts for everyone</h2><p className="mt-1 text-xs leading-5 text-white/30">When on, people can see “Opened” after you view their messages.</p></div><button type="button" disabled={saving} onClick={() => updateGlobal(!enabled)} className={`relative h-7 w-12 rounded-full transition ${enabled ? "bg-red-500" : "bg-white/15"}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${enabled ? "left-6" : "left-1"}`} /></button></div>
          </section>

          <section className="mt-5 rounded-2xl border border-white/[0.08] bg-black/25 p-5">
            <h2 className="font-semibold">Per-person controls</h2>
            <p className="mt-1 text-xs leading-5 text-white/30">Turn receipts off for one person even when they are enabled globally.</p>
            <div className="mt-5 divide-y divide-white/[0.06]">{users.length === 0 ? <p className="py-8 text-center text-sm text-white/25">Your conversations will appear here.</p> : users.map((person) => { const on = effective(person); return <div key={person.id} className="flex items-center gap-3 py-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-red-500/10 text-xs font-bold text-red-300">{person.image ? <img src={person.image} alt="" className="h-full w-full object-cover" /> : person.name.charAt(0).toUpperCase()}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{person.name}</span><span className="block truncate text-xs text-white/30">@{person.username}</span></span><button type="button" disabled={saving} onClick={() => updatePerson(person.username, !on)} className={`rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] ${on ? "border-red-400/20 bg-red-500/10 text-red-200" : "border-white/10 bg-white/[0.03] text-white/35"}`}>{on ? "Opened visible" : "Hidden"}</button></div>; })}</div>
          </section>
        </div>
      </div>
      <MobileNav />
    </main>
  );
}

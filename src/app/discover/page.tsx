"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import MobileNav from "@/components/MobileNav";
import AppHeader from "@/components/AppHeader";

type Data = {
  query: string;
  search: { users: any[]; vehicles: any[]; posts: any[]; events: any[] };
  personalized: any[];
  marketplace: any[];
  topRated: any[];
  myVehicles: any[];
};

export default function DiscoverPage() {
  const [q, setQ] = useState("");
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewTarget, setReviewTarget] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [message, setMessage] = useState("");

  async function load(search = q) {
    setLoading(true);
    const res = await fetch("/api/discover" + (search.trim() ? "?q=" + encodeURIComponent(search.trim()) : ""), { cache: "no-store" });
    const json = await res.json();
    if (json.success) setData(json);
    setLoading(false);
  }

  useEffect(() => { load(""); }, []);

  async function trust(action: string, targetId: string) {
    const res = await fetch("/api/trust", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, targetId, reason: "Inappropriate or unwanted behaviour" }) });
    const json = await res.json();
    setMessage(json.success ? action === "block" ? "User blocked. They will be removed from your discovery results." : "Report submitted to Revvam." : json.error);
    if (json.success && action === "block") load();
  }

  async function review(targetId: string) {
    const res = await fetch("/api/reviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetId, rating: reviewRating, comment: reviewComment }) });
    const json = await res.json();
    setMessage(json.success ? "Review saved." : json.error);
    if (json.success) { setReviewTarget(null); setReviewComment(""); load(); }
  }

  async function listVehicle(vehicleId: string, listingStatus: string) {
    const vehicle = data?.myVehicles.find((v) => v.id === vehicleId);
    if (!vehicle) return;
    const res = await fetch("/api/marketplace", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vehicleId, listingStatus, listingPrice: vehicle.listingPrice, listingCurrency: vehicle.listingCurrency ?? "GHS", listingLocation: vehicle.listingLocation, listingDescription: vehicle.listingDescription }),
    });
    const json = await res.json();
    setMessage(json.success ? listingStatus === "FOR_SALE" ? "Your car is now visible in the marketplace." : "Marketplace listing updated." : json.error);
    if (json.success) load();
  }

  return (
    <main className="min-h-screen bg-[#020202] text-white">
      <AppHeader />
      <div className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6">
        <div className="mb-6 rounded-[1.8rem] border border-red-500/15 bg-gradient-to-br from-red-950/30 via-white/[.025] to-transparent p-6 sm:p-8">
          <p className="text-[9px] font-black uppercase tracking-[.3em] text-red-400">Revvam discovery</p>
          <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div><h1 className="text-3xl font-black tracking-tight sm:text-5xl">Find your road.</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-white/40">People, cars, builds, events and trusted Revvam services — with a feed that learns what you care about.</p></div>
            <form onSubmit={(e) => { e.preventDefault(); load(); }} className="flex w-full max-w-md gap-2">
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search people, cars, posts or events..." className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-sm outline-none placeholder:text-white/25 focus:border-red-500/40" />
              <button className="rounded-xl bg-red-600 px-5 text-xs font-black hover:bg-red-500">Search</button>
            </form>
          </div>
        </div>

        {message && <button onClick={() => setMessage("")} className="mb-5 w-full rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-left text-xs font-semibold text-red-100">{message} <span className="float-right opacity-50">×</span></button>}
        {loading && <div className="rounded-2xl border border-white/10 p-8 text-center text-sm text-white/35">Loading Revvam Discovery…</div>}

        {data && q && <section className="mb-8">
          <SectionTitle eyebrow="Search results" title={'Results for “' + q + '”'} />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {data.search.users.map((u) => <div key={u.id} className="rounded-2xl border border-white/10 bg-white/[.025] p-4">
              <div className="flex items-center gap-3"><Avatar src={u.image} /><div className="min-w-0"><div className="truncate text-sm font-bold">{u.name}</div><div className="truncate text-[11px] text-white/35">@{u.username}</div></div></div>
              <div className="mt-3 text-[10px] uppercase tracking-wider text-red-300">{u.role.replace("_", " ")}</div>
              <div className="mt-3 flex gap-2"><Link href={"/users/" + u.username} className="flex-1 rounded-lg border border-white/10 px-3 py-2 text-center text-[10px] font-bold">Profile</Link><button onClick={() => trust("block", u.id)} className="rounded-lg border border-white/10 px-3 py-2 text-[10px] text-white/45">Block</button><button onClick={() => trust("report", u.id)} className="rounded-lg border border-red-500/15 px-3 py-2 text-[10px] text-red-300">Report</button></div>
            </div>)}
            {data.search.vehicles.map((v) => <div key={v.id} className="rounded-2xl border border-white/10 bg-white/[.025] p-4"><div className="text-sm font-bold">{v.year ? v.year + " " : ""}{v.make} {v.model}</div><div className="mt-1 text-[10px] text-white/35">Owned by @{v.user.username}</div>{v.listingStatus === "FOR_SALE" && <div className="mt-3 text-sm font-black text-red-300">{v.listingCurrency} {v.listingPrice?.toLocaleString()}</div>}</div>)}
            {data.search.posts.map((p) => <Link key={p.id} href={"/posts/" + p.id} className="rounded-2xl border border-white/10 bg-white/[.025] p-4"><div className="flex items-center gap-2"><Avatar src={p.author.image} small/><span className="text-xs font-bold">{p.author.name}</span></div><p className="mt-3 line-clamp-4 text-xs leading-5 text-white/55">{p.content}</p></Link>)}
            {data.search.events.map((e) => <div key={e.id} className="rounded-2xl border border-white/10 bg-white/[.025] p-4"><div className="text-sm font-bold">{e.title}</div><div className="mt-2 text-[10px] text-white/35">{e.locationLabel ?? "Location TBA"} · {new Date(e.startsAt).toLocaleDateString()}</div></div>)}
          </div>
        </section>}

        <section className="mb-8">
          <SectionTitle eyebrow="1 · Discovery" title="Personalized for you" action={<Link href="/home" className="text-[10px] font-bold text-red-300">Open community →</Link>} />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {data?.personalized.slice(0, 6).map((p) => <Link key={p.id} href={"/posts/" + p.id} className="rounded-2xl border border-white/10 bg-white/[.025] p-4 transition hover:border-red-500/20"><div className="flex items-center gap-2"><Avatar src={p.author.image} small /><span className="text-xs font-bold">{p.author.name}</span><span className="text-[9px] text-white/25">@{p.author.username}</span></div><p className="mt-3 line-clamp-3 text-sm leading-6 text-white/60">{p.content}</p><div className="mt-3 text-[9px] text-white/25">{p._count.likes} likes · {p._count.comments} comments · {p._count.shares} shares</div></Link>)}
          </div>
        </section>

        <section className="mb-8">
          <SectionTitle eyebrow="2 · Reputation" title="Trusted people & businesses" />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {data?.topRated.map((u) => <div key={u.id} className="rounded-2xl border border-white/10 bg-white/[.025] p-4"><div className="flex items-center gap-3"><Avatar src={u.image}/><div><div className="text-sm font-bold">{u.name}</div><div className="text-[10px] text-white/35">@{u.username}</div></div></div><div className="mt-4 flex items-center justify-between"><span className="text-sm font-black text-red-300">★ {u.averageRating}</span><span className="text-[10px] text-white/25">{u.reviewCount} reviews</span></div><button onClick={() => setReviewTarget(reviewTarget === u.id ? null : u.id)} className="mt-3 w-full rounded-lg border border-white/10 py-2 text-[10px] font-bold">Leave review</button>{reviewTarget === u.id && <div className="mt-3 space-y-2"><select value={reviewRating} onChange={(e) => setReviewRating(Number(e.target.value))} className="w-full rounded-lg border border-white/10 bg-black px-2 py-2 text-xs"><option value="5">★★★★★ 5</option><option value="4">★★★★ 4</option><option value="3">★★★ 3</option><option value="2">★★ 2</option><option value="1">★ 1</option></select><textarea value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} placeholder="How was the service?" className="h-20 w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-xs outline-none"/><button onClick={() => review(u.id)} className="w-full rounded-lg bg-red-600 py-2 text-[10px] font-black">Publish review</button></div>}</div>)}
            {!data?.topRated.length && <Empty text="Revvam reputation will appear here as users complete interactions and leave reviews." />}
          </div>
        </section>

        <section className="mb-8">
          <SectionTitle eyebrow="3 · Marketplace" title="Cars for sale" />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {data?.marketplace.map((v) => <div key={v.id} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[.025]">{v.image ? <img src={v.image} alt="" className="h-40 w-full object-cover" /> : <div className="flex h-40 items-center justify-center bg-white/[.03] text-4xl">🚗</div>}<div className="p-4"><div className="text-sm font-bold">{v.year ? v.year + " " : ""}{v.make} {v.model}</div><div className="mt-2 text-lg font-black text-red-300">{v.listingCurrency} {v.listingPrice?.toLocaleString() ?? "Price on request"}</div><div className="mt-1 text-[10px] text-white/30">{v.listingLocation ?? "Location not provided"} · @{v.user.username}</div></div></div>)}
            {!data?.marketplace.length && <Empty text="No cars are listed for sale yet." />}
          </div>
          {data?.myVehicles.length ? <div className="mt-4 rounded-2xl border border-white/10 bg-white/[.02] p-4"><div className="mb-3 text-xs font-bold">Your marketplace controls</div><div className="flex flex-wrap gap-2">{data.myVehicles.map(v => <button key={v.id} onClick={() => listVehicle(v.id, v.listingStatus === "FOR_SALE" ? "NONE" : "FOR_SALE")} className="rounded-xl border border-white/10 px-3 py-2 text-[10px] font-bold hover:border-red-500/30">{v.make} {v.model}: {v.listingStatus === "FOR_SALE" ? "Remove listing" : "List for sale"}</button>)}</div></div> : null}
        </section>

        <section>
          <SectionTitle eyebrow="4 · Trust & safety" title="You control your space" />
          <div className="grid gap-3 md:grid-cols-3"><TrustCard title="Block" text="Remove a user from your discovery results and keep their activity out of your personalized feed."/><TrustCard title="Report" text="Send suspicious, abusive or inappropriate accounts to Revvam for review."/><TrustCard title="Safer discovery" text="Blocked accounts are automatically excluded from search, marketplace and personalized recommendations."/></div>
        </section>
      </div>
      <MobileNav />
    </main>
  );
}

function SectionTitle({ eyebrow, title, action }: { eyebrow: string; title: string; action?: React.ReactNode }) { return <div className="mb-4 flex items-end justify-between"><div><p className="text-[9px] font-black uppercase tracking-[.25em] text-white/25">{eyebrow}</p><h2 className="mt-1 text-xl font-black">{title}</h2></div>{action}</div>; }
function Avatar({ src, small=false }: { src?: string | null; small?: boolean }) { return src ? <img src={src} alt="" className={small ? "h-7 w-7 rounded-full object-cover" : "h-10 w-10 rounded-xl object-cover"} /> : <div className={small ? "flex h-7 w-7 items-center justify-center rounded-full bg-red-500/15 text-[10px]" : "flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/15"}>🚗</div>; }
function Empty({ text }: { text: string }) { return <div className="rounded-2xl border border-dashed border-white/10 p-6 text-xs leading-5 text-white/30">{text}</div>; }
function TrustCard({ title, text }: { title: string; text: string }) { return <div className="rounded-2xl border border-white/10 bg-white/[.025] p-5"><div className="text-sm font-black">{title}</div><p className="mt-2 text-xs leading-5 text-white/35">{text}</p></div>; }
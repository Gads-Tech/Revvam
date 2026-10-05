"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";

type Data = {
  search: { users: any[]; vehicles: any[]; posts: any[]; events: any[] };
  marketplace: any[];
  topRated: any[];
  myVehicles: any[];
};

export default function DiscoverySections() {
  const [q, setQ] = useState("");
  const [data, setData] = useState<Data | null>(null);
  const [open, setOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<any | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [notice, setNotice] = useState("");

  async function search(e?: FormEvent) {
    e?.preventDefault();
    const value = q.trim();
    if (!value) { setData(null); setOpen(false); setPreviewOpen(false); return; }
    setOpen(true);
    setPreviewOpen(false);
    const r = await fetch("/api/discover?q=" + encodeURIComponent(value), { cache: "no-store" });
    const j = await r.json();
    if (j.success) setData(j);
  }

  useEffect(() => {
    const value = q.trim();
    if (!value) {
      setPreviewOpen(false);
      setSearching(false);
      return;
    }
    setPreviewOpen(true);
    setSearching(true);
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const r = await fetch("/api/discover?q=" + encodeURIComponent(value), { cache: "no-store", signal: controller.signal });
        const j = await r.json();
        if (j.success) setData(j);
      } catch {}
      finally { if (!controller.signal.aborted) setSearching(false); }
    }, 180);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [q]);

  async function submitReview() {
    if (!reviewTarget) return;
    const r = await fetch("/api/reviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetId: reviewTarget.id, rating, comment }) });
    const j = await r.json();
    setNotice(j.success ? "Review saved." : (j.error || "Unable to save review."));
    if (j.success) { setReviewTarget(null); setComment(""); search(); }
  }

  async function list(v: any) {
    const next = v.listingStatus === "FOR_SALE" ? "NONE" : "FOR_SALE";
    const r = await fetch("/api/marketplace", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ vehicleId: v.id, listingStatus: next, listingPrice: v.listingPrice, listingCurrency: v.listingCurrency || "GHS", listingLocation: v.listingLocation, listingDescription: v.listingDescription }) });
    const j = await r.json();
    setNotice(j.success ? (next === "FOR_SALE" ? "Car listed in Marketplace." : "Car removed from Marketplace.") : (j.error || "Unable to update listing."));
    if (j.success) search();
  }

  return (
    <section className="mb-6">
      <div className="rounded-[1.5rem] border border-white/[0.08] bg-white/[0.02] p-4 sm:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-red-300/70">Explore Revvam</p>
            <p className="mt-1 text-xs text-white/30">Search people, cars, posts and events without leaving Discover.</p>
          </div>
          <form onSubmit={search} className="flex w-full gap-2 md:max-w-xl">
            <div className="relative min-w-0 flex-1">
              <input value={q} onChange={e => setQ(e.target.value)} onFocus={() => q.trim() && setPreviewOpen(true)} placeholder="Search Revvam…" className="w-full min-w-0 rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-xs outline-none placeholder:text-white/20 focus:border-red-500/30" />
              {previewOpen && q.trim() && (
                <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-2xl border border-white/[0.10] bg-[#090909] shadow-[0_24px_70px_rgba(0,0,0,.7)]">
                  {searching && !data ? <div className="px-4 py-4 text-[10px] text-white/30">Finding matches…</div> : data?.search?.users?.length || data?.search?.vehicles?.length || data?.search?.posts?.length ? (
                    <>
                      {data?.search.users.slice(0, 4).map((u: any) => (
                        <Link key={u.id} href={"/users/" + u.username} onClick={() => { setPreviewOpen(false); setQ(""); }} className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3 hover:bg-white/[0.04]">
                          <Avatar src={u.image} />
                          <span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold">{u.name || u.username}</span><span className="block truncate text-[9px] text-white/30">@{u.username}</span></span>
                          <span className="text-[8px] font-black uppercase tracking-[.16em] text-red-300/60">People</span>
                        </Link>
                      ))}
                      {data?.search.vehicles.slice(0, 2).map((v: any) => <Link key={v.id} href={"/profile/cars/" + v.id} onClick={() => setPreviewOpen(false)} className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3 hover:bg-white/[0.04]"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10 text-red-300">Car</span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold">{v.year ? v.year + " " : ""}{v.make} {v.model}</span><span className="block truncate text-[9px] text-white/30">@{v.user.username}</span></span><span className="text-[8px] font-black uppercase tracking-[.16em] text-white/30">Car</span></Link>)}
                      {data?.search.posts.slice(0, 2).map((p: any) => <Link key={p.id} href={"/posts/" + p.id} onClick={() => setPreviewOpen(false)} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.04]"><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold">{p.content || "Post"}</span><span className="block truncate text-[9px] text-white/25">@{p.author.username}</span></span><span className="text-[8px] font-black uppercase tracking-[.16em] text-white/30">Post</span></Link>)}
                    </>
                  ) : <div className="px-4 py-4 text-[10px] text-white/30">No matches yet.</div>}
                </div>
              )}
            </div>
            <button className="rounded-xl bg-red-600 px-4 py-2.5 text-[10px] font-black">Search</button>
          </form>
        </div>
      </div>

      {notice && <button onClick={() => setNotice("")} className="mt-2 w-full rounded-xl border border-red-500/15 bg-red-500/[0.05] px-3 py-2 text-left text-[10px] text-red-200">{notice}</button>}

      {open && data && <div className="mt-3 space-y-4">
        <div className="flex items-center justify-between"><h2 className="text-sm font-bold">Search results</h2><button onClick={() => setOpen(false)} className="text-[10px] text-white/30">Close</button></div>
        <ResultGrid title="People" items={data.search.users} empty="No people found." render={u => <div className="flex items-center gap-3"><Avatar src={u.image}/><div className="min-w-0 flex-1"><Link href={"/users/" + u.username} className="block truncate text-xs font-bold">{u.name || u.username}</Link><span className="text-[9px] text-white/30">@{u.username}</span></div></div>} />
        <ResultGrid title="Cars" items={data.search.vehicles} empty="No matching cars." render={v => <div><div className="text-xs font-bold">{v.year ? v.year + " " : ""}{v.make} {v.model}</div><div className="mt-1 text-[9px] text-white/30">@{v.user.username}{v.listingStatus === "FOR_SALE" ? " · " + v.listingCurrency + " " + Number(v.listingPrice || 0).toLocaleString() : ""}</div></div>} />
        <ResultGrid title="Posts" items={data.search.posts} empty="No matching posts." render={p => <Link href={"/posts/" + p.id} className="block line-clamp-3 text-xs leading-5 text-white/55">{p.content}</Link>} />
        <ResultGrid title="Events" items={data.search.events} empty="No matching events." render={e => <div><div className="text-xs font-bold">{e.title}</div><div className="mt-1 text-[9px] text-white/30">{e.locationLabel || "Location TBA"}</div></div>} />
      </div>}

      {reviewTarget && <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-3 sm:items-center"><div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#090909] p-5 shadow-2xl"><div className="flex items-center justify-between"><h3 className="font-bold">Rate {reviewTarget.name || reviewTarget.username}</h3><button onClick={() => setReviewTarget(null)} className="text-white/30">×</button></div><div className="mt-4 flex gap-1">{[1,2,3,4,5].map(n => <button key={n} onClick={() => setRating(n)} className={`text-2xl ${n <= rating ? "text-red-300" : "text-white/15"}`}>★</button>)}</div><textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="How was your experience?" className="mt-4 h-24 w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-xs outline-none"/><button onClick={submitReview} className="mt-3 w-full rounded-xl bg-red-600 py-3 text-xs font-black">Publish review</button></div></div>}
    </section>
  );
}

function ResultGrid({ title, items, empty, render }: { title: string; items: any[]; empty: string; render: (item:any)=>React.ReactNode }) {
  return <section><div className="mb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-white/30">{title}</div>{items.length ? <div className="grid gap-2 sm:grid-cols-2">{items.map(item => <div key={item.id} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">{render(item)}</div>)}</div> : <div className="rounded-xl border border-dashed border-white/[0.07] p-3 text-[10px] text-white/20">{empty}</div>}</section>;
}
function Avatar({src}:{src?:string|null}) { return src ? <img src={src} alt="" className="h-8 w-8 rounded-full object-cover"/> : <div className="h-8 w-8 rounded-full bg-red-500/15"/>; }
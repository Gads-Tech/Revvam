"use client";

import { useEffect, useState } from "react";

type Props = { initialStats: { users:number; posts:number; comments:number; reports:number; emergencies:number }; superAdmin:boolean };
export default function ControlCenterClient({ initialStats, superAdmin }: Props) {
  const [stats,setStats]=useState(initialStats);
  const [message,setMessage]=useState("");
  const [target,setTarget]=useState("");
  const [reason,setReason]=useState("");

  async function act(action:string, extra:Record<string,string>={}) {
    setMessage("Processing…");
    const res=await fetch("/api/control-center",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action,targetId:target,...extra})});
    const data=await res.json();
    if(!res.ok){setMessage(data.error||"Action failed.");return;}
    setMessage("Action completed.");
    const fresh=await fetch("/api/control-center").then(r=>r.json());
    if(fresh.stats) setStats(fresh.stats);
  }

  return <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_.6fr]">
    <section className="rounded-3xl border border-white/[.08] bg-white/[.025] p-5">
      <div className="mb-5"><p className="text-[10px] font-black uppercase tracking-[.2em] text-red-400">Command console</p><p className="mt-1 text-sm text-white/35">Protected platform controls. Every action is server-authorized.</p></div>
      <input value={target} onChange={e=>setTarget(e.target.value)} placeholder="Target ID" className="mb-3 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-sm outline-none placeholder:text-white/20"/>
      <input value={reason} onChange={e=>setReason(e.target.value)} placeholder="Reason / audit note" className="mb-5 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-sm outline-none placeholder:text-white/20"/>
      <div className="grid gap-2 sm:grid-cols-2">
        <button onClick={()=>act("suspend_user",{reason})} className="rounded-xl border border-red-500/20 bg-red-500/[.07] px-4 py-3 text-xs font-bold text-red-200">Suspend user</button>
        <button onClick={()=>act("restore_user")} className="rounded-xl border border-white/10 px-4 py-3 text-xs font-bold text-white/65">Restore user</button>
        <button onClick={()=>act("delete_post")} className="rounded-xl border border-white/10 px-4 py-3 text-xs font-bold text-white/65">Remove post</button>
        <button onClick={()=>act("delete_comment")} className="rounded-xl border border-white/10 px-4 py-3 text-xs font-bold text-white/65">Remove comment</button>
        <button onClick={()=>act("resolve_report")} className="rounded-xl border border-white/10 px-4 py-3 text-xs font-bold text-white/65">Resolve report</button>
        <button onClick={()=>act("close_emergency")} className="rounded-xl border border-orange-500/20 bg-orange-500/[.06] px-4 py-3 text-xs font-bold text-orange-200">Close emergency</button>
        {superAdmin && <button onClick={()=>act("change_role",{role:"ADMIN"})} className="rounded-xl border border-red-500/25 bg-red-600/[.10] px-4 py-3 text-xs font-black text-red-100 sm:col-span-2">Promote target to ADMIN</button>}
      </div>
      {message && <p className="mt-4 text-xs text-white/40">{message}</p>}
    </section>
    <section className="rounded-3xl border border-red-500/15 bg-red-500/[.035] p-5">
      <p className="text-[10px] font-black uppercase tracking-[.2em] text-red-300">Live authority</p>
      <div className="mt-5 space-y-3">{Object.entries(stats).map(([k,v])=><div key={k} className="flex items-center justify-between rounded-xl border border-white/[.06] bg-black/20 px-4 py-3"><span className="text-xs capitalize text-white/40">{k}</span><strong className="text-lg">{v}</strong></div>)}</div>
      <p className="mt-5 text-[10px] leading-5 text-white/25">{superAdmin ? "SUPER ADMIN • unrestricted platform authority layer" : "ADMIN • moderation authority layer"}</p>
    </section>
  </div>;
}
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function NearbyEmergencyPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/map?mode=emergencies");
  }, [router]);

  return (
    <main className="min-h-screen bg-black text-white grid place-items-center">
      <div className="text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-pulse rounded-full border border-red-500/30 bg-red-500/10" />
        <p className="text-sm text-white/40">Opening Revvam World…</p>
      </div>
    </main>
  );
}

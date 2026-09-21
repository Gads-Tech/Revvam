"use client";

import Link from "next/link";
import { WarningIcon } from "@/components/icons";

export default function EmergencyHelpButton() {
  return (
    <Link
      href="/emergency"
      aria-label="Emergency Help"
      className="relative flex min-w-0 items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] px-2 py-2.5 text-[10px] font-bold text-white/50 transition hover:border-red-400/20 hover:bg-red-500/[0.06] hover:text-white sm:text-xs"
    >
      <span className="flex h-4 w-4 items-center justify-center text-red-300/80">
        <WarningIcon className="h-4 w-4" />
      </span>
      <span className="truncate">Emergency Help</span>
    </Link>
  );
}

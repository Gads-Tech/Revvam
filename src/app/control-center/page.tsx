import { redirect } from "next/navigation";
import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import ControlCenterClient from "./ControlCenterClient";

export default async function RevvamControlCenterPage() {
  const auth = await requireAdmin();

  if (!auth.user) redirect("/login");
  if (!auth.authorized) redirect("/home");

  const [users, posts, reports, emergencies, recentUsers] = await Promise.all([
    prisma.user.count(),
    prisma.post.count(),
    prisma.report.count(),
    prisma.emergencyRequest.count({ where: { status: "OPEN" } }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, name: true, username: true, role: true, createdAt: true, image: true },
    }),
  ]);

  return (
    <main className="min-h-screen bg-[#030303] px-4 py-8 text-white sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-red-400/75">Revvam Management</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Control Center</h1>
            <p className="mt-2 text-sm text-white/35">Private tools for platform operations and moderation.</p>
          </div>
          <Link href="/home" className="rounded-xl border border-white/[0.09] bg-white/[0.035] px-4 py-2.5 text-xs font-semibold text-white/60 hover:text-white">Back to Revvam</Link>
        </header>

        <ControlCenterClient initialStats={{ users, posts, comments: await prisma.postComment.count(), reports, emergencies }} superAdmin={auth.user.role === "SUPER_ADMIN"} />

      </div>
    </main>
  );
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const mechanics = await prisma.user.findMany({
    where: {
      OR: [{ role: "MECHANIC" }, { role: "MECHANIC_SHOP" }],
      mechanicProfile: { isNot: null },
    },
    select: {
      id: true,
      name: true,
      username: true,
      image: true,
      mechanicProfile: {
        select: { headline: true, skills: true, yearsExperience: true },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 12,
  });

  return NextResponse.json({
    success: true,
    mechanics: mechanics.map((m) => ({
      id: m.id,
      name: m.name,
      username: m.username,
      image: m.image,
      headline: m.mechanicProfile?.headline ?? null,
      skills: m.mechanicProfile?.skills ?? [],
      yearsExperience: m.mechanicProfile?.yearsExperience ?? null,
    })),
  });
}

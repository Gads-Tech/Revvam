import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const now = new Date();
    const events = await prisma.event.findMany({
      where: {
        startsAt: { lte: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 30) },
        OR: [{ endsAt: null }, { endsAt: { gte: now } }],
      },
      orderBy: { startsAt: "asc" },
      take: 100,
      include: {
        host: { select: { id: true, name: true, username: true, image: true } },
      },
    });

    return NextResponse.json(
      { success: true, events },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } },
    );
  } catch (error) {
    console.error("Events map feed error:", error);
    return NextResponse.json({ success: false, events: [], error: "Unable to load Revvam events." }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

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


export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "You must be logged in." }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const description = typeof body?.description === "string" ? body.description.trim() : null;
    const latitude = Number(body?.latitude);
    const longitude = Number(body?.longitude);
    const startsAt = new Date(body?.startsAt);
    const endsAt = body?.endsAt ? new Date(body.endsAt) : null;
    const locationLabel = typeof body?.locationLabel === "string" ? body.locationLabel.trim() : null;
    const image = typeof body?.image === "string" ? body.image.trim() : null;

    if (!title || title.length > 120) {
      return NextResponse.json({ success: false, error: "Event title is required and must be 120 characters or less." }, { status: 400 });
    }
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      return NextResponse.json({ success: false, error: "A valid event location is required." }, { status: 400 });
    }
    if (Number.isNaN(startsAt.getTime())) {
      return NextResponse.json({ success: false, error: "A valid event start time is required." }, { status: 400 });
    }
    if (endsAt && Number.isNaN(endsAt.getTime())) {
      return NextResponse.json({ success: false, error: "The event end time is invalid." }, { status: 400 });
    }

    const event = await prisma.event.create({
      data: {
        hostId: user.id,
        title,
        description: description || null,
        latitude,
        longitude,
        locationLabel: locationLabel || null,
        startsAt,
        endsAt,
        image: image || null,
      },
      include: {
        host: { select: { id: true, name: true, username: true, image: true } },
      },
    });

    return NextResponse.json({ success: true, event }, { status: 201 });
  } catch (error) {
    console.error("Create event error:", error);
    return NextResponse.json({ success: false, error: "Unable to create the event." }, { status: 500 });
  }
}

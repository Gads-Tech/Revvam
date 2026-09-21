import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: "You must be logged in." }, { status: 401, headers: noStore });
  if (user.role !== "MECHANIC" && user.role !== "MECHANIC_SHOP" && user.role !== "ADMIN") {
    return NextResponse.json({ success: false, error: "Only mechanic accounts can offer roadside help." }, { status: 403, headers: noStore });
  }

  const body = await request.json().catch(() => null);
  const emergencyId = typeof body?.emergencyId === "string" ? body.emergencyId : "";
  const message = typeof body?.message === "string" ? body.message.trim() : null;
  if (!emergencyId) return NextResponse.json({ success: false, error: "Emergency request is required." }, { status: 400, headers: noStore });
  if (message && message.length > 500) return NextResponse.json({ success: false, error: "Offer message is too long." }, { status: 400, headers: noStore });

  const emergency = await prisma.emergencyRequest.findUnique({ where: { id: emergencyId }, select: { id: true, driverId: true, status: true } });
  if (!emergency || !["OPEN", "OFFERS_RECEIVED"].includes(emergency.status)) {
    return NextResponse.json({ success: false, error: "This emergency is no longer accepting offers." }, { status: 409, headers: noStore });
  }
  if (emergency.driverId === user.id) return NextResponse.json({ success: false, error: "You cannot offer help to your own emergency." }, { status: 400, headers: noStore });

  const offer = await prisma.emergencyOffer.upsert({
    where: { emergencyId_mechanicId: { emergencyId, mechanicId: user.id } },
    create: { emergencyId, mechanicId: user.id, message: message || null },
    update: { message: message || null, status: "PENDING" },
  });

  if (emergency.status === "OPEN") {
    await prisma.emergencyRequest.update({ where: { id: emergencyId }, data: { status: "OFFERS_RECEIVED" } });
  }

  await prisma.notification.create({
    data: {
      userId: emergency.driverId,
      actorId: user.id,
      type: "EMERGENCY_OFFER",
      title: "Someone offered to help",
      body: message ? `${user.name}: ${message}` : `${user.name} offered to help with your emergency.`,
      href: `/emergency/nearby?emergency=${encodeURIComponent(emergencyId)}&offer=${encodeURIComponent(offer.id)}`,
    },
  });

  return NextResponse.json({ success: true, offer }, { status: 201, headers: noStore });
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: "You must be logged in." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const notificationId = typeof body?.notificationId === "string" ? body.notificationId : "";
  const action = body?.action === "accept_offer" || body?.action === "decline_offer" ? body.action : "";

  if (!notificationId || !action) {
    return NextResponse.json({ success: false, error: "Notification and action are required." }, { status: 400 });
  }

  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, userId: user.id, type: "EMERGENCY_OFFER" },
    select: { id: true, actorId: true, href: true },
  });

  if (!notification) return NextResponse.json({ success: false, error: "Emergency offer notification not found." }, { status: 404 });

  let emergencyId = "";
  let offerId = "";
  try {
    const url = new URL(notification.href || "/emergency/nearby", "http://revvam.local");
    emergencyId = url.searchParams.get("emergency") || "";
    offerId = url.searchParams.get("offer") || "";
  } catch {}

  // Resolve older notifications that were created before emergency/offer IDs
  // were included in notification.href.
  if (!emergencyId || !offerId) {
    const fallback = await prisma.emergencyOffer.findFirst({
      where: {
        mechanicId: notification.actorId,
        status: "PENDING",
        emergency: { driverId: user.id, status: { in: ["OPEN", "OFFERS_RECEIVED"] } },
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, emergencyId: true },
    });
    if (fallback) {
      offerId = fallback.id;
      emergencyId = fallback.emergencyId;
    }
  }

  if (!emergencyId || !offerId) {
    return NextResponse.json({ success: false, error: "No pending emergency offer was found for this notification." }, { status: 404 });
  }

  const emergency = await prisma.emergencyRequest.findUnique({
    where: { id: emergencyId },
    include: { offers: true },
  });

  if (!emergency || emergency.driverId !== user.id) {
    return NextResponse.json({ success: false, error: "Emergency request not found." }, { status: 404 });
  }

  const offer = emergency.offers.find((item) => item.id === offerId && item.mechanicId === notification.actorId);
  if (!offer || offer.status !== "PENDING") {
    return NextResponse.json({ success: false, error: "That emergency offer is no longer available." }, { status: 409 });
  }

  if (action === "decline_offer") {
    const updated = await prisma.emergencyOffer.update({ where: { id: offerId }, data: { status: "DECLINED" } });
    await prisma.notification.create({
      data: {
        userId: offer.mechanicId,
        actorId: user.id,
        type: "EMERGENCY_DECLINED",
        title: "Your help offer was declined",
        body: "The requester declined your offer to help.",
        href: "/profile/notifications",
      },
    });
    await prisma.notification.update({ where: { id: notificationId }, data: { readAt: new Date() } });
    return NextResponse.json({ success: true, offer: updated });
  }

  const result = await prisma.$transaction(async (tx) => {
    const otherPending = emergency.offers.filter((item) => item.id !== offerId && item.status === "PENDING");
    await tx.emergencyOffer.updateMany({
      where: { emergencyId, id: { not: offerId }, status: "PENDING" },
      data: { status: "DECLINED" },
    });
    await tx.emergencyOffer.update({ where: { id: offerId }, data: { status: "ACCEPTED" } });

    for (const declined of otherPending) {
      await tx.notification.create({
        data: {
          userId: declined.mechanicId,
          actorId: user.id,
          type: "EMERGENCY_DECLINED",
          title: "Your help offer was declined",
          body: "Another helper was selected for this emergency.",
          href: "/profile/notifications",
        },
      });
    }

    await tx.notification.create({
      data: {
        userId: offer.mechanicId,
        actorId: user.id,
        type: "EMERGENCY_ACCEPTED",
        title: "Your help offer was accepted",
        body: "Your offer was accepted. You can now send the requester a chat request.",
        href: "/users/" + encodeURIComponent((await tx.user.findUnique({ where: { id: user.id }, select: { username: true } }))?.username || ""),
      },
    });

    const updatedEmergency = await tx.emergencyRequest.update({
      where: { id: emergencyId },
      data: { acceptedOfferId: offerId, status: "ACCEPTED", acceptedAt: new Date() },
    });

    await tx.notification.update({ where: { id: notificationId }, data: { readAt: new Date() } });
    return updatedEmergency;
  });

  return NextResponse.json({ success: true, emergency: result });
}

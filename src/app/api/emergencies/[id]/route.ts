import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

function publicLocation(id: string, latitude: number, longitude: number, radiusMeters: number, exact: boolean) {
  if (exact) return { latitude, longitude, radiusMeters, exactLocation: true };
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  const angle = ((hash >>> 0) % 360) * (Math.PI / 180);
  const offsetMeters = 100 + ((hash >>> 8) % 51);
  return {
    latitude: latitude + (offsetMeters * Math.cos(angle)) / 111_320,
    longitude: longitude + (offsetMeters * Math.sin(angle)) / (111_320 * Math.max(0.2, Math.cos(latitude * Math.PI / 180))),
    radiusMeters,
    exactLocation: false,
  };
}


const noStore = { "Cache-Control": "no-store" };

type Context = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Context) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: "You must be logged in." }, { status: 401, headers: noStore });
  const { id } = await params;

  const emergency = await prisma.emergencyRequest.findUnique({
    where: { id },
    include: {
      driver: { select: { id: true, name: true, username: true, image: true } },
      vehicle: { select: { id: true, make: true, model: true, year: true, image: true } },
      offers: { include: { mechanic: { select: { id: true, name: true, username: true, image: true, role: true } } }, orderBy: { createdAt: "asc" } },
    },
  });

  if (!emergency) return NextResponse.json({ success: false, error: "Emergency request not found." }, { status: 404, headers: noStore });

  const isOwner = emergency.driverId === user.id;
  const acceptedHelper = emergency.acceptedOfferId
    ? emergency.offers.some((offer) => offer.id === emergency.acceptedOfferId && offer.mechanicId === user.id)
    : false;
  const sourceLatitude = emergency.liveLatitude ?? emergency.latitude;
  const sourceLongitude = emergency.liveLongitude ?? emergency.longitude;
  const location = publicLocation(emergency.id, sourceLatitude, sourceLongitude, emergency.radiusMeters, isOwner || acceptedHelper);

  const safeEmergency = {
    ...emergency,
    latitude: location.latitude,
    longitude: location.longitude,
    radiusMeters: location.radiusMeters,
    exactLocation: location.exactLocation,
    offers: emergency.offers.map(({ mechanicId, ...offer }) => offer),
  };

  return NextResponse.json({ success: true, emergency: safeEmergency }, { headers: noStore });
}

export async function PATCH(request: Request, { params }: Context) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: "You must be logged in." }, { status: 401, headers: noStore });
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const action = typeof body?.action === "string" ? body.action : "";

  const emergency = await prisma.emergencyRequest.findUnique({ where: { id }, include: { offers: true } });
  if (!emergency) return NextResponse.json({ success: false, error: "Emergency request not found." }, { status: 404, headers: noStore });

  if (action === "update_location") {
    if (emergency.driverId !== user.id) return NextResponse.json({ success: false, error: "Only the person requesting help can update this location." }, { status: 403, headers: noStore });
    const latitude = Number(body?.latitude);
    const longitude = Number(body?.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return NextResponse.json({ success: false, error: "A valid live location is required." }, { status: 400, headers: noStore });
    }
    const updated = await prisma.emergencyRequest.update({ where: { id }, data: { liveLatitude: latitude, liveLongitude: longitude } });
    return NextResponse.json({ success: true, emergency: updated }, { headers: noStore });
  }

  if (action === "delete") {
    if (emergency.driverId !== user.id && user.role !== "ADMIN") return NextResponse.json({ success: false, error: "Only the person who posted this emergency can delete it." }, { status: 403, headers: noStore });
    if (["ACCEPTED", "MECHANIC_EN_ROUTE", "ARRIVED"].includes(emergency.status)) return NextResponse.json({ success: false, error: "An accepted emergency cannot be deleted. Cancel or complete it first." }, { status: 409, headers: noStore });
    await prisma.emergencyRequest.delete({ where: { id } });
    return NextResponse.json({ success: true }, { headers: noStore });
  }

  if (action === "update") {
    if (emergency.driverId !== user.id) return NextResponse.json({ success: false, error: "Only the person who posted this emergency can edit it." }, { status: 403, headers: noStore });
    if (["COMPLETED", "CANCELLED"].includes(emergency.status)) return NextResponse.json({ success: false, error: "This emergency is already closed." }, { status: 409, headers: noStore });
    const description = typeof body?.description === "string" ? body.description.trim() : emergency.description;
    if (description.length < 8 || description.length > 1500) return NextResponse.json({ success: false, error: "Description must be between 8 and 1500 characters." }, { status: 400, headers: noStore });
    const radiusMeters = body?.radiusMeters === undefined ? emergency.radiusMeters : Number(body.radiusMeters);
    if (![500, 1000, 2500, 5000].includes(radiusMeters)) return NextResponse.json({ success: false, error: "Choose a valid assistance radius." }, { status: 400, headers: noStore });
    const updated = await prisma.emergencyRequest.update({ where: { id }, data: { description, radiusMeters } });
    return NextResponse.json({ success: true, emergency: updated }, { headers: noStore });
  }

  if (action === "ghost_mode") {
    if (emergency.driverId !== user.id) return NextResponse.json({ success: false, error: "Only the person requesting help can change ghost mode." }, { status: 403, headers: noStore });
    if (["COMPLETED", "CANCELLED", "ACCEPTED", "MECHANIC_EN_ROUTE", "ARRIVED"].includes(emergency.status)) return NextResponse.json({ success: false, error: "Ghost mode can only be changed while the request is open." }, { status: 409, headers: noStore });
    const ghostMode = Boolean(body?.ghostMode);
    const updated = await prisma.emergencyRequest.update({ where: { id }, data: { ghostMode } });
    return NextResponse.json({ success: true, emergency: updated }, { headers: noStore });
  }
  if (action === "radius") {
    if (emergency.driverId !== user.id) return NextResponse.json({ success: false, error: "Only the person requesting help can change the radius." }, { status: 403, headers: noStore });
    const radiusMeters = Number(body?.radiusMeters);
    if (![500, 1000, 2500, 5000].includes(radiusMeters)) return NextResponse.json({ success: false, error: "Choose a valid assistance radius." }, { status: 400, headers: noStore });
    const updated = await prisma.emergencyRequest.update({ where: { id }, data: { radiusMeters } });
    return NextResponse.json({ success: true, emergency: updated }, { headers: noStore });
  }

  if (action === "cancel") {
    if (emergency.driverId !== user.id && user.role !== "ADMIN") return NextResponse.json({ success: false, error: "Only the driver can cancel this request." }, { status: 403, headers: noStore });
    if (["COMPLETED", "CANCELLED"].includes(emergency.status)) return NextResponse.json({ success: false, error: "This emergency is already closed." }, { status: 409, headers: noStore });
    const updated = await prisma.emergencyRequest.update({ where: { id }, data: { status: "CANCELLED" } });
    return NextResponse.json({ success: true, emergency: updated }, { headers: noStore });
  }

  if (action === "accept_offer") {
    if (emergency.driverId !== user.id && user.role !== "ADMIN") return NextResponse.json({ success: false, error: "Only the driver can accept an offer." }, { status: 403, headers: noStore });
    const offerId = typeof body?.offerId === "string" ? body.offerId : "";
    const offer = emergency.offers.find((item) => item.id === offerId);
    if (!offer || offer.status !== "PENDING") return NextResponse.json({ success: false, error: "That offer is no longer available." }, { status: 409, headers: noStore });

    const result = await prisma.$transaction(async (tx) => {
      await tx.emergencyOffer.updateMany({ where: { emergencyId: id, id: { not: offerId }, status: "PENDING" }, data: { status: "DECLINED" } });
      await tx.emergencyOffer.update({ where: { id: offerId }, data: { status: "ACCEPTED" } });
      const directKey = [user.id, offer.mechanicId].sort().join(":");
      const conversation = await tx.conversation.upsert({ where: { directKey }, create: { directKey }, update: {} });
      await tx.conversationMember.createMany({ data: [{ conversationId: conversation.id, userId: user.id }, { conversationId: conversation.id, userId: offer.mechanicId }], skipDuplicates: true });
      await tx.notification.create({ data: { userId: offer.mechanicId, actorId: user.id, type: "EMERGENCY_ACCEPTED", title: "Your help was accepted", body: "Your offer to help has been accepted. You can now chat with the requester.", href: "/messages/" + encodeURIComponent(user.name) } });
      const emergency = await tx.emergencyRequest.update({ where: { id }, data: { acceptedOfferId: offerId, status: "ACCEPTED", acceptedAt: new Date() } });
      return { emergency, conversationId: conversation.id };
    });

    return NextResponse.json({ success: true, emergency: result.emergency, conversationId: result.conversationId }, { headers: noStore });
  }

  if (action === "status") {
    const allowed = new Set(["MECHANIC_EN_ROUTE", "ARRIVED", "COMPLETED"]);
    if (!allowed.has(body?.status)) return NextResponse.json({ success: false, error: "Invalid assistance status." }, { status: 400, headers: noStore });
    const accepted = emergency.offers.find((offer) => offer.id === emergency.acceptedOfferId && offer.mechanicId === user.id);
    if (!accepted && user.role !== "ADMIN") return NextResponse.json({ success: false, error: "You are not the accepted helper." }, { status: 403, headers: noStore });
    const nextStatus = body.status as "MECHANIC_EN_ROUTE" | "ARRIVED" | "COMPLETED";
    const updated = await prisma.emergencyRequest.update({ where: { id }, data: { status: nextStatus, completedAt: nextStatus === "COMPLETED" ? new Date() : undefined } });
    return NextResponse.json({ success: true, emergency: updated }, { headers: noStore });
  }

  return NextResponse.json({ success: false, error: "Unknown emergency action." }, { status: 400, headers: noStore });
}

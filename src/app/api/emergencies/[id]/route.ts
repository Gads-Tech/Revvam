import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";
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

  return NextResponse.json({ success: true, emergency }, { headers: noStore });
}

export async function PATCH(request: Request, { params }: Context) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: "You must be logged in." }, { status: 401, headers: noStore });
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const action = typeof body?.action === "string" ? body.action : "";

  const emergency = await prisma.emergencyRequest.findUnique({ where: { id }, include: { offers: true } });
  if (!emergency) return NextResponse.json({ success: false, error: "Emergency request not found." }, { status: 404, headers: noStore });

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

    const updated = await prisma.$transaction(async (tx) => {
      await tx.emergencyOffer.updateMany({ where: { emergencyId: id, id: { not: offerId }, status: "PENDING" }, data: { status: "DECLINED" } });
      await tx.emergencyOffer.update({ where: { id: offerId }, data: { status: "ACCEPTED" } });
      return tx.emergencyRequest.update({ where: { id }, data: { acceptedOfferId: offerId, status: "ACCEPTED", acceptedAt: new Date() } });
    });

    return NextResponse.json({ success: true, emergency: updated }, { headers: noStore });
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

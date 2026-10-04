import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: "You must be logged in." }, { status: 401 });
    const body = await request.json();
    const vehicleId = String(body.vehicleId ?? "");
    const vehicle = await prisma.vehicle.findFirst({ where: { id: vehicleId, userId: user.id } });
    if (!vehicle) return NextResponse.json({ success: false, error: "Vehicle not found." }, { status: 404 });
    const status = body.listingStatus === "FOR_SALE" ? "FOR_SALE" : body.listingStatus === "SOLD" ? "SOLD" : "NONE";
    const price = body.listingPrice == null || body.listingPrice === "" ? null : Number(body.listingPrice);
    if (price !== null && (!Number.isFinite(price) || price < 0)) return NextResponse.json({ success: false, error: "Invalid price." }, { status: 400 });
    const updated = await prisma.vehicle.update({
      where: { id: vehicleId },
      data: {
        listingStatus: status,
        listingPrice: price,
        listingCurrency: String(body.listingCurrency ?? "GHS").slice(0, 8),
        listingLocation: typeof body.listingLocation === "string" ? body.listingLocation.trim().slice(0, 120) : null,
        listingDescription: typeof body.listingDescription === "string" ? body.listingDescription.trim().slice(0, 1000) : null,
        listedAt: status === "FOR_SALE" ? new Date() : null,
      },
      select: { id: true, make: true, model: true, listingStatus: true, listingPrice: true, listingCurrency: true, listingLocation: true, listingDescription: true },
    });
    return NextResponse.json({ success: true, vehicle: { ...updated, listingPrice: updated.listingPrice == null ? null : Number(updated.listingPrice) } });
  } catch {
    return NextResponse.json({ success: false, error: "Unable to update vehicle listing." }, { status: 500 });
  }
}
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { success: false, error: "You must be logged in." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const count = await prisma.emergencyRequest.count({
    where: {
      driverId: { not: user.id },
      status: { in: ["OPEN", "OFFERS_RECEIVED"] },
    },
  });

  return NextResponse.json(
    { success: true, count },
    { headers: { "Cache-Control": "no-store" } },
  );
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { success: false, count: 0, error: "You must be logged in." },
      {
        status: 401,
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
      },
    );
  }

  const count = await prisma.emergencyRequest.count({
    where: {
      status: { in: ["OPEN", "OFFERS_RECEIVED"] },
      driverId: { not: user.id },
    },
  });

  return NextResponse.json(
    { success: true, count },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    },
  );
}

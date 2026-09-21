import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const headers = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ success: false, count: 0, error: "You must be logged in." }, { status: 401, headers });
    }

    // Count the same active states used by the Nearby Emergency map.
    // Do the subtraction in application code so this endpoint cannot disagree
    // with the feed because of a relation/filter mismatch.
    const active = await prisma.emergencyRequest.findMany({
      where: { status: { in: ["OPEN", "OFFERS_RECEIVED"] } },
      select: { driverId: true },
    });

    const count = active.reduce((total, emergency) => {
      return total + (emergency.driverId === user.id ? 0 : 1);
    }, 0);

    return NextResponse.json(
      { success: true, count, activeTotal: active.length },
      { headers },
    );
  } catch (error) {
    console.error("Emergency count error:", error);
    return NextResponse.json(
      { success: false, count: 0, error: "Unable to check emergency count." },
      { status: 500, headers },
    );
  }
}

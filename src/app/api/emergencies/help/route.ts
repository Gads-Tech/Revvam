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
      return NextResponse.json(
        { success: false, error: "You must be logged in." },
        { status: 401, headers },
      );
    }

    const emergencies = await prisma.emergencyRequest.findMany({
      where: {
        driverId: { not: user.id },
        status: { in: ["OPEN", "OFFERS_RECEIVED"] },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 20,
      select: {
        id: true,
        type: true,
        description: true,
        locationLabel: true,
        ghostMode: true,
        radiusMeters: true,
        createdAt: true,
        driver: {
          select: {
            username: true,
            image: true,
          },
        },
      },
    });

    const latest = emergencies[0] ?? null;

    return NextResponse.json(
      {
        success: true,
        count: emergencies.length,
        latest: latest
          ? {
              id: latest.id,
              createdAt: latest.createdAt.toISOString(),
              type: latest.type,
              description: latest.description,
              locationLabel: latest.locationLabel,
              ghostMode: latest.ghostMode,
              radiusMeters: latest.radiusMeters,
              driver: latest.driver,
            }
          : null,
        emergencies: emergencies.map((emergency) => ({
          id: emergency.id,
          type: emergency.type,
          description: emergency.description,
          locationLabel: emergency.locationLabel,
          ghostMode: emergency.ghostMode,
          radiusMeters: emergency.radiusMeters,
          createdAt: emergency.createdAt.toISOString(),
          driver: emergency.driver,
        })),
      },
      { headers },
    );
  } catch (error) {
    console.error("Emergency help alert error:", error);
    return NextResponse.json(
      { success: false, error: "Unable to check emergency help alerts." },
      { status: 500, headers },
    );
  }
}

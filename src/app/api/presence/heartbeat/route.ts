import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function POST() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "You must be logged in." },
        { status: 401 }
      );
    }

    const lastSeenAt = new Date();

    await prisma.user.update({
      where: { id: user.id },
      data: { lastSeenAt },
    });

    return NextResponse.json({
      success: true,
      lastSeenAt: lastSeenAt.toISOString(),
    });
  } catch (error) {
    console.error("Presence heartbeat error:", error);
    return NextResponse.json(
      { success: false, error: "Unable to update presence." },
      { status: 500 }
    );
  }
}

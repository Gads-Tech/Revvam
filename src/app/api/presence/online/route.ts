import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

const ONLINE_WINDOW_MS = 90_000;

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: "You must be logged in." },
        { status: 401 }
      );
    }

    const cutoff = new Date(Date.now() - ONLINE_WINDOW_MS);

    const users = await prisma.user.findMany({
      where: {
        id: { not: currentUser.id },
        showOnlineStatus: true,
        lastSeenAt: { gte: cutoff },
      },
      orderBy: { lastSeenAt: "desc" },
      take: 30,
      select: {
        id: true,
        name: true,
        username: true,
        image: true,
        role: true,
        lastSeenAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      users: users.map((user) => ({
        ...user,
        lastSeenAt: user.lastSeenAt?.toISOString() ?? null,
      })),
    });
  } catch (error) {
    console.error("Online users error:", error);
    return NextResponse.json(
      { success: false, error: "Unable to load online users." },
      { status: 500 }
    );
  }
}

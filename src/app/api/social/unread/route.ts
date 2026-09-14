import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: "You must be logged in." }, { status: 401 });

    const [unreadNotifications, unreadMessages] = await Promise.all([
      prisma.notification.count({ where: { userId: user.id, readAt: null } }),
      prisma.message.count({
        where: {
          senderId: { not: user.id },
          readAt: null,
          conversation: { members: { some: { userId: user.id } } },
        },
      }),
    ]);

    return NextResponse.json({ success: true, unreadNotifications, unreadMessages });
  } catch (error) {
    console.error("Live social counts error:", error);
    return NextResponse.json({ success: false, error: "Unable to load social counts." }, { status: 500 });
  }
}

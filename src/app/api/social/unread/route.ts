import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: "You must be logged in." }, { status: 401, headers: { "Cache-Control": "no-store, max-age=0" } });

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

    return NextResponse.json(
      { success: true, unreadNotifications, unreadMessages },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate", Pragma: "no-cache", Expires: "0" } },
    );
  } catch (error) {
    console.error("Live social counts error:", error);
    return NextResponse.json({ success: false, error: "Unable to load social counts." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}

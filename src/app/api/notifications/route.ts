import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const noStore = { "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate", Pragma: "no-cache", Expires: "0" };

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: "You must be logged in." }, { status: 401, headers: noStore });

    // Messages have their own inbox/count. They must never appear as notifications.
    const notifications = await prisma.notification.findMany({
      where: { userId: user.id, type: { not: "MESSAGE" } },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        actor: { select: { id: true, name: true, username: true, image: true } },
        chatRequest: { select: { id: true, status: true, message: true } },
      },
    });

    const actorIds = notifications.filter((item) => item.type === "FOLLOW").map((item) => item.actorId);
    const existingFollows = actorIds.length
      ? await prisma.follow.findMany({ where: { followerId: user.id, followingId: { in: actorIds } }, select: { followingId: true } })
      : [];
    const followingIds = new Set(existingFollows.map((item) => item.followingId));
    const unreadCount = await prisma.notification.count({ where: { userId: user.id, readAt: null, type: { not: "MESSAGE" } } });

    return NextResponse.json({
      success: true,
      notifications: notifications.map((item) => ({
        ...item,
        isFollowingActor: followingIds.has(item.actorId),
        isRead: Boolean(item.readAt),
      })),
      unreadCount,
    }, { headers: noStore });
  } catch (error) {
    console.error("Notifications error:", error);
    return NextResponse.json({ success: false, error: "Unable to load notifications." }, { status: 500, headers: noStore });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: "You must be logged in." }, { status: 401, headers: noStore });

    const body = await request.json().catch(() => ({}));
    const notificationId = typeof body?.notificationId === "string" ? body.notificationId : "";

    if (notificationId) {
      await prisma.notification.updateMany({ where: { id: notificationId, userId: user.id, type: { not: "MESSAGE" } }, data: { readAt: new Date() } });
    } else {
      await prisma.notification.updateMany({ where: { userId: user.id, readAt: null, type: { not: "MESSAGE" } }, data: { readAt: new Date() } });
    }

    return NextResponse.json({ success: true }, { headers: noStore });
  } catch (error) {
    console.error("Mark notifications read error:", error);
    return NextResponse.json({ success: false, error: "Unable to update notifications." }, { status: 500, headers: noStore });
  }
}

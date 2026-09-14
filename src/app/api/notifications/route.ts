import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: "You must be logged in." }, { status: 401 });

    const notifications = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        actor: { select: { id: true, name: true, username: true, image: true } },
      },
    });

    const actorIds = notifications.filter((item) => item.type === "FOLLOW").map((item) => item.actorId);
    const existingFollows = actorIds.length
      ? await prisma.follow.findMany({
          where: { followerId: user.id, followingId: { in: actorIds } },
          select: { followingId: true },
        })
      : [];
    const followingIds = new Set(existingFollows.map((item) => item.followingId));

    const unreadCount = await prisma.notification.count({ where: { userId: user.id, readAt: null } });

    return NextResponse.json({
      success: true,
      notifications: notifications.map((item) => ({
        ...item,
        isFollowingActor: followingIds.has(item.actorId),
      })),
      unreadCount,
    });
  } catch (error) {
    console.error("Notifications error:", error);
    return NextResponse.json({ success: false, error: "Unable to load notifications." }, { status: 500 });
  }
}

export async function PATCH() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: "You must be logged in." }, { status: 401 });

    await prisma.notification.updateMany({
      where: { userId: user.id, readAt: null },
      data: { readAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Mark notifications read error:", error);
    return NextResponse.json({ success: false, error: "Unable to update notifications." }, { status: 500 });
  }
}

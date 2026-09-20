import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const revalidate = 0;
const noStore = { "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate", Pragma: "no-cache", Expires: "0" };
const notificationWhere = (userId: string) => ({ userId, type: { not: "MESSAGE" as const } });

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: "You must be logged in." }, { status: 401, headers: noStore });
    // Keep mechanic emergency alerts reliable even if an emergency was created while
    // the mechanic was offline or before the notification fan-out completed.
    if (user.role === "MECHANIC" || user.role === "MECHANIC_SHOP") {
      const openEmergencies = await prisma.emergencyRequest.findMany({
        where: { status: { in: ["OPEN", "OFFERS_RECEIVED"] }, driverId: { not: user.id } },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: { id: true, driverId: true, type: true, description: true, createdAt: true, driver: { select: { name: true } } },
      });

      for (const emergency of openEmergencies) {
        const href = "/map";
        const existing = await prisma.notification.findFirst({
          where: { userId: user.id, type: "EMERGENCY_OFFER", href, body: { contains: emergency.id } },
          select: { id: true },
        });
        if (!existing) {
          await prisma.notification.create({
            data: {
              userId: user.id,
              actorId: emergency.driverId,
              type: "EMERGENCY_OFFER",
              title: "Emergency help needed nearby",
              body: \`Emergency \${emergency.id}: \${emergency.driver.name} needs help with a \${emergency.type.toLowerCase().replaceAll("_", " ")}. \${emergency.description.slice(0, 220)}\`,
              href,
            },
          });
        }
      }
    }

    const notifications = await prisma.notification.findMany({
      where: notificationWhere(user.id), orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 50,
      include: { actor: { select: { id: true, name: true, username: true, image: true } }, chatRequest: { select: { id: true, status: true, message: true } } },
    });
    const actorIds = notifications.filter((item) => item.type === "FOLLOW").map((item) => item.actorId);
    const existingFollows = actorIds.length ? await prisma.follow.findMany({ where: { followerId: user.id, followingId: { in: actorIds } }, select: { followingId: true } }) : [];
    const followingIds = new Set(existingFollows.map((item) => item.followingId));
    const unreadCount = await prisma.notification.count({ where: { ...notificationWhere(user.id), readAt: null } });
    return NextResponse.json({ success: true, notifications: notifications.map((item) => ({ ...item, isFollowingActor: followingIds.has(item.actorId), isRead: Boolean(item.readAt) })), unreadCount }, { headers: noStore });
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
    if (notificationId) await prisma.notification.updateMany({ where: { ...notificationWhere(user.id), id: notificationId }, data: { readAt: new Date() } });
    else await prisma.notification.updateMany({ where: { ...notificationWhere(user.id), readAt: null }, data: { readAt: new Date() } });
    return NextResponse.json({ success: true }, { headers: noStore });
  } catch (error) {
    console.error("Mark notifications read error:", error);
    return NextResponse.json({ success: false, error: "Unable to update notifications." }, { status: 500, headers: noStore });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: "You must be logged in." }, { status: 401, headers: noStore });
    const body = await request.json().catch(() => ({}));
    const clearAll = body?.clearAll === true;
    const notificationId = typeof body?.notificationId === "string" ? body.notificationId : "";
    const notificationIds = Array.isArray(body?.notificationIds) ? body.notificationIds.filter((id: unknown): id is string => typeof id === "string" && id.length > 0) : [];
    const where = notificationId ? { ...notificationWhere(user.id), id: notificationId } : notificationIds.length ? { ...notificationWhere(user.id), id: { in: notificationIds } } : clearAll ? notificationWhere(user.id) : null;
    if (!where) return NextResponse.json({ success: false, error: "No notifications selected." }, { status: 400, headers: noStore });
    const result = await prisma.notification.deleteMany({ where });
    return NextResponse.json({ success: true, deletedCount: result.count }, { headers: noStore });
  } catch (error) {
    console.error("Delete notifications error:", error);
    return NextResponse.json({ success: false, error: "Unable to delete notifications." }, { status: 500, headers: noStore });
  }
}

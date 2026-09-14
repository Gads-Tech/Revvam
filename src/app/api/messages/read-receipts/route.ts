import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: "You must be logged in." }, { status: 401 });

    const [current, overrides, memberships] = await Promise.all([
      prisma.user.findUnique({ where: { id: user.id }, select: { readReceiptsEnabled: true } }),
      prisma.readReceiptPreference.findMany({
        where: { ownerId: user.id },
        select: { targetId: true, enabled: true, target: { select: { id: true, name: true, username: true, image: true } } },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.conversationMember.findMany({
        where: { userId: user.id },
        select: { conversation: { select: { members: { where: { userId: { not: user.id } }, select: { user: { select: { id: true, name: true, username: true, image: true } } } } } } },
      }),
    ]);

    const users = new Map<string, { id: string; name: string; username: string; image: string | null }>();
    for (const membership of memberships) {
      for (const member of membership.conversation.members) users.set(member.user.id, member.user);
    }
    for (const override of overrides) users.set(override.target.id, override.target);

    return NextResponse.json({
      success: true,
      enabled: current?.readReceiptsEnabled ?? true,
      overrides: overrides.map((item) => ({ targetId: item.targetId, enabled: item.enabled, user: item.target })),
      users: Array.from(users.values()),
    });
  } catch (error) {
    console.error("Read receipt settings error:", error);
    return NextResponse.json({ success: false, error: "Unable to load read receipt settings." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: "You must be logged in." }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const scope = body?.scope === "user" ? "user" : "global";
    const enabled = Boolean(body?.enabled);

    if (scope === "global") {
      await prisma.user.update({ where: { id: user.id }, data: { readReceiptsEnabled: enabled } });
      return NextResponse.json({ success: true, scope, enabled });
    }

    const targetUsername = typeof body?.username === "string" ? body.username.trim() : "";
    if (!targetUsername) return NextResponse.json({ success: false, error: "Username is required." }, { status: 400 });

    const target = await prisma.user.findUnique({ where: { username: targetUsername }, select: { id: true, username: true } });
    if (!target) return NextResponse.json({ success: false, error: "User not found." }, { status: 404 });
    if (target.id === user.id) return NextResponse.json({ success: false, error: "You cannot set a receipt preference for yourself." }, { status: 400 });

    await prisma.readReceiptPreference.upsert({
      where: { ownerId_targetId: { ownerId: user.id, targetId: target.id } },
      create: { ownerId: user.id, targetId: target.id, enabled },
      update: { enabled },
    });

    return NextResponse.json({ success: true, scope, enabled, username: target.username });
  } catch (error) {
    console.error("Update read receipt settings error:", error);
    return NextResponse.json({ success: false, error: "Unable to update read receipt settings." }, { status: 500 });
  }
}

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

    // Live Community is intentionally limited to people the current user
    // already has a private conversation with. This prevents it from becoming
    // a global directory of everyone currently online.
    const chatContacts = await prisma.conversationMember.findMany({
      where: {
        conversation: {
          members: {
            some: { userId: currentUser.id },
          },
        },
        userId: { not: currentUser.id },
      },
      select: { userId: true },
      distinct: ["userId"],
    });

    const contactIds = chatContacts.map((member) => member.userId);

    if (contactIds.length === 0) {
      return NextResponse.json({ success: true, users: [] });
    }

    const users = await prisma.user.findMany({
      where: {
        id: { in: contactIds },
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

import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

type RouteContext = {
  params: Promise<{ username: string }>;
};

export async function POST(
  request: Request,
  context: RouteContext
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: "You must be logged in." },
        { status: 401 }
      );
    }

    const { username } = await context.params;
    const cleanUsername = decodeURIComponent(username).trim().replace(/^@/, "");

    const target = await prisma.user.findFirst({
      where: { username: { equals: cleanUsername, mode: "insensitive" } },
      select: { id: true, username: true },
    });

    if (!target) {
      return NextResponse.json(
        { success: false, error: "User not found." },
        { status: 404 }
      );
    }

    if (target.id === currentUser.id) {
      return NextResponse.json(
        { success: false, error: "You cannot follow yourself." },
        { status: 400 }
      );
    }

    const existing = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: currentUser.id,
          followingId: target.id,
        },
      },
    });

    if (existing) {
      await prisma.follow.delete({ where: { id: existing.id } });
    } else {
      await prisma.follow.create({
        data: {
          followerId: currentUser.id,
          followingId: target.id,
        },
      });
    }

    const followers = await prisma.follow.count({
      where: { followingId: target.id },
    });

    return NextResponse.json({
      success: true,
      following: !existing,
      followers,
    });
  } catch (error) {
    console.error("Follow toggle error:", error);
    return NextResponse.json(
      { success: false, error: "Unable to update follow status." },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "You must be logged in." },
        { status: 401 }
      );
    }

    const [followers, following, postCount, unreadNotifications] =
      await Promise.all([
        prisma.follow.findMany({
          where: { followingId: user.id },
          orderBy: { createdAt: "desc" },
          take: 25,
          select: {
            id: true,
            createdAt: true,
            follower: {
              select: {
                id: true,
                name: true,
                username: true,
                image: true,
              },
            },
          },
        }),
        prisma.follow.findMany({
          where: { followerId: user.id },
          orderBy: { createdAt: "desc" },
          take: 25,
          select: {
            id: true,
            createdAt: true,
            following: {
              select: {
                id: true,
                name: true,
                username: true,
                image: true,
              },
            },
          },
        }),
        prisma.post.count({ where: { authorId: user.id } }),
        prisma.notification.count({
          where: { userId: user.id, readAt: null },
        }),
      ]);

    const followerIds = followers.map((item) => item.follower.id);
    const followingBack = followerIds.length
      ? await prisma.follow.findMany({
          where: {
            followerId: user.id,
            followingId: { in: followerIds },
          },
          select: { followingId: true },
        })
      : [];

    const followingBackIds = new Set(
      followingBack.map((item) => item.followingId)
    );

    return NextResponse.json({
      success: true,
      counts: {
        posts: postCount,
        followers: followers.length,
        following: following.length,
      },
      unreadNotifications,
      followers: followers.map((item) => ({
        id: item.id,
        createdAt: item.createdAt,
        user: item.follower,
        isFollowing: followingBackIds.has(item.follower.id),
      })),
      following: following.map((item) => ({
        id: item.id,
        createdAt: item.createdAt,
        user: item.following,
      })),
    });
  } catch (error) {
    console.error("Profile social data error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to load your social activity.",
      },
      { status: 500 }
    );
  }
}

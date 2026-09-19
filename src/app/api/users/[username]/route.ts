import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

type RouteContext = {
  params: Promise<{ username: string }>;
};

export async function GET(
  request: Request,
  context: RouteContext
) {
  try {
    const { username } = await context.params;
    const cleanUsername = decodeURIComponent(username).trim().replace(/^@/, "");

    if (!cleanUsername) {
      return NextResponse.json(
        { success: false, error: "Username is required." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findFirst({
      where: {
        username: { equals: cleanUsername, mode: "insensitive" },
      },
      select: {
        id: true,
        name: true,
        username: true,
        image: true,
        bio: true,
        location: true,
        role: true,
        onboardingType: true,
        mechanicProfile: { select: { headline: true, about: true, skills: true, services: true, yearsExperience: true } },
        createdAt: true,
        vehicles: {
          orderBy: { createdAt: "desc" },
          include: {
            photos: { orderBy: { createdAt: "asc" } },
            modifications: {
              orderBy: { createdAt: "desc" },
              include: {
                photos: { orderBy: { createdAt: "asc" } },
                mentions: {
                  include: {
                    mentionedUser: {
                      select: { id: true, username: true, name: true, image: true },
                    },
                  },
                },
              },
            },
          },
        },
        posts: {
          orderBy: { createdAt: "desc" },
          take: 30,
        },
        _count: {
          select: {
            vehicles: true,
            posts: true,
            followers: true,
            following: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found." },
        { status: 404 }
      );
    }

    const normalizedVehicles = user.vehicles.map((vehicle) => {
      const seenUrls = new Set<string>();

      const mainPhotoUrl = vehicle.image;
      if (mainPhotoUrl) {
        seenUrls.add(mainPhotoUrl);
      }

      const photos = vehicle.photos.filter((photo) => {
        if (seenUrls.has(photo.url)) {
          return false;
        }

        seenUrls.add(photo.url);
        return true;
      });

      const modifications = vehicle.modifications.map((modification) => ({
        ...modification,
        photos: modification.photos.filter((photo) => {
          if (seenUrls.has(photo.url)) {
            return false;
          }

          seenUrls.add(photo.url);
          return true;
        }),
      }));

      return {
        ...vehicle,
        photos,
        modifications,
      };
    });

    const publicUser = {
      ...user,
      vehicles: normalizedVehicles,
    };

    const currentUser = await getCurrentUser();
    let following = false;

    if (currentUser && currentUser.id !== user.id) {
      const relation = await prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: currentUser.id,
            followingId: user.id,
          },
        },
        select: { id: true },
      });
      following = Boolean(relation);
    }

    return NextResponse.json({
      success: true,
      user: publicUser,
      following,
      isOwnProfile: currentUser?.id === user.id,
    });
  } catch (error) {
    console.error("Public user profile fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Unable to load this profile." },
      { status: 500 }
    );
  }
}

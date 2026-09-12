import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    username: string;
  }>;
};

export async function GET(
  request: Request,
  context: RouteContext
) {
  try {
    const { username } = await context.params;

    const cleanUsername = decodeURIComponent(username)
      .trim()
      .replace(/^@/, "");

    if (!cleanUsername) {
      return NextResponse.json(
        {
          success: false,
          error: "Username is required.",
        },
        { status: 400 }
      );
    }

    /*
     * =========================================================
     * FIND USERNAME CASE-INSENSITIVELY
     * =========================================================
     *
     * This allows all of these URLs to resolve to the same
     * account:
     *
     * /users/dEMIgD
     * /users/dEmigD
     * /users/demigd
     * /users/DEMiGD
     *
     * The actual username stored in the database remains
     * unchanged.
     */

    const user = await prisma.user.findFirst({
      where: {
        username: {
          equals: cleanUsername,
          mode: "insensitive",
        },
      },

      select: {
        id: true,
        name: true,
        username: true,
        image: true,
        bio: true,
        role: true,
        onboardingType: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "User not found.",
        },
        { status: 404 }
      );
    }

    /*
     * IMPORTANT:
     *
     * Return the username exactly as it exists in the database.
     * This gives the frontend the canonical capitalization.
     */
    return NextResponse.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error(
      "Public user profile fetch error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Unable to load this profile.",
      },
      { status: 500 }
    );
  }
}
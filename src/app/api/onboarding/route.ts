import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

const allowedTypes = [
  "DRIVER",
  "MECHANIC",
  "MECHANIC_SHOP",
  "DEALERSHIP",
  "EXPLORER",
] as const;

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "You must be logged in.",
        },
        { status: 401 }
      );
    }

    const body = await request.json();

    const type = body.type;

    if (!allowedTypes.includes(type)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid onboarding selection.",
        },
        { status: 400 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        onboardingType: type,
      },
      select: {
        id: true,
        name: true,
        username: true,
        onboardingType: true,
      },
    });

    return NextResponse.json({
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    console.error("Onboarding error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to save your selection.",
      },
      { status: 500 }
    );
  }
}

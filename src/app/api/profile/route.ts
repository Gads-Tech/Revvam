import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/session";

export async function GET() {
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

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        onboardingType: user.onboardingType,
        image: user.image,
        bio: user.bio,
      },
    });
  } catch (error) {
    console.error(
      "Profile fetch error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Unable to load your profile.",
      },
      { status: 500 }
    );
  }
}

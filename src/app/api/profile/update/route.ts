import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function PATCH(request: Request) {
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

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    const username =
      typeof body.username === "string"
        ? body.username.trim()
        : "";

    const bio =
      typeof body.bio === "string"
        ? body.bio.trim()
        : "";

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          error: "Name is required.",
        },
        { status: 400 }
      );
    }

    if (!username) {
      return NextResponse.json(
        {
          success: false,
          error: "Username is required.",
        },
        { status: 400 }
      );
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Username can only contain letters, numbers, and underscores.",
        },
        { status: 400 }
      );
    }

    if (username.length < 3) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Username must be at least 3 characters.",
        },
        { status: 400 }
      );
    }

    if (username.length > 30) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Username must be 30 characters or less.",
        },
        { status: 400 }
      );
    }

    if (bio.length > 500) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Bio must be 500 characters or less.",
        },
        { status: 400 }
      );
    }

    const existingUser =
      await prisma.user.findFirst({
        where: {
          username,
          NOT: {
            id: user.id,
          },
        },
        select: {
          id: true,
        },
      });

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: "That username is already taken.",
        },
        { status: 409 }
      );
    }

    const updatedUser =
      await prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          name,
          username,
          bio: bio || null,
        },
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          role: true,
          image: true,
          bio: true,
        },
      });

    return NextResponse.json({
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    console.error(
      "Profile update error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Unable to update your profile.",
      },
      { status: 500 }
    );
  }
}

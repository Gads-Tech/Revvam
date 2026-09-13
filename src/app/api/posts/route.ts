import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  try {
    const posts = await prisma.post.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        author: {
          select: {
            name: true,
            username: true,
            image: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, posts });
  } catch (error) {
    console.error("Posts fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Unable to load posts." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: "You must be logged in." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const content = typeof body.content === "string" ? body.content.trim() : "";
    const image = typeof body.image === "string" ? body.image.trim() : null;

    if (!content) {
      return NextResponse.json(
        { success: false, error: "Post content is required." },
        { status: 400 }
      );
    }

    if (content.length > 2000) {
      return NextResponse.json(
        { success: false, error: "Post is too long." },
        { status: 400 }
      );
    }

    const post = await prisma.post.create({
      data: {
        authorId: currentUser.id,
        content,
        image: image || null,
      },
      include: {
        author: {
          select: {
            name: true,
            username: true,
            image: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, post }, { status: 201 });
  } catch (error) {
    console.error("Post creation error:", error);
    return NextResponse.json(
      { success: false, error: "Unable to create post." },
      { status: 500 }
    );
  }
}

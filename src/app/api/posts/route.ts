import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    const posts = await prisma.post.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        author: { select: { name: true, username: true, image: true } },
        _count: { select: { likes: true, comments: true } },
        likes: currentUser ? { where: { userId: currentUser.id }, select: { id: true } } : false,
        mentions: { include: { mentionedUser: { select: { id: true, name: true, username: true, image: true } } } },
      },
    });
    return NextResponse.json({
      success: true,
      posts: posts.map(({ likes, ...post }) => ({ ...post, liked: Array.isArray(likes) && likes.length > 0 })),
    });
  } catch (error) {
    console.error("Posts fetch error:", error);
    return NextResponse.json({ success: false, error: "Unable to load posts." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ success: false, error: "You must be logged in." }, { status: 401 });
    const body = await request.json();
    const content = typeof body.content === "string" ? body.content.trim() : "";
    const image = typeof body.image === "string" ? body.image.trim() : null;
    const video = typeof body.video === "string" ? body.video.trim() : null;
    const mentionedUserIds = Array.isArray(body.mentionedUserIds) ? [...new Set(body.mentionedUserIds.filter((id: unknown): id is string => typeof id === "string"))] : [];

    if (!content) return NextResponse.json({ success: false, error: "Post content is required." }, { status: 400 });
    if (content.length > 2000) return NextResponse.json({ success: false, error: "Post is too long." }, { status: 400 });
    if (!image && !video) {
      // Text-only posts are valid.
    }
    if (image && image.length > 12_000_000) return NextResponse.json({ success: false, error: "Image is too large." }, { status: 400 });
    if (video && video.length > 20_000_000) return NextResponse.json({ success: false, error: "Video is too large." }, { status: 400 });
    if (mentionedUserIds.length > 20) return NextResponse.json({ success: false, error: "You can tag up to 20 people." }, { status: 400 });

    const validMentionIds = mentionedUserIds.filter((id) => id !== currentUser.id);
    const validUsers = validMentionIds.length ? await prisma.user.findMany({ where: { id: { in: validMentionIds } }, select: { id: true } }) : [];

    const post = await prisma.post.create({
      data: {
        authorId: currentUser.id,
        content,
        image: image || null,
        video: video || null,
        mentions: validUsers.length ? { create: validUsers.map((user) => ({ mentionedUserId: user.id, mentionedById: currentUser.id })) } : undefined,
      },
      include: {
        author: { select: { name: true, username: true, image: true } },
        _count: { select: { likes: true, comments: true } },
        likes: { where: { userId: currentUser.id }, select: { id: true } },
        mentions: { include: { mentionedUser: { select: { id: true, name: true, username: true, image: true } } } },
      },
    });
    const { likes, ...postData } = post;
    return NextResponse.json({ success: true, post: { ...postData, liked: likes.length > 0 } }, { status: 201 });
  } catch (error) {
    console.error("Post creation error:", error);
    return NextResponse.json({ success: false, error: "Unable to create post." }, { status: 500 });
  }
}

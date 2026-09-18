import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const revalidate = 0;
const noStore = { "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate", Pragma: "no-cache", Expires: "0" };

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mine = searchParams.get("mine") === "true";
  try {
    const currentUser = await getCurrentUser();
    const posts = await prisma.post.findMany({ where: mine && currentUser ? { authorId: currentUser.id } : undefined, orderBy: { createdAt: "desc" }, take: 50, include: { author: { select: { id: true, name: true, username: true, image: true } }, _count: { select: { likes: true, comments: true, shares: true } }, likes: currentUser ? { where: { userId: currentUser.id }, select: { id: true } } : false, mentions: { include: { mentionedUser: { select: { id: true, name: true, username: true, image: true } } } } } });
    return NextResponse.json({ success: true, posts: posts.map(({ likes, ...post }) => ({ ...post, owned: Boolean(currentUser && post.authorId === currentUser.id), liked: Array.isArray(likes) && likes.length > 0 })) }, { headers: noStore });
  } catch (error) {
    console.error("Posts fetch error:", error);
    return NextResponse.json({ success: false, error: "Unable to load posts." }, { status: 500, headers: noStore });
  }
}

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ success: false, error: "You must be logged in." }, { status: 401, headers: noStore });
    const body = await request.json();
    const content = typeof body.content === "string" ? body.content.trim() : "";
    const image = typeof body.image === "string" ? body.image.trim() : null;
    const video = typeof body.video === "string" ? body.video.trim() : null;
    const mentionedUserIds: string[] = Array.isArray(body.mentionedUserIds) ? Array.from(new Set(body.mentionedUserIds.filter((id: unknown): id is string => typeof id === "string"))) : [];
    if (!content) return NextResponse.json({ success: false, error: "Post content is required." }, { status: 400, headers: noStore });
    if (content.length > 2000) return NextResponse.json({ success: false, error: "Post is too long." }, { status: 400, headers: noStore });
    if (image && image.length > 12_000_000) return NextResponse.json({ success: false, error: "Image is too large." }, { status: 400, headers: noStore });
    if (video && video.length > 20_000_000) return NextResponse.json({ success: false, error: "Video is too large." }, { status: 400, headers: noStore });
    if (mentionedUserIds.length > 20) return NextResponse.json({ success: false, error: "You can tag up to 20 people." }, { status: 400, headers: noStore });

    const validMentionIds = mentionedUserIds.filter((id) => id !== currentUser.id);
    const validUsers = validMentionIds.length ? await prisma.user.findMany({ where: { id: { in: validMentionIds } }, select: { id: true, username: true } }) : [];
    const post = await prisma.post.create({
      data: { authorId: currentUser.id, content, image: image || null, video: video || null, mentions: validUsers.length ? { create: validUsers.map((user) => ({ mentionedUserId: user.id, mentionedById: currentUser.id })) } : undefined },
      include: { author: { select: { name: true, username: true, image: true } }, _count: { select: { likes: true, comments: true, shares: true } }, likes: { where: { userId: currentUser.id }, select: { id: true } }, mentions: { include: { mentionedUser: { select: { id: true, name: true, username: true, image: true } } } } },
    });

    if (validUsers.length) {
      await prisma.notification.createMany({ data: validUsers.map((mentionedUser) => ({ userId: mentionedUser.id, actorId: currentUser.id, type: "POST_MENTION" as const, title: "You were tagged", body: `@${currentUser.username} tagged you in a post.`, href: `/posts/${post.id}` })) });
    }

    const { likes, ...postData } = post;
    return NextResponse.json({ success: true, post: { ...postData, owned: true, liked: likes.length > 0 } }, { status: 201, headers: noStore });
  } catch (error) {
    console.error("Post creation error:", error);
    return NextResponse.json({ success: false, error: "Unable to create post." }, { status: 500, headers: noStore });
  }
}

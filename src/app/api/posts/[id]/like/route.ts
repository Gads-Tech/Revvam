import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const revalidate = 0;
const noStore = { "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate", Pragma: "no-cache", Expires: "0" };

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const post = await prisma.post.findUnique({ where: { id }, select: { id: true } });
  if (!post) return NextResponse.json({ success: false, error: "Post not found." }, { status: 404, headers: noStore });
  const [likes, comments, shares, liked] = await Promise.all([
    prisma.postLike.count({ where: { postId: id } }),
    prisma.postComment.count({ where: { postId: id } }),
    prisma.postShare.count({ where: { postId: id } }),
    user ? prisma.postLike.findUnique({ where: { postId_userId: { postId: id, userId: user.id } }, select: { id: true } }) : null,
  ]);
  return NextResponse.json({ success: true, liked: Boolean(liked), likes, comments, shares }, { headers: noStore });
}

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: "You must be logged in." }, { status: 401, headers: noStore });
  const { id } = await params;
  const post = await prisma.post.findUnique({ where: { id }, select: { id: true, authorId: true } });
  if (!post) return NextResponse.json({ success: false, error: "Post not found." }, { status: 404, headers: noStore });
  const existing = await prisma.postLike.findUnique({ where: { postId_userId: { postId: id, userId: user.id } } });
  if (existing) {
    await prisma.postLike.delete({ where: { id: existing.id } });
  } else {
    await prisma.postLike.create({ data: { postId: id, userId: user.id } });
    if (post.authorId !== user.id) {
      await prisma.notification.create({ data: { userId: post.authorId, actorId: user.id, type: "POST_LIKE", title: "New like", body: `@${user.username} liked your post.`, href: `/posts/${id}` } });
    }
  }
  const [likes, comments, shares] = await Promise.all([
    prisma.postLike.count({ where: { postId: id } }),
    prisma.postComment.count({ where: { postId: id } }),
    prisma.postShare.count({ where: { postId: id } }),
  ]);
  return NextResponse.json({ success: true, liked: !existing, likes, comments, shares }, { headers: noStore });
}

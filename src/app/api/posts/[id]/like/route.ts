import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: "You must be logged in." }, { status: 401 });
  const { id } = await params;
  const post = await prisma.post.findUnique({ where: { id }, select: { id: true, authorId: true } });
  if (!post) return NextResponse.json({ success: false, error: "Post not found." }, { status: 404 });
  const existing = await prisma.postLike.findUnique({ where: { postId_userId: { postId: id, userId: user.id } } });
  if (existing) await prisma.postLike.delete({ where: { id: existing.id } });
  else await prisma.postLike.create({ data: { postId: id, userId: user.id } });
  const likes = await prisma.postLike.count({ where: { postId: id } });
  return NextResponse.json({ success: true, liked: !existing, likes });
}
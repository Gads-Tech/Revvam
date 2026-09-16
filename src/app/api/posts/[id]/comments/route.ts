import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const comments = await prisma.postComment.findMany({ where: { postId: id }, orderBy: { createdAt: "asc" }, include: { author: { select: { name: true, username: true, image: true } } } });
  return NextResponse.json({ success: true, comments });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: "You must be logged in." }, { status: 401 });
  const { id } = await params;
  const body = await request.json();
  const content = typeof body.content === "string" ? body.content.trim() : "";
  if (!content) return NextResponse.json({ success: false, error: "Comment cannot be empty." }, { status: 400 });
  if (content.length > 1000) return NextResponse.json({ success: false, error: "Comment is too long." }, { status: 400 });
  const post = await prisma.post.findUnique({ where: { id }, select: { id: true } });
  if (!post) return NextResponse.json({ success: false, error: "Post not found." }, { status: 404 });
  const comment = await prisma.postComment.create({ data: { postId: id, authorId: user.id, content }, include: { author: { select: { name: true, username: true, image: true } } } });
  return NextResponse.json({ success: true, comment }, { status: 201 });
}
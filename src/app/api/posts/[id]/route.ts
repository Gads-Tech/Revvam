import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate", Pragma: "no-cache", Expires: "0" };

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ success: false, error: "You must be logged in." }, { status: 401, headers: noStore });
    const { id } = await params;
    const body = await request.json();
    const content = typeof body.content === "string" ? body.content.trim() : "";
    if (!content) return NextResponse.json({ success: false, error: "Post content is required." }, { status: 400, headers: noStore });
    if (content.length > 2000) return NextResponse.json({ success: false, error: "Post is too long." }, { status: 400, headers: noStore });
    const existing = await prisma.post.findUnique({ where: { id }, select: { authorId: true } });
    if (!existing) return NextResponse.json({ success: false, error: "Post not found." }, { status: 404, headers: noStore });
    if (existing.authorId !== currentUser.id) return NextResponse.json({ success: false, error: "You can only edit your own posts." }, { status: 403, headers: noStore });
    const post = await prisma.post.update({ where: { id }, data: { content }, include: { author: { select: { id: true, name: true, username: true, image: true } }, _count: { select: { likes: true, comments: true, shares: true } } } });
    return NextResponse.json({ success: true, post: { ...post, liked: false } }, { headers: noStore });
  } catch (error) {
    console.error("Post update error:", error);
    return NextResponse.json({ success: false, error: "Unable to update post." }, { status: 500, headers: noStore });
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ success: false, error: "You must be logged in." }, { status: 401, headers: noStore });
    const { id } = await params;
    const existing = await prisma.post.findUnique({ where: { id }, select: { authorId: true } });
    if (!existing) return NextResponse.json({ success: false, error: "Post not found." }, { status: 404, headers: noStore });
    if (existing.authorId !== currentUser.id) return NextResponse.json({ success: false, error: "You can only delete your own posts." }, { status: 403, headers: noStore });
    await prisma.post.delete({ where: { id } });
    return NextResponse.json({ success: true }, { headers: noStore });
  } catch (error) {
    console.error("Post delete error:", error);
    return NextResponse.json({ success: false, error: "Unable to delete post." }, { status: 500, headers: noStore });
  }
}

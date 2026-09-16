import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const revalidate = 0;
const noStore = { "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate", Pragma: "no-cache", Expires: "0" };

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: "You must be logged in." }, { status: 401, headers: noStore });
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const channel = body?.channel === "EXTERNAL" ? "EXTERNAL" : "REVVAM";
  const post = await prisma.post.findUnique({ where: { id }, select: { id: true, authorId: true } });
  if (!post) return NextResponse.json({ success: false, error: "Post not found." }, { status: 404, headers: noStore });

  await prisma.postShare.create({ data: { postId: id, userId: user.id, channel } });

  if (post.authorId !== user.id && channel === "REVVAM") {
    await prisma.notification.create({ data: { userId: post.authorId, actorId: user.id, type: "POST_SHARE", title: "Post shared", body: `@${user.username} shared your post.`, href: `/posts/${id}` } });
  }

  const shares = await prisma.postShare.count({ where: { postId: id } });
  return NextResponse.json({ success: true, shares }, { headers: noStore });
}

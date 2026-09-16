import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const revalidate = 0;
const noStore = { "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate", Pragma: "no-cache", Expires: "0" };
const authorSelect = { id: true, name: true, username: true, image: true } as const;

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const currentUser = await getCurrentUser();
  const comments = await prisma.postComment.findMany({ where: { postId: id }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], include: { author: { select: authorSelect }, parent: { select: { id: true, parentId: true, author: { select: { username: true } } } } } });
  return NextResponse.json({ success: true, currentUserId: currentUser?.id ?? null, comments }, { headers: noStore });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: "You must be logged in." }, { status: 401, headers: noStore });
  const { id } = await params;
  const body = await request.json();
  const content = typeof body.content === "string" ? body.content.trim() : "";
  const requestedParentId = typeof body.parentId === "string" && body.parentId.trim() ? body.parentId.trim() : null;
  if (!content) return NextResponse.json({ success: false, error: "Comment cannot be empty." }, { status: 400, headers: noStore });
  if (content.length > 1000) return NextResponse.json({ success: false, error: "Comment is too long." }, { status: 400, headers: noStore });
  const post = await prisma.post.findUnique({ where: { id }, select: { id: true, authorId: true } });
  if (!post) return NextResponse.json({ success: false, error: "Post not found." }, { status: 404, headers: noStore });

  let parent: { id: string; postId: string; authorId: string; author: { username: string }; parentId: string | null } | null = null;
  if (requestedParentId) {
    parent = await prisma.postComment.findUnique({ where: { id: requestedParentId }, select: { id: true, postId: true, authorId: true, parentId: true, author: { select: { username: true } } } });
    if (!parent || parent.postId !== id) return NextResponse.json({ success: false, error: "Comment to reply to was not found." }, { status: 404, headers: noStore });
  }

  const parentId = parent?.id ?? null;
  const comment = await prisma.postComment.create({ data: { postId: id, authorId: user.id, content, parentId }, include: { author: { select: authorSelect }, parent: { select: { id: true, parentId: true, author: { select: { username: true } } } } } });

  const notifications: { userId: string; actorId: string; type: "POST_COMMENT"; title: string; body: string; href: string }[] = [];
  const recipients = new Set<string>();
  if (post.authorId !== user.id) recipients.add(post.authorId);
  if (parent && parent.authorId !== user.id) recipients.add(parent.authorId);
  for (const userId of recipients) notifications.push({ userId, actorId: user.id, type: "POST_COMMENT", title: parent ? "New comment reply" : "New comment", body: parent ? `@${user.username} replied to your comment.` : `@${user.username} commented on your post.`, href: `/posts/${id}?comment=${encodeURIComponent(comment.id)}#comment-${encodeURIComponent(comment.id)}` });
  if (notifications.length) await prisma.notification.createMany({ data: notifications });
  return NextResponse.json({ success: true, comment }, { status: 201, headers: noStore });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: "You must be logged in." }, { status: 401, headers: noStore });
  const { id: postId } = await params;
  const body = await request.json().catch(() => ({}));
  const commentId = typeof body.commentId === "string" ? body.commentId : "";
  if (!commentId) return NextResponse.json({ success: false, error: "Comment not specified." }, { status: 400, headers: noStore });
  const comment = await prisma.postComment.findUnique({ where: { id: commentId }, select: { id: true, postId: true, authorId: true } });
  if (!comment || comment.postId !== postId) return NextResponse.json({ success: false, error: "Comment not found." }, { status: 404, headers: noStore });
  if (comment.authorId !== user.id) return NextResponse.json({ success: false, error: "You can only delete your own comments." }, { status: 403, headers: noStore });
  await prisma.postComment.delete({ where: { id: commentId } });
  return NextResponse.json({ success: true, commentId }, { headers: noStore });
}

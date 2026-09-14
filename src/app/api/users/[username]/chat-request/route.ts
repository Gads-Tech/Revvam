import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

function directKey(firstId: string, secondId: string) {
  return [firstId, secondId].sort().join(":");
}

export async function GET(request: Request, context: { params: Promise<{ username: string }> }) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const { username } = await context.params;
  const target = await prisma.user.findUnique({ where: { username }, select: { id: true, username: true } });
  if (!target) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
  if (target.id === currentUser.id) return NextResponse.json({ success: true, status: "SELF" });

  const conversation = await prisma.conversation.findUnique({ where: { directKey: directKey(currentUser.id, target.id) }, select: { id: true } });
  if (conversation) return NextResponse.json({ success: true, status: "ACCEPTED", conversationId: conversation.id });

  const sent = await prisma.chatRequest.findUnique({ where: { senderId_recipientId: { senderId: currentUser.id, recipientId: target.id } }, select: { id: true, status: true } });
  if (sent?.status === "PENDING") return NextResponse.json({ success: true, status: "PENDING_SENT", requestId: sent.id });
  if (sent?.status === "DECLINED") return NextResponse.json({ success: true, status: "DECLINED", requestId: sent.id });

  const received = await prisma.chatRequest.findUnique({ where: { senderId_recipientId: { senderId: target.id, recipientId: currentUser.id } }, select: { id: true, status: true } });
  if (received?.status === "PENDING") return NextResponse.json({ success: true, status: "PENDING_RECEIVED", requestId: received.id });
  if (received?.status === "DECLINED") return NextResponse.json({ success: true, status: "DECLINED_BY_TARGET", requestId: received.id });

  return NextResponse.json({ success: true, status: "NONE" });
}

export async function POST(request: Request, context: { params: Promise<{ username: string }> }) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const { username } = await context.params;
  const target = await prisma.user.findUnique({ where: { username } });
  if (!target) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
  if (target.id === currentUser.id) return NextResponse.json({ success: false, error: "You cannot message yourself." }, { status: 400 });

  const key = directKey(currentUser.id, target.id);
  const conversation = await prisma.conversation.findUnique({ where: { directKey: key }, select: { id: true } });
  if (conversation) return NextResponse.json({ success: true, status: "ACCEPTED", conversationId: conversation.id });

  const reverse = await prisma.chatRequest.findUnique({ where: { senderId_recipientId: { senderId: target.id, recipientId: currentUser.id } }, select: { id: true, status: true } });
  if (reverse?.status === "PENDING") {
    return NextResponse.json({ success: false, error: "This user has already sent you a chat request. Check your notifications to accept it." }, { status: 409 });
  }

  const existing = await prisma.chatRequest.findUnique({ where: { senderId_recipientId: { senderId: currentUser.id, recipientId: target.id } } });
  const chatRequest = existing
    ? await prisma.chatRequest.update({ where: { id: existing.id }, data: { status: "PENDING" } })
    : await prisma.chatRequest.create({ data: { senderId: currentUser.id, recipientId: target.id } });

  await prisma.notification.upsert({
    where: { chatRequestId: chatRequest.id },
    create: {
      userId: target.id,
      actorId: currentUser.id,
      type: "CHAT_REQUEST",
      title: "New chat request",
      body: `${currentUser.name} wants to chat with you.`,
      href: "/profile/notifications",
      chatRequestId: chatRequest.id,
    },
    update: {
      userId: target.id,
      actorId: currentUser.id,
      type: "CHAT_REQUEST",
      title: "New chat request",
      body: `${currentUser.name} wants to chat with you.`,
      href: "/profile/notifications",
      readAt: null,
    },
  });

  return NextResponse.json({ success: true, status: "PENDING_SENT", requestId: chatRequest.id });
}

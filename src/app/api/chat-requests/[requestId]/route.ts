import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

function directKey(firstId: string, secondId: string) {
  return [firstId, secondId].sort().join(":");
}

export async function PATCH(request: Request, context: { params: Promise<{ requestId: string }> }) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const { requestId } = await context.params;
  const body = await request.json().catch(() => ({}));
  const action = body?.action;
  if (action !== "accept" && action !== "decline") return NextResponse.json({ success: false, error: "Invalid action." }, { status: 400 });

  const chatRequest = await prisma.chatRequest.findUnique({
    where: { id: requestId },
    include: {
      sender: { select: { id: true, name: true, username: true, image: true } },
      recipient: { select: { id: true, name: true, username: true } },
    },
  });

  if (!chatRequest || chatRequest.recipientId !== currentUser.id) return NextResponse.json({ success: false, error: "Chat request not found." }, { status: 404 });
  if (chatRequest.status !== "PENDING") return NextResponse.json({ success: false, error: "This request has already been handled." }, { status: 409 });

  if (action === "decline") {
    await prisma.$transaction([
      prisma.chatRequest.update({ where: { id: requestId }, data: { status: "DECLINED" } }),
      prisma.notification.updateMany({ where: { chatRequestId: requestId, userId: currentUser.id }, data: { readAt: new Date() } }),
    ]);
    return NextResponse.json({ success: true, status: "DECLINED" });
  }

  const conversation = await prisma.$transaction(async (tx) => {
    const existingConversation = await tx.conversation.upsert({
      where: { directKey: directKey(chatRequest.senderId, chatRequest.recipientId) },
      create: { directKey: directKey(chatRequest.senderId, chatRequest.recipientId) },
      update: {},
    });

    await tx.conversationMember.createMany({
      data: [
        { conversationId: existingConversation.id, userId: chatRequest.senderId },
        { conversationId: existingConversation.id, userId: chatRequest.recipientId },
      ],
      skipDuplicates: true,
    });

    if (chatRequest.message) {
      await tx.message.create({ data: { conversationId: existingConversation.id, senderId: chatRequest.senderId, content: chatRequest.message } });
      await tx.conversation.update({ where: { id: existingConversation.id }, data: { updatedAt: new Date() } });
    }

    await tx.chatRequest.update({ where: { id: requestId }, data: { status: "ACCEPTED" } });
    await tx.notification.updateMany({ where: { chatRequestId: requestId, userId: currentUser.id }, data: { readAt: new Date() } });
    await tx.notification.create({
      data: {
        userId: chatRequest.senderId,
        actorId: currentUser.id,
        type: "CHAT_ACCEPTED",
        title: "Chat request accepted",
        body: `${currentUser.name} accepted your chat request.`,
        href: `/messages/${encodeURIComponent(currentUser.username)}`,
      },
    });

    return existingConversation;
  });

  return NextResponse.json({ success: true, status: "ACCEPTED", conversationId: conversation.id });
}

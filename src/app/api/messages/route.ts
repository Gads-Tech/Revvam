import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

function directKey(firstId: string, secondId: string) {
  return [firstId, secondId].sort().join(":");
}

async function receiptVisible(ownerId: string, targetId: string) {
  const owner = await prisma.user.findUnique({ where: { id: ownerId }, select: { readReceiptsEnabled: true } });
  const override = await prisma.readReceiptPreference.findUnique({ where: { ownerId_targetId: { ownerId, targetId } }, select: { enabled: true } });
  return override?.enabled ?? owner?.readReceiptsEnabled ?? true;
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: "You must be logged in." }, { status: 401 });

    const conversations = await prisma.conversation.findMany({
      where: { members: { some: { userId: user.id } } },
      orderBy: { updatedAt: "desc" },
      include: {
        members: { include: { user: { select: { id: true, name: true, username: true, image: true } } } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });

    const mapped = await Promise.all(conversations.map(async (conversation) => {
      const otherUser = conversation.members.find((member) => member.userId !== user.id)?.user ?? null;
      const lastMessage = conversation.messages[0] ?? null;
      const visible = otherUser ? await receiptVisible(otherUser.id, user.id) : false;
      return {
        id: conversation.id,
        updatedAt: conversation.updatedAt,
        otherUser,
        lastMessage: lastMessage ? {
          content: lastMessage.content,
          createdAt: lastMessage.createdAt,
          senderId: lastMessage.senderId,
          opened: lastMessage.senderId === user.id ? Boolean(lastMessage.readAt && visible) : false,
        } : null,
        unreadCount: await prisma.message.count({ where: { conversationId: conversation.id, senderId: { not: user.id }, readAt: null } }),
      };
    }));

    return NextResponse.json({ success: true, conversations: mapped });
  } catch (error) {
    console.error("Messages list error:", error);
    return NextResponse.json({ success: false, error: "Unable to load messages." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: "You must be logged in." }, { status: 401 });

    const body = await request.json();
    const recipientUsername = typeof body?.recipientUsername === "string" ? body.recipientUsername.trim() : "";
    const content = typeof body?.content === "string" ? body.content.trim() : "";
    if (!recipientUsername || !content) return NextResponse.json({ success: false, error: "Recipient and message are required." }, { status: 400 });

    const recipient = await prisma.user.findUnique({ where: { username: recipientUsername }, select: { id: true, username: true } });
    if (!recipient) return NextResponse.json({ success: false, error: "User not found." }, { status: 404 });
    if (recipient.id === user.id) return NextResponse.json({ success: false, error: "You cannot message yourself." }, { status: 400 });

    const key = directKey(user.id, recipient.id);
    let conversation = await prisma.conversation.findUnique({ where: { directKey: key }, select: { id: true } });

    if (!conversation) {
      const acceptedRequest = await prisma.chatRequest.findFirst({
        where: { status: "ACCEPTED", OR: [{ senderId: user.id, recipientId: recipient.id }, { senderId: recipient.id, recipientId: user.id }] },
        select: { id: true },
      });
      if (!acceptedRequest) return NextResponse.json({ success: false, error: "You need an accepted chat request before starting a private conversation." }, { status: 403 });

      conversation = await prisma.conversation.create({ data: { directKey: key }, select: { id: true } });
      await prisma.conversationMember.createMany({ data: [{ conversationId: conversation.id, userId: user.id }, { conversationId: conversation.id, userId: recipient.id }], skipDuplicates: true });
    }

    const message = await prisma.message.create({ data: { conversationId: conversation.id, senderId: user.id, content } });
    await prisma.conversation.update({ where: { id: conversation.id }, data: { updatedAt: new Date() } });

    // Messages are represented by the Messages inbox/count, never by the Notifications center.
    return NextResponse.json({ success: true, conversationId: conversation.id, message });
  } catch (error) {
    console.error("Create message error:", error);
    return NextResponse.json({ success: false, error: "Unable to send message." }, { status: 500 });
  }
}

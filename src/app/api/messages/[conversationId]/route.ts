import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

type RouteContext = { params: Promise<{ conversationId: string }> };

async function isMember(conversationId: string, userId: string) {
  return prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: "You must be logged in." }, { status: 401 });

    const { conversationId } = await context.params;
    const membership = await isMember(conversationId, user.id);
    if (!membership) return NextResponse.json({ success: false, error: "Conversation not found." }, { status: 404 });

    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
      take: 200,
      include: {
        sender: { select: { id: true, name: true, username: true, image: true } },
      },
    });

    await prisma.message.updateMany({
      where: { conversationId, senderId: { not: user.id }, readAt: null },
      data: { readAt: new Date() },
    });

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        members: {
          where: { userId: { not: user.id } },
          include: { user: { select: { id: true, name: true, username: true, image: true } } },
        },
      },
    });

    return NextResponse.json({
      success: true,
      messages,
      otherUser: conversation?.members[0]?.user ?? null,
    });
  } catch (error) {
    console.error("Conversation load error:", error);
    return NextResponse.json({ success: false, error: "Unable to load conversation." }, { status: 500 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: "You must be logged in." }, { status: 401 });

    const { conversationId } = await context.params;
    const membership = await isMember(conversationId, user.id);
    if (!membership) return NextResponse.json({ success: false, error: "Conversation not found." }, { status: 404 });

    const body = await request.json();
    const content = typeof body.content === "string" ? body.content.trim() : "";
    if (!content) return NextResponse.json({ success: false, error: "Message cannot be empty." }, { status: 400 });
    if (content.length > 2000) return NextResponse.json({ success: false, error: "Message must be 2000 characters or less." }, { status: 400 });

    const recipient = await prisma.conversationMember.findFirst({
      where: { conversationId, userId: { not: user.id } },
      select: { userId: true },
    });

    if (!recipient) return NextResponse.json({ success: false, error: "Recipient not found." }, { status: 404 });

    const message = await prisma.$transaction(async (tx) => {
      const created = await tx.message.create({
        data: { conversationId, senderId: user.id, content },
        include: { sender: { select: { id: true, name: true, username: true, image: true } } },
      });

      await tx.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });

      await tx.notification.create({
        data: {
          userId: recipient.userId,
          actorId: user.id,
          type: "MESSAGE",
          title: "New message",
          body: `@${user.username} sent you a message.`,
          href: `/messages?conversation=${conversationId}`,
        },
      });

      return created;
    });

    return NextResponse.json({ success: true, message });
  } catch (error) {
    console.error("Send message error:", error);
    return NextResponse.json({ success: false, error: "Unable to send message." }, { status: 500 });
  }
}

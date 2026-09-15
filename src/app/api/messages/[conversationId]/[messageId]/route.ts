import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

type RouteContext = { params: Promise<{ conversationId: string; messageId: string }> };

const DELETE_FOR_BOTH_MS = 2 * 60 * 1000;

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: "You must be logged in." }, { status: 401 });

    const { conversationId, messageId } = await context.params;
    const member = await prisma.conversationMember.findUnique({ where: { conversationId_userId: { conversationId, userId: user.id } } });
    if (!member) return NextResponse.json({ success: false, error: "Conversation not found." }, { status: 404 });

    const message = await prisma.message.findFirst({ where: { id: messageId, conversationId }, select: { id: true, senderId: true, createdAt: true } });
    if (!message) return NextResponse.json({ success: false, error: "Message not found." }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const mode = body.mode === "both" ? "both" : "me";

    if (mode === "both" && message.senderId !== user.id) {
      return NextResponse.json({ success: false, error: "You can only delete your own sent messages for both." }, { status: 403 });
    }

    if (mode === "both" && Date.now() - message.createdAt.getTime() > DELETE_FOR_BOTH_MS) {
      return NextResponse.json({ success: false, error: "Messages can only be deleted for both within 2 minutes." }, { status: 409 });
    }

    if (mode === "both") {
      await prisma.message.delete({ where: { id: message.id } });
      return NextResponse.json({ success: true, mode: "both" });
    }

    await prisma.messageDeletion.upsert({
      where: { messageId_userId: { messageId: message.id, userId: user.id } },
      create: { messageId: message.id, userId: user.id },
      update: { deletedAt: new Date() },
    });

    return NextResponse.json({ success: true, mode: "me" });
  } catch (error) {
    console.error("Delete message error:", error);
    return NextResponse.json({ success: false, error: "Unable to delete message." }, { status: 500 });
  }
}

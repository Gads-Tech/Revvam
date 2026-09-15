import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

type RouteContext = { params: Promise<{ conversationId: string }> };

async function isMember(conversationId: string, userId: string) {
  return prisma.conversationMember.findUnique({ where: { conversationId_userId: { conversationId, userId } } });
}

async function receiptEnabled(ownerId: string, targetId: string) {
  const owner = await prisma.user.findUnique({ where: { id: ownerId }, select: { readReceiptsEnabled: true } });
  const override = await prisma.readReceiptPreference.findUnique({ where: { ownerId_targetId: { ownerId, targetId } }, select: { enabled: true } });
  return override?.enabled ?? owner?.readReceiptsEnabled ?? true;
}

const messageInclude = {
  sender: { select: { id: true, name: true, username: true, image: true } },
  replyTo: { select: { id: true, content: true, senderId: true, sender: { select: { id: true, name: true, username: true } } } },
} as const;

const noStoreHeaders = { "Cache-Control": "no-store, max-age=0, must-revalidate" };

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: "You must be logged in." }, { status: 401, headers: noStoreHeaders });

    const { conversationId } = await context.params;
    if (!(await isMember(conversationId, user.id))) return NextResponse.json({ success: false, error: "Conversation not found." }, { status: 404, headers: noStoreHeaders });

    const url = new URL(request.url);
    const markRead = url.searchParams.get("markRead") === "1";

    // These reads do not depend on each other, so run them together. This is
    // especially important on mobile where a slow sequential poll can miss the
    // next polling window.
    const [conversation, messages, unreadBeforeOpen] = await Promise.all([
      prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
          members: {
            where: { userId: { not: user.id } },
            include: { user: { select: { id: true, name: true, username: true, image: true } } },
          },
        },
      }),
      prisma.message.findMany({
        where: { conversationId, deletions: { none: { userId: user.id } } },
        orderBy: { createdAt: "asc" },
        take: 200,
        include: messageInclude,
      }),
      prisma.message.count({
        where: { conversationId, senderId: { not: user.id }, readAt: null, deletions: { none: { userId: user.id } } },
      }),
    ]);

    const otherUser = conversation?.members[0]?.user ?? null;
    const canShowReceipt = otherUser ? await receiptEnabled(otherUser.id, user.id) : false;

    if (markRead) {
      await prisma.$transaction([
        prisma.message.updateMany({ where: { conversationId, senderId: { not: user.id }, readAt: null }, data: { readAt: new Date() } }),
        prisma.notification.updateMany({ where: { userId: user.id, actorId: otherUser?.id, type: "MESSAGE", readAt: null }, data: { readAt: new Date() } }),
      ]);
    }

    return NextResponse.json({
      success: true,
      currentUserId: user.id,
      messages: messages.map((message) => ({ ...message, opened: message.senderId === user.id ? Boolean(message.readAt && canShowReceipt) : false })),
      otherUser,
      readReceiptsEnabledForOtherUser: canShowReceipt,
      unreadBeforeOpen: markRead ? unreadBeforeOpen : 0,
      unreadCount: markRead ? 0 : unreadBeforeOpen,
    }, { headers: noStoreHeaders });
  } catch (error) {
    console.error("Conversation load error:", error);
    return NextResponse.json({ success: false, error: "Unable to load conversation." }, { status: 500, headers: noStoreHeaders });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: "You must be logged in." }, { status: 401, headers: noStoreHeaders });
    const { conversationId } = await context.params;
    if (!(await isMember(conversationId, user.id))) return NextResponse.json({ success: false, error: "Conversation not found." }, { status: 404, headers: noStoreHeaders });

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { members: { where: { userId: { not: user.id } }, select: { userId: true } } },
    });
    const otherUserId = conversation?.members[0]?.userId;
    await prisma.$transaction([
      prisma.message.updateMany({ where: { conversationId, senderId: { not: user.id }, readAt: null }, data: { readAt: new Date() } }),
      prisma.notification.updateMany({ where: { userId: user.id, actorId: otherUserId, type: "MESSAGE", readAt: null }, data: { readAt: new Date() } }),
    ]);
    return NextResponse.json({ success: true, unreadCount: 0 }, { headers: noStoreHeaders });
  } catch (error) {
    console.error("Mark messages read error:", error);
    return NextResponse.json({ success: false, error: "Unable to mark messages as read." }, { status: 500, headers: noStoreHeaders });
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: "You must be logged in." }, { status: 401, headers: noStoreHeaders });
    const { conversationId } = await context.params;
    if (!(await isMember(conversationId, user.id))) return NextResponse.json({ success: false, error: "Conversation not found." }, { status: 404, headers: noStoreHeaders });

    const body = await request.json().catch(() => ({}));
    const content = typeof body.content === "string" ? body.content.trim() : "";
    const replyToId = typeof body.replyToId === "string" ? body.replyToId : null;
    if (!content) return NextResponse.json({ success: false, error: "Message cannot be empty." }, { status: 400, headers: noStoreHeaders });
    if (content.length > 2000) return NextResponse.json({ success: false, error: "Message must be 2000 characters or less." }, { status: 400, headers: noStoreHeaders });

    const recipient = await prisma.conversationMember.findFirst({ where: { conversationId, userId: { not: user.id } }, select: { userId: true } });
    if (!recipient) return NextResponse.json({ success: false, error: "Recipient not found." }, { status: 404, headers: noStoreHeaders });

    let validReplyToId: string | null = null;
    if (replyToId) {
      const replyTarget = await prisma.message.findFirst({ where: { id: replyToId, conversationId }, select: { id: true } });
      if (!replyTarget) return NextResponse.json({ success: false, error: "Reply target not found." }, { status: 400, headers: noStoreHeaders });
      validReplyToId = replyTarget.id;
    }

    const message = await prisma.$transaction(async (tx) => {
      const created = await tx.message.create({ data: { conversationId, senderId: user.id, content, replyToId: validReplyToId }, include: messageInclude });
      await tx.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
      return created;
    });

    return NextResponse.json({ success: true, message }, { headers: noStoreHeaders });
  } catch (error) {
    console.error("Send message error:", error);
    return NextResponse.json({ success: false, error: "Unable to send message." }, { status: 500, headers: noStoreHeaders });
  }
}

import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

function directKey(a: string, b: string) {
  return [a, b].sort().join(":");
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "You must be logged in." }, { status: 401 });
    }

    const memberships = await prisma.conversationMember.findMany({
      where: { userId: user.id },
      include: {
        conversation: {
          include: {
            members: {
              where: { userId: { not: user.id } },
              include: {
                user: { select: { id: true, name: true, username: true, image: true } },
              },
            },
            messages: { orderBy: { createdAt: "desc" }, take: 1 },
          },
        },
      },
    });

    const conversations = memberships
      .map(({ conversation }) => ({
        id: conversation.id,
        updatedAt: conversation.updatedAt,
        user: conversation.members[0]?.user ?? null,
        lastMessage: conversation.messages[0] ?? null,
      }))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    return NextResponse.json({ success: true, conversations });
  } catch (error) {
    console.error("Messages list error:", error);
    return NextResponse.json({ success: false, error: "Unable to load messages." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "You must be logged in." }, { status: 401 });
    }

    const body = await request.json();
    const username = typeof body.username === "string" ? body.username.trim().replace(/^@/, "") : "";

    if (!username) {
      return NextResponse.json({ success: false, error: "Username is required." }, { status: 400 });
    }

    const target = await prisma.user.findFirst({
      where: { username: { equals: username, mode: "insensitive" } },
      select: { id: true, name: true, username: true, image: true },
    });

    if (!target) {
      return NextResponse.json({ success: false, error: "User not found." }, { status: 404 });
    }

    if (target.id === user.id) {
      return NextResponse.json({ success: false, error: "You cannot message yourself." }, { status: 400 });
    }

    const key = directKey(user.id, target.id);
    let conversation = await prisma.conversation.findUnique({
      where: { directKey: key },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          directKey: key,
          members: {
            create: [{ userId: user.id }, { userId: target.id }],
          },
        },
      });
    }

    return NextResponse.json({ success: true, conversationId: conversation.id, user: target });
  } catch (error) {
    console.error("Create conversation error:", error);
    return NextResponse.json({ success: false, error: "Unable to start conversation." }, { status: 500 });
  }
}

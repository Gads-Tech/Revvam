import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: "You must be logged in." }, { status: 401 });
    const body = await request.json();
    const action = body.action;
    const targetId = String(body.targetId ?? "");
    if (!targetId || targetId === user.id) return NextResponse.json({ success: false, error: "Invalid target." }, { status: 400 });

    if (action === "block") {
      const target = await prisma.user.findUnique({ where: { id: targetId }, select: { id: true } });
      if (!target) return NextResponse.json({ success: false, error: "User not found." }, { status: 404 });
      await prisma.block.upsert({ where: { blockerId_blockedId: { blockerId: user.id, blockedId: targetId } }, update: {}, create: { blockerId: user.id, blockedId: targetId } });
      return NextResponse.json({ success: true, action: "blocked" });
    }

    if (action === "unblock") {
      await prisma.block.deleteMany({ where: { blockerId: user.id, blockedId: targetId } });
      return NextResponse.json({ success: true, action: "unblocked" });
    }

    if (action === "report") {
      const reason = String(body.reason ?? "Other").slice(0, 120);
      const details = typeof body.details === "string" ? body.details.trim().slice(0, 1000) : null;
      const report = await prisma.report.create({ data: { reporterId: user.id, targetId, reason, details } });
      return NextResponse.json({ success: true, reportId: report.id });
    }

    return NextResponse.json({ success: false, error: "Unknown trust action." }, { status: 400 });
  } catch {
    return NextResponse.json({ success: false, error: "Unable to complete that action." }, { status: 500 });
  }
}
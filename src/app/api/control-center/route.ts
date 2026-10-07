import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireSuperAdmin } from "@/lib/admin";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.authorized) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [users, posts, comments, reports, emergencies, logs] = await Promise.all([
    prisma.user.count(),
    prisma.post.count(),
    prisma.postComment.count(),
    prisma.report.count({ where: { status: "OPEN" } }),
    prisma.emergencyRequest.count({ where: { status: { in: ["OPEN", "OFFERS_RECEIVED"] } } }),
    prisma.adminAuditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 25,
      include: { actor: { select: { username: true, name: true } }, targetUser: { select: { username: true, name: true } } },
    }),
  ]);

  return NextResponse.json({
    stats: { users, posts, comments, reports, emergencies },
    superAdmin: auth.user.role === "SUPER_ADMIN",
    logs,
  });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.authorized) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const action = String(body.action || "");
  const targetId = body.targetId ? String(body.targetId) : null;

  const writeLog = (details?: string, targetType?: string) =>
    prisma.adminAuditLog.create({
      data: {
        actorId: auth.user!.id,
        targetUserId: targetType === "USER" ? targetId : null,
        action,
        targetType,
        targetId,
        details,
      },
    });

  if (action === "suspend_user" || action === "restore_user") {
    if (!targetId) return NextResponse.json({ error: "Target user required." }, { status: 400 });
    const target = await prisma.user.findUnique({ where: { id: targetId }, select: { id: true, role: true } });
    if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });
    if (target.role === "SUPER_ADMIN" || (target.role === "ADMIN" && auth.user.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Insufficient authority." }, { status: 403 });
    }
    await prisma.user.update({
      where: { id: targetId },
      data: action === "suspend_user" ? { suspendedAt: new Date(), suspendedReason: String(body.reason || "Platform moderation") } : { suspendedAt: null, suspendedReason: null },
    });
    if (action === "suspend_user") await prisma.session.deleteMany({ where: { userId: targetId } });
    await writeLog(String(body.reason || ""), "USER");
    return NextResponse.json({ success: true });
  }

  if (action === "change_role") {
    const superAuth = await requireSuperAdmin();
    if (!superAuth.authorized) return NextResponse.json({ error: "Super Admin authority required." }, { status: 403 });
    if (!targetId || !["USER", "ADMIN"].includes(String(body.role))) return NextResponse.json({ error: "Invalid role change." }, { status: 400 });
    const target = await prisma.user.findUnique({ where: { id: targetId }, select: { role: true } });
    if (!target || target.role === "SUPER_ADMIN") return NextResponse.json({ error: "Target cannot be changed." }, { status: 403 });
    await prisma.user.update({ where: { id: targetId }, data: { role: String(body.role) as "USER" | "ADMIN" } });
    await writeLog("Role changed to " + body.role, "USER");
    return NextResponse.json({ success: true });
  }

  if (action === "delete_post") {
    if (!targetId) return NextResponse.json({ error: "Post required." }, { status: 400 });
    await prisma.post.delete({ where: { id: targetId } });
    await writeLog("Post deleted", "POST");
    return NextResponse.json({ success: true });
  }

  if (action === "delete_comment") {
    if (!targetId) return NextResponse.json({ error: "Comment required." }, { status: 400 });
    await prisma.postComment.delete({ where: { id: targetId } });
    await writeLog("Comment deleted", "COMMENT");
    return NextResponse.json({ success: true });
  }

  if (action === "resolve_report") {
    if (!targetId) return NextResponse.json({ error: "Report required." }, { status: 400 });
    await prisma.report.update({ where: { id: targetId }, data: { status: "RESOLVED" } });
    await writeLog("Report resolved", "REPORT");
    return NextResponse.json({ success: true });
  }

  if (action === "close_emergency") {
    if (!targetId) return NextResponse.json({ error: "Emergency required." }, { status: 400 });
    await prisma.emergencyRequest.update({ where: { id: targetId }, data: { status: "COMPLETED", completedAt: new Date() } });
    await writeLog("Emergency closed by platform administration", "EMERGENCY");
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown admin action." }, { status: 400 });
}

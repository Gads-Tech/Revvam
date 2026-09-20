import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ conversationId: string }> };
const MAX_VIDEO = 10 * 1024 * 1024;
const MAX_IMAGE = 8 * 1024 * 1024;
const MAX_AUDIO = 8 * 1024 * 1024;
const noStore = { "Cache-Control": "no-store, max-age=0, must-revalidate" };

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: "You must be logged in." }, { status: 401, headers: noStore });
    const { conversationId } = await context.params;
    const member = await prisma.conversationMember.findUnique({ where: { conversationId_userId: { conversationId, userId: user.id } } });
    if (!member) return NextResponse.json({ success: false, error: "Conversation not found." }, { status: 404, headers: noStore });

    const form = await request.formData();
    const file = form.get("file");
    const kind = String(form.get("kind") ?? "");
    if (!(file instanceof File)) return NextResponse.json({ success: false, error: "File is required." }, { status: 400, headers: noStore });

    const limits: Record<string, number> = { IMAGE: MAX_IMAGE, VIDEO: MAX_VIDEO, AUDIO: MAX_AUDIO };
    if (!limits[kind]) return NextResponse.json({ success: false, error: "Unsupported media type." }, { status: 400, headers: noStore });
    if (file.size > limits[kind]) return NextResponse.json({ success: false, error: kind === "VIDEO" ? "Video must not exceed 10 MB." : "File is too large." }, { status: 413, headers: noStore });

    const allowed = kind === "IMAGE" ? ["image/jpeg", "image/png", "image/webp"] : kind === "VIDEO" ? ["video/mp4", "video/webm", "video/quicktime"] : ["audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg"];
    if (!allowed.includes(file.type)) return NextResponse.json({ success: false, error: "Unsupported file format." }, { status: 415, headers: noStore });

    const ext = file.type.split("/")[1]?.replace("quicktime", "mov").replace("mpeg", "mp3") ?? "bin";
    const filename = crypto.randomUUID() + "." + ext;
    const dir = path.join(process.cwd(), "public", "uploads", "messages", conversationId);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));

    return NextResponse.json({ success: true, mediaUrl: "/uploads/messages/" + conversationId + "/" + filename, mediaMimeType: file.type, mediaSize: file.size }, { headers: noStore });
  } catch (error) {
    console.error("Message media upload error:", error);
    return NextResponse.json({ success: false, error: "Unable to upload media." }, { status: 500, headers: noStore });
  }
}

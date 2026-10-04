import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function GET(request: NextRequest) {
  const targetId = request.nextUrl.searchParams.get("targetId");
  if (!targetId) return NextResponse.json({ success: false, error: "targetId is required." }, { status: 400 });
  const reviews = await prisma.review.findMany({
    where: { targetId },
    orderBy: { createdAt: "desc" },
    include: { author: { select: { name: true, username: true, image: true } } },
  });
  const average = reviews.length ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;
  return NextResponse.json({ success: true, average: Number(average.toFixed(1)), count: reviews.length, reviews });
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: "You must be logged in." }, { status: 401 });
    const body = await request.json();
    const targetId = String(body.targetId ?? "");
    const rating = Number(body.rating);
    const comment = typeof body.comment === "string" ? body.comment.trim().slice(0, 1000) : null;
    if (!targetId || targetId === user.id) return NextResponse.json({ success: false, error: "Choose another user to review." }, { status: 400 });
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return NextResponse.json({ success: false, error: "Rating must be between 1 and 5." }, { status: 400 });
    const target = await prisma.user.findUnique({ where: { id: targetId }, select: { id: true } });
    if (!target) return NextResponse.json({ success: false, error: "User not found." }, { status: 404 });
    const review = await prisma.review.upsert({
      where: { targetId_authorId: { targetId, authorId: user.id } },
      update: { rating, comment },
      create: { targetId, authorId: user.id, rating, comment },
      include: { author: { select: { name: true, username: true, image: true } } },
    });
    return NextResponse.json({ success: true, review });
  } catch {
    return NextResponse.json({ success: false, error: "Unable to save review." }, { status: 500 });
  }
}
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };

function cleanList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 30))];
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: "You must be logged in." }, { status: 401, headers });
  const profile = await prisma.mechanicProfile.findUnique({ where: { userId: user.id } });
  return NextResponse.json({ success: true, profile }, { headers });
}

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: "You must be logged in." }, { status: 401, headers });
  if (user.role !== "MECHANIC") {
    return NextResponse.json({ success: false, error: "Only mechanic accounts can edit a mechanic profile." }, { status: 403, headers });
  }

  const body = await request.json().catch(() => null);
  const headline = typeof body?.headline === "string" ? body.headline.trim().slice(0, 100) : null;
  const about = typeof body?.about === "string" ? body.about.trim().slice(0, 1000) : null;
  const yearsExperience = body?.yearsExperience === "" || body?.yearsExperience == null ? null : Number(body.yearsExperience);

  if (yearsExperience !== null && (!Number.isInteger(yearsExperience) || yearsExperience < 0 || yearsExperience > 80)) {
    return NextResponse.json({ success: false, error: "Enter a valid number of years." }, { status: 400, headers });
  }

  const skills = cleanList(body?.skills);
  const services = cleanList(body?.services);

  const profile = await prisma.mechanicProfile.upsert({
    where: { userId: user.id },
    create: { userId: user.id, headline, about, yearsExperience, skills, services },
    update: { headline, about, yearsExperience, skills, services },
  });

  return NextResponse.json({ success: true, profile }, { headers });
}

import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

const MAX_DATA_URL_LENGTH = 3_000_000;

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "You must be logged in." }, { status: 401 });
    }

    const body = await request.json();
    const image = typeof body.image === "string" ? body.image.trim() : "";

    if (!image) {
      await prisma.user.update({ where: { id: user.id }, data: { image: null } });
      return NextResponse.json({ success: true, image: null });
    }

    if (!image.startsWith("data:image/")) {
      return NextResponse.json({ success: false, error: "Please select a valid image." }, { status: 400 });
    }

    if (image.length > MAX_DATA_URL_LENGTH) {
      return NextResponse.json({ success: false, error: "Profile photo is too large. Please choose a smaller image." }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { image },
      select: { image: true },
    });

    return NextResponse.json({ success: true, image: updated.image });
  } catch (error) {
    console.error("Profile avatar update error:", error);
    return NextResponse.json({ success: false, error: "Unable to update your profile photo." }, { status: 500 });
  }
}

import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "You must be logged in." },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      showOnlineStatus: user.showOnlineStatus,
      showLastSeen: user.showLastSeen,
    });
  } catch (error) {
    console.error("Presence settings fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Unable to load presence settings." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "You must be logged in." },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const data: { showOnlineStatus?: boolean; showLastSeen?: boolean } = {};

    if (typeof body?.showOnlineStatus === "boolean") {
      data.showOnlineStatus = body.showOnlineStatus;
    }

    if (typeof body?.showLastSeen === "boolean") {
      data.showLastSeen = body.showLastSeen;
    }

    if (!Object.keys(data).length) {
      return NextResponse.json(
        { success: false, error: "No presence setting was provided." },
        { status: 400 }
      );
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data,
      select: { showOnlineStatus: true, showLastSeen: true },
    });

    return NextResponse.json({
      success: true,
      ...updated,
    });
  } catch (error) {
    console.error("Presence settings update error:", error);
    return NextResponse.json(
      { success: false, error: "Unable to update presence settings." },
      { status: 500 }
    );
  }
}

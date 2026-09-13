import { NextResponse } from "next/server";

import { deleteSession } from "@/lib/session";

export async function POST() {
  try {
    await deleteSession();

    const response = NextResponse.json(
      { success: true },
      { status: 200 }
    );

    response.cookies.delete("revvam_session");
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");

    return response;
  } catch (error) {
    console.error("Logout error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to log out.",
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}

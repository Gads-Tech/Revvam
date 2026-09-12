import { NextResponse } from "next/server";
import argon2 from "argon2";

import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/session";

export async function POST(
  request: Request
) {
  try {
    const body = await request.json();

    const identifier =
      typeof body.identifier === "string"
        ? body.identifier.trim().toLowerCase()
        : "";

    const password =
      typeof body.password === "string"
        ? body.password
        : "";

    if (!identifier || !password) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Username/email and password are required.",
        },
        { status: 400 }
      );
    }

    /*
     * Allow users to log in using either:
     * - email
     * - username
     */

    const user =
      await prisma.user.findFirst({
        where: {
          OR: [
            {
              email: identifier,
            },
            {
              username: identifier,
            },
          ],
        },
      });

    /*
     * Use the same generic error for a missing
     * account or incorrect password.
     *
     * This prevents revealing whether an
     * account exists.
     */

    if (
      !user ||
      !user.passwordHash
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid username/email or password.",
        },
        { status: 401 }
      );
    }

    /*
     * Verify the submitted password against
     * the Argon2 password hash stored in
     * PostgreSQL.
     */

    const passwordValid =
      await argon2.verify(
        user.passwordHash,
        password
      );

    if (!passwordValid) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid username/email or password.",
        },
        { status: 401 }
      );
    }

    /*
     * Password is correct.
     *
     * Create a new server-side session.
     */

    await createSession(user.id);

    /*
     * Never return passwordHash to the browser.
     */

    return NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          email: user.email,
          role: user.role,
          image: user.image,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "Login error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Something went wrong. Please try again.",
      },
      { status: 500 }
    );
  }
}
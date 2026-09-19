import { NextResponse } from "next/server";
import argon2 from "argon2";

import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    const username =
      typeof body.username === "string"
        ? body.username.trim().toLowerCase()
        : "";

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    const password =
      typeof body.password === "string"
        ? body.password
        : "";

    // -----------------------------
    // Server-side validation
    // -----------------------------

    if (!name) {
      return NextResponse.json(
        { error: "Name is required." },
        { status: 400 }
      );
    }

    if (name.length > 80) {
      return NextResponse.json(
        { error: "Name is too long." },
        { status: 400 }
      );
    }

    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return NextResponse.json(
        {
          error:
            "Username must contain 3–20 letters, numbers, or underscores.",
        },
        { status: 400 }
      );
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        {
          error:
            "Password must be at least 8 characters.",
        },
        { status: 400 }
      );
    }

    if (password.length > 128) {
      return NextResponse.json(
        {
          error:
            "Password is too long.",
        },
        { status: 400 }
      );
    }

    // -----------------------------
    // Check existing account
    // -----------------------------

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { username },
        ],
      },
      select: {
        email: true,
        username: true,
      },
    });

    if (existingUser) {
      if (existingUser.email === email) {
        return NextResponse.json(
          {
            error:
              "An account with this email already exists.",
          },
          { status: 409 }
        );
      }

      if (existingUser.username === username) {
        return NextResponse.json(
          {
            error:
              "That username is already taken.",
          },
          { status: 409 }
        );
      }
    }

    // -----------------------------
    // Hash password
    // -----------------------------

    const passwordHash = await argon2.hash(password);

    // -----------------------------
    // Create user
    // -----------------------------

    const user = await prisma.user.create({
      data: {
        name,
        username,
        email,
        passwordHash,
      },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    // -----------------------------
    // Sign the new account in immediately.
    //
    // Profile setup is the next step after
    // account creation, so it needs the same
    // server-side session as a normal login.
    // -----------------------------

    await createSession(user.id);

    // -----------------------------
    // Return safe user data
    // -----------------------------

    return NextResponse.json(
      {
        success: true,
        user,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("SIGNUP_ERROR:", error);

    return NextResponse.json(
      {
        error:
          "Something went wrong while creating your account.",
      },
      { status: 500 }
    );
  }
}

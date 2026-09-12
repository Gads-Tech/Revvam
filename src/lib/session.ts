import { cookies } from "next/headers";
import { randomBytes } from "crypto";

import { prisma } from "@/lib/prisma";

const SESSION_COOKIE_NAME = "revvam_session";

const SESSION_DURATION_SECONDS =
  60 * 60 * 24 * 30; // 30 days

/**
 * Creates a cryptographically secure random session token.
 */
function generateSessionToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Creates a database session and sets the
 * HTTP-only session cookie.
 */
export async function createSession(
  userId: string
) {
  const token = generateSessionToken();

  const expiresAt = new Date(
    Date.now() +
      SESSION_DURATION_SECONDS * 1000
  );

  await prisma.session.create({
    data: {
      token,
      userId,
      expiresAt,
    },
  });

  const cookieStore = await cookies();

  cookieStore.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure:
      process.env.NODE_ENV ===
      "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });

  return {
    token,
    expiresAt,
  };
}

/**
 * Gets the currently authenticated user.
 *
 * Returns null when there is no valid session.
 */
export async function getCurrentUser() {
  const cookieStore = await cookies();

  const token = cookieStore.get(
    SESSION_COOKIE_NAME
  )?.value;

  if (!token) {
    return null;
  }

  const session =
    await prisma.session.findUnique({
      where: {
        token,
      },
      include: {
        user: true,
      },
    });

  if (!session) {
    return null;
  }

  /*
   * Session has expired.
   * Remove it from the database.
   */
  if (
    session.expiresAt.getTime() <=
    Date.now()
  ) {
    await prisma.session.delete({
      where: {
        id: session.id,
      },
    });

    cookieStore.delete(
      SESSION_COOKIE_NAME
    );

    return null;
  }

  return session.user;
}

/**
 * Gets the current session together
 * with the authenticated user.
 */
export async function getCurrentSession() {
  const cookieStore = await cookies();

  const token = cookieStore.get(
    SESSION_COOKIE_NAME
  )?.value;

  if (!token) {
    return null;
  }

  const session =
    await prisma.session.findUnique({
      where: {
        token,
      },
      include: {
        user: true,
      },
    });

  if (!session) {
    return null;
  }

  if (
    session.expiresAt.getTime() <=
    Date.now()
  ) {
    await prisma.session.delete({
      where: {
        id: session.id,
      },
    });

    cookieStore.delete(
      SESSION_COOKIE_NAME
    );

    return null;
  }

  return session;
}

/**
 * Deletes the current session from
 * both PostgreSQL and the browser.
 */
export async function deleteSession() {
  const cookieStore = await cookies();

  const token = cookieStore.get(
    SESSION_COOKIE_NAME
  )?.value;

  if (token) {
    await prisma.session.deleteMany({
      where: {
        token,
      },
    });
  }

  cookieStore.delete(
    SESSION_COOKIE_NAME
  );
}

/**
 * Deletes every session belonging to
 * a specific user.
 *
 * Useful later for "log out everywhere".
 */
export async function deleteAllUserSessions(
  userId: string
) {
  await prisma.session.deleteMany({
    where: {
      userId,
    },
  });
}
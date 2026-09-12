import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function GET(request: Request) {
try {
const currentUser = await getCurrentUser();


if (!currentUser) {
  return NextResponse.json(
    {
      success: false,
      error: "You must be logged in.",
    },
    { status: 401 }
  );
}

const { searchParams } = new URL(request.url);

const query = searchParams.get("q")?.trim() ?? "";

if (!query) {
  return NextResponse.json({
    success: true,
    users: [],
  });
}

/*
 * Remove @ if the frontend sends:
 *
 * @kwame
 *
 * instead of:
 *
 * kwame
 */
const usernameQuery = query.startsWith("@")
  ? query.slice(1)
  : query;

if (!usernameQuery) {
  return NextResponse.json({
    success: true,
    users: [],
  });
}

/*
 * Search usernames case-insensitively.
 *
 * We return only information needed by the
 * mention autocomplete.
 *
 * Passwords and other private information
 * are never returned.
 */
const users = await prisma.user.findMany({
  where: {
    username: {
      contains: usernameQuery,
      mode: "insensitive",
    },
  },
  select: {
    id: true,
    name: true,
    username: true,
    image: true,
    role: true,
    onboardingType: true,
  },
  orderBy: {
    username: "asc",
  },
  take: 8,
});

return NextResponse.json({
  success: true,
  users,
});


} catch (error) {
console.error("Username search error:", error);


return NextResponse.json(
  {
    success: false,
    error: "Unable to search users.",
  },
  { status: 500 }
);


}
}

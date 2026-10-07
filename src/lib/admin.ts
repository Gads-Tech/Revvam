import { getCurrentUser } from "@/lib/session";

export async function requireAdmin() {
  const user = await getCurrentUser();

  if (!user) {
    return { user: null, authorized: false as const, status: 401 as const };
  }

  if (user.role !== "ADMIN") {
    return { user, authorized: false as const, status: 403 as const };
  }

  return { user, authorized: true as const, status: 200 as const };
}

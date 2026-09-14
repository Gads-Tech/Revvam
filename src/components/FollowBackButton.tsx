"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function FollowBackButton({
  username,
  following = false,
}: {
  username: string;
  following?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [isFollowing, setIsFollowing] = useState(following);

  async function toggleFollow() {
    if (busy) return;

    setBusy(true);
    try {
      const response = await fetch(
        `/api/users/${encodeURIComponent(username)}/follow`,
        {
          method: "POST",
          credentials: "include",
          headers: { Accept: "application/json" },
        }
      );

      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "Unable to update follow status.");
      }

      setIsFollowing(Boolean(data.following));
      router.refresh();
    } catch (error) {
      console.error("Follow back error:", error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggleFollow}
      disabled={busy}
      className={`shrink-0 rounded-xl border px-3 py-2 text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
        isFollowing
          ? "border-white/[0.10] bg-white/[0.04] text-white/50 hover:border-white/[0.16] hover:text-white/75"
          : "border-red-500/25 bg-red-500/10 text-red-200 hover:border-red-400/40 hover:bg-red-500/15"
      }`}
    >
      {busy ? "..." : isFollowing ? "Following" : "Follow back"}
    </button>
  );
}

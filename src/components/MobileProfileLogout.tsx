"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type SocialUser = {
  id: string;
  name: string;
  username: string;
  image: string | null;
};

type Follower = {
  id: string;
  user: SocialUser;
  isFollowing: boolean;
};

type SocialData = {
  counts: {
    posts: number;
    followers: number;
    following: number;
  };
  followers: Follower[];
  following: Array<{ id: string; user: SocialUser }>;
};

function Avatar({ user }: { user: SocialUser }) {
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/[0.10] bg-red-600/[0.10] text-sm font-bold text-red-300">
      {user.image ? (
        <img src={user.image} alt={user.name} className="h-full w-full object-cover" />
      ) : (
        user.name.charAt(0).toUpperCase()
      )}
    </span>
  );
}

export default function MobileProfileLogout() {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");
  const [social, setSocial] = useState<SocialData | null>(null);
  const [loadingSocial, setLoadingSocial] = useState(true);
  const [followBusy, setFollowBusy] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadSocial() {
      try {
        const response = await fetch("/api/profile/social", {
          credentials: "include",
          cache: "no-store",
        });
        const data = await response.json();
        if (!response.ok || !data.success) return;
        if (active) setSocial(data);
      } catch (loadError) {
        console.error("Profile social data error:", loadError);
      } finally {
        if (active) setLoadingSocial(false);
      }
    }

    loadSocial();

    return () => {
      active = false;
    };
  }, []);

  const handleFollowBack = async (user: SocialUser) => {
    if (followBusy) return;

    setFollowBusy(user.id);
    setError("");

    try {
      const response = await fetch(
        `/api/users/${encodeURIComponent(user.username)}/follow`,
        {
          method: "POST",
          credentials: "include",
        }
      );
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Unable to update follow.");
      }

      setSocial((current) =>
        current
          ? {
              ...current,
              counts: {
                ...current.counts,
                following: current.counts.following + (data.following ? 1 : -1),
              },
              followers: current.followers.map((item) =>
                item.user.id === user.id
                  ? { ...item, isFollowing: Boolean(data.following) }
                  : item
              ),
            }
          : current
      );
    } catch (followError) {
      setError(
        followError instanceof Error
          ? followError.message
          : "Unable to update follow."
      );
    } finally {
      setFollowBusy(null);
    }
  };

  const handleLogout = async () => {
    if (loggingOut) return;

    setLoggingOut(true);
    setError("");

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "Unable to log out.");
      }

      router.replace("/login");
      router.refresh();
    } catch (logoutError) {
      setError(
        logoutError instanceof Error ? logoutError.message : "Unable to log out."
      );
      setLoggingOut(false);
    }
  };

  return (
    <section className="mt-5 pb-28" aria-label="Social and account actions">
      <div className="rounded-[2rem] border border-white/[0.08] bg-white/[0.025] p-5 backdrop-blur-2xl sm:p-7">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-red-400/65">
            Your social circle
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-tight">
            Followers & following
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-white/30">
            See who follows you, follow them back, and keep track of your Revvam connections.
          </p>
        </div>

        {loadingSocial ? (
          <div className="mt-6 grid grid-cols-3 gap-3">
            {[0, 1, 2].map((item) => (
              <div key={item} className="h-20 animate-pulse rounded-2xl bg-white/[0.04]" />
            ))}
          </div>
        ) : social ? (
          <>
            <div className="mt-6 grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-white/[0.07] bg-black/20 p-4 text-center">
                <p className="text-2xl font-black">{social.counts.posts}</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-white/25">Posts</p>
              </div>
              <div className="rounded-2xl border border-red-500/15 bg-red-500/[0.045] p-4 text-center">
                <p className="text-2xl font-black text-red-200">{social.counts.followers}</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-white/25">Followers</p>
              </div>
              <div className="rounded-2xl border border-white/[0.07] bg-black/20 p-4 text-center">
                <p className="text-2xl font-black">{social.counts.following}</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-white/25">Following</p>
              </div>
            </div>

            <div className="mt-6 grid gap-5 lg:grid-cols-2">
              <div className="rounded-3xl border border-white/[0.07] bg-black/20 p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">People following you</h3>
                    <p className="mt-1 text-xs text-white/25">Your latest followers</p>
                  </div>
                  <span className="rounded-full bg-white/[0.05] px-2.5 py-1 text-xs text-white/40">
                    {social.counts.followers}
                  </span>
                </div>

                <div className="mt-4 space-y-2">
                  {social.followers.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/[0.08] px-4 py-8 text-center text-sm text-white/25">
                      Nobody has followed you yet.
                    </div>
                  ) : (
                    social.followers.map((item) => (
                      <div key={item.id} className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
                        <Link href={`/users/${encodeURIComponent(item.user.username)}`}>
                          <Avatar user={item.user} />
                        </Link>
                        <div className="min-w-0 flex-1">
                          <Link href={`/users/${encodeURIComponent(item.user.username)}`} className="block truncate text-sm font-semibold hover:text-red-300">
                            {item.user.name}
                          </Link>
                          <p className="truncate text-xs text-white/25">@{item.user.username}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleFollowBack(item.user)}
                          disabled={followBusy === item.user.id}
                          className="shrink-0 rounded-xl border border-red-400/20 bg-red-500/[0.07] px-3 py-2 text-[11px] font-semibold text-red-300 transition hover:bg-red-500/[0.14] disabled:opacity-40"
                        >
                          {followBusy === item.user.id
                            ? "..."
                            : item.isFollowing
                              ? "Following"
                              : "Follow back"}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-white/[0.07] bg-black/20 p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">You follow</h3>
                    <p className="mt-1 text-xs text-white/25">Your latest connections</p>
                  </div>
                  <span className="rounded-full bg-white/[0.05] px-2.5 py-1 text-xs text-white/40">
                    {social.counts.following}
                  </span>
                </div>

                <div className="mt-4 space-y-2">
                  {social.following.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/[0.08] px-4 py-8 text-center text-sm text-white/25">
                      You are not following anyone yet.
                    </div>
                  ) : (
                    social.following.map((item) => (
                      <Link
                        key={item.id}
                        href={`/users/${encodeURIComponent(item.user.username)}`}
                        className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3 transition hover:border-red-500/20 hover:bg-red-500/[0.04]"
                      >
                        <Avatar user={item.user} />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{item.user.name}</p>
                          <p className="truncate text-xs text-white/25">@{item.user.username}</p>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            </div>
          </>
        ) : null}

        {error && <p className="mt-4 text-center text-sm text-red-300">{error}</p>}
      </div>

      <button
        type="button"
        onClick={handleLogout}
        disabled={loggingOut}
        className="mt-5 flex min-h-12 w-full items-center justify-center rounded-2xl border border-red-500/25 bg-red-500/[0.08] px-5 text-sm font-semibold text-red-200 transition-colors active:bg-red-500/[0.16] disabled:opacity-50"
      >
        {loggingOut ? "Logging out…" : "Log out"}
      </button>
    </section>
  );
}

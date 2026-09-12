"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type PublicUser = {
  id: string;
  name: string | null;
  username: string;
  image: string | null;
  bio: string | null;
  role: string | null;
  onboardingType: string | null;
};

export default function PublicUserProfilePage() {
  const params = useParams();

  const username = params.username as string;

  const [user, setUser] =
    useState<PublicUser | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    async function loadUser() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `/api/users/${encodeURIComponent(
            username
          )}`,
          {
            method: "GET",
            cache: "no-store",
          }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          setError(
            data.error ||
              "Unable to load this profile."
          );
          return;
        }

        setUser(data.user);
      } catch (error) {
        console.error(
          "Unable to load public profile:",
          error
        );

        setError(
          "Unable to load this profile."
        );
      } finally {
        setLoading(false);
      }
    }

    if (username) {
      loadUser();
    }
  }, [username]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="text-center">
          <div
            className="
              mx-auto
              h-8
              w-8
              animate-spin
              rounded-full
              border-2
              border-white/10
              border-t-red-500
            "
          />

          <p className="mt-4 text-sm text-white/30">
            Loading profile...
          </p>
        </div>
      </main>
    );
  }

  if (error || !user) {
    return (
      <main className="min-h-screen bg-black px-5 py-12 text-white sm:px-8">
        <div className="mx-auto max-w-2xl">
          <div
            className="
              rounded-3xl
              border
              border-red-500/20
              bg-red-500/[0.06]
              px-5
              py-4
              text-sm
              text-red-300
            "
          >
            {error || "User not found."}
          </div>

          <Link
            href="/profile"
            className="
              mt-5
              inline-flex
              text-sm
              text-white/40
              transition-colors
              hover:text-white
            "
          >
            ← Back to profile
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black px-5 py-8 text-white sm:px-8">
      <div
        className="
          pointer-events-none
          fixed
          left-1/2
          top-[-280px]
          h-[520px]
          w-[520px]
          -translate-x-1/2
          rounded-full
          bg-red-600/[0.07]
          blur-[150px]
        "
      />

      <div
        className="
          pointer-events-none
          fixed
          bottom-[-250px]
          right-[-200px]
          h-[500px]
          w-[500px]
          rounded-full
          bg-red-950/[0.08]
          blur-[160px]
        "
      />

      <div className="relative z-10 mx-auto w-full max-w-3xl">
        <Link
          href="/profile"
          className="
            inline-flex
            items-center
            gap-2
            text-sm
            text-white/35
            transition-colors
            hover:text-white
          "
        >
          <span>←</span>
          Back to profile
        </Link>

        <section
          className="
            mt-8
            overflow-hidden
            rounded-[2rem]
            border
            border-white/[0.08]
            bg-white/[0.025]
            backdrop-blur-2xl
          "
        >
          <div
            className="
              h-32
              bg-gradient-to-br
              from-red-600/[0.18]
              via-red-950/[0.08]
              to-transparent
            "
          />

          <div className="px-6 pb-8 sm:px-8">
            <div
              className="
                -mt-12
                flex
                flex-col
                gap-5
                sm:flex-row
                sm:items-end
                sm:justify-between
              "
            >
              <div className="flex items-end gap-4">
                {user.image ? (
                  <img
                    src={user.image}
                    alt={
                      user.name ||
                      user.username
                    }
                    className="
                      h-24
                      w-24
                      rounded-3xl
                      border
                      border-white/[0.12]
                      bg-black
                      object-cover
                      shadow-2xl
                    "
                  />
                ) : (
                  <div
                    className="
                      flex
                      h-24
                      w-24
                      items-center
                      justify-center
                      rounded-3xl
                      border
                      border-white/[0.12]
                      bg-white/[0.05]
                      text-3xl
                      font-bold
                      text-white/30
                    "
                  >
                    {(user.name ||
                      user.username)
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                )}

                <div className="pb-1">
                  <h1
                    className="
                      text-2xl
                      font-bold
                      tracking-[-0.03em]
                    "
                  >
                    {user.name ||
                      user.username}
                  </h1>

                  <p className="mt-1 text-sm text-white/35">
                    @{user.username}
                  </p>
                </div>
              </div>

              {user.role && (
                <div
                  className="
                    w-fit
                    rounded-full
                    border
                    border-red-400/20
                    bg-red-500/[0.08]
                    px-3
                    py-1.5
                    text-[9px]
                    font-bold
                    uppercase
                    tracking-[0.14em]
                    text-red-300
                  "
                >
                  {user.role}
                </div>
              )}
            </div>

            {user.bio && (
              <div className="mt-7">
                <p className="text-sm leading-7 text-white/45">
                  {user.bio}
                </p>
              </div>
            )}

            <div className="mt-7 border-t border-white/[0.06] pt-5">
              <p className="text-xs text-white/20">
                Revvam member
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
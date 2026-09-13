import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import GlassCard from "@/components/GlassCard";
import Logo from "@/components/Logo";
import MobileNav from "@/components/MobileNav";

export default async function HomePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const featuredVehicles = await prisma.vehicle.findMany({
    where: {
      isFeatured: true,
    },
    include: {
      user: {
        select: {
          name: true,
          username: true,
          image: true,
        },
      },
      photos: {
        orderBy: {
          createdAt: "asc",
        },
        take: 1,
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
    take: 6,
  });

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="pointer-events-none fixed left-1/2 top-[-300px] z-0 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-red-600/[0.06] blur-[150px]" />
      <div className="pointer-events-none fixed bottom-[-300px] right-[-200px] z-0 h-[500px] w-[500px] rounded-full bg-red-950/[0.08] blur-[150px]" />

      <header className="sticky top-0 z-50 hidden border-b border-white/[0.06] bg-black/70 backdrop-blur-2xl md:block">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-8">
          <Logo className="h-12 w-auto" />

          <nav className="flex items-center gap-8">
            <Link href="/home" className="text-sm font-medium text-white transition-colors hover:text-red-400">
              Discover
            </Link>
            <Link href="#" className="text-sm font-medium text-white/45 transition-colors hover:text-white">
              Mechanics
            </Link>
            <Link href="#" className="text-sm font-medium text-white/45 transition-colors hover:text-white">
              Dealerships
            </Link>
            <Link href="#" className="text-sm font-medium text-white/45 transition-colors hover:text-white">
              Events
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/profile" className="flex items-center gap-3 rounded-full border border-white/[0.08] bg-white/[0.025] px-4 py-2 transition-all duration-300 hover:border-white/[0.16] hover:bg-white/[0.05]">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-600/20 text-xs font-bold text-red-300">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <span className="max-w-28 truncate text-sm text-white/70">{user.username}</span>
            </Link>

            <form action="/api/auth/logout" method="POST">
              <button type="submit" className="rounded-full px-4 py-2 text-xs font-medium text-white/35 transition-colors hover:text-white">
                Log out
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="relative z-10 mx-auto max-w-7xl px-5 pb-32 pt-8 sm:px-6 md:pb-16 md:pt-10 lg:px-8">
        <div className="mb-8 flex items-center justify-between md:hidden">
          <Logo className="h-11 w-auto" />
          <Link href="/profile" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.09] bg-white/[0.04] text-sm font-bold text-red-300">
            {user.name.charAt(0).toUpperCase()}
          </Link>
        </div>

        <section className="mb-10">
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.25em] text-red-400/70">
            Your garage community
          </p>
          <h1 className="text-4xl font-black tracking-[-0.045em] sm:text-5xl">
            What&apos;s happening,
            <br className="sm:hidden" /> {user.name.split(" ")[0]}?
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-white/35 sm:text-base">
            Discover cars, meet people who understand the obsession, and see what&apos;s happening around you.
          </p>
        </section>

        <section className="mb-10 grid gap-4 sm:grid-cols-3">
          <GlassCard className="p-5">
            <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-red-500/[0.10] text-xl">+</div>
            <h2 className="font-semibold">Create a post</h2>
            <p className="mt-2 text-sm leading-5 text-white/35">Share your car, build, experience, or story.</p>
          </GlassCard>

          <GlassCard className="p-5">
            <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.05] text-xl">🔧</div>
            <h2 className="font-semibold">Find a mechanic</h2>
            <p className="mt-2 text-sm leading-5 text-white/35">Discover trusted automotive professionals nearby.</p>
          </GlassCard>

          <GlassCard className="p-5">
            <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.05] text-xl">🚗</div>
            <h2 className="font-semibold">Add your car</h2>
            <p className="mt-2 text-sm leading-5 text-white/35">Build your garage and show people what you drive.</p>
          </GlassCard>
        </section>

        {featuredVehicles.length > 0 && (
          <section className="mb-10">
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-red-400/60">Community spotlight</p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight">Featured vehicles</h2>
                <p className="mt-2 text-sm text-white/30">Cars their owners have chosen to put in the spotlight.</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {featuredVehicles.map((vehicle) => {
                const image = vehicle.image ?? vehicle.photos[0]?.url ?? null;

                return (
                  <Link
                    key={vehicle.id}
                    href={`/profile/cars/${vehicle.id}`}
                    className="group overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.025] transition-all duration-300 hover:-translate-y-1 hover:border-red-400/20 hover:bg-white/[0.04] hover:shadow-[0_20px_70px_rgba(0,0,0,0.35)]"
                  >
                    <div className="relative h-52 overflow-hidden bg-black">
                      {image ? (
                        <img
                          src={image}
                          alt={`${vehicle.make} ${vehicle.model}`}
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-6xl opacity-20">🚗</div>
                      )}

                      <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black via-black/50 to-transparent" />

                      <div className="absolute left-4 top-4 rounded-full border border-red-400/20 bg-red-600/80 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.15em] text-white backdrop-blur-xl">
                        Featured
                      </div>
                    </div>

                    <div className="p-5">
                      <p className="text-xs uppercase tracking-[0.18em] text-red-400/60">
                        {vehicle.year ?? "Year unknown"} · {vehicle.type ?? "Vehicle"}
                      </p>
                      <h3 className="mt-1 text-xl font-semibold">
                        {vehicle.make} {vehicle.model}
                      </h3>
                      <p className="mt-2 text-sm text-white/30">
                        @{vehicle.user.username}
                      </p>
                      <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-4">
                        <span className="text-sm text-white/35">View vehicle</span>
                        <span className="text-sm text-white/25 transition-all group-hover:translate-x-1 group-hover:text-red-400">→</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section>
            <div className="mb-5 flex items-end justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-white/25">Community</p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight">Discover</h2>
              </div>
              <button type="button" className="text-xs font-medium text-white/30 transition-colors hover:text-white">Latest</button>
            </div>

            <GlassCard className="overflow-hidden">
              <div className="p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-600/20 text-sm font-bold text-red-300">R</div>
                  <div>
                    <p className="text-sm font-medium">Revvam</p>
                    <p className="text-xs text-white/25">Just now</p>
                  </div>
                </div>

                <div className="mt-6">
                  <p className="text-lg font-semibold">Your Revvam journey starts here.</p>
                  <p className="mt-3 text-sm leading-6 text-white/35">
                    The community feed is ready for the next stage. Soon you&apos;ll see real posts from drivers, mechanics, dealerships, and car enthusiasts.
                  </p>
                </div>

                <div className="mt-6 flex gap-6 border-t border-white/[0.06] pt-5">
                  <button type="button" className="text-sm text-white/35 transition-colors hover:text-white">♡ Like</button>
                  <button type="button" className="text-sm text-white/35 transition-colors hover:text-white">○ Comment</button>
                  <button type="button" className="text-sm text-white/35 transition-colors hover:text-white">↗ Share</button>
                </div>
              </div>
            </GlassCard>
          </section>

          <aside className="hidden space-y-5 lg:block">
            <GlassCard className="p-6">
              <p className="text-xs uppercase tracking-[0.2em] text-white/25">Your account</p>
              <div className="mt-5 flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600/15 text-lg font-bold text-red-300">{user.name.charAt(0).toUpperCase()}</div>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{user.name}</p>
                  <p className="truncate text-sm text-white/30">@{user.username}</p>
                </div>
              </div>
              <Link href="/profile" className="mt-6 block rounded-2xl border border-white/[0.08] bg-white/[0.025] px-4 py-3 text-center text-sm font-medium text-white/60 transition-all hover:border-white/[0.16] hover:bg-white/[0.05] hover:text-white">
                View profile
              </Link>
            </GlassCard>

            <GlassCard className="p-6">
              <p className="text-xs uppercase tracking-[0.2em] text-white/25">Coming next</p>
              <div className="mt-5 space-y-4">
                <ComingSoon icon="🚘" title="Your garage" />
                <ComingSoon icon="📍" title="Nearby mechanics" />
                <ComingSoon icon="🔥" title="Trending builds" />
                <ComingSoon icon="📅" title="Car events" />
              </div>
            </GlassCard>
          </aside>
        </div>
      </div>

      <MobileNav />
    </main>
  );
}

function ComingSoon({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-lg">{icon}</span>
      <span className="text-sm text-white/45">{title}</span>
      <span className="ml-auto text-[9px] uppercase tracking-wider text-white/15">Soon</span>
    </div>
  );
}

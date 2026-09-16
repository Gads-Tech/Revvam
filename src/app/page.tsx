import Link from "next/link";

import Navbar from "@/components/Navbar";
import GlassCard from "@/components/GlassCard";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const [posts, featuredVehicles, communityStats] = await Promise.all([
    prisma.post.findMany({
      orderBy: { createdAt: "desc" },
      take: 12,
      include: {
        author: {
          select: { name: true, username: true, image: true },
        },
      },
    }),
    prisma.vehicle.findMany({
      where: { isFeatured: true },
      orderBy: { updatedAt: "desc" },
      take: 6,
      include: {
        user: { select: { name: true, username: true, image: true } },
        photos: { orderBy: { createdAt: "asc" }, take: 1 },
      },
    }),
    Promise.all([
      prisma.user.count(),
      prisma.post.count(),
      prisma.vehicle.count(),
    ]),
  ]);

  const [userCount, postCount, vehicleCount] = communityStats;

  return (
    <main className="min-h-screen overflow-x-hidden bg-black text-white">
      <div className="pointer-events-none fixed left-1/2 top-[-260px] z-0 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-red-600/[0.07] blur-[150px]" />
      <div className="pointer-events-none fixed bottom-[-280px] right-[-180px] z-0 h-[520px] w-[520px] rounded-full bg-red-950/[0.10] blur-[160px]" />

      <Navbar />

      <section className="relative z-10 px-4 pb-14 pt-36 sm:px-6 sm:pt-40 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-4xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-red-400/15 bg-red-500/[0.07] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.22em] text-red-300/80">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.8)]" />
              Live Revvam community
            </div>

            <h1 className="text-5xl font-black leading-[0.94] tracking-[-0.055em] sm:text-7xl lg:text-8xl">
              See what&apos;s happening
              <br />
              <span className="text-red-500">on Revvam.</span>
            </h1>

            <p className="mt-7 max-w-2xl text-base leading-7 text-white/45 sm:text-lg sm:leading-8">
              Explore real posts, builds and people from the automotive community. You can look around freely — create an account when you&apos;re ready to join the conversation.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/signup" className="inline-flex h-12 items-center justify-center rounded-2xl border border-red-400/25 bg-red-600/20 px-6 text-sm font-bold text-white shadow-[0_12px_40px_rgba(220,38,38,0.12)] transition hover:bg-red-500/30">
                Join Revvam <span className="ml-2">→</span>
              </Link>
              <Link href="/login" className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/[0.10] bg-white/[0.04] px-6 text-sm font-semibold text-white/65 transition hover:border-white/[0.16] hover:bg-white/[0.07] hover:text-white">
                Log in
              </Link>
            </div>
          </div>

          <div className="mt-12 grid grid-cols-3 gap-2 sm:max-w-xl sm:gap-3">
            <Stat value={userCount} label="People" />
            <Stat value={postCount} label="Posts" />
            <Stat value={vehicleCount} label="Vehicles" />
          </div>
        </div>
      </section>

      <section id="community" className="relative z-10 border-y border-white/[0.06] bg-white/[0.015] px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-red-400/70">Community feed</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">What people are posting</h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-white/30">This is Revvam in motion. Browse the public conversation before you decide to jump in.</p>
            </div>
            <Link href="/signup" className="inline-flex w-fit rounded-full border border-white/[0.10] bg-white/[0.04] px-4 py-2.5 text-xs font-semibold text-white/55 transition hover:border-red-400/20 hover:bg-red-500/[0.06] hover:text-white">
              Create an account to post
            </Link>
          </div>

          {posts.length === 0 ? (
            <GlassCard className="p-10 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-2xl">✦</div>
              <h3 className="mt-5 text-xl font-semibold">The road is yours.</h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/35">The community is getting started. Join Revvam and be one of the first people to post.</p>
              <Link href="/signup" className="mt-6 inline-flex rounded-full border border-red-400/20 bg-red-600/10 px-5 py-2.5 text-sm font-semibold text-red-200 hover:bg-red-600/20">Join now</Link>
            </GlassCard>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {posts.map((post) => (
                <article key={post.id} className="overflow-hidden rounded-[1.75rem] border border-white/[0.08] bg-black/45 shadow-2xl shadow-black/20 transition hover:border-white/[0.14]">
                  <div className="p-5 sm:p-6">
                    <Link href={`/users/${encodeURIComponent(post.author.username)}`} className="flex items-center gap-3 group">
                      <Avatar image={post.author.image} fallback={post.author.username} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold group-hover:text-red-300">{post.author.name}</p>
                        <p className="truncate text-xs text-white/25">@{post.author.username} · {formatDate(post.createdAt)}</p>
                      </div>
                    </Link>
                    <p className="mt-5 whitespace-pre-wrap text-[15px] leading-7 text-white/70">{post.content}</p>
                  </div>

                  {post.image && (
                    <div className="max-h-[520px] overflow-hidden border-y border-white/[0.06] bg-black">
                      <img src={post.image} alt="Community post" className="mx-auto max-h-[520px] w-full object-contain" />
                    </div>
                  )}

                  <div className="flex items-center gap-2 border-t border-white/[0.06] p-3 sm:p-4">
                    <Link href="/login" className="flex-1 rounded-xl px-3 py-2.5 text-center text-xs font-semibold text-white/35 transition hover:bg-white/[0.05] hover:text-red-300" title="Log in or create an account to like posts">
                      ♡ Like
                    </Link>
                    <Link href="/login" className="flex-1 rounded-xl px-3 py-2.5 text-center text-xs font-semibold text-white/35 transition hover:bg-white/[0.05] hover:text-white" title="Log in or create an account to comment">
                      ○ Comment
                    </Link>
                    <Link href="/login" className="flex-1 rounded-xl px-3 py-2.5 text-center text-xs font-semibold text-white/35 transition hover:bg-white/[0.05] hover:text-white">
                      ↗ Share
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {featuredVehicles.length > 0 && (
        <section id="vehicles" className="relative z-10 px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8">
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-red-400/70">Build spotlight</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Cars getting attention</h2>
              <p className="mt-2 text-sm text-white/30">Explore some of the builds already being shared by the community.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {featuredVehicles.map((vehicle) => {
                const image = vehicle.image ?? vehicle.photos[0]?.url ?? null;
                return (
                  <article key={vehicle.id} className="overflow-hidden rounded-[1.75rem] border border-white/[0.08] bg-white/[0.025] transition hover:-translate-y-1 hover:border-red-400/20">
                    <div className="relative h-56 overflow-hidden bg-black">
                      {image ? <img src={image} alt={`${vehicle.make} ${vehicle.model}`} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-6xl opacity-20">🚗</div>}
                      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black to-transparent" />
                      <span className="absolute left-4 top-4 rounded-full border border-red-400/20 bg-red-600/75 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.15em]">Featured</span>
                    </div>
                    <div className="p-5">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-red-400/60">{vehicle.year ?? "Year unknown"} · {vehicle.type ?? "Vehicle"}</p>
                      <h3 className="mt-1 text-xl font-bold">{vehicle.make} {vehicle.model}</h3>
                      <Link href={`/users/${encodeURIComponent(vehicle.user.username)}`} className="mt-4 flex items-center gap-2 text-sm text-white/35 transition hover:text-red-300">
                        <Avatar image={vehicle.user.image} fallback={vehicle.user.username} small />
                        @{vehicle.user.username}
                      </Link>
                      <Link href="/login" className="mt-4 block rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-3 text-center text-xs font-semibold text-white/40 transition hover:border-red-400/20 hover:bg-red-500/[0.06] hover:text-white">
                        Join to explore builds →
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <section id="how-it-works" className="relative z-10 border-t border-white/[0.06] px-4 py-16 pb-32 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-[2rem] border border-white/[0.08] bg-gradient-to-br from-red-600/[0.10] via-white/[0.025] to-transparent p-7 sm:p-10">
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-red-400/70">Ready to take part?</p>
            <div className="mt-3 flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <h2 className="text-3xl font-black tracking-tight sm:text-4xl">Look around. Then join the community.</h2>
                <p className="mt-3 text-sm leading-7 text-white/35 sm:text-base">Browsing is open to everyone. To like posts, comment, publish your own posts or build your Revvam profile, create an account or log in.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href="/signup" className="inline-flex h-12 items-center rounded-2xl border border-red-400/25 bg-red-600/20 px-6 text-sm font-bold hover:bg-red-500/30">Join Now →</Link>
                <Link href="/login" className="inline-flex h-12 items-center rounded-2xl border border-white/[0.10] bg-white/[0.04] px-6 text-sm font-semibold text-white/60 hover:bg-white/[0.07] hover:text-white">Log in</Link>
              </div>
            </div>
          </div>
          <p className="mt-8 text-center text-xs text-white/15">Revvam · Your car. Your community.</p>
        </div>
      </section>
    </main>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] px-4 py-4 text-center backdrop-blur-xl">
      <p className="text-xl font-black sm:text-2xl">{value.toLocaleString()}</p>
      <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.16em] text-white/25">{label}</p>
    </div>
  );
}

function Avatar({ image, fallback, small = false }: { image?: string | null; fallback: string; small?: boolean }) {
  return (
    <span className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-red-600/15 font-bold text-red-300 ${small ? "h-6 w-6 text-[8px]" : "h-10 w-10 text-xs"}`}>
      {image ? <img src={image} alt="" className="h-full w-full object-cover" /> : fallback.charAt(0).toUpperCase()}
    </span>
  );
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(value);
}

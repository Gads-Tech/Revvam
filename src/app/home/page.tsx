export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import EmergencyHelpLive from "@/components/EmergencyHelpLive";
import EmergencyHelpButton from "@/components/EmergencyHelpButton";
import { redirect } from "next/navigation";
import { CarIcon, MessageIcon, MoreIcon, SearchIcon, WarningIcon, LocationIcon, BellIcon } from "@/components/icons";

import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import GlassCard from "@/components/GlassCard";
import Logo from "@/components/Logo";
import MobileNav from "@/components/MobileNav";
import AppHeader from "@/components/AppHeader";
import LiveSocialActions from "@/components/LiveSocialActions";
import PostCard from "@/components/PostCard";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");


  const isMechanic = user.role === "MECHANIC" || user.role === "MECHANIC_SHOP" || user.onboardingType === "MECHANIC" || user.onboardingType === "MECHANIC_SHOP";

  const [posts, liveEmergencies, vehicleCount, postCount] = await Promise.all([
    prisma.post.findMany({
      orderBy: { createdAt: "desc" },
      take: 12,
      include: {
        author: { select: { name: true, username: true, image: true } },
        _count: { select: { likes: true, comments: true, shares: true } },
        likes: { where: { userId: user.id }, select: { id: true } },
        mentions: { include: { mentionedUser: { select: { id: true, name: true, username: true, image: true } } } },
      },
    }),
    prisma.emergencyRequest.findMany({
      where: { status: { in: ["OPEN", "OFFERS_RECEIVED"] }, driverId: { not: user.id } },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: {
        id: true,
        type: true,
        description: true,
        locationLabel: true,
        radiusMeters: true,
        ghostMode: true,
        createdAt: true,
        driver: { select: { username: true, image: true } },
      },
    }),
    prisma.vehicle.count({ where: { ownerId: user.id } }),
    prisma.post.count({ where: { authorId: user.id } }),
  ]);

  const emergencyHelpEnabled = true;

  return (
    <main className="min-h-screen bg-[#020202] text-white">
      <div className="pointer-events-none fixed left-1/2 top-[-360px] z-0 h-[720px] w-[720px] -translate-x-1/2 rounded-full bg-red-600/[0.055] blur-[170px]" />
      <div className="pointer-events-none fixed bottom-[-320px] left-[-160px] z-0 h-[520px] w-[520px] rounded-full bg-red-950/[0.10] blur-[160px]" />

      <AppHeader />


      <div className="relative z-10 mx-auto max-w-[1480px] px-4 pb-32 pt-5 sm:px-6 md:pb-12 md:pt-7 xl:px-8">
        <EmergencyHelpLive initialCount={liveEmergencies.length} enabled={emergencyHelpEnabled} />
        <div className="mb-5 flex items-center justify-between md:hidden">
          <Logo href="/home" className="h-9 w-auto scale-[1.7] transform-gpu" />
          <div className="flex items-center gap-2"><Link href="/map" className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.03]"><LocationIcon className="h-4 w-4 text-red-300" /></Link><Link href="/profile" className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-white/10">{user.image ? <img src={user.image} alt="" className="h-full w-full object-cover" /> : user.name.charAt(0)}</Link></div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[245px_minmax(0,1fr)_285px]">
          <aside className="hidden xl:block">
            <div className="sticky top-24 space-y-4">
              <section className="overflow-hidden rounded-[1.7rem] border border-white/[0.08] bg-white/[0.025]">
                <div className="border-b border-white/[0.07] p-4"><div className="flex items-center gap-2"><SearchIcon className="h-4 w-4 text-white/35" /><span className="text-xs font-semibold text-white/60">Explore Revvam</span></div></div>
                <div className="p-2">
                  <SideLink href="/home" label="Discover" active />
                  <SideLink href="/map" label="Live map" badge={liveEmergencies.length ? String(liveEmergencies.length) : undefined} />
                  <SideLink href="/profile/mechanic" label="Mechanics" />
                  <SideLink href="/map" label="Dealerships" />
                  <SideLink href="/map" label="Events" />
                  <SideLink href="/messages" label="Messages" />
                </div>
              </section>
              <section className="rounded-[1.7rem] border border-red-500/15 bg-gradient-to-br from-red-950/30 to-transparent p-5">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10"><WarningIcon className="h-5 w-5 text-red-300" /></div>
                <h3 className="text-sm font-bold">Need help on the road?</h3>
                <p className="mt-2 text-xs leading-5 text-white/35">Report a live issue and let nearby Revvam users offer help.</p>
                <Link href="/emergency" className="mt-4 flex items-center justify-center rounded-xl border border-red-400/30 bg-red-600/10 py-2.5 text-xs font-bold text-red-200 hover:bg-red-600/20">Report issue</Link>
              </section>
              <div className="px-2 text-[9px] uppercase tracking-[0.2em] text-white/15">Revvam · Drive together</div>
            </div>
          </aside>

          <section className="min-w-0">
            <section className="mb-5 overflow-hidden rounded-[1.8rem] border border-red-500/10 bg-gradient-to-br from-red-950/25 via-white/[0.025] to-transparent p-5 sm:p-7">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.32em] text-red-400/80">Revvam community</p>
                  <h1 className="text-3xl font-black tracking-[-0.05em] sm:text-5xl">What&apos;s happening?</h1>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-white/35">Cars, builds, people and live road situations — all in one place.</p>
                </div>
                <Link href="/profile/posts" className="inline-flex w-fit items-center gap-2 rounded-xl border border-red-400/25 bg-red-600/10 px-4 py-2.5 text-xs font-bold text-red-100 transition hover:bg-red-600/20">+ Create post</Link>
              </div>
            </section>

            <section className="mb-6 grid grid-cols-3 gap-2 sm:grid-cols-4">
              <QuickLink href="/profile/cars/add" icon={<CarIcon className="h-4 w-4" />} label="Add car" />
              <EmergencyHelpButton initialCount={liveEmergencies.length} />
              <QuickLink href="/map" icon={<LocationIcon className="h-4 w-4" />} label="Live map" />
              <QuickLink href="/profile" icon={<MoreIcon className="h-4 w-4" />} label="My profile" />
            </section>

            <section>
              <div className="mb-4 flex items-end justify-between">
                <div><p className="text-[9px] font-bold uppercase tracking-[0.27em] text-white/20">Live from the community</p><h2 className="mt-1.5 text-xl font-bold tracking-tight sm:text-2xl">What people are posting</h2></div>
                <span className="hidden rounded-full border border-white/[0.07] px-3 py-1 text-[9px] font-semibold text-white/25 sm:inline-flex">{posts.length} recent posts</span>
              </div>
              {posts.length === 0 ? <GlassCard className="p-8 sm:p-10"><div className="mx-auto max-w-xl text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10"><MessageIcon className="h-7 w-7 text-red-300/70" /></div><h3 className="mt-5 text-xl font-semibold">The road is yours.</h3><p className="mt-2 text-sm leading-6 text-white/35">No community posts yet. Start the conversation with your first build, photo or car story.</p><Link href="/profile/posts" className="mt-6 inline-flex rounded-full border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-white/70">Post something</Link></div></GlassCard> : <div className="space-y-4">{posts.map((post) => { const { likes, ...postWithoutLikes } = post; return <PostCard key={post.id} post={{ ...postWithoutLikes, liked: likes.length > 0, createdAt: post.createdAt.toISOString(), image: post.image, video: post.video }} />; })}</div>}
            </section>
          </section>

          <aside className="hidden lg:block">
            <div className="sticky top-24 space-y-4">
              <section className="overflow-hidden rounded-[1.7rem] border border-white/[0.08] bg-white/[0.025]">
                              <div className="flex items-center justify-between border-b border-white/[0.07] p-4"><div className="flex items-center gap-2"><span className="h-2 w-2 animate-pulse rounded-full bg-red-500" /><h3 className="text-xs font-bold">Live on map</h3></div><Link href="/map" className="text-[10px] font-semibold text-red-300">View all</Link></div>
                              <div className="p-2">
                                {liveEmergencies.length ? liveEmergencies.map((item) => <Link key={item.id} href="/map" className="block rounded-2xl p-3 transition hover:bg-white/[0.035]"><div className="flex gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-red-500/20 bg-red-500/10 text-red-300">{item.driver.image ? <img src={item.driver.image} alt="" className="h-full w-full object-cover" /> : <WarningIcon className="h-4 w-4" />}</div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><span className="truncate text-xs font-bold">{prettyEmergency(item.type)}</span><span className="shrink-0 text-[9px] text-white/20">{timeAgo(item.createdAt)}</span></div><p className="mt-1 line-clamp-2 text-[10px] leading-4 text-white/35">{item.description}</p><div className="mt-2 flex items-center gap-2 text-[9px] text-white/20"><span>{item.ghostMode ? "Location hidden" : item.locationLabel ?? "Live location"}</span><span className="text-red-300">LIVE</span></div></div></div></Link>) : <div className="p-5 text-center text-xs text-white/25">No active road issues nearby.</div>}
                              </div>
                            </section>
              

              <section className="rounded-[1.7rem] border border-white/[0.08] bg-white/[0.025] p-4">
                <div className="mb-3 flex items-center justify-between"><h3 className="text-xs font-bold">Your Revvam</h3><Link href="/profile" className="text-[10px] text-red-300">Profile</Link></div>
                <div className="grid grid-cols-2 gap-2"><Stat value={String(postCount)} label="Posts" /><Stat value={String(vehicleCount)} label="Cars" /></div>
                <Link href="/profile/cars/add" className="mt-3 flex items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.02] py-2.5 text-[10px] font-bold text-white/55 hover:text-white">+ Add vehicle</Link>
              </section>

              <section className="rounded-[1.7rem] border border-white/[0.08] bg-gradient-to-br from-white/[0.035] to-transparent p-4">
                <div className="flex items-start gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/10"><BellIcon className="h-4 w-4 text-red-300" /></div><div><h3 className="text-xs font-bold">Stay connected</h3><p className="mt-1 text-[10px] leading-4 text-white/30">Offers, emergency responses and messages appear in your notifications.</p></div></div>
                <Link href="/profile/notifications" className="mt-3 block text-center text-[10px] font-bold text-red-300">Open notifications →</Link>
              </section>
            </div>
          </aside>
        </div>
      </div>
      <MobileNav />
    </main>
  );
}

function NavLink({ href, active = false, children }: { href: string; active?: boolean; children: React.ReactNode }) {
  return <Link href={href} className={`relative py-7 text-xs font-semibold transition ${active ? "text-white after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-red-500" : "text-white/40 hover:text-white"}`}>{children}</Link>;
}

function SideLink({ href, label, active = false, badge }: { href: string; label: string; active?: boolean; badge?: string }) {
  return <Link href={href} className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold transition ${active ? "bg-red-500/10 text-red-200" : "text-white/45 hover:bg-white/[0.04] hover:text-white"}`}><span>{label}</span>{badge && <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[8px] font-black text-white">{badge}</span>}</Link>;
}

function QuickLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return <Link href={href} className="flex min-w-0 items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] px-2 py-2.5 text-[10px] font-bold text-white/50 transition hover:border-red-400/20 hover:bg-red-500/[0.06] hover:text-white sm:text-xs"><span className="text-red-300/80">{icon}</span><span className="truncate">{label}</span></Link>;
}

function Stat({ value, label }: { value: string; label: string }) {
  return <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3 text-center"><div className="text-lg font-black">{value}</div><div className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.15em] text-white/20">{label}</div></div>;
}

function prettyEmergency(type: string) {
  return type.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function timeAgo(date: Date) {
  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

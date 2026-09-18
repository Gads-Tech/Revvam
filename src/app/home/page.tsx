import Link from "next/link";
import { redirect } from "next/navigation";
import { CarIcon, MessageIcon, PlusIcon, MoreIcon, SearchIcon } from "@/components/icons";

import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import GlassCard from "@/components/GlassCard";
import Logo from "@/components/Logo";
import MobileNav from "@/components/MobileNav";
import LiveSocialActions from "@/components/LiveSocialActions";
import PostCard from "@/components/PostCard";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const posts = await prisma.post.findMany({
    orderBy: { createdAt: "desc" },
    take: 12,
    include: {
      author: { select: { name: true, username: true, image: true } },
      _count: { select: { likes: true, comments: true, shares: true } },
      likes: { where: { userId: user.id }, select: { id: true } },
      mentions: { include: { mentionedUser: { select: { id: true, name: true, username: true, image: true } } } },
    },
  });

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="pointer-events-none fixed left-1/2 top-[-300px] z-0 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-red-600/[0.06] blur-[150px]" />
      <div className="pointer-events-none fixed bottom-[-300px] right-[-200px] z-0 h-[500px] w-[500px] rounded-full bg-red-950/[0.08] blur-[150px]" />
      <header className="sticky top-0 z-50 hidden border-b border-white/[0.06] bg-black/75 backdrop-blur-2xl md:block">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-8">
          <Logo href="/home" className="h-12 w-auto scale-[1.38] transform-gpu" />
          <nav className="flex items-center gap-8">
            <Link href="/home" className="text-sm font-medium text-white hover:text-red-400">Discover</Link>
            <Link href="#" className="text-sm font-medium text-white/40 hover:text-white">Mechanics</Link>
            <Link href="#" className="text-sm font-medium text-white/40 hover:text-white">Dealerships</Link>
            <Link href="#" className="text-sm font-medium text-white/40 hover:text-white">Events</Link>
          </nav>
          <div className="flex items-center gap-3"><LiveSocialActions /><Link href="/profile" aria-label="Open your profile" className="ml-1 flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-white/[0.09] bg-white/[0.04] text-sm font-bold text-red-300 transition hover:border-red-400/30">{user.image ? <img src={user.image} alt="" className="h-full w-full object-cover" /> : user.name.charAt(0).toUpperCase()}</Link></div>
        </div>
      </header>
      <div className="relative z-10 mx-auto max-w-7xl px-5 pb-32 pt-6 sm:px-6 md:pb-16 md:pt-10 lg:px-8">
        <div className="mb-7 flex items-center justify-between md:hidden"><Logo href="/home" className="h-10 w-auto scale-[1.45] transform-gpu" /></div>
        <section className="mb-8 rounded-[2rem] border border-white/[0.07] bg-gradient-to-br from-white/[0.035] to-transparent p-6 sm:p-8"><div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between"><div><p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-red-400/70">Revvam community</p><h1 className="text-4xl font-black tracking-[-0.05em] sm:text-5xl">What&apos;s happening?</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-white/40 sm:text-base">Cars, builds, people and conversations from across Revvam — all in one place.</p></div><Link href="/profile/posts" className="inline-flex w-fit items-center gap-2 rounded-full border border-red-400/20 bg-red-600/10 px-4 py-2.5 text-sm font-semibold text-red-200 transition hover:bg-red-600/20">+ Create post</Link></div></section>
        <section className="mb-9 flex flex-wrap items-center gap-2"><QuickLink href="/profile/cars/add" icon={<CarIcon className="h-4 w-4" />} label="Add car" /><QuickLink href="#" icon={<CarIcon className="h-4 w-4" />} label="Find mechanic" muted /><QuickLink href="/profile" icon={<MoreIcon className="h-4 w-4" />} label="My profile" /><span className="ml-1 hidden text-xs text-white/20 sm:inline">Build your garage, then get back to the feed.</span></section>
        <section className="mb-10"><div className="mb-5"><p className="text-[10px] uppercase tracking-[0.25em] text-white/25">Live from the community</p><h2 className="mt-2 text-2xl font-bold tracking-tight">What people are posting</h2></div>{posts.length === 0 ? <GlassCard className="p-8 sm:p-10"><div className="mx-auto max-w-xl text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-2xl"><MessageIcon className="h-7 w-7 text-red-300/70" /></div><h3 className="mt-5 text-xl font-semibold">The road is yours.</h3><p className="mt-2 text-sm leading-6 text-white/35">No community posts yet. Start the conversation with your first build, photo or car story.</p><Link href="/profile/posts" className="mt-6 inline-flex rounded-full border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-white/70 hover:bg-white/[0.07] hover:text-white">Post something</Link></div></GlassCard> : <div className="space-y-4">{posts.map((post) => { const { likes, ...postWithoutLikes } = post; return <PostCard key={post.id} post={{ ...postWithoutLikes, liked: likes.length > 0, createdAt: post.createdAt.toISOString(), image: post.image, video: post.video }} />; })}</div>}</section>
        <aside className="rounded-3xl border border-white/[0.07] bg-white/[0.02] p-5 sm:p-6"><div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[10px] uppercase tracking-[0.25em] text-white/25">Your Revvam</p><h2 className="mt-2 text-lg font-semibold">Keep your garage moving.</h2><p className="mt-1 text-sm text-white/30">Add cars and manage your profile without leaving the community feed.</p></div><div className="flex gap-2"><Link href="/profile/cars/add" className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-white/55 hover:bg-white/[0.05] hover:text-white">+ Add car</Link><Link href="#" className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-white/35 hover:bg-white/[0.05] hover:text-white">Mechanics</Link></div></div></aside>
      </div><MobileNav />
    </main>
  );
}

function QuickLink({ href, icon, label, muted = false }: { href: string; icon: React.ReactNode; label: string; muted?: boolean }) { return <Link href={href} className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-semibold transition ${muted ? "border-white/[0.07] bg-white/[0.02] text-white/30 hover:text-white/60" : "border-white/[0.09] bg-white/[0.025] text-white/55 hover:border-red-400/20 hover:bg-red-500/[0.06] hover:text-white"}`}><span>{icon}</span>{label}</Link>; }

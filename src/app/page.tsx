import Link from "next/link";
import { redirect } from "next/navigation";
import Navbar from "@/components/Navbar";
import GlassCard from "@/components/GlassCard";
import PostCard from "@/components/PostCard";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const currentUser = await getCurrentUser();
  if (currentUser) redirect("/home");

  const posts = await prisma.post.findMany({
    orderBy: { createdAt: "desc" },
    take: 12,
    include: {
      author: { select: { id: true, name: true, username: true, image: true } },
      _count: { select: { comments: true, likes: true, shares: true } },
    },
  });

  return (
    <main className="min-h-screen overflow-x-hidden bg-black text-white">
      <div className="pointer-events-none fixed left-1/2 top-[-260px] z-0 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-red-600/[0.07] blur-[150px]" />
      <div className="pointer-events-none fixed bottom-[-280px] right-[-180px] z-0 h-[520px] w-[520px] rounded-full bg-red-950/[0.10] blur-[160px]" />
      <Navbar />
      <section className="relative z-10 px-4 pb-14 pt-36 sm:px-6 sm:pt-40 lg:px-8"><div className="mx-auto max-w-7xl"><div className="max-w-4xl">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-red-400/15 bg-red-500/[0.07] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.22em] text-red-300/80"><span className="h-1.5 w-1.5 rounded-full bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.8)]" />Live Revvam community</div>
        <h1 className="text-5xl font-black leading-[0.94] tracking-[-0.055em] sm:text-7xl lg:text-8xl">See what&apos;s happening<br /><span className="text-red-500">on Revvam.</span></h1>
        <p className="mt-7 max-w-2xl text-base leading-7 text-white/45 sm:text-lg sm:leading-8">Explore real posts, builds and people from the automotive community. Browse freely, read the conversation and share posts outside Revvam. Create an account when you&apos;re ready to join in.</p>
        <div className="mt-8 flex flex-wrap gap-3"><Link href="/signup" className="inline-flex h-12 items-center justify-center rounded-2xl border border-red-400/25 bg-red-600/20 px-6 text-sm font-bold text-white shadow-[0_12px_40px_rgba(220,38,38,0.12)] transition hover:bg-red-500/30">Join Revvam <span className="ml-2">→</span></Link><Link href="/login" className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/[0.10] bg-white/[0.04] px-6 text-sm font-semibold text-white/65 transition hover:border-white/[0.16] hover:bg-white/[0.07] hover:text-white">Log in</Link></div>
      </div></div></section>
      <section id="community" className="relative z-10 border-y border-white/[0.06] bg-white/[0.015] px-4 py-14 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.28em] text-red-400/70">Community feed</p><h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">What people are posting</h2><p className="mt-2 max-w-xl text-sm leading-6 text-white/30">Read posts and comments without an account. Sign in when you want to like, comment or publish.</p></div><Link href="/signup" className="inline-flex w-fit rounded-full border border-white/[0.10] bg-white/[0.04] px-4 py-2.5 text-xs font-semibold text-white/55 transition hover:border-red-400/20 hover:bg-red-500/[0.06] hover:text-white">Create an account to post</Link></div>
        {posts.length === 0 ? <GlassCard className="p-10 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-2xl">✦</div><h3 className="mt-5 text-xl font-semibold">The road is yours.</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/35">The community is getting started. Join Revvam and be one of the first people to post.</p><Link href="/signup" className="mt-6 inline-flex rounded-full border border-red-400/20 bg-red-600/10 px-5 py-2.5 text-sm font-semibold text-red-200 hover:bg-red-600/20">Join now</Link></GlassCard> : <div className="grid gap-4 lg:grid-cols-2">{posts.map((post) => <PostCard key={post.id} publicMode post={{ id: post.id, content: post.content, image: post.image, video: post.video, createdAt: post.createdAt.toISOString(), author: post.author, _count: post._count, liked: false }} />)}</div>}
      </div></section>
      <section id="how-it-works" className="relative z-10 border-t border-white/[0.06] px-4 py-16 pb-32 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><div className="rounded-[2rem] border border-white/[0.08] bg-gradient-to-br from-red-600/[0.10] via-white/[0.025] to-transparent p-7 sm:p-10"><p className="text-[10px] font-bold uppercase tracking-[0.28em] text-red-400/70">Ready to take part?</p><div className="mt-3 flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between"><div className="max-w-2xl"><h2 className="text-3xl font-black tracking-tight sm:text-4xl">Look around. Then join the community.</h2><p className="mt-3 text-sm leading-7 text-white/35 sm:text-base">Browsing and reading are open to everyone. To like posts, comment, publish your own posts or build your Revvam profile, create an account or log in.</p></div><div className="flex flex-wrap gap-3"><Link href="/signup" className="inline-flex h-12 items-center rounded-2xl border border-red-400/25 bg-red-600/20 px-6 text-sm font-bold hover:bg-red-500/30">Join Now →</Link><Link href="/login" className="inline-flex h-12 items-center rounded-2xl border border-white/[0.10] bg-white/[0.04] px-6 text-sm font-semibold text-white/60 hover:bg-white/[0.07] hover:text-white">Log in</Link></div></div></div><p className="mt-8 text-center text-xs text-white/15">Revvam · Your car. Your community.</p></div></section>
    </main>
  );
}

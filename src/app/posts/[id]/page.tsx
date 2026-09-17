import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import PostCard from "@/components/PostCard";

export default async function SharedPostPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ source?: string; comment?: string }> }) {
  const { id } = await params;
  const { source, comment } = await searchParams;
  const [post, currentUser] = await Promise.all([
    prisma.post.findUnique({ where: { id }, include: { author: { select: { name: true, username: true, image: true } }, _count: { select: { likes: true, comments: true, shares: true } }, mentions: { include: { mentionedUser: { select: { id: true, name: true, username: true, image: true } } } } } }),
    getCurrentUser(),
  ]);
  if (!post) notFound();

  const fromNotifications = source === "notifications";
  const backHref = fromNotifications ? "/profile/notifications" : currentUser ? "/home" : "/";
  const backLabel = fromNotifications ? "Back" : currentUser ? "Discover" : "Explore Revvam";
  const postCard = <PostCard post={{ id: post.id, content: post.content, image: post.image, video: post.video, createdAt: post.createdAt.toISOString(), author: post.author, _count: post._count, mentions: post.mentions, liked: false }} deepLinkCommentId={comment ?? null} />;

  return <main className="min-h-screen bg-black px-4 pb-20 pt-8 text-white sm:px-6"><div className="mx-auto max-w-2xl"><div className="mb-8 flex items-center justify-between"><Link href={backHref} className="text-sm text-white/40 hover:text-white">← {backLabel}</Link>{!currentUser && <div className="flex gap-2"><Link href="/login" className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-white/60 hover:text-white">Log in</Link><Link href="/signup" className="rounded-full border border-red-400/20 bg-red-600/15 px-4 py-2 text-xs font-semibold text-red-200 hover:bg-red-600/25">Join Revvam</Link></div>}</div>{postCard}</div></main>;
}

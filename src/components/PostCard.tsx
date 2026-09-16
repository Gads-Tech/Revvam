"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type User = { id?: string; name: string; username: string; image: string | null };
export type PostData = {
  id: string;
  content: string;
  image: string | null;
  video?: string | null;
  createdAt: string;
  author: User;
  liked?: boolean;
  _count?: { likes: number; comments: number };
  mentions?: { mentionedUser: User }[];
};

type Comment = { id: string; content: string; createdAt: string; author: User };

export default function PostCard({ post, onChanged }: { post: PostData; onChanged?: (post: PostData) => void }) {
  const [liked, setLiked] = useState(Boolean(post.liked));
  const [likes, setLikes] = useState(post._count?.likes ?? 0);
  const [comments, setComments] = useState<Comment[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [commentBusy, setCommentBusy] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => { setLiked(Boolean(post.liked)); setLikes(post._count?.likes ?? 0); }, [post.id, post.liked, post._count?.likes]);

  async function toggleLike() {
    if (busy) return;
    setBusy(true); setNotice("");
    try {
      const response = await fetch(`/api/posts/${post.id}/like`, { method: "POST", credentials: "include" });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Unable to like post.");
      setLiked(Boolean(data.liked)); setLikes(Number(data.likes) || 0);
      onChanged?.({ ...post, liked: Boolean(data.liked), _count: { likes: Number(data.likes) || 0, comments: post._count?.comments ?? 0 } });
    } catch (error) { setNotice(error instanceof Error ? error.message : "Unable to like post."); }
    finally { setBusy(false); }
  }

  async function loadComments() {
    try {
      const response = await fetch(`/api/posts/${post.id}/comments`, { cache: "no-store", credentials: "include" });
      const data = await response.json();
      if (response.ok && data.success) setComments(data.comments ?? []);
    } catch { setNotice("Unable to load comments."); }
  }

  async function toggleComments() {
    const next = !showComments; setShowComments(next);
    if (next) await loadComments();
  }

  async function addComment(event: React.FormEvent) {
    event.preventDefault(); if (!comment.trim() || commentBusy) return;
    setCommentBusy(true); setNotice("");
    try {
      const response = await fetch(`/api/posts/${post.id}/comments`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: comment }) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Unable to comment.");
      setComments((current) => [...current, data.comment]); setComment("");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Unable to comment."); }
    finally { setCommentBusy(false); }
  }

  async function sharePost() {
    const url = `${window.location.origin}/posts/${post.id}`;
    try {
      if (navigator.share) await navigator.share({ title: `@${post.author.username} on Revvam`, text: post.content.slice(0, 120), url });
      else { await navigator.clipboard.writeText(url); setNotice("Post link copied."); }
    } catch { /* user cancelled share */ }
  }

  return <article className="overflow-hidden rounded-3xl border border-white/[0.07] bg-white/[0.025] transition hover:border-white/[0.12]">
    <div className="p-5 sm:p-6">
      <Link href={`/users/${encodeURIComponent(post.author.username)}`} className="flex items-center gap-3">
        {post.author.image ? <img src={post.author.image} alt="" className="h-10 w-10 rounded-full object-cover" /> : <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-600/15 text-xs font-bold text-red-300">{post.author.name.charAt(0).toUpperCase()}</div>}
        <div className="min-w-0"><p className="truncate text-sm font-semibold">{post.author.name}</p><p className="truncate text-xs text-white/25">@{post.author.username} · {formatDate(post.createdAt)}</p></div>
      </Link>
      <p className="mt-5 whitespace-pre-wrap text-[15px] leading-7 text-white/75">{post.content}</p>
      {post.mentions?.length ? <div className="mt-3 flex flex-wrap gap-1.5">{post.mentions.map(({ mentionedUser }) => <Link key={mentionedUser.username} href={`/users/${encodeURIComponent(mentionedUser.username)}`} className="rounded-full border border-red-400/15 bg-red-500/[0.06] px-2.5 py-1 text-[10px] text-red-300">@{mentionedUser.username}</Link>)}</div> : null}
    </div>
    {post.image && <div className="max-h-[620px] overflow-hidden border-t border-white/[0.06] bg-black"><img src={post.image} alt="Post" className="mx-auto max-h-[620px] w-full object-contain" /></div>}
    {post.video && <div className="overflow-hidden border-t border-white/[0.06] bg-black"><video src={post.video} controls playsInline preload="metadata" className="max-h-[620px] w-full" /></div>}
    <div className="flex items-center gap-1 border-t border-white/[0.06] px-4 py-2 sm:px-5">
      <button type="button" onClick={toggleLike} disabled={busy} className={`flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl text-xs font-semibold transition ${liked ? "text-red-300" : "text-white/35 hover:bg-white/[0.04] hover:text-white"}`}><span className="text-base">{liked ? "♥" : "♡"}</span>{likes || "Like"}</button>
      <button type="button" onClick={toggleComments} className="flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl text-xs font-semibold text-white/35 transition hover:bg-white/[0.04] hover:text-white"><span className="text-base">○</span>{post._count?.comments || comments.length || "Comment"}</button>
      <button type="button" onClick={sharePost} className="flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl text-xs font-semibold text-white/35 transition hover:bg-white/[0.04] hover:text-white"><span className="text-base">↗</span>Share</button>
    </div>
    {showComments && <div className="border-t border-white/[0.06] px-4 pb-4 pt-3 sm:px-5">
      <div className="space-y-3">{comments.map((item) => <div key={item.id} className="rounded-2xl bg-white/[0.025] p-3"><div className="flex items-center gap-2"><span className="text-xs font-semibold">@{item.author.username}</span><span className="text-[9px] text-white/20">{formatDate(item.createdAt)}</span></div><p className="mt-1 text-xs leading-5 text-white/55">{item.content}</p></div>)}</div>
      <form onSubmit={addComment} className="mt-3 flex gap-2"><input value={comment} onChange={(e) => setComment(e.target.value)} maxLength={1000} placeholder="Write a comment..." className="min-w-0 flex-1 rounded-2xl border border-white/[0.08] bg-black/30 px-4 py-2.5 text-xs text-white outline-none placeholder:text-white/20 focus:border-red-400/25" /><button disabled={!comment.trim() || commentBusy} className="rounded-2xl border border-red-400/20 bg-red-600/15 px-4 text-xs font-semibold text-red-200 disabled:opacity-40">{commentBusy ? "..." : "Post"}</button></form>
    </div>}
    {notice && <p className="border-t border-white/[0.06] px-5 py-2 text-[10px] text-red-300">{notice}</p>}
  </article>;
}

function formatDate(value: string) { return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(value)); }

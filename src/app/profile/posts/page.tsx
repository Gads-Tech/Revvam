"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import MobileNav from "@/components/MobileNav";

type Post = {
  id: string;
  content: string;
  image: string | null;
  createdAt: string;
  author: { name: string; username: string; image: string | null };
};

export default function DriverPostsPage() {
  const [content, setContent] = useState("");
  const [image, setImage] = useState("");
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadPosts() {
    try {
      const response = await fetch("/api/posts", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error);
      setPosts(data.posts ?? []);
    } catch (loadError) {
      console.error(loadError);
      setError("Unable to load posts.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPosts();
  }, []);

  async function createPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!content.trim() || saving) return;

    try {
      setSaving(true);
      setError("");
      const response = await fetch("/api/posts", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, image: image || null }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        setError(data.error || "Unable to publish post.");
        return;
      }
      setPosts((current) => [data.post, ...current]);
      setContent("");
      setImage("");
    } catch (saveError) {
      console.error(saveError);
      setError("Unable to publish post.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-black px-4 pb-32 pt-7 text-white sm:px-6 sm:pt-10">
      <div className="relative z-10 mx-auto w-full max-w-3xl">
        <Link href="/profile" className="text-sm text-white/35 hover:text-white">← Back to profile</Link>

        <header className="mt-7">
          <p className="text-xs uppercase tracking-[0.22em] text-red-400/70">Driver posts</p>
          <h1 className="mt-2 text-4xl font-black tracking-[-0.045em]">Your posts</h1>
          <p className="mt-3 text-sm leading-6 text-white/35">Share your cars, builds, progress, events, and life with the Revvam community.</p>
        </header>

        <form onSubmit={createPost} className="mt-7 rounded-[2rem] border border-white/[0.08] bg-white/[0.025] p-5 backdrop-blur-2xl sm:p-6">
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            maxLength={2000}
            placeholder="What are you working on?"
            className="min-h-36 w-full resize-none rounded-2xl border border-white/[0.08] bg-black/30 p-4 text-sm leading-6 text-white outline-none placeholder:text-white/20 focus:border-red-400/25"
          />
          <input
            value={image}
            onChange={(event) => setImage(event.target.value)}
            placeholder="Optional image URL"
            className="mt-3 h-11 w-full rounded-2xl border border-white/[0.08] bg-black/30 px-4 text-sm text-white outline-none placeholder:text-white/20 focus:border-red-400/25"
          />
          {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="text-xs text-white/20">{content.length}/2000</span>
            <button type="submit" disabled={!content.trim() || saving} className="rounded-2xl border border-red-400/25 bg-red-600/20 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-500/30 disabled:opacity-40">
              {saving ? "Publishing..." : "Publish post"}
            </button>
          </div>
        </form>

        <section className="mt-7 space-y-3">
          {loading ? (
            <div className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-8 text-center text-sm text-white/25">Loading posts...</div>
          ) : posts.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/[0.08] p-10 text-center text-sm text-white/25">You have not posted anything yet.</div>
          ) : posts.map((post) => (
            <article key={post.id} className="rounded-3xl border border-white/[0.07] bg-white/[0.025] p-5">
              <Link href={`/users/${encodeURIComponent(post.author.username)}`} className="flex items-center gap-3">
                {post.author.image ? <img src={post.author.image} alt={post.author.name} className="h-9 w-9 rounded-full object-cover" /> : <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-600/15 text-xs font-bold text-red-300">{post.author.name.charAt(0).toUpperCase()}</div>}
                <div><p className="text-sm font-semibold">{post.author.name}</p><p className="text-xs text-white/25">@{post.author.username}</p></div>
              </Link>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-white/60">{post.content}</p>
              {post.image && <img src={post.image} alt="Post" className="mt-4 max-h-[520px] w-full rounded-2xl object-cover" />}
            </article>
          ))}
        </section>
      </div>
      <MobileNav />
    </main>
  );
}

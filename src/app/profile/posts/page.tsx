"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import MobileNav from "@/components/MobileNav";
import PostCard, { PostData } from "@/components/PostCard";
import PostComposer from "@/components/PostComposer";
import BackButton from "@/components/BackButton";

export default function DriverPostsPage() {
  const [posts, setPosts] = useState<PostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadPosts() {
    try {
      const response = await fetch("/api/posts", { cache: "no-store", credentials: "include" });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Unable to load posts.");
      setPosts(data.posts ?? []);
    } catch (loadError) { console.error(loadError); setError("Unable to load posts."); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadPosts(); }, []);

  return <main className="min-h-screen overflow-x-hidden bg-black px-4 pb-32 pt-7 text-white sm:px-6 sm:pt-10">
    <div className="relative z-10 mx-auto w-full max-w-3xl">
      <BackButton />
      <header className="mt-7"><p className="text-xs uppercase tracking-[0.22em] text-red-400/70">Driver posts</p><h1 className="mt-2 text-4xl font-black tracking-[-0.045em]">Your posts</h1><p className="mt-3 text-sm leading-6 text-white/35">Share your cars, builds, progress, events, and life with the Revvam community.</p></header>
      <div className="mt-7"><PostComposer onCreated={(post) => setPosts((current) => [post, ...current])} /></div>
      {error && <p className="mt-4 text-sm text-red-300">{error}</p>}
      <section className="mt-7 space-y-4">
        {loading ? <div className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-8 text-center text-sm text-white/25">Loading posts...</div> : posts.length === 0 ? <div className="rounded-3xl border border-dashed border-white/[0.08] p-10 text-center text-sm text-white/25">You have not posted anything yet.</div> : posts.map((post) => <PostCard key={post.id} post={post} />)}
      </section>
    </div>
    <MobileNav />
  </main>;
}

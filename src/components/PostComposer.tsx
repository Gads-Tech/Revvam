"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { CloseIcon, ImageIcon, SendIcon, UserIcon, VideoIcon } from "@/components/icons";
import type { PostData } from "@/components/PostCard";

type TagUser = { id: string; name: string; username: string; image: string | null };

export default function PostComposer({ onCreated }: { onCreated: (post: PostData) => void }) {
  const [content, setContent] = useState("");
  const [image, setImage] = useState("");
  const [video, setVideo] = useState("");
  const [tagQuery, setTagQuery] = useState("");
  const [tagged, setTagged] = useState<TagUser[]>([]);
  const [suggestions, setSuggestions] = useState<TagUser[]>([]);
  const [showTags, setShowTags] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const imageInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const query = tagQuery.trim();
    if (!query) { setSuggestions([]); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/users/search?q=${encodeURIComponent(query.replace(/^@/, ""))}`, { signal: controller.signal, credentials: "include" });
        const data = await response.json();
        if (response.ok && data.success) setSuggestions((data.users ?? []).filter((u: TagUser) => !tagged.some((t) => t.id === u.id)));
      } catch { /* cancelled */ }
    }, 180);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [tagQuery, tagged]);

  async function readFile(file: File, maxBytes: number) {
    if (file.size > maxBytes) throw new Error(`That file is too large. Maximum is ${Math.round(maxBytes / 1024 / 1024)}MB.`);
    return await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error("Unable to read file.")); reader.readAsDataURL(file); });
  }

  async function chooseImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file) return;
    try { setError(""); setVideo(""); setImage(await readFile(file, 4 * 1024 * 1024)); } catch (e) { setError(e instanceof Error ? e.message : "Unable to add image."); }
    event.target.value = "";
  }

  async function chooseVideo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file) return;
    try { setError(""); setImage(""); setVideo(await readFile(file, 8 * 1024 * 1024)); } catch (e) { setError(e instanceof Error ? e.message : "Unable to add video."); }
    event.target.value = "";
  }

  function addTag(user: TagUser) { setTagged((current) => [...current, user]); setTagQuery(""); setShowTags(false); }

  async function createPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!content.trim() || saving) return;
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/posts", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content, image: image || null, video: video || null, mentionedUserIds: tagged.map((user) => user.id) }) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Unable to publish post.");
      onCreated(data.post); setContent(""); setImage(""); setVideo(""); setTagged([]); setTagQuery("");
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to publish post."); }
    finally { setSaving(false); }
  }

  return <form onSubmit={createPost} className="rounded-[2rem] border border-white/[0.08] bg-white/[0.025] p-5 backdrop-blur-2xl sm:p-6">
    <textarea value={content} onChange={(e) => setContent(e.target.value)} maxLength={2000} placeholder="What are you working on? Share a build, photo, video or car story..." className="min-h-32 w-full resize-none rounded-2xl border border-white/[0.08] bg-black/30 p-4 text-sm leading-6 text-white outline-none placeholder:text-white/20 focus:border-red-400/25" />
    {(image || video) && <div className="relative mt-3 overflow-hidden rounded-2xl border border-white/[0.08] bg-black">{image ? <img src={image} alt="Preview" className="max-h-80 w-full object-contain" /> : <video src={video} controls playsInline className="max-h-80 w-full" />}<button type="button" onClick={() => { setImage(""); setVideo(""); }} className="absolute right-2 top-2 flex items-center gap-1.5 rounded-full border border-white/10 bg-black/80 px-3 py-1.5 text-xs text-white/80"><CloseIcon className="h-3.5 w-3.5" />Remove</button></div>}
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <input ref={imageInput} type="file" accept="image/*" className="hidden" onChange={chooseImage} />
      <input ref={videoInput} type="file" accept="video/*" className="hidden" onChange={chooseVideo} />
      <button type="button" onClick={() => imageInput.current?.click()} className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 py-2 text-xs font-semibold text-white/55 hover:text-white"><ImageIcon className="h-4 w-4" /> Photo</button>
      <button type="button" onClick={() => videoInput.current?.click()} className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 py-2 text-xs font-semibold text-white/55 hover:text-white"><VideoIcon className="h-4 w-4" /> Video</button>
      <div className="relative"><input value={tagQuery} onFocus={() => setShowTags(true)} onChange={(e) => { setTagQuery(e.target.value); setShowTags(true); }} placeholder="@ Tag someone" className="h-9 w-36 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 text-xs text-white outline-none placeholder:text-white/25 focus:border-red-400/25" />{showTags && tagQuery && suggestions.length > 0 && <div className="absolute left-0 top-11 z-30 w-64 overflow-hidden rounded-2xl border border-white/10 bg-[#090909] p-1 shadow-2xl">{suggestions.map((user) => <button key={user.id} type="button" onClick={() => addTag(user)} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left hover:bg-white/[0.06]"><span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-red-600/15 text-[10px] text-red-300">{user.image ? <img src={user.image} alt="" className="h-full w-full object-cover" /> : user.username.charAt(0).toUpperCase()}</span><span><span className="block text-xs font-semibold text-white/80">{user.name}</span><span className="block text-[10px] text-white/30">@{user.username}</span></span></button>)}</div>}</div>
    </div>
    {tagged.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{tagged.map((user) => <button key={user.id} type="button" onClick={() => setTagged((current) => current.filter((item) => item.id !== user.id))} className="inline-flex items-center gap-1 rounded-full border border-red-400/15 bg-red-500/[0.06] px-2.5 py-1 text-[10px] text-red-300">@{user.username}<CloseIcon className="h-3 w-3" /></button>)}</div>}
    {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
    <div className="mt-4 flex items-center justify-between gap-3"><span className="text-xs text-white/20">{content.length}/2000</span><button type="submit" disabled={!content.trim() || saving} className="rounded-2xl border border-red-400/25 bg-red-600/20 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-500/30 disabled:opacity-40">{saving ? "Publishing..." : "Publish post"}</button></div>
  </form>;
}

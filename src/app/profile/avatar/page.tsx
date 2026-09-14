"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import MobileNav from "@/components/MobileNav";

export default function ProfileAvatarPage() {
  const [image, setImage] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetch("/api/profile", { credentials: "include", cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.error || "Unable to load profile.");
        setImage(data.user.image ?? null);
        setPreview(data.user.image ?? null);
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Unable to load profile."))
      .finally(() => setLoading(false));
  }, []);

  function handleFile(file: File | undefined) {
    setError("");
    setSuccess("");
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > 2_000_000) {
      setError("Please choose an image smaller than 2MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPreview(String(reader.result));
    reader.readAsDataURL(file);
  }

  async function save() {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/profile/avatar", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: preview }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Unable to save photo.");
      setImage(data.image ?? null);
      setPreview(data.image ?? null);
      setSuccess("Profile photo updated.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save photo.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    setPreview(null);
    setError("");
    setSuccess("");
  }

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center bg-black text-white"><div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-red-500" /></main>;
  }

  return (
    <main className="min-h-screen bg-black px-5 py-8 pb-32 text-white sm:px-8">
      <div className="mx-auto max-w-xl">
        <Link href="/profile" className="text-sm text-white/35 hover:text-white">← Back to profile</Link>
        <section className="mt-6 rounded-[2rem] border border-white/[0.08] bg-white/[0.025] p-6 backdrop-blur-2xl sm:p-8">
          <p className="text-xs uppercase tracking-[0.22em] text-red-400/70">Profile identity</p>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.04em]">Profile photo</h1>
          <p className="mt-3 text-sm leading-6 text-white/35">Choose the photo people will see beside your name across Revvam.</p>

          <div className="mt-8 flex flex-col items-center">
            <div className="flex h-40 w-40 items-center justify-center overflow-hidden rounded-[2.5rem] border border-white/[0.10] bg-white/[0.04] text-5xl font-black text-red-300">
              {preview ? <img src={preview} alt="Profile preview" className="h-full w-full object-cover" /> : "R"}
            </div>

            <label className="mt-6 inline-flex h-12 cursor-pointer items-center justify-center rounded-2xl border border-red-400/25 bg-red-600/15 px-6 text-sm font-semibold text-white hover:bg-red-500/25">
              Choose photo
              <input type="file" accept="image/*" className="hidden" onChange={(event) => handleFile(event.target.files?.[0])} />
            </label>

            {preview && (
              <button type="button" onClick={remove} className="mt-3 text-xs font-medium text-white/30 hover:text-red-300">Remove photo</button>
            )}
          </div>

          {error && <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-sm text-red-300">{error}</div>}
          {success && <div className="mt-6 rounded-2xl border border-green-500/20 bg-green-500/[0.06] px-4 py-3 text-sm text-green-300">{success}</div>}

          <button type="button" onClick={save} disabled={saving || preview === image} className="mt-6 h-13 w-full rounded-2xl border border-red-400/25 bg-red-600/20 px-5 text-sm font-semibold text-white transition hover:bg-red-500/30 disabled:cursor-not-allowed disabled:opacity-40">
            {saving ? "Saving..." : "Save profile photo"}
          </button>
        </section>
      </div>
      <MobileNav />
    </main>
  );
}

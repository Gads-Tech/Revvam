"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import MobileNav from "@/components/MobileNav";

const MAX_FILE_SIZE = 2_000_000;
const MAX_DATA_URL_LENGTH = 3_000_000;

function readImage(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Unable to read that image."));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to process that image."));
    image.src = src;
  });
}

async function cropImage(src: string, zoom: number, offsetX: number, offsetY: number) {
  const source = await loadImage(src);
  const size = 640;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Your browser could not prepare the photo.");

  const scale = Math.max(size / source.naturalWidth, size / source.naturalHeight) * zoom;
  const width = source.naturalWidth * scale;
  const height = source.naturalHeight * scale;
  context.fillStyle = "#090909";
  context.fillRect(0, 0, size, size);
  context.drawImage(source, (size - width) / 2 + offsetX, (size - height) / 2 + offsetY, width, height);
  return canvas.toDataURL("image/jpeg", 0.9);
}

export default function ProfileAvatarPage() {
  const [image, setImage] = useState<string | null>(null);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [cropSource, setCropSource] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
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
        setOriginalImage(data.user.image ?? null);
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Unable to load profile."))
      .finally(() => setLoading(false));
  }, []);

  const previewStyle = useMemo(() => ({
    transform: `translate(${offsetX / 4}px, ${offsetY / 4}px) scale(${zoom})`,
  }), [offsetX, offsetY, zoom]);

  async function handleFile(file: File | undefined) {
    setError("");
    setSuccess("");
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError("Please choose an image file.");
    if (file.size > MAX_FILE_SIZE) return setError("Please choose an image smaller than 2MB.");
    try {
      setCropSource(await readImage(file));
      setZoom(1);
      setOffsetX(0);
      setOffsetY(0);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to read that image.");
    }
  }

  async function applyCrop() {
    if (!cropSource) return;
    try {
      setError("");
      setImage(await cropImage(cropSource, zoom, offsetX, offsetY));
      setCropSource(null);
    } catch (cropError) {
      setError(cropError instanceof Error ? cropError.message : "Unable to crop that image.");
    }
  }

  async function save() {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      if (image && image.length > MAX_DATA_URL_LENGTH) throw new Error("Profile photo is too large. Please choose a smaller image.");
      const response = await fetch("/api/profile/avatar", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Unable to save photo.");
      setImage(data.image ?? null);
      setOriginalImage(data.image ?? null);
      setSuccess("Profile photo updated.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save photo.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <main className="flex min-h-screen items-center justify-center bg-black text-white"><div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-red-500" /></main>;

  return (
    <main className="min-h-screen bg-black px-5 py-8 pb-32 text-white sm:px-8">
      <div className="mx-auto max-w-xl">
        <Link href="/profile" className="text-sm text-white/35 hover:text-white">← Back to profile</Link>
        <section className="mt-6 rounded-[2rem] border border-white/[0.08] bg-white/[0.025] p-6 backdrop-blur-2xl sm:p-8">
          <p className="text-xs uppercase tracking-[0.22em] text-red-400/70">Profile identity</p>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.04em]">Profile photo</h1>
          <p className="mt-3 text-sm leading-6 text-white/35">Choose, crop and scale the photo people see beside your name across Revvam.</p>

          <div className="mt-8 flex flex-col items-center">
            <div className="flex h-40 w-40 items-center justify-center overflow-hidden rounded-full border border-white/[0.10] bg-white/[0.04] text-5xl font-black text-red-300">
              {image ? <img src={image} alt="Profile preview" className="h-full w-full object-cover" /> : "R"}
            </div>
            <label className="mt-6 inline-flex h-12 cursor-pointer items-center justify-center rounded-2xl border border-red-400/25 bg-red-600/15 px-6 text-sm font-semibold text-white hover:bg-red-500/25">
              Choose photo
              <input type="file" accept="image/*" className="hidden" onChange={(event) => handleFile(event.target.files?.[0])} />
            </label>
            {image && <button type="button" onClick={() => setImage(null)} className="mt-3 text-xs font-medium text-white/30 hover:text-red-300">Remove photo</button>}
          </div>

          {cropSource && (
            <div className="mt-7 rounded-2xl border border-white/[0.08] bg-black/40 p-4">
              <div className="flex flex-col items-center">
                <div className="relative h-64 w-64 overflow-hidden rounded-full border-2 border-red-500/40 bg-black sm:h-72 sm:w-72">
                  <img src={cropSource} alt="Crop preview" className="absolute left-1/2 top-1/2 h-full w-full max-w-none -translate-x-1/2 -translate-y-1/2 object-cover" style={previewStyle} />
                  <div className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-white/20" />
                </div>
                <p className="mt-3 text-center text-xs text-white/30">Adjust the crop until it looks right.</p>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <label className="text-xs text-white/45">Scale<input aria-label="Photo scale" type="range" min="1" max="3" step="0.01" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} className="mt-2 w-full accent-red-500" /></label>
                <label className="text-xs text-white/45">Horizontal<input aria-label="Horizontal photo position" type="range" min="-260" max="260" value={offsetX} onChange={(event) => setOffsetX(Number(event.target.value))} className="mt-2 w-full accent-red-500" /></label>
                <label className="text-xs text-white/45">Vertical<input aria-label="Vertical photo position" type="range" min="-260" max="260" value={offsetY} onChange={(event) => setOffsetY(Number(event.target.value))} className="mt-2 w-full accent-red-500" /></label>
              </div>
              <div className="mt-4 flex flex-wrap justify-end gap-2">
                <button type="button" onClick={() => { setZoom(1); setOffsetX(0); setOffsetY(0); }} className="rounded-xl border border-white/[0.08] px-4 py-2 text-xs font-medium text-white/40 hover:text-white">Reset</button>
                <button type="button" onClick={() => setCropSource(null)} className="rounded-xl border border-white/[0.08] px-4 py-2 text-xs font-medium text-white/40 hover:text-white">Cancel</button>
                <button type="button" onClick={applyCrop} className="rounded-xl border border-red-400/25 bg-red-600/15 px-4 py-2 text-xs font-semibold text-white hover:bg-red-500/25">Use cropped photo</button>
              </div>
            </div>
          )}

          {error && <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-sm text-red-300">{error}</div>}
          {success && <div className="mt-6 rounded-2xl border border-green-500/20 bg-green-500/[0.06] px-4 py-3 text-sm text-green-300">{success}</div>}
          <button type="button" onClick={save} disabled={saving || cropSource !== null || image === originalImage} className="mt-6 h-13 w-full rounded-2xl border border-red-400/25 bg-red-600/20 px-5 text-sm font-semibold text-white transition hover:bg-red-500/30 disabled:cursor-not-allowed disabled:opacity-40">
            {saving ? "Saving..." : "Save profile photo"}
          </button>
        </section>
      </div>
      <MobileNav />
    </main>
  );
}

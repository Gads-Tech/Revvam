"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import AuthLayout from "@/components/AuthLayout";
import FormInput from "@/components/FormInput";
import GlassButton from "@/components/GlassButton";

const AVATAR_MAX_BYTES = 2_000_000;
const AVATAR_MAX_DATA_URL_LENGTH = 3_000_000;

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

async function createCroppedAvatar(src: string, zoom: number, offsetX: number, offsetY: number) {
  const image = await loadImage(src);
  const canvas = document.createElement("canvas");
  const size = 640;
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Your browser could not prepare the photo.");

  const scale = Math.max(size / image.naturalWidth, size / image.naturalHeight) * zoom;
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  const x = (size - width) / 2 + offsetX;
  const y = (size - height) / 2 + offsetY;

  context.fillStyle = "#090909";
  context.fillRect(0, 0, size, size);
  context.drawImage(image, x, y, width, height);

  return canvas.toDataURL("image/jpeg", 0.9);
}

export default function EditProfilePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [cropSource, setCropSource] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [serverError, setServerError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/profile", { credentials: "include", cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || !data.success) {
          router.replace("/login");
          return;
        }
        if (!cancelled) {
          setName(data.user.name ?? "");
          setUsername(data.user.username ?? "");
          setBio(data.user.bio ?? "");
          setImage(data.user.image ?? null);
          setOriginalImage(data.user.image ?? null);
        }
      })
      .catch(() => {
        if (!cancelled) setServerError("Unable to load your profile.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [router]);

  const cropPreviewStyle = useMemo(() => ({
    transform: `translate(${offsetX / 4}px, ${offsetY / 4}px) scale(${zoom})`,
  }), [offsetX, offsetY, zoom]);

  function resetCrop() {
    setZoom(1);
    setOffsetX(0);
    setOffsetY(0);
  }

  async function handleAvatarFile(file: File | undefined) {
    if (!file) return;
    setServerError("");
    setSuccessMessage("");
    if (!file.type.startsWith("image/")) {
      setServerError("Please choose an image file.");
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      setServerError("Profile photo must be smaller than 2MB.");
      return;
    }

    try {
      const source = await readImage(file);
      setCropSource(source);
      setZoom(1);
      setOffsetX(0);
      setOffsetY(0);
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "Unable to read that image.");
    }
  }

  async function applyCrop() {
    if (!cropSource) return;
    try {
      setServerError("");
      const cropped = await createCroppedAvatar(cropSource, zoom, offsetX, offsetY);
      setImage(cropped);
      setCropSource(null);
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "Unable to crop that image.");
    }
  }

  async function saveAvatar() {
    if (image === originalImage) return;
    setAvatarSaving(true);
    setServerError("");
    setSuccessMessage("");
    try {
      if (image && image.length > AVATAR_MAX_DATA_URL_LENGTH) {
        throw new Error("Profile photo is too large. Please choose a smaller image.");
      }
      const response = await fetch("/api/profile/avatar", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Unable to update photo.");
      setImage(data.image ?? null);
      setOriginalImage(data.image ?? null);
      setSuccessMessage("Profile photo updated.");
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "Unable to update photo.");
      throw error;
    } finally {
      setAvatarSaving(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError("");
    setSuccessMessage("");
    const cleanName = name.trim();
    const cleanUsername = username.trim();
    const cleanBio = bio.trim();

    if (!cleanName) return setServerError("Enter your name.");
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(cleanUsername)) return setServerError("Username must be 3-30 characters using only letters, numbers, and underscores.");
    if (cleanBio.length > 500) return setServerError("Bio must be 500 characters or less.");

    try {
      setSaving(true);

      const response = await fetch("/api/profile/update", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: cleanName, username: cleanUsername, bio: cleanBio }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Unable to update your profile.");

      // Save a newly selected/cropped avatar as part of Save changes too.
      // This means users do not lose their photo if they forget the smaller Save photo button.
      if (image !== originalImage) {
        await saveAvatar();
      }

      setSuccessMessage("Profile updated successfully.");
      window.setTimeout(() => { router.push("/profile"); router.refresh(); }, 600);
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "Unable to connect to Revvam.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center bg-black text-white"><div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-red-500" /></main>;
  }

  return (
    <AuthLayout title="Edit profile" subtitle="Update the information people see on your Revvam profile.">
      <div className="mb-7 rounded-3xl border border-white/[0.08] bg-white/[0.025] p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/[0.10] bg-red-600/[0.10] text-2xl font-black text-red-300">
            {image ? <img src={image} alt="Profile preview" className="h-full w-full object-cover" /> : name.charAt(0).toUpperCase() || "R"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-[0.18em] text-white/25">Profile photo</p>
            <p className="mt-1 text-sm text-white/35">Crop and scale your photo before people see it across Revvam.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <label className="inline-flex cursor-pointer items-center rounded-xl border border-red-400/20 bg-red-500/[0.08] px-3 py-2 text-xs font-semibold text-red-300">
                Choose photo
                <input type="file" accept="image/*" className="hidden" onChange={(event) => handleAvatarFile(event.target.files?.[0])} />
              </label>
              <button type="button" onClick={() => { setImage(null); setCropSource(null); }} className="rounded-xl border border-white/[0.08] px-3 py-2 text-xs font-medium text-white/35 hover:text-white">Remove</button>
              <button type="button" onClick={saveAvatar} disabled={avatarSaving || image === originalImage || saving} className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white/60 disabled:opacity-40">{avatarSaving ? "Saving..." : "Save photo"}</button>
            </div>
          </div>
        </div>

        {cropSource && (
          <div className="mt-6 rounded-2xl border border-white/[0.08] bg-black/40 p-4">
            <div className="flex flex-col items-center">
              <div className="relative h-64 w-64 overflow-hidden rounded-full border-2 border-red-500/40 bg-black shadow-2xl sm:h-72 sm:w-72">
                <img src={cropSource} alt="Crop preview" className="absolute left-1/2 top-1/2 h-full w-full max-w-none -translate-x-1/2 -translate-y-1/2 object-cover" style={cropPreviewStyle} />
                <div className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-white/20" />
              </div>
              <p className="mt-3 text-center text-xs text-white/30">The circle is your final profile photo crop.</p>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <label className="text-xs text-white/45">Scale
                <input aria-label="Photo scale" type="range" min="1" max="3" step="0.01" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} className="mt-2 w-full accent-red-500" />
              </label>
              <label className="text-xs text-white/45">Horizontal position
                <input aria-label="Horizontal photo position" type="range" min="-260" max="260" step="1" value={offsetX} onChange={(event) => setOffsetX(Number(event.target.value))} className="mt-2 w-full accent-red-500" />
              </label>
              <label className="text-xs text-white/45">Vertical position
                <input aria-label="Vertical photo position" type="range" min="-260" max="260" step="1" value={offsetY} onChange={(event) => setOffsetY(Number(event.target.value))} className="mt-2 w-full accent-red-500" />
              </label>
            </div>

            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button type="button" onClick={resetCrop} className="rounded-xl border border-white/[0.08] px-4 py-2 text-xs font-medium text-white/40 hover:text-white">Reset</button>
              <button type="button" onClick={() => setCropSource(null)} className="rounded-xl border border-white/[0.08] px-4 py-2 text-xs font-medium text-white/40 hover:text-white">Cancel</button>
              <button type="button" onClick={applyCrop} className="rounded-xl border border-red-400/25 bg-red-600/15 px-4 py-2 text-xs font-semibold text-white hover:bg-red-500/25">Use cropped photo</button>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <FormInput label="Name" type="text" name="name" autoComplete="name" placeholder="Your name" value={name} onChange={(event) => setName(event.target.value)} disabled={saving} />
        <FormInput label="Username" type="text" name="username" autoComplete="username" placeholder="Your username" value={username} onChange={(event) => setUsername(event.target.value)} disabled={saving} />
        <div>
          <label htmlFor="bio" className="mb-2 block text-sm font-medium text-white/60">Bio</label>
          <textarea id="bio" name="bio" placeholder="Tell the Revvam community about yourself..." value={bio} onChange={(event) => setBio(event.target.value)} disabled={saving} maxLength={500} rows={5} className="w-full resize-none rounded-2xl border border-white/[0.12] bg-white/[0.045] px-5 py-4 text-base text-white outline-none placeholder:text-white/25 focus:border-red-500/50 focus:bg-white/[0.07] focus:ring-1 focus:ring-red-500/30 disabled:opacity-50" />
          <div className="mt-2 flex justify-end text-[10px] text-white/20">{bio.length}/500</div>
        </div>
        {serverError && <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-sm text-red-300">{serverError}</div>}
        {successMessage && <div className="rounded-2xl border border-green-500/20 bg-green-500/[0.06] px-4 py-3 text-sm text-green-300">{successMessage}</div>}
        <GlassButton type="submit" variant="primary" disabled={saving || Boolean(cropSource)} className="w-full">{saving ? "Saving..." : "Save changes"}</GlassButton>
        <Link href="/profile" className="flex h-14 w-full items-center justify-center rounded-2xl border border-white/[0.10] bg-white/[0.025] text-sm font-medium text-white/50 hover:bg-white/[0.06] hover:text-white">Cancel</Link>
      </form>
    </AuthLayout>
  );
}

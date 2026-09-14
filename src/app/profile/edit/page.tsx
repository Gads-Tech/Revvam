"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import AuthLayout from "@/components/AuthLayout";
import FormInput from "@/components/FormInput";
import GlassButton from "@/components/GlassButton";

export default function EditProfilePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [image, setImage] = useState<string | null>(null);
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

  function handleAvatarFile(file: File | undefined) {
    if (!file) return;
    setServerError("");
    if (!file.type.startsWith("image/")) {
      setServerError("Please choose an image file.");
      return;
    }
    if (file.size > 2_000_000) {
      setServerError("Profile photo must be smaller than 2MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImage(String(reader.result));
    reader.readAsDataURL(file);
  }

  async function saveAvatar() {
    setAvatarSaving(true);
    setServerError("");
    setSuccessMessage("");
    try {
      const response = await fetch("/api/profile/avatar", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Unable to update photo.");
      setImage(data.image ?? null);
      setSuccessMessage("Profile photo updated.");
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "Unable to update photo.");
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
            <p className="mt-1 text-sm text-white/35">This appears beside your name across Revvam.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <label className="inline-flex cursor-pointer items-center rounded-xl border border-red-400/20 bg-red-500/[0.08] px-3 py-2 text-xs font-semibold text-red-300">
                Choose photo
                <input type="file" accept="image/*" className="hidden" onChange={(event) => handleAvatarFile(event.target.files?.[0])} />
              </label>
              <button type="button" onClick={() => setImage(null)} className="rounded-xl border border-white/[0.08] px-3 py-2 text-xs font-medium text-white/35 hover:text-white">Remove</button>
              <button type="button" onClick={saveAvatar} disabled={avatarSaving} className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white/60 disabled:opacity-40">{avatarSaving ? "Saving..." : "Save photo"}</button>
            </div>
          </div>
        </div>
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
        <GlassButton type="submit" variant="primary" disabled={saving} className="w-full">{saving ? "Saving..." : "Save changes"}</GlassButton>
        <Link href="/profile" className="flex h-14 w-full items-center justify-center rounded-2xl border border-white/[0.10] bg-white/[0.025] text-sm font-medium text-white/50 hover:bg-white/[0.06] hover:text-white">Cancel</Link>
      </form>
    </AuthLayout>
  );
}

"use client";

import { useRef, useState } from "react";

type ModificationPhoto = {
  id: string;
  modificationId: string;
  url: string;
  createdAt: string;
};

type Props = {
  vehicleId: string;
  modificationId: string;
  photos: ModificationPhoto[];
  onPhotosChange: (photos: ModificationPhoto[]) => void;
};

const ACCEPT = "image/jpeg,image/png,image/webp,image/gif";
const MAX_FILES = 10;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export default function ModificationPhotoManager({
  vehicleId,
  modificationId,
  photos,
  onPhotosChange,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [selected, setSelected] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  function handleSelection(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";

    if (!files.length) return;

    setError("");

    const valid = files.filter((file) => {
      if (!file.type.startsWith("image/")) return false;
      if (file.size > MAX_FILE_SIZE) return false;
      return true;
    });

    if (valid.length !== files.length) {
      setError("Only JPG, PNG, WEBP or GIF images up to 10 MB are allowed.");
    }

    const remaining = MAX_FILES - selected.length;
    const next = valid.slice(0, Math.max(remaining, 0));

    if (valid.length > next.length) {
      setError(`You can upload up to ${MAX_FILES} photos at once.`);
    }

    setSelected((current) => [...current, ...next]);
    setPreviews((current) => [
      ...current,
      ...next.map((file) => URL.createObjectURL(file)),
    ]);
  }

  function removeSelected(index: number) {
    URL.revokeObjectURL(previews[index]);
    setSelected((current) => current.filter((_, i) => i !== index));
    setPreviews((current) => current.filter((_, i) => i !== index));
  }

  async function upload() {
    if (!selected.length) return;

    try {
      setUploading(true);
      setError("");

      const formData = new FormData();
      selected.forEach((file) => formData.append("photos", file));

      const response = await fetch(
        `/api/vehicles/${vehicleId}/modifications/${modificationId}/photos`,
        {
          method: "POST",
          credentials: "include",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || "Unable to upload modification photos.");
        return;
      }

      const uploaded = Array.isArray(data.photos) ? data.photos : [];
      onPhotosChange([...uploaded, ...photos]);

      previews.forEach((url) => URL.revokeObjectURL(url));
      setSelected([]);
      setPreviews([]);
    } catch (error) {
      console.error("Upload modification photos error:", error);
      setError("Unable to upload modification photos.");
    } finally {
      setUploading(false);
    }
  }

  async function deletePhoto(photoId: string) {
    try {
      setDeletingId(photoId);
      setError("");

      const response = await fetch(
        `/api/vehicles/${vehicleId}/modifications/${modificationId}/photos?photoId=${encodeURIComponent(photoId)}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || "Unable to delete modification photo.");
        return;
      }

      onPhotosChange(photos.filter((photo) => photo.id !== photoId));
    } catch (error) {
      console.error("Delete modification photo error:", error);
      setError("Unable to delete modification photo.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="mt-5 border-t border-white/[0.06] pt-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-white/20">
            Modification photos
          </p>
          <p className="mt-1 text-xs text-white/20">
            Show the work, parts and finished result.
          </p>
        </div>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="rounded-xl border border-red-400/20 bg-red-500/[0.07] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-red-300 transition hover:border-red-400/35 hover:bg-red-500/[0.13] disabled:opacity-40"
        >
          + Add photos
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        onChange={handleSelection}
        className="hidden"
      />

      {photos.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="group relative aspect-[4/3] overflow-hidden rounded-2xl border border-white/[0.08] bg-black"
            >
              <img
                src={photo.url}
                alt="Modification"
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              />
              <button
                type="button"
                onClick={() => deletePhoto(photo.id)}
                disabled={deletingId === photo.id}
                aria-label="Delete modification photo"
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.12] bg-black/70 text-xs text-white/70 backdrop-blur-xl transition hover:bg-red-500/30 hover:text-red-300 disabled:opacity-40"
              >
                {deletingId === photo.id ? "…" : "×"}
              </button>
            </div>
          ))}
        </div>
      )}

      {selected.length > 0 && (
        <div className="mt-4 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {previews.map((preview, index) => (
              <div key={preview} className="relative aspect-[4/3] overflow-hidden rounded-xl bg-black">
                <img src={preview} alt="Selected modification preview" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeSelected(index)}
                  className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-lg bg-black/75 text-white/70 hover:bg-red-500/30 hover:text-red-300"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={upload}
            disabled={uploading}
            className="mt-3 h-10 w-full rounded-xl border border-red-400/25 bg-red-600/[0.18] text-xs font-semibold text-white transition hover:bg-red-500/[0.28] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {uploading ? "Uploading..." : `Upload ${selected.length} ${selected.length === 1 ? "photo" : "photos"}`}
          </button>
        </div>
      )}

      {error && (
        <p className="mt-3 rounded-xl border border-red-500/15 bg-red-500/[0.05] px-3 py-2 text-xs text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}

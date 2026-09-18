import { CarIcon, MechanicIcon, CameraIcon, ExpandIcon } from "@/components/icons";
"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useParams, useRouter } from "next/navigation";
import ModificationPhotoManager from "@/components/ModificationPhotoManager";

type VehiclePhoto = {
  id: string;
  vehicleId: string;
  url: string;
  createdAt: string;
};

type Vehicle = {
  id: string;
  make: string;
  model: string;
  year: number | null;
  type: string | null;
  image?: string | null;
  isFeatured: boolean;
  createdAt: string;
  photos?: VehiclePhoto[];
};

type MentionedUser = {
  id: string;
  name: string | null;
  username: string;
  image: string | null;
  role: string | null;
  onboardingType: string | null;
};

type VehicleModificationMention = {
  mentionedUser: MentionedUser;
};

type VehicleModification = {
  photos?: {
    id: string;
    modificationId: string;
    url: string;
    createdAt: string;
  }[];
  id: string;
  vehicleId: string;
  title: string;
  category: string;
  description: string | null;
  cost: number | null;
  installedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  mentions?: VehicleModificationMention[];
};

type PreviewPhoto = {
  id: string;
  file: File;
  previewUrl: string;
};

type ModificationForm = {
  title: string;
  category: string;
  description: string;
  cost: string;
  installedAt: string;
  notes: string;
};

const MODIFICATION_CATEGORIES = [
  "Performance",
  "Exterior",
  "Interior",
  "Wheels & Tires",
  "Suspension",
  "Exhaust",
  "Audio",
  "Lighting",
  "Engine",
  "Maintenance",
  "Other",
];

const EMPTY_MODIFICATION_FORM: ModificationForm = {
  title: "",
  category: "",
  description: "",
  cost: "",
  installedAt: "",
  notes: "",
};


function renderMentionedText(
  text: string,
  mentions: VehicleModificationMention[] = []
) {
  if (!text) {
    return null;
  }

  /*
   * Build a lookup using lowercase usernames.
   *
   * Lowercase is ONLY used for matching.
   * We NEVER use the lowercase value as the URL username.
   */
  const mentionedUsers = new Map<
    string,
    VehicleModificationMention["mentionedUser"]
  >();

  for (const mention of mentions) {
    const username =
      mention.mentionedUser?.username;

    if (!username) {
      continue;
    }

    mentionedUsers.set(
      username.toLowerCase(),
      mention.mentionedUser
    );
  }

  /*
   * Split normal text from @username mentions.
   */
  const parts = text.split(
    /(@[a-zA-Z0-9_.-]+)/g
  );

  return parts.map((part, index) => {
    /*
     * Normal text.
     */
    if (!part.startsWith("@")) {
      return (
        <span key={index}>
          {part}
        </span>
      );
    }

    /*
     * Keep the ORIGINAL username exactly as it was
     * written in the modification.
     *
     * Example:
     *
     * @dEMIgD
     *
     * usernameFromText = "dEMIgD"
     *
     * We do NOT convert this to "demigd".
     */
    const usernameFromText =
      part.slice(1);

    /*
     * Use lowercase ONLY to find the corresponding
     * database mention.
     */
    const mentionedUser =
      mentionedUsers.get(
        usernameFromText.toLowerCase()
      );

    /*
     * If the mention record exists, ALWAYS use the
     * canonical username returned by Prisma.
     *
     * This preserves:
     *
     * dEMIgD
     *
     * instead of:
     *
     * demigd
     *
     * If there is no mention record, fall back to
     * exactly what the user typed.
     */
    const targetUsername =
      mentionedUser?.username ||
      usernameFromText;

    return (
      <Link
        key={index}
        href={`/users/${encodeURIComponent(
          targetUsername
        )}`}
        className="
          relative
          z-20
          inline
          cursor-pointer
          font-medium
          text-red-400
          transition-colors
          hover:text-red-300
          hover:underline
          hover:underline-offset-4
        "
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        {part}
      </Link>
    );
  });
}

/*
 * =========================================================
 * RESOLVE @USERNAME MENTIONS
 * =========================================================
 *
 * The modification API accepts user IDs for mentions.
 * The form contains @usernames, so before saving we resolve
 * each username through the existing users search endpoint.
 */
async function resolveMentionedUserIds(
  text: string
): Promise<string[]> {
  const usernames = Array.from(
    new Set(
      (text.match(/@[a-zA-Z0-9_.-]+/g) || [])
        .map((mention) =>
          mention.slice(1).trim()
        )
        .filter(Boolean)
    )
  );

  if (usernames.length === 0) {
    return [];
  }

  const resolvedIds: string[] = [];

  for (const username of usernames) {
    try {
      const response = await fetch(
        `/api/users/search?q=${encodeURIComponent(
          username
        )}`,
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        }
      );

      if (!response.ok) {
        continue;
      }

      const data = await response.json();

      /*
       * Support the common response shapes used by the
       * existing users search endpoint.
       */
      const candidates = Array.isArray(
        data.users
      )
        ? data.users
        : Array.isArray(data.results)
        ? data.results
        : Array.isArray(data.data)
        ? data.data
        : [];

      const matchedUser = candidates.find(
        (candidate: {
          id?: string;
          username?: string;
        }) =>
          typeof candidate?.id === "string" &&
          typeof candidate?.username ===
            "string" &&
          candidate.username.toLowerCase() ===
            username.toLowerCase()
      );

      if (matchedUser?.id) {
        resolvedIds.push(matchedUser.id);
      }
    } catch (error) {
      console.error(
        `Unable to resolve @${username}:`,
        error
      );
    }
  }

  return Array.from(
    new Set(resolvedIds)
  );
}

export default function VehiclePage() {
  const params = useParams();
  const router = useRouter();

  const vehicleId = params.id as string;

  const fileInputRef =
    useRef<HTMLInputElement | null>(null);

  const [vehicle, setVehicle] =
    useState<Vehicle | null>(null);

  const [photos, setPhotos] =
    useState<VehiclePhoto[]>([]);

  const [previewPhotos, setPreviewPhotos] =
    useState<PreviewPhoto[]>([]);

  const [modifications, setModifications] =
    useState<VehicleModification[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [photosLoading, setPhotosLoading] =
    useState(true);

  const [modificationsLoading, setModificationsLoading] =
    useState(true);

  const [uploading, setUploading] =
    useState(false);

  const [savingModification, setSavingModification] =
    useState(false);

  const [deletingPhotoId, setDeletingPhotoId] =
    useState<string | null>(null);

 const [settingMainPhotoId, setSettingMainPhotoId] =
  useState<string | null>(null);

const [settingFeatured, setSettingFeatured] =
  useState(false);

const [deletingModificationId, setDeletingModificationId] =
  useState<string | null>(null);
  const [deleting, setDeleting] =
    useState(false);

  const [error, setError] =
    useState("");

  const [photoError, setPhotoError] =
    useState("");

  const [modificationError, setModificationError] =
    useState("");

  const [viewerIndex, setViewerIndex] =
    useState<number | null>(null);

  const [showModificationForm, setShowModificationForm] =
    useState(false);

  const [editingModificationId, setEditingModificationId] =
    useState<string | null>(null);

  const [modificationForm, setModificationForm] =
    useState<ModificationForm>(
      EMPTY_MODIFICATION_FORM
    );

  /*
   * =========================================================
   * LOAD VEHICLE
   * =========================================================
   */

  useEffect(() => {
    async function loadVehicle() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `/api/vehicles/${vehicleId}`,
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          setError(
            data.error ||
              "Unable to load this vehicle."
          );
          return;
        }

        setVehicle(data.vehicle);
      } catch (error) {
        console.error(
          "Unable to load vehicle:",
          error
        );

        setError(
          "Unable to load this vehicle."
        );
      } finally {
        setLoading(false);
      }
    }

    if (vehicleId) {
      loadVehicle();
    }
  }, [vehicleId]);

  /*
   * =========================================================
   * LOAD PHOTOS
   * =========================================================
   */

  useEffect(() => {
    async function loadPhotos() {
      try {
        setPhotosLoading(true);
        setPhotoError("");

        const response = await fetch(
          `/api/vehicles/${vehicleId}/photos`,
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          setPhotoError(
            data.error ||
              "Unable to load vehicle photos."
          );
          return;
        }

        setPhotos(
          Array.isArray(data.photos)
            ? data.photos
            : []
        );
      } catch (error) {
        console.error(
          "Load vehicle photos error:",
          error
        );

        setPhotoError(
          "Unable to load vehicle photos."
        );
      } finally {
        setPhotosLoading(false);
      }
    }

    if (vehicleId) {
      loadPhotos();
    }
  }, [vehicleId]);

  /*
   * =========================================================
   * LOAD MODIFICATIONS
   * =========================================================
   */

  useEffect(() => {
    async function loadModifications() {
      try {
        setModificationsLoading(true);
        setModificationError("");

        const response = await fetch(
          `/api/vehicles/${vehicleId}/modifications`,
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          setModificationError(
            data.error ||
              "Unable to load modifications."
          );
          return;
        }

        setModifications(
          Array.isArray(data.modifications)
            ? data.modifications
            : []
        );
      } catch (error) {
        console.error(
          "Load vehicle modifications error:",
          error
        );

        setModificationError(
          "Unable to load modifications."
        );
      } finally {
        setModificationsLoading(false);
      }
    }

    if (vehicleId) {
      loadModifications();
    }
  }, [vehicleId]);

  /*
   * =========================================================
   * CLEAN UP PREVIEW URLS
   * =========================================================
   */

  useEffect(() => {
    return () => {
      previewPhotos.forEach((photo) => {
        URL.revokeObjectURL(
          photo.previewUrl
        );
      });
    };
  }, [previewPhotos]);

  /*
   * =========================================================
   * FILE SELECTION
   * =========================================================
   */

  function handleFileSelection(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const files = Array.from(
      event.target.files || []
    );

    if (files.length === 0) {
      return;
    }

    setPhotoError("");

    const imageFiles = files.filter((file) =>
      file.type.startsWith("image/")
    );

    if (imageFiles.length !== files.length) {
      setPhotoError(
        "Only image files can be selected."
      );
    }

    const remainingSlots =
      10 - previewPhotos.length;

    if (remainingSlots <= 0) {
      setPhotoError(
        "You can upload up to 10 photos at once."
      );
      return;
    }

    const selectedFiles =
      imageFiles.slice(0, remainingSlots);

    if (
      selectedFiles.length <
      imageFiles.length
    ) {
      setPhotoError(
        "You can upload up to 10 photos at once."
      );
    }

    const newPreviews: PreviewPhoto[] =
      selectedFiles.map((file) => ({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
      }));

    setPreviewPhotos((current) => [
      ...current,
      ...newPreviews,
    ]);

    event.target.value = "";
  }

  /*
   * =========================================================
   * REMOVE LOCAL PREVIEW
   * =========================================================
   */

  function removePreview(id: string) {
    setPreviewPhotos((current) => {
      const photo = current.find(
        (item) => item.id === id
      );

      if (photo) {
        URL.revokeObjectURL(
          photo.previewUrl
        );
      }

      return current.filter(
        (item) => item.id !== id
      );
    });
  }

  /*
   * =========================================================
   * UPLOAD PHOTOS
   * =========================================================
   */

  async function handleUploadPhotos() {
    if (previewPhotos.length === 0) {
      setPhotoError(
        "Select at least one photo first."
      );
      return;
    }

    try {
      setUploading(true);
      setPhotoError("");

      const formData = new FormData();

      previewPhotos.forEach((photo) => {
        formData.append(
          "photos",
          photo.file
        );
      });

      const response = await fetch(
        `/api/vehicles/${vehicleId}/photos`,
        {
          method: "POST",
          credentials: "include",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        setPhotoError(
          data.error ||
            "Unable to upload photos."
        );
        return;
      }

      const uploadedPhotos =
        Array.isArray(data.photos)
          ? data.photos
          : [];

      setPhotos((current) => [
        ...uploadedPhotos,
        ...current,
      ]);

      if (
        !vehicle?.image &&
        uploadedPhotos.length > 0
      ) {
        setVehicle((current) =>
          current
            ? {
                ...current,
                image:
                  uploadedPhotos[0].url,
              }
            : current
        );
      }

      previewPhotos.forEach((photo) => {
        URL.revokeObjectURL(
          photo.previewUrl
        );
      });

      setPreviewPhotos([]);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error(
        "Upload vehicle photos error:",
        error
      );

      setPhotoError(
        "Unable to upload photos."
      );
    } finally {
      setUploading(false);
    }
  }

  /*
   * =========================================================
   * DELETE PHOTO
   * =========================================================
   */

  async function handleDeletePhoto(
    photoId: string
  ) {
    const confirmed = window.confirm(
      "Remove this photo from your vehicle gallery?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingPhotoId(photoId);
      setPhotoError("");

      const response = await fetch(
        `/api/vehicles/${vehicleId}/photos/${photoId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        setPhotoError(
          data.error ||
            "Unable to remove this photo."
        );
        return;
      }

      setPhotos((current) =>
        current.filter(
          (photo) =>
            photo.id !== photoId
        )
      );

      if (
        vehicle?.image &&
        photos.some(
          (photo) =>
            photo.id === photoId &&
            photo.url === vehicle.image
        )
      ) {
        router.refresh();

        const vehicleResponse =
          await fetch(
            `/api/vehicles/${vehicleId}`,
            {
              credentials: "include",
              cache: "no-store",
            }
          );

        const vehicleData =
          await vehicleResponse.json();

        if (vehicleData.success) {
          setVehicle(
            vehicleData.vehicle
          );
        }
      }
    } catch (error) {
      console.error(
        "Delete vehicle photo error:",
        error
      );

      setPhotoError(
        "Unable to remove this photo."
      );
    } finally {
      setDeletingPhotoId(null);
    }
  }

  /*
   * =========================================================
   * SET MAIN PHOTO
   * =========================================================
   */

  async function handleSetMainPhoto(
    photo: VehiclePhoto
  ) {
    if (!vehicle) {
      return;
    }

    try {
      setSettingMainPhotoId(photo.id);
      setPhotoError("");

      const response = await fetch(
        `/api/vehicles/${vehicleId}/photos/${photo.id}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            action: "set-main",
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        setPhotoError(
          data.error ||
            "Unable to set main photo."
        );
        return;
      }

      setVehicle((current) =>
        current
          ? {
              ...current,
              image: photo.url,
            }
          : current
      );
    } catch (error) {
      console.error(
        "Set main photo error:",
        error
      );

      setPhotoError(
        "Unable to set main photo."
      );
    } finally {
      setSettingMainPhotoId(null);
    }
  }

   /*
   * =========================================================
   * SET / UNSET FEATURED VEHICLE
   * =========================================================
   */

  async function handleToggleFeatured() {
    if (!vehicle) {
      return;
    }

    try {
      setSettingFeatured(true);
      setError("");

      const featured =
        !vehicle.isFeatured;

      const response = await fetch(
        `/api/vehicles/${vehicleId}/featured`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            featured,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(
          data.error ||
            "Unable to update featured vehicle."
        );
        return;
      }

      setVehicle((current) =>
        current
          ? {
              ...current,
              isFeatured:
                data.vehicle?.isFeatured ??
                featured,
            }
          : current
      );
    } catch (error) {
      console.error(
        "Toggle featured vehicle error:",
        error
      );

      setError(
        "Unable to update featured vehicle."
      );
    } finally {
      setSettingFeatured(false);
    }
  }

  
  /*
   * =========================================================
   * OPEN ADD MODIFICATION
   * =========================================================
   */

  function openAddModification() {
    setEditingModificationId(null);
    setModificationForm(
      EMPTY_MODIFICATION_FORM
    );
    setModificationError("");
    setShowModificationForm(true);
  }

  /*
   * =========================================================
   * OPEN EDIT MODIFICATION
   * =========================================================
   */

  function openEditModification(
    modification: VehicleModification
  ) {
    setEditingModificationId(
      modification.id
    );

    setModificationForm({
      title: modification.title,
      category: modification.category,
      description:
        modification.description || "",
      cost:
        modification.cost !== null
          ? String(modification.cost)
          : "",
      installedAt: modification.installedAt
        ? modification.installedAt.slice(
            0,
            10
          )
        : "",
      notes: modification.notes || "",
    });

    setModificationError("");
    setShowModificationForm(true);
  }

  /*
   * =========================================================
   * CLOSE MODIFICATION FORM
   * =========================================================
   */

  function closeModificationForm() {
    if (savingModification) {
      return;
    }

    setShowModificationForm(false);
    setEditingModificationId(null);
    setModificationForm(
      EMPTY_MODIFICATION_FORM
    );
    setModificationError("");
  }

  /*
   * =========================================================
   * UPDATE MODIFICATION FORM
   * =========================================================
   */

  function updateModificationField(
    field: keyof ModificationForm,
    value: string
  ) {
    setModificationForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  /*
   * =========================================================
   * SAVE MODIFICATION
   * =========================================================
   */

  async function handleSaveModification(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      !modificationForm.title.trim()
    ) {
      setModificationError(
        "Give this modification a title."
      );
      return;
    }

    if (
      !modificationForm.category
    ) {
      setModificationError(
        "Choose a modification category."
      );
      return;
    }

    try {
      setSavingModification(true);
      setModificationError("");

      const isEditing =
        editingModificationId !== null;

      const endpoint = isEditing
        ? `/api/vehicles/${vehicleId}/modifications/${editingModificationId}`
        : `/api/vehicles/${vehicleId}/modifications`;

      /*
       * Resolve every @username in the modification text
       * into a real user ID before sending the modification.
       *
       * We check both description and notes because mentions
       * can be written in either field.
       */
      const mentionSource = [
        modificationForm.description,
        modificationForm.notes,
      ].join(" ");

      const mentionedUserIds =
        await resolveMentionedUserIds(
          mentionSource
        );

      const response = await fetch(
        endpoint,
        {
          method: isEditing
            ? "PATCH"
            : "POST",
          credentials: "include",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            title:
              modificationForm.title.trim(),
            category:
              modificationForm.category,
            description:
              modificationForm.description.trim() ||
              null,
            cost:
              modificationForm.cost.trim() ||
              null,
            installedAt:
              modificationForm.installedAt ||
              null,
            notes:
              modificationForm.notes.trim() ||
              null,

            /*
             * This is consumed by the modification API to
             * create/update the mention records.
             */
            mentionedUserIds,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        setModificationError(
          data.error ||
            "Unable to save modification."
        );
        return;
      }

      if (isEditing) {
        setModifications((current) =>
          current.map((item) =>
            item.id ===
            editingModificationId
              ? data.modification
              : item
          )
        );

        closeModificationForm();
      } else {
        setModifications((current) => [
          data.modification,
          ...current,
        ]);

        setEditingModificationId(data.modification.id);
        setModificationForm({
          title: data.modification.title,
          category: data.modification.category,
          description: data.modification.description || "",
          cost: data.modification.cost !== null ? String(data.modification.cost) : "",
          installedAt: data.modification.installedAt ? data.modification.installedAt.slice(0, 10) : "",
          notes: data.modification.notes || "",
        });
        setModificationError(
          "Modification saved. Add photos below, then close when you are done."
        );
      }
    } catch (error) {
      console.error(
        "Save modification error:",
        error
      );

      setModificationError(
        "Unable to save modification."
      );
    } finally {
      setSavingModification(false);
    }
  }

  /*
   * =========================================================
   * DELETE MODIFICATION
   * =========================================================
   */

  async function handleDeleteModification(
    modification: VehicleModification
  ) {
    const confirmed = window.confirm(
      `Remove "${modification.title}" from this vehicle's build?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingModificationId(
        modification.id
      );
      setModificationError("");

      const response = await fetch(
        `/api/vehicles/${vehicleId}/modifications/${modification.id}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        setModificationError(
          data.error ||
            "Unable to remove modification."
        );
        return;
      }

      setModifications((current) =>
        current.filter(
          (item) =>
            item.id !== modification.id
        )
      );
    } catch (error) {
      console.error(
        "Delete modification error:",
        error
      );

      setModificationError(
        "Unable to remove modification."
      );
    } finally {
      setDeletingModificationId(null);
    }
  }

  /*
   * =========================================================
   * DELETE VEHICLE
   * =========================================================
   */

  async function handleDelete() {
    if (!vehicle) {
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to remove your ${vehicle.make} ${vehicle.model} from your garage?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeleting(true);
      setError("");

      const response = await fetch(
        `/api/vehicles/${vehicle.id}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(
          data.error ||
            "Unable to remove this vehicle."
        );
        return;
      }

      router.push("/profile/driver");
      router.refresh();
    } catch (error) {
      console.error(
        "Delete vehicle error:",
        error
      );

      setError(
        "Unable to remove this vehicle."
      );
    } finally {
      setDeleting(false);
    }
  }

  /*
   * =========================================================
   * FULL SCREEN VIEWER
   * =========================================================
   */

  const viewerPhoto =
    viewerIndex !== null
      ? photos[viewerIndex]
      : null;

  function closeViewer() {
    setViewerIndex(null);
  }

  function showPreviousPhoto() {
    if (viewerIndex === null) {
      return;
    }

    setViewerIndex(
      viewerIndex === 0
        ? photos.length - 1
        : viewerIndex - 1
    );
  }

  function showNextPhoto() {
    if (viewerIndex === null) {
      return;
    }

    setViewerIndex(
      viewerIndex === photos.length - 1
        ? 0
        : viewerIndex + 1
    );
  }

  /*
   * =========================================================
   * KEYBOARD CONTROLS
   * =========================================================
   */

  useEffect(() => {
    if (viewerIndex === null) {
      return;
    }

    function handleKeyDown(
      event: KeyboardEvent
    ) {
      if (event.key === "Escape") {
        closeViewer();
      }

      if (event.key === "ArrowLeft") {
        showPreviousPhoto();
      }

      if (event.key === "ArrowRight") {
        showNextPhoto();
      }
    }

    document.addEventListener(
      "keydown",
      handleKeyDown
    );

    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyDown
      );

      document.body.style.overflow = "";
    };
  }, [viewerIndex, photos.length]);

  /*
   * =========================================================
   * MAIN PHOTO
   * =========================================================
   */

  const mainPhoto = useMemo(() => {
  if (!vehicle?.image) {
    return null;
  }

  return (
    photos.find(
      (photo) => photo.url === vehicle.image
    ) || {
      id: "main",
      url: vehicle.image,
      createdAt: vehicle.createdAt,
    }
  );
}, [vehicle, photos]);

  /*
   * =========================================================
   * BUILD STATS
   * =========================================================
   */

  const totalModificationCost =
    modifications.reduce(
      (total, modification) =>
        total +
        (modification.cost || 0),
      0
    );

  /*
   * =========================================================
   * FORMAT HELPERS
   * =========================================================
   */

  function formatModificationDate(
    date: string | null
  ) {
    if (!date) {
      return "Date not specified";
    }

    return new Date(
      date
    ).toLocaleDateString(
      undefined,
      {
        month: "short",
        year: "numeric",
      }
    );
  }

  function formatModificationCost(
    cost: number | null
  ) {
    if (cost === null) {
      return "Cost not specified";
    }

    return new Intl.NumberFormat(
      "en-GH",
      {
        style: "currency",
        currency: "GHS",
        maximumFractionDigits: 2,
      }
    ).format(cost);
  }

  /*
   * =========================================================
   * LOADING
   * =========================================================
   */

  if (loading) {
    return (
      <main className="min-h-screen bg-black px-5 py-8 text-white sm:px-8">
        <div className="relative z-10 mx-auto flex min-h-[80vh] w-full max-w-5xl items-center justify-center">
          <div className="text-center">
            <div
              className="
                mx-auto
                h-9
                w-9
                animate-spin
                rounded-full
                border-2
                border-white/10
                border-t-red-500
              "
            />

            <p className="mt-4 text-sm text-white/25">
              Loading vehicle...
            </p>
          </div>
        </div>
      </main>
    );
  }

  /*
   * =========================================================
   * ERROR
   * =========================================================
   */

  if (error || !vehicle) {
    return (
      <main className="min-h-screen bg-black px-5 py-8 text-white sm:px-8">
        <div className="relative z-10 mx-auto flex min-h-[80vh] w-full max-w-2xl items-center justify-center">
          <div
            className="
              w-full
              rounded-[2rem]
              border
              border-white/[0.08]
              bg-white/[0.025]
              p-8
              text-center
              backdrop-blur-2xl
            "
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/[0.06] text-2xl">
              <CarIcon className="h-16 w-16 opacity-20" />
            </div>

            <h1 className="mt-6 text-2xl font-bold">
              Vehicle not found
            </h1>

            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-white/35">
              {error ||
                "This vehicle may have been removed or is no longer available."}
            </p>

            <Link
              href="/profile/driver"
              className="
                mt-7
                inline-flex
                h-12
                items-center
                justify-center
                rounded-2xl
                border
                border-red-400/30
                bg-red-600/[0.25]
                px-6
                text-sm
                font-semibold
              "
            >
              Back to garage
            </Link>
          </div>
        </div>
      </main>
    );
  }

  /*
   * =========================================================
   * MAIN PAGE
   * =========================================================
   */

  return (
    <main className="min-h-screen bg-black px-5 py-8 text-white sm:px-8">
      {/* Background */}

      <div
        className="
          pointer-events-none
          fixed
          left-1/2
          top-[-280px]
          h-[520px]
          w-[520px]
          -translate-x-1/2
          rounded-full
          bg-red-600/[0.07]
          blur-[150px]
        "
      />

      <div
        className="
          pointer-events-none
          fixed
          bottom-[-250px]
          right-[-200px]
          h-[500px]
          w-[500px]
          rounded-full
          bg-red-950/[0.08]
          blur-[160px]
        "
      />

      <div className="relative z-10 mx-auto w-full max-w-5xl">

        {/* Back */}

        <Link
          href="/profile/driver"
          className="
            mb-8
            inline-flex
            items-center
            gap-2
            text-sm
            text-white/35
            transition-colors
            hover:text-white
          "
        >
          <span>←</span>
          Back to garage
        </Link>

        {/* ===================================================
            HERO
        =================================================== */}

        <section
          className="
            overflow-hidden
            rounded-[2rem]
            border
            border-white/[0.08]
            bg-white/[0.025]
            backdrop-blur-2xl
          "
        >
          <div
            className="
              relative
              flex
              h-[280px]
              items-center
              justify-center
              overflow-hidden
              border-b
              border-white/[0.08]
              bg-white/[0.025]
              sm:h-[420px]
            "
          >
            {vehicle.image ? (
              <button
                type="button"
                onClick={() => {
                  if (mainPhoto) {
                    const index =
                      photos.findIndex(
                        (photo) =>
                          photo.id ===
                          mainPhoto.id
                      );

                    if (index !== -1) {
                      setViewerIndex(index);
                    }
                  }
                }}
                className="group block h-full w-full cursor-zoom-in"
              >
                <img
                  src={vehicle.image}
                  alt={`${vehicle.make} ${vehicle.model}`}
                  className="
                    h-full
                    w-full
                    object-cover
                    transition-transform
                    duration-700
                    group-hover:scale-[1.02]
                  "
                />

                <div
                  className="
                    absolute
                    inset-0
                    flex
                    items-center
                    justify-center
                    bg-black/0
                    transition-all
                    duration-300
                    group-hover:bg-black/20
                  "
                >
                  <span
                    className="
                      rounded-2xl
                      border
                      border-white/[0.12]
                      bg-black/60
                      px-4
                      py-3
                      text-xs
                      font-semibold
                      uppercase
                      tracking-[0.12em]
                      text-white/0
                      backdrop-blur-xl
                      transition-all
                      group-hover:text-white/80
                    "
                  >
                    View full screen
                  </span>
                </div>
              </button>
            ) : (
              <div className="text-[120px] opacity-10">
                <CarIcon className="h-16 w-16 opacity-20" />
              </div>
            )}

            <div
              className="
                absolute
                left-5
                top-5
                rounded-full
                border
                border-white/[0.10]
                bg-black/50
                px-4
                py-2
                text-[10px]
                font-medium
                uppercase
                tracking-[0.18em]
                text-white/60
                backdrop-blur-xl
              "
            >
              {vehicle.type || "Vehicle"}
            </div>
          </div>

          <div className="p-6 sm:p-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-red-400/70">
                  {vehicle.year ||
                    "Year unknown"}
                </p>

                <h1 className="mt-2 text-4xl font-black tracking-[-0.045em] sm:text-5xl">
                  {vehicle.make}{" "}
                  {vehicle.model}
                </h1>

                <p className="mt-3 text-sm text-white/30">
                  Part of your Revvam garage
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
  <button
    type="button"
    onClick={handleToggleFeatured}
    disabled={settingFeatured}
    className="
      inline-flex
      h-12
      items-center
      justify-center
      gap-2
      rounded-2xl
      border
      border-red-400/30
      bg-red-600/[0.12]
      px-5
      text-sm
      font-semibold
      text-white
      transition-all
      hover:border-red-400/50
      hover:bg-red-600/[0.22]
      disabled:cursor-not-allowed
      disabled:opacity-50
    "
  >
    <span aria-hidden="true">
      {vehicle.isFeatured ? "★" : "☆"}
    </span>

    {settingFeatured
      ? "Saving..."
      : vehicle.isFeatured
        ? "Featured"
        : "Feature vehicle"}
  </button>

  <Link
    href={`/profile/cars/${vehicle.id}/edit`}
    className="
      inline-flex
      h-12
      items-center
      justify-center
      rounded-2xl
      border
      border-red-400/30
      bg-red-600/[0.25]
      px-6
      text-sm
      font-semibold
      text-white
    "
  >
    Edit vehicle
  </Link>
</div>
            </div>
          </div>
        </section>

        {/* ===================================================
            INFORMATION
        =================================================== */}

        <section
          className="
            mt-6
            rounded-[2rem]
            border
            border-white/[0.08]
            bg-white/[0.025]
            p-6
            backdrop-blur-2xl
            sm:p-8
          "
        >
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red-400/60">
            Vehicle information
          </p>

          <h2 className="mt-2 text-xl font-semibold">
            Details
          </h2>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Make", vehicle.make],
              ["Model", vehicle.model],
              [
                "Year",
                vehicle.year ||
                  "Not specified",
              ],
              [
                "Type",
                vehicle.type ||
                  "Not specified",
              ],
            ].map(([label, value]) => (
              <div
                key={label}
                className="
                  rounded-2xl
                  border
                  border-white/[0.07]
                  bg-black/20
                  p-5
                "
              >
                <p className="text-xs uppercase tracking-[0.15em] text-white/25">
                  {label}
                </p>

                <p className="mt-2 font-medium">
                  {value}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ===================================================
            BUILD
        =================================================== */}

        <section
          className="
            mt-6
            rounded-[2rem]
            border
            border-white/[0.08]
            bg-white/[0.025]
            p-6
            backdrop-blur-2xl
            sm:p-8
          "
        >
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-red-400/60">
                Build
              </p>

              <h2 className="mt-2 text-xl font-semibold">
                Modifications & build
              </h2>

              <p className="mt-2 max-w-xl text-sm leading-6 text-white/30">
                Keep track of the work you&apos;ve
done to this vehicle, from
                performance upgrades to visual
                changes.
              </p>
            </div>

            <button
              type="button"
              onClick={
                openAddModification
              }
              className="
                inline-flex
                h-11
                shrink-0
                items-center
                justify-center
                gap-2
                rounded-2xl
                border
                border-red-400/30
                bg-red-600/[0.25]
                px-5
                text-sm
                font-semibold
                text-white
                transition-all
                hover:border-red-300/40
                hover:bg-red-500/[0.40]
              "
            >
              <span className="text-lg leading-none">
                +
              </span>
              Add modification
            </button>
          </div>

          {/* Build summary */}

          {modifications.length > 0 && (
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div
                className="
                  rounded-2xl
                  border
                  border-white/[0.07]
                  bg-black/20
                  p-4
                "
              >
                <p className="text-[10px] uppercase tracking-[0.15em] text-white/25">
                  Modifications
                </p>

                <p className="mt-2 text-2xl font-bold">
                  {modifications.length}
                </p>
              </div>

              <div
                className="
                  rounded-2xl
                  border
                  border-white/[0.07]
                  bg-black/20
                  p-4
                "
              >
                <p className="text-[10px] uppercase tracking-[0.15em] text-white/25">
                  Build categories
                </p>

                <p className="mt-2 text-2xl font-bold">
                  {
                    new Set(
                      modifications.map(
                        (item) =>
                          item.category
                      )
                    ).size
                  }
                </p>
              </div>

              <div
                className="
                  rounded-2xl
                  border
                  border-white/[0.07]
                  bg-black/20
                  p-4
                "
              >
                <p className="text-[10px] uppercase tracking-[0.15em] text-white/25">
                  Recorded spend
                </p>

                <p className="mt-2 text-xl font-bold">
                  {formatModificationCost(
                    totalModificationCost
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Error */}

          {modificationError && (
            <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-sm text-red-300">
              {modificationError}
            </div>
          )}

          {/* Loading */}

          {modificationsLoading ? (
            <div className="mt-6 flex min-h-[220px] items-center justify-center rounded-3xl border border-white/[0.08] bg-black/20">
              <div className="text-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-red-500" />

                <p className="mt-3 text-sm text-white/20">
                  Loading build...
                </p>
              </div>
            </div>
          ) : modifications.length === 0 ? (
            <div
              className="
                mt-6
                flex
                min-h-[260px]
                items-center
                justify-center
                rounded-3xl
                border
                border-dashed
                border-white/[0.08]
                bg-black/20
                px-6
                text-center
              "
            >
              <div>
                <div className="text-5xl opacity-20">
                  <MechanicIcon className="h-5 w-5" />
                </div>

                <p className="mt-4 text-sm font-medium text-white/30">
                  Your build is empty
                </p>

                <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-white/15">
                  Start documenting the work
you&apos;ve done to this vehicle.
                </p>

                <button
                  type="button"
                  onClick={
                    openAddModification
                  }
                  className="
                    mt-5
                    rounded-2xl
                    border
                    border-red-400/20
                    bg-red-500/[0.08]
                    px-5
                    py-2.5
                    text-xs
                    font-semibold
                    text-red-300
                    transition-all
                    hover:bg-red-500/[0.15]
                  "
                >
                  Add your first modification
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {modifications.map(
                (modification) => (
                  <article
                    key={modification.id}
                    className="
                      group
                      overflow-hidden
                      rounded-3xl
                      border
                      border-white/[0.08]
                      bg-black/20
                      transition-all
                      hover:border-white/[0.12]
                    "
                  >
                    <div className="p-5 sm:p-6">
                      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className="
                                rounded-full
                                border
                                border-red-400/20
                                bg-red-500/[0.08]
                                px-3
                                py-1
                                text-[9px]
                                font-bold
                                uppercase
                                tracking-[0.14em]
                                text-red-300
                              "
                            >
                              {
                                modification.category
                              }
                            </span>

                            {modification.installedAt && (
                              <span className="text-[10px] text-white/20">
                                Installed{" "}
                                {formatModificationDate(
                                  modification.installedAt
                                )}
                              </span>
                            )}
                          </div>

                          <h3 className="mt-3 text-xl font-bold tracking-[-0.02em]">
                            {
                              modification.title
                            }
                          </h3>

                          {modification.description && (
                            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/35">
                              {renderMentionedText(
                                modification.description,
                                modification.mentions
                              )}
                            </p>
                          )}
                        </div>

                        <div className="shrink-0 text-left sm:text-right">
                          <p className="text-[9px] uppercase tracking-[0.14em] text-white/20">
                            Cost
                          </p>

                          <p className="mt-1 text-sm font-semibold text-white/70">
                            {formatModificationCost(
                              modification.cost
                            )}
                          </p>
                        </div>
                      </div>

                      {modification.photos &&
                        modification.photos.length > 0 && (
                        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                          {modification.photos.map((photo) => (
                            <div
                              key={photo.id}
                              className="aspect-[4/3] overflow-hidden rounded-2xl border border-white/[0.07] bg-black"
                            >
                              <img
                                src={photo.url}
                                alt={`${modification.title} photo`}
                                className="h-full w-full object-cover"
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {modification.notes && (
                        <div
                          className="
                            mt-5
                            rounded-2xl
                            border
                            border-white/[0.06]
                            bg-white/[0.02]
                            p-4
                          "
                        >
                          <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-white/20">
                            Notes
                          </p>

                          <p className="mt-2 text-sm leading-6 text-white/35">
                            {renderMentionedText(
                              modification.notes,
                              modification.mentions
                            )}
                          </p>
                        </div>
                      )}

                      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-white/[0.06] pt-4">
                        <button
                          type="button"
                          onClick={() =>
                            openEditModification(
                              modification
                            )
                          }
                          className="
                            rounded-xl
                            border
                            border-white/[0.10]
                            bg-white/[0.03]
                            px-4
                            py-2
                            text-[10px]
                            font-semibold
                            uppercase
                            tracking-[0.08em]
                            text-white/60
                            transition-all
                            hover:border-white/[0.18]
                            hover:bg-white/[0.06]
                            hover:text-white
                          "
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleDeleteModification(
                              modification
                            )
                          }
                          disabled={
                            deletingModificationId ===
                            modification.id
                          }
                          className="
                            rounded-xl
                            border
                            border-red-500/[0.12]
                            bg-red-500/[0.04]
                            px-4
                            py-2
                            text-[10px]
                            font-semibold
                            uppercase
                            tracking-[0.08em]
                            text-red-300/70
                            transition-all
                            hover:border-red-500/30
                            hover:bg-red-500/[0.10]
                            hover:text-red-300
                            disabled:opacity-40
                          "
                        >
                          {deletingModificationId ===
                          modification.id
                            ? "Deleting..."
                            : "Delete"}
                        </button>
                      </div>
                    </div>
                  </article>
                )
              )}
            </div>
          )}
        </section>

        {/* ===================================================
            GALLERY
        =================================================== */}

        <section
          className="
            mt-6
            rounded-[2rem]
            border
            border-white/[0.08]
            bg-white/[0.025]
            p-6
            backdrop-blur-2xl
            sm:p-8
          "
        >
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-red-400/60">
                Gallery
              </p>

              <h2 className="mt-2 text-xl font-semibold">
                Vehicle photos
              </h2>

              <p className="mt-2 text-sm leading-6 text-white/30">
                Upload and manage photos of your
                vehicle.
              </p>
            </div>

            <div className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-[10px] uppercase tracking-[0.15em] text-white/30">
              {photos.length}{" "}
              {photos.length === 1
                ? "photo"
                : "photos"}
            </div>
          </div>

          <div
            className="
              mt-6
              rounded-3xl
              border
              border-white/[0.07]
              bg-black/20
              p-5
            "
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              onChange={
                handleFileSelection
              }
              className="hidden"
            />

            <button
              type="button"
              onClick={() =>
                fileInputRef.current?.click()
              }
              className="
                flex
                min-h-[150px]
                w-full
                flex-col
                items-center
                justify-center
                rounded-3xl
                border
                border-dashed
                border-white/[0.10]
                bg-white/[0.02]
                px-6
                text-center
                transition-all
                hover:border-red-400/30
                hover:bg-red-500/[0.03]
              "
            >
              <div className="text-4xl">
                <CameraIcon className="h-5 w-5" />
              </div>

              <p className="mt-4 text-sm font-semibold text-white/70">
                Choose photos from your device
              </p>

              <p className="mt-2 text-xs text-white/25">
                JPG, PNG, WEBP or GIF · Up to
                10 MB each
              </p>
            </button>

            {previewPhotos.length > 0 && (
              <div className="mt-5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-[0.15em] text-white/30">
                    Ready to upload
                  </p>

                  <p className="text-xs text-white/20">
                    {previewPhotos.length}{" "}
                    selected
                  </p>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {previewPhotos.map(
                    (photo) => (
                      <div
                        key={photo.id}
                        className="
                          group
                          relative
                          overflow-hidden
                          rounded-2xl
                          border
                          border-white/[0.08]
                          bg-black
                        "
                      >
                        <img
                          src={
                            photo.previewUrl
                          }
                          alt="Selected preview"
                          className="aspect-[4/3] w-full object-cover"
                        />

                        <button
                          type="button"
                          onClick={() =>
                            removePreview(
                              photo.id
                            )
                          }
                          className="
                            absolute
                            right-2
                            top-2
                            flex
                            h-8
                            w-8
                            items-center
                            justify-center
                            rounded-xl
                            border
                            border-white/[0.12]
                            bg-black/70
                            text-white/70
                            backdrop-blur-xl
                            hover:bg-red-500/30
                            hover:text-red-300
                          "
                        >
                          <CloseIcon className="h-4 w-4" />
                        </button>

                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 pb-3 pt-8">
                          <p className="truncate text-xs text-white/50">
                            {photo.file.name}
                          </p>
                        </div>
                      </div>
                    )
                  )}
                </div>

                <button
                  type="button"
                  onClick={
                    handleUploadPhotos
                  }
                  disabled={uploading}
                  className="
                    mt-5
                    h-12
                    w-full
                    rounded-2xl
                    border
                    border-red-400/30
                    bg-red-600/[0.25]
                    text-sm
                    font-semibold
                    text-white
                    transition-all
                    hover:border-red-300/40
                    hover:bg-red-500/[0.40]
                    disabled:cursor-not-allowed
                    disabled:opacity-40
                  "
                >
                  {uploading
                    ? "Uploading photos..."
                    : `Upload ${previewPhotos.length} ${
                        previewPhotos.length ===
                        1
                          ? "photo"
                          : "photos"
                      }`}
                </button>
              </div>
            )}
          </div>

          {photoError && (
            <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-sm text-red-300">
              {photoError}
            </div>
          )}

          {photosLoading ? (
            <div className="mt-6 flex min-h-[220px] items-center justify-center rounded-3xl border border-white/[0.08] bg-black/20">
              <div className="text-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-red-500" />

                <p className="mt-3 text-sm text-white/20">
                  Loading gallery...
                </p>
              </div>
            </div>
          ) : photos.length === 0 ? (
            <div className="mt-6 flex min-h-[220px] items-center justify-center rounded-3xl border border-dashed border-white/[0.08] bg-black/20 px-6 text-center">
              <div>
                <div className="text-5xl opacity-20">
                  <CameraIcon className="h-5 w-5" />
                </div>

                <p className="mt-4 text-sm font-medium text-white/30">
                  No photos yet
                </p>

                <p className="mt-1 text-xs text-white/15">
                  Choose photos from your device
                  above.
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {photos.map(
                (photo, index) => {
                  const isMain =
                    vehicle.image ===
                    photo.url;

                  return (
                    <div
                      key={photo.id}
                      className="
                        group
                        relative
                        overflow-hidden
                        rounded-3xl
                        border
                        border-white/[0.08]
                        bg-black
                      "
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setViewerIndex(
                            index
                          )
                        }
                        className="block w-full cursor-zoom-in text-left"
                      >
                        <img
                          src={photo.url}
                          alt={`${vehicle.make} ${vehicle.model}`}
                          className="
                            aspect-[4/3]
                            w-full
                            object-cover
                            transition-transform
                            duration-500
                            group-hover:scale-[1.03]
                          "
                        />
                      </button>

                      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/90 to-transparent" />

                      {isMain && (
                        <div className="absolute left-3 top-3 rounded-full border border-red-400/30 bg-red-600/80 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.15em] text-white backdrop-blur-xl">
                          Main photo
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          setViewerIndex(
                            index
                          )
                        }
                        className="
                          absolute
                          right-3
                          top-3
                          flex
                          h-9
                          w-9
                          items-center
                          justify-center
                          rounded-xl
                          border
                          border-white/[0.12]
                          bg-black/60
                          text-white/70
                          backdrop-blur-xl
                          transition-all
                          hover:bg-black/80
                          hover:text-white
                        "
                        aria-label="Open photo"
                      >
                        <ExpandIcon className="h-4 w-4" />
                      </button>

                      <div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-2">
                        {!isMain ? (
                          <button
                            type="button"
                            onClick={() =>
                              handleSetMainPhoto(
                                photo
                              )
                            }
                            disabled={
                              settingMainPhotoId ===
                              photo.id
                            }
                            className="
                              rounded-xl
                              border
                              border-white/[0.12]
                              bg-black/60
                              px-3
                              py-2
                              text-[10px]
                              font-semibold
                              uppercase
                              tracking-[0.08em]
                              text-white/70
                              backdrop-blur-xl
                              transition-all
                              hover:border-red-400/30
                              hover:bg-red-500/20
                              hover:text-white
                              disabled:opacity-40
                            "
                          >
                            {settingMainPhotoId ===
                            photo.id
                              ? "Setting..."
                              : "Set as main"}
                          </button>
                        ) : (
                          <span className="rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-red-300">
                            Current main
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() =>
                            handleDeletePhoto(
                              photo.id
                            )
                          }
                          disabled={
                            deletingPhotoId ===
                            photo.id
                          }
                          className="
                            rounded-xl
                            border
                            border-white/[0.12]
                            bg-black/60
                            px-3
                            py-2
                            text-[10px]
                            font-semibold
                            uppercase
                            tracking-[0.08em]
                            text-white/60
                            backdrop-blur-xl
                            transition-all
                            hover:border-red-400/30
                            hover:bg-red-500/20
                            hover:text-red-300
                            disabled:opacity-40
                          "
                        >
                          {deletingPhotoId ===
                          photo.id
                            ? "Deleting..."
                            : "Delete"}
                        </button>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}
        </section>

        {/* ===================================================
            DANGER ZONE
        =================================================== */}

        <section
          className="
            mt-6
            rounded-[2rem]
            border
            border-red-500/[0.12]
            bg-red-500/[0.025]
            p-6
            sm:p-8
          "
        >
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red-400/60">
            Garage management
          </p>

          <h2 className="mt-2 text-xl font-semibold">
            Remove vehicle
          </h2>

          <p className="mt-2 max-w-xl text-sm leading-6 text-white/30">
            Remove this vehicle from your Revvam
            garage. This action cannot be undone.
          </p>

          {error && (
            <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="
              mt-6
              inline-flex
              h-11
              items-center
              justify-center
              rounded-2xl
              border
              border-red-500/20
              bg-red-500/[0.06]
              px-5
              text-sm
              font-medium
              text-red-300
              transition-all
              hover:border-red-500/30
              hover:bg-red-500/[0.10]
              disabled:cursor-not-allowed
              disabled:opacity-40
            "
          >
            {deleting
              ? "Removing..."
              : "Remove vehicle"}
          </button>
        </section>
      </div>

      {/* =====================================================
          ADD / EDIT MODIFICATION MODAL
      ===================================================== */}

      {showModificationForm && (
        <div
          className="
            fixed
            inset-0
            z-[90]
            flex
            items-center
            justify-center
            overflow-y-auto
            bg-black/80
            p-4
            backdrop-blur-xl
          "
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeModificationForm();
            }
          }}
        >
          <div
            className="
              w-full
              max-w-2xl
              overflow-hidden
              rounded-[2rem]
              border
              border-white/[0.10]
              bg-[#0a0a0a]
              shadow-2xl
            "
          >
            {/* Modal header */}

            <div className="flex items-start justify-between gap-5 border-b border-white/[0.07] p-6 sm:p-8">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-red-400/60">
                  Vehicle build
                </p>

                <h2 className="mt-2 text-2xl font-bold tracking-[-0.03em]">
                  {editingModificationId
                    ? "Edit modification"
                    : "Add modification"}
                </h2>

                <p className="mt-2 text-sm text-white/30">
                  Record the work done to your{" "}
                  {vehicle.make}{" "}
                  {vehicle.model}.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  closeModificationForm
                }
                disabled={
                  savingModification
                }
                className="
                  flex
                  h-10
                  w-10
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  border
                  border-white/[0.10]
                  bg-white/[0.04]
                  text-lg
                  text-white/50
                  transition-all
                  hover:bg-white/[0.08]
                  hover:text-white
                  disabled:opacity-30
                "
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>

            {/* Form */}

            <form
              onSubmit={
                handleSaveModification
              }
              className="p-6 sm:p-8"
            >
              {modificationError && (
                <div className="mb-5 rounded-2xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-sm text-red-300">
                  {modificationError}
                </div>
              )}

              <div className="grid gap-5 sm:grid-cols-2">
                {/* Title */}

                <div className="sm:col-span-2">
                  <label className="text-xs font-medium uppercase tracking-[0.12em] text-white/30">
                    Modification title
                  </label>

                  <input
                    type="text"
                    value={
                      modificationForm.title
                    }
                    onChange={(event) =>
                      updateModificationField(
                        "title",
                        event.target.value
                      )
                    }
                    placeholder="e.g. Stage 1 ECU Tune"
                    className="
                      mt-2
                      h-12
                      w-full
                      rounded-2xl
                      border
                      border-white/[0.10]
                      bg-white/[0.03]
                      px-4
                      text-sm
                      text-white
                      outline-none
                      placeholder:text-white/15
                      focus:border-red-400/30
                      focus:bg-white/[0.05]
                    "
                  />
                </div>

                {/* Category */}

                <div>
                  <label className="text-xs font-medium uppercase tracking-[0.12em] text-white/30">
                    Category
                  </label>

                  <select
                    value={
                      modificationForm.category
                    }
                    onChange={(event) =>
                      updateModificationField(
                        "category",
                        event.target.value
                      )
                    }
                    className="
                      mt-2
                      h-12
                      w-full
                      rounded-2xl
                      border
                      border-white/[0.10]
                      bg-[#111]
                      px-4
                      text-sm
                      text-white
                      outline-none
                      focus:border-red-400/30
                    "
                  >
                    <option value="">
                      Select category
                    </option>

                    {MODIFICATION_CATEGORIES.map(
                      (category) => (
                        <option
                          key={category}
                          value={category}
                        >
                          {category}
                        </option>
                      )
                    )}
                  </select>
                </div>

                {/* Cost */}

                <div>
                  <label className="text-xs font-medium uppercase tracking-[0.12em] text-white/30">
                    Cost
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      modificationForm.cost
                    }
                    onChange={(event) =>
                      updateModificationField(
                        "cost",
                        event.target.value
                      )
                    }
                    placeholder="0.00"
                    className="
                      mt-2
                      h-12
                      w-full
                      rounded-2xl
                      border
                      border-white/[0.10]
                      bg-white/[0.03]
                      px-4
                      text-sm
                      text-white
                      outline-none
                      placeholder:text-white/15
                      focus:border-red-400/30
                      focus:bg-white/[0.05]
                    "
                  />

                  <p className="mt-1.5 text-[10px] text-white/15">
                    Amount in Ghana cedis
                  </p>
                </div>

                {/* Installed date */}

                <div>
                  <label className="text-xs font-medium uppercase tracking-[0.12em] text-white/30">
                    Installation date
                  </label>

                  <input
                    type="date"
                    value={
                      modificationForm.installedAt
                    }
                    onChange={(event) =>
                      updateModificationField(
                        "installedAt",
                        event.target.value
                      )
                    }
                    className="
                      mt-2
                      h-12
                      w-full
                      rounded-2xl
                      border
                      border-white/[0.10]
                      bg-white/[0.03]
                      px-4
                      text-sm
                      text-white
                      outline-none
                      focus:border-red-400/30
                      focus:bg-white/[0.05]
                    "
                  />
                </div>

                {/* Description */}

                <div className="sm:col-span-2">
                  <label className="text-xs font-medium uppercase tracking-[0.12em] text-white/30">
                    Description
                  </label>

                  <textarea
                    value={
                      modificationForm.description
                    }
                    onChange={(event) =>
                      updateModificationField(
                        "description",
                        event.target.value
                      )
                    }
                    placeholder="Tell people what was changed..."
                    rows={4}
                    className="
                      mt-2
                      w-full
                      resize-none
                      rounded-2xl
                      border
                      border-white/[0.10]
                      bg-white/[0.03]
                      px-4
                      py-3
                      text-sm
                      leading-6
                      text-white
                      outline-none
                      placeholder:text-white/15
                      focus:border-red-400/30
                      focus:bg-white/[0.05]
                    "
                  />
                </div>

                {/* Notes */}

                <div className="sm:col-span-2">
                  <label className="text-xs font-medium uppercase tracking-[0.12em] text-white/30">
                    Notes
                  </label>

                  <textarea
                    value={
                      modificationForm.notes
                    }
                    onChange={(event) =>
                      updateModificationField(
                        "notes",
                        event.target.value
                      )
                    }
                    placeholder="Part numbers, shop details, setup notes, etc."
                    rows={3}
                    className="
                      mt-2
                      w-full
                      resize-none
                      rounded-2xl
                      border
                      border-white/[0.10]
                      bg-white/[0.03]
                      px-4
                      py-3
                      text-sm
                      leading-6
                      text-white
                      outline-none
                      placeholder:text-white/15
                      focus:border-red-400/30
                      focus:bg-white/[0.05]
                    "
                  />
                </div>

                {editingModificationId && (
                  <div className="sm:col-span-2">
                    <ModificationPhotoManager
                      vehicleId={vehicleId}
                      modificationId={editingModificationId}
                      photos={
                        modifications.find(
                          (item) =>
                            item.id ===
                            editingModificationId
                        )?.photos || []
                      }
                      onPhotosChange={(nextPhotos) => {
                        setModifications((current) =>
                          current.map((item) =>
                            item.id === editingModificationId
                              ? {
                                  ...item,
                                  photos: nextPhotos,
                                }
                              : item
                          )
                        );
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Buttons */}

              <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={
                    closeModificationForm
                  }
                  disabled={
                    savingModification
                  }
                  className="
                    h-12
                    rounded-2xl
                    border
                    border-white/[0.10]
                    bg-white/[0.03]
                    px-6
                    text-sm
                    font-semibold
                    text-white/60
                    transition-all
                    hover:bg-white/[0.06]
                    hover:text-white
                    disabled:opacity-30
                  "
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    savingModification
                  }
                  className="
                    h-12
                    rounded-2xl
                    border
                    border-red-400/30
                    bg-red-600/[0.25]
                    px-7
                    text-sm
                    font-semibold
                    text-white
                    transition-all
                    hover:border-red-300/40
                    hover:bg-red-500/[0.40]
                    disabled:cursor-not-allowed
                    disabled:opacity-40
                  "
                >
                  {savingModification
                    ? "Saving..."
                    : editingModificationId
                    ? "Save changes"
                    : "Add modification"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================
          FULL SCREEN PHOTO VIEWER
      ===================================================== */}

      {viewerPhoto &&
        viewerIndex !== null && (
          <div
            className="
              fixed
              inset-0
              z-[100]
              flex
              items-center
              justify-center
              bg-black/95
              p-4
              backdrop-blur-xl
            "
            onClick={closeViewer}
          >
            <button
              type="button"
              onClick={closeViewer}
              className="
                absolute
                right-5
                top-5
                z-20
                flex
                h-11
                w-11
                items-center
                justify-center
                rounded-2xl
                border
                border-white/[0.12]
                bg-white/[0.06]
                text-xl
                text-white/70
                backdrop-blur-xl
                hover:bg-white/[0.12]
                hover:text-white
              "
              aria-label="Close photo viewer"
            >
              
            </button>

            <div
              className="
                absolute
                left-1/2
                top-5
                z-20
                -translate-x-1/2
                rounded-full
                border
                border-white/[0.10]
                bg-black/60
                px-4
                py-2
                text-xs
                text-white/50
                backdrop-blur-xl
              "
            >
              {viewerIndex + 1} /{" "}
              {photos.length}
            </div>

            {photos.length > 1 && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  showPreviousPhoto();
                }}
                className="
                  absolute
                  left-4
                  top-1/2
                  z-20
                  flex
                  h-12
                  w-12
                  -translate-y-1/2
                  items-center
                  justify-center
                  rounded-2xl
                  border
                  border-white/[0.12]
                  bg-black/60
                  text-2xl
                  text-white/60
                  backdrop-blur-xl
                  hover:bg-black/80
                  hover:text-white
                  sm:left-8
                "
                aria-label="Previous photo"
              >
                <BackIcon className="h-4 w-4 rotate-180" />
              </button>
            )}

            <img
              src={viewerPhoto.url}
              alt={`${vehicle.make} ${vehicle.model}`}
              onClick={(event) =>
                event.stopPropagation()
              }
              className="
                max-h-[88vh]
                max-w-[92vw]
                rounded-2xl
                object-contain
                shadow-2xl
                sm:max-w-[85vw]
              "
            />

            {photos.length > 1 && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  showNextPhoto();
                }}
                className="
                  absolute
                  right-4
                  top-1/2
                  z-20
                  flex
                  h-12
                  w-12
                  -translate-y-1/2
                  items-center
                  justify-center
                  rounded-2xl
                  border
                  border-white/[0.12]
                  bg-black/60
                  text-2xl
                  text-white/60
                  backdrop-blur-xl
                  hover:bg-black/80
                  hover:text-white
                  sm:right-8
                "
                aria-label="Next photo"
              >
                <BackIcon className="h-4 w-4" />
              </button>
            )}

            <div
              className="
                absolute
                bottom-5
                left-1/2
                z-20
                -translate-x-1/2
                rounded-full
                border
                border-white/[0.10]
                bg-black/60
                px-4
                py-2
                text-xs
                text-white/40
                backdrop-blur-xl
              "
            >
              {vehicle.make}{" "}
              {vehicle.model}
            </div>
          </div>
        )}
    </main>
  );
}
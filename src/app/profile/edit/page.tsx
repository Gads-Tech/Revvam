"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import { useRouter } from "next/navigation";
import Link from "next/link";

import AuthLayout from "@/components/AuthLayout";
import FormInput from "@/components/FormInput";
import GlassButton from "@/components/GlassButton";

export default function EditProfilePage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [serverError, setServerError] = useState("");
  const [successMessage, setSuccessMessage] =
    useState("");

  const [nameError, setNameError] = useState("");
  const [usernameError, setUsernameError] =
    useState("");

  /*
   * Load the currently authenticated user's
   * profile when the page mounts.
   */
  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        const response = await fetch(
          "/api/profile",
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          if (!cancelled) {
            router.replace("/login");
          }

          return;
        }

        if (!cancelled) {
          setName(data.user.name ?? "");
          setUsername(
            data.user.username ?? ""
          );
          setBio(data.user.bio ?? "");
        }
      } catch (error) {
        console.error(
          "Unable to load profile:",
          error
        );

        if (!cancelled) {
          setServerError(
            "Unable to load your profile."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [router]);

  /*
   * Submit profile changes.
   */
  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setNameError("");
    setUsernameError("");
    setServerError("");
    setSuccessMessage("");

    const cleanName = name.trim();
    const cleanUsername = username.trim();
    const cleanBio = bio.trim();

    let hasError = false;

    /*
     * Name validation.
     */
    if (!cleanName) {
      setNameError("Enter your name.");
      hasError = true;
    }

    /*
     * Username validation.
     */
    if (!cleanUsername) {
      setUsernameError(
        "Enter a username."
      );

      hasError = true;
    } else if (
      !/^[a-zA-Z0-9_]+$/.test(
        cleanUsername
      )
    ) {
      setUsernameError(
        "Only letters, numbers, and underscores are allowed."
      );

      hasError = true;
    } else if (cleanUsername.length < 3) {
      setUsernameError(
        "Username must be at least 3 characters."
      );

      hasError = true;
    } else if (cleanUsername.length > 30) {
      setUsernameError(
        "Username must be 30 characters or less."
      );

      hasError = true;
    }

    /*
     * Bio validation.
     */
    if (cleanBio.length > 500) {
      setServerError(
        "Bio must be 500 characters or less."
      );

      hasError = true;
    }

    if (hasError) {
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(
        "/api/profile/update",
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            name: cleanName,
            username: cleanUsername,
            bio: cleanBio,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        setServerError(
          data.error ||
            "Unable to update your profile."
        );

        return;
      }

      setSuccessMessage(
        "Profile updated successfully."
      );

      /*
       * Give the success message a moment
       * before returning to the profile.
       */
      window.setTimeout(() => {
        router.push("/profile");
        router.refresh();
      }, 700);
    } catch (error) {
      console.error(
        "Profile update request failed:",
        error
      );

      setServerError(
        "Unable to connect to Revvam. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  /*
   * Loading state.
   */
  if (loading) {
    return (
      <main
        className="
          flex
          min-h-screen
          items-center
          justify-center
          bg-black
          text-white
        "
      >
        <div className="text-center">
          <div
            className="
              mx-auto
              h-8
              w-8
              animate-spin
              rounded-full
              border-2
              border-white/10
              border-t-red-500
            "
          />

          <p
            className="
              mt-4
              text-sm
              text-white/30
            "
          >
            Loading profile...
          </p>
        </div>
      </main>
    );
  }

  return (
    <AuthLayout
      title="Edit profile"
      subtitle="Update the information people see on your Revvam profile."
    >
      <form
        onSubmit={handleSubmit}
        className="space-y-5"
      >
        {/* Name */}
        <FormInput
          label="Name"
          type="text"
          name="name"
          autoComplete="name"
          placeholder="Your name"
          value={name}
          onChange={(event) =>
            setName(event.target.value)
          }
          error={nameError}
          disabled={saving}
        />

        {/* Username */}
        <FormInput
          label="Username"
          type="text"
          name="username"
          autoComplete="username"
          placeholder="Your username"
          value={username}
          onChange={(event) =>
            setUsername(
              event.target.value
            )
          }
          error={usernameError}
          disabled={saving}
        />

        {/* Bio */}
        <div>
          <label
            htmlFor="bio"
            className="
              mb-2
              block
              text-sm
              font-medium
              text-white/60
            "
          >
            Bio
          </label>

          <textarea
            id="bio"
            name="bio"
            placeholder="Tell the Revvam community about yourself..."
            value={bio}
            onChange={(event) =>
              setBio(event.target.value)
            }
            disabled={saving}
            maxLength={500}
            rows={5}
            className="
              w-full
              resize-none
              rounded-2xl
              border
              border-white/[0.12]
              bg-white/[0.045]
              px-5
              py-4
              text-base
              text-white
              outline-none
              placeholder:text-white/25
              backdrop-blur-xl
              transition-all
              duration-300
              hover:border-white/[0.20]
              focus:border-red-500/50
              focus:bg-white/[0.07]
              focus:ring-1
              focus:ring-red-500/30
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          />

          <div
            className="
              mt-2
              flex
              justify-end
              text-[10px]
              text-white/20
            "
          >
            {bio.length}/500
          </div>
        </div>

        {/* Server error */}
        {serverError && (
          <div
            className="
              rounded-2xl
              border
              border-red-500/20
              bg-red-500/[0.06]
              px-4
              py-3
              text-sm
              leading-5
              text-red-300
            "
          >
            {serverError}
          </div>
        )}

        {/* Success */}
        {successMessage && (
          <div
            className="
              rounded-2xl
              border
              border-green-500/20
              bg-green-500/[0.06]
              px-4
              py-3
              text-sm
              leading-5
              text-green-300
            "
          >
            {successMessage}
          </div>
        )}

        {/* Save */}
        <GlassButton
          type="submit"
          variant="primary"
          disabled={saving}
          className="w-full"
        >
          {saving ? (
            <span
              className="
                flex
                items-center
                justify-center
                gap-2
              "
            >
              <span
                className="
                  h-4
                  w-4
                  animate-spin
                  rounded-full
                  border-2
                  border-white/20
                  border-t-white
                "
              />

              Saving...
            </span>
          ) : (
            "Save changes"
          )}
        </GlassButton>

        {/* Cancel */}
        <Link
          href="/profile"
          className="
            flex
            h-14
            w-full
            items-center
            justify-center
            rounded-2xl
            border
            border-white/[0.10]
            bg-white/[0.025]
            text-sm
            font-medium
            text-white/50
            backdrop-blur-xl
            transition-all
            duration-300
            hover:border-white/[0.18]
            hover:bg-white/[0.06]
            hover:text-white
          "
        >
          Cancel
        </Link>
      </form>
    </AuthLayout>
  );
}
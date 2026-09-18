"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CarIcon, MechanicIcon, StorefrontIcon, CheckIcon, UserIcon } from "@/components/icons/RevvamIcons";

type Role =
  | "USER"
  | "MECHANIC"
  | "MECHANIC_SHOP"
  | "DEALERSHIP";

type OnboardingType =
  | "DRIVER"
  | "EXPLORER"
  | "MECHANIC"
  | "MECHANIC_SHOP"
  | "DEALERSHIP";

type SetupChoice = {
  value: Role;
  icon: React.ReactNode;
  title: string;
  description: string;
  onboardingType: OnboardingType;
};

const roles: SetupChoice[] = [
  {
    value: "USER",
    icon: <CarIcon className="h-6 w-6" />,
    title: "Driver",
    description:
      "Share your cars, builds, experiences, and connect with other enthusiasts.",
    onboardingType: "DRIVER",
  },
  {
    value: "MECHANIC",
    icon: <MechanicIcon className="h-6 w-6" />,
    title: "Mechanic",
    description:
      "Show your expertise, connect with drivers, and offer automotive services.",
    onboardingType: "MECHANIC",
  },
  {
    value: "MECHANIC_SHOP",
    icon: <StorefrontIcon className="h-6 w-6" />,
    title: "Mechanic Shop",
    description:
      "Represent your workshop and help drivers find your automotive services.",
    onboardingType: "MECHANIC_SHOP",
  },
  {
    value: "DEALERSHIP",
    icon: <CarIcon className="h-6 w-6" />,
    title: "Dealership",
    description:
      "Represent your dealership and showcase vehicles to the Revvam community.",
    onboardingType: "DEALERSHIP",
  },
  {
    value: "USER",
    icon: <UserIcon className="h-6 w-6" />,
    title: "Explorer",
    description:
      "Explore Revvam, discover cars, meet people, and experience the community.",
    onboardingType: "EXPLORER",
  },
];

export default function ProfileSetupPage() {
  const router = useRouter();

  const [selectedRole, setSelectedRole] =
    useState<SetupChoice | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleContinue() {
    if (!selectedRole) {
      setError("Choose an option to continue.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        "/api/profile/role",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            role: selectedRole.value,
            onboardingType:
              selectedRole.onboardingType,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(
          data.error ||
            "Unable to save your profile type."
        );

        return;
      }

      /*
       * Route to the correct onboarding flow.
       */
      switch (selectedRole.onboardingType) {
        case "DRIVER":
          router.push("/profile/setup/driver");
          break;

        case "EXPLORER":
          router.push("/profile/setup/explorer");
          break;

        case "MECHANIC":
          router.push("/profile/setup/mechanic");
          break;

        case "MECHANIC_SHOP":
          router.push(
            "/profile/setup/mechanic-shop"
          );
          break;

        case "DEALERSHIP":
          router.push(
            "/profile/setup/dealership"
          );
          break;

        default:
          router.push("/profile");
          break;
      }

      router.refresh();
    } catch (error) {
      console.error(
        "Role selection failed:",
        error
      );

      setError(
        "Unable to connect to Revvam. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      className="
        relative
        min-h-screen
        overflow-hidden
        bg-black
        px-5
        py-12
        text-white
        sm:px-6
      "
    >
      {/* Atmospheric glow */}

      <div
        className="
          pointer-events-none
          absolute
          left-1/2
          top-[-260px]
          h-[520px]
          w-[520px]
          -translate-x-1/2
          rounded-full
          bg-red-600/[0.08]
          blur-[140px]
        "
      />

      <div
        className="
          pointer-events-none
          absolute
          bottom-[-250px]
          right-[-180px]
          h-[500px]
          w-[500px]
          rounded-full
          bg-red-950/[0.10]
          blur-[150px]
        "
      />

      <div
        className="
          relative
          z-10
          mx-auto
          flex
          min-h-[calc(100vh-6rem)]
          w-full
          max-w-2xl
          items-center
          justify-center
        "
      >
        <div className="w-full">

          {/* Header */}

          <div className="mb-8 text-center">
            <p
              className="
                mb-3
                text-xs
                font-medium
                uppercase
                tracking-[0.25em]
                text-red-400/70
              "
            >
              Welcome to Revvam
            </p>

            <h1
              className="
                text-4xl
                font-black
                tracking-[-0.045em]
                sm:text-5xl
              "
            >
              What brings you here?
            </h1>

            <p
              className="
                mx-auto
                mt-4
                max-w-lg
                text-sm
                leading-6
                text-white/40
                sm:text-base
              "
            >
              Choose the profile that best describes
              how you want to use Revvam.
            </p>
          </div>

          {/* Role cards */}

          <div className="grid gap-4 sm:grid-cols-2">
            {roles.map((role) => {
              const selected =
                selectedRole?.onboardingType ===
                role.onboardingType;

              return (
                <button
                  key={role.onboardingType}
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setSelectedRole(role);
                    setError("");
                  }}
                  className={`
                    group
                    relative
                    overflow-hidden
                    rounded-3xl
                    border
                    p-6
                    text-left
                    backdrop-blur-2xl
                    transition-all
                    duration-300
                    active:scale-[0.98]

                    ${
                      selected
                        ? `
                          border-red-500/50
                          bg-red-500/[0.09]
                          shadow-[0_20px_70px_rgba(239,68,68,0.10)]
                        `
                        : `
                          border-white/[0.09]
                          bg-white/[0.025]
                          hover:border-white/[0.18]
                          hover:bg-white/[0.055]
                        `
                    }

                    disabled:cursor-not-allowed
                    disabled:opacity-60
                  `}
                >
                  {/* Selection indicator */}

                  <div
                    className={`
                      absolute
                      right-5
                      top-5
                      flex
                      h-6
                      w-6
                      items-center
                      justify-center
                      rounded-full
                      border
                      text-xs
                      transition-all

                      ${
                        selected
                          ? `
                            border-red-400
                            bg-red-500
                            text-white
                          `
                          : `
                            border-white/[0.15]
                            bg-white/[0.03]
                            text-transparent
                          `
                      }
                    `}
                  >
                    ✓
                  </div>

                  {/* Icon */}

                  <div
                    className={`
                      mb-6
                      flex
                      h-14
                      w-14
                      items-center
                      justify-center
                      rounded-2xl
                      text-2xl
                      transition-all

                      ${
                        selected
                          ? "bg-red-500/[0.15]"
                          : "bg-white/[0.05]"
                      }
                    `}
                  >
                    {role.icon}
                  </div>

                  <h2 className="text-lg font-semibold">
                    {role.title}
                  </h2>

                  <p
                    className="
                      mt-2
                      text-sm
                      leading-6
                      text-white/35
                    "
                  >
                    {role.description}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Error */}

          {error && (
            <div
              className="
                mt-5
                rounded-2xl
                border
                border-red-500/20
                bg-red-500/[0.06]
                px-4
                py-3
                text-center
                text-sm
                text-red-300
              "
            >
              {error}
            </div>
          )}

          {/* Continue */}

          <button
            type="button"
            onClick={handleContinue}
            disabled={
              loading || !selectedRole
            }
            className="
              mt-6
              flex
              h-14
              w-full
              items-center
              justify-center
              rounded-2xl
              border
              border-red-400/30
              bg-red-600/[0.30]
              px-5
              text-sm
              font-semibold
              text-white
              backdrop-blur-xl
              transition-all
              duration-300
              hover:border-red-300/40
              hover:bg-red-500/[0.45]
              active:scale-[0.99]
              disabled:cursor-not-allowed
              disabled:opacity-35
            "
          >
            {loading ? (
              <span className="flex items-center gap-2">
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
              "Continue"
            )}
          </button>

          <p
            className="
              mt-5
              text-center
              text-[10px]
              uppercase
              tracking-[0.25em]
              text-white/15
            "
          >
            You can update your profile later
          </p>
        </div>
      </div>
    </main>
  );
}
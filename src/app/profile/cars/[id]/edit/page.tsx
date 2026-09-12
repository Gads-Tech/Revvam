"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const vehicleTypes = [
  "Sedan",
  "SUV",
  "Coupe",
  "Hatchback",
  "Pickup",
  "Van",
  "Wagon",
  "Convertible",
  "Sports Car",
  "Motorcycle",
  "Other",
];

type Vehicle = {
  id: string;
  make: string;
  model: string;
  year: number | null;
  type: string | null;
};

export default function EditCarPage() {
  const router = useRouter();
  const params = useParams();

  const vehicleId = params.id as string;

  const [vehicle, setVehicle] =
    useState<Vehicle | null>(null);

  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [type, setType] = useState("");

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  useEffect(() => {
    async function loadVehicle() {
      try {
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
              "Unable to load your vehicle."
          );
          return;
        }

        const loadedVehicle =
          data.vehicle as Vehicle;

        setVehicle(loadedVehicle);

        setMake(loadedVehicle.make);
        setModel(loadedVehicle.model);
        setYear(
          loadedVehicle.year
            ? String(loadedVehicle.year)
            : ""
        );
        setType(
          loadedVehicle.type || ""
        );
      } catch (error) {
        console.error(
          "Unable to load vehicle:",
          error
        );

        setError(
          "Unable to load your vehicle."
        );
      } finally {
        setLoading(false);
      }
    }

    if (vehicleId) {
      loadVehicle();
    }
  }, [vehicleId]);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!make.trim()) {
      setError("Enter your vehicle's make.");
      return;
    }

    if (!model.trim()) {
      setError("Enter your vehicle's model.");
      return;
    }

    if (!year) {
      setError("Enter your vehicle's year.");
      return;
    }

    if (!type) {
      setError("Select your vehicle type.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const response = await fetch(
        `/api/vehicles/${vehicleId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            make: make.trim(),
            model: model.trim(),
            year: Number(year),
            type,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(
          data.error ||
            "Unable to update your vehicle."
        );
        return;
      }

      router.push("/profile/driver");
      router.refresh();
    } catch (error) {
      console.error(
        "Unable to update vehicle:",
        error
      );

      setError(
        "Unable to connect to Revvam. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
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

          <p className="mt-4 text-sm text-white/30">
            Loading vehicle...
          </p>
        </div>
      </main>
    );
  }

  if (!vehicle && error) {
    return (
      <main className="min-h-screen bg-black px-5 py-12 text-white">
        <div className="mx-auto max-w-2xl">
          <div
            className="
              rounded-3xl
              border
              border-red-500/20
              bg-red-500/[0.06]
              px-5
              py-4
              text-sm
              text-red-300
            "
          >
            {error}
          </div>

          <Link
            href="/profile/driver"
            className="
              mt-5
              inline-flex
              text-sm
              text-white/40
              hover:text-white
            "
          >
            ← Back to garage
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black px-5 py-8 text-white sm:px-8">
      {/* Atmospheric background */}

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

      <div className="relative z-10 mx-auto w-full max-w-2xl">
        {/* Header */}

        <header className="mb-8">
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
            Your Garage
          </p>

          <h1
            className="
              text-4xl
              font-black
              tracking-[-0.045em]
              sm:text-5xl
            "
          >
            Edit car
          </h1>

          <p className="mt-3 text-sm leading-6 text-white/40 sm:text-base">
            Update the details of your vehicle.
          </p>
        </header>

        {/* Form */}

        <form
          onSubmit={handleSubmit}
          className="
            rounded-[2rem]
            border
            border-white/[0.08]
            bg-white/[0.025]
            p-6
            backdrop-blur-2xl
            sm:p-8
          "
        >
          <div className="space-y-6">
            {/* Make */}

            <div>
              <label
                htmlFor="make"
                className="mb-2 block text-sm font-medium text-white/70"
              >
                Make
              </label>

              <input
                id="make"
                type="text"
                value={make}
                onChange={(event) =>
                  setMake(event.target.value)
                }
                disabled={saving}
                className="
                  h-14
                  w-full
                  rounded-2xl
                  border
                  border-white/[0.10]
                  bg-black/30
                  px-4
                  text-sm
                  text-white
                  outline-none
                  transition
                  focus:border-red-500/40
                  focus:bg-white/[0.04]
                "
              />
            </div>

            {/* Model */}

            <div>
              <label
                htmlFor="model"
                className="mb-2 block text-sm font-medium text-white/70"
              >
                Model
              </label>

              <input
                id="model"
                type="text"
                value={model}
                onChange={(event) =>
                  setModel(event.target.value)
                }
                disabled={saving}
                className="
                  h-14
                  w-full
                  rounded-2xl
                  border
                  border-white/[0.10]
                  bg-black/30
                  px-4
                  text-sm
                  text-white
                  outline-none
                  transition
                  focus:border-red-500/40
                  focus:bg-white/[0.04]
                "
              />
            </div>

            {/* Year */}

            <div>
              <label
                htmlFor="year"
                className="mb-2 block text-sm font-medium text-white/70"
              >
                Year
              </label>

              <input
                id="year"
                type="number"
                min="1886"
                max={new Date().getFullYear() + 1}
                value={year}
                onChange={(event) =>
                  setYear(event.target.value)
                }
                disabled={saving}
                className="
                  h-14
                  w-full
                  rounded-2xl
                  border
                  border-white/[0.10]
                  bg-black/30
                  px-4
                  text-sm
                  text-white
                  outline-none
                  transition
                  focus:border-red-500/40
                  focus:bg-white/[0.04]
                "
              />
            </div>

            {/* Type */}

            <div>
              <label
                htmlFor="type"
                className="mb-2 block text-sm font-medium text-white/70"
              >
                Vehicle type
              </label>

              <select
                id="type"
                value={type}
                onChange={(event) =>
                  setType(event.target.value)
                }
                disabled={saving}
                className="
                  h-14
                  w-full
                  appearance-none
                  rounded-2xl
                  border
                  border-white/[0.10]
                  bg-black/30
                  px-4
                  text-sm
                  text-white
                  outline-none
                  transition
                  focus:border-red-500/40
                  focus:bg-white/[0.04]
                "
              >
                <option
                  value=""
                  disabled
                  className="bg-black"
                >
                  Select vehicle type
                </option>

                {vehicleTypes.map(
                  (vehicleType) => (
                    <option
                      key={vehicleType}
                      value={vehicleType}
                      className="bg-black"
                    >
                      {vehicleType}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>

          {/* Error */}

          {error && (
            <div
              className="
                mt-6
                rounded-2xl
                border
                border-red-500/20
                bg-red-500/[0.06]
                px-4
                py-3
                text-sm
                text-red-300
              "
            >
              {error}
            </div>
          )}

          {/* Actions */}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/profile/driver"
              className="
                inline-flex
                h-14
                flex-1
                items-center
                justify-center
                rounded-2xl
                border
                border-white/[0.10]
                bg-white/[0.03]
                px-5
                text-sm
                font-medium
                text-white/60
                transition-all
                hover:border-white/[0.18]
                hover:bg-white/[0.06]
                hover:text-white
              "
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={saving}
              className="
                inline-flex
                h-14
                flex-1
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
                active:scale-[0.98]
                disabled:cursor-not-allowed
                disabled:opacity-40
              "
            >
              {saving ? (
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
                "Save changes"
              )}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

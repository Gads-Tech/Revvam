"use client";

import {
  FormEvent,
  useState,
} from "react";

import { useRouter } from "next/navigation";

type DriverData = {
  ownsCar: boolean | null;
  carMake: string;
  carModel: string;
  carYear: string;
  carType: string;
  interests: string[];
};

const interests = [
  "Performance",
  "JDM",
  "European",
  "American",
  "Off-road",
  "Luxury",
  "Classic",
  "Electric",
  "Modified",
  "Motorsport",
];

const carTypes = [
  "Sedan",
  "Coupe",
  "Hatchback",
  "SUV",
  "Pickup",
  "Wagon",
  "Sports Car",
  "Supercar",
  "Classic",
  "Motorcycle",
  "Other",
];

export default function DriverSetupPage() {
  const router = useRouter();

  const [step, setStep] = useState(1);

  const [data, setData] = useState<DriverData>({
    ownsCar: null,
    carMake: "",
    carModel: "",
    carYear: "",
    carType: "",
    interests: [],
  });

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function updateData(updates: Partial<DriverData>) {
    setData((current) => ({
      ...current,
      ...updates,
    }));

    setError("");
  }

  function toggleInterest(interest: string) {
    setData((current) => {
      const exists = current.interests.includes(interest);

      return {
        ...current,
        interests: exists
          ? current.interests.filter(
              (item) => item !== interest
            )
          : [...current.interests, interest],
      };
    });

    setError("");
  }

  function nextStep() {
    setError("");

    /*
     * STEP 1 VALIDATION
     */
    if (step === 1) {
      if (data.ownsCar === null) {
        setError(
          "Tell us whether you currently own a car."
        );

        return;
      }

      /*
       * Drivers without a car don't need
       * to complete the vehicle step.
       */
      if (!data.ownsCar) {
        setStep(3);
        return;
      }
    }

    /*
     * STEP 2 VALIDATION
     */
    if (step === 2) {
      if (!data.carMake.trim()) {
        setError("Enter your car's make.");
        return;
      }

      if (!data.carModel.trim()) {
        setError("Enter your car's model.");
        return;
      }

      if (!data.carYear.trim()) {
        setError("Enter your car's year.");
        return;
      }

      const year = Number(data.carYear);

      if (
        !Number.isInteger(year) ||
        year < 1886 ||
        year > new Date().getFullYear() + 1
      ) {
        setError("Enter a valid vehicle year.");
        return;
      }

      if (!data.carType) {
        setError("Select your vehicle type.");
        return;
      }
    }

    if (step < 3) {
      setStep((current) => current + 1);
    }
  }

  function previousStep() {
    setError("");

    /*
     * If the user doesn't own a car,
     * going back from step 3 returns
     * directly to step 1.
     */
    if (
      step === 3 &&
      data.ownsCar === false
    ) {
      setStep(1);
      return;
    }

    if (step > 1) {
      setStep((current) => current - 1);
    }
  }

  async function handleFinish(event: FormEvent) {
    event.preventDefault();

    setError("");

    /*
     * Require at least one interest.
     */
    if (data.interests.length === 0) {
      setError(
        "Choose at least one automotive interest."
      );

      return;
    }

    /*
     * If the user owns a car, make sure
     * all vehicle information is present.
     */
    if (data.ownsCar) {
      if (
        !data.carMake.trim() ||
        !data.carModel.trim() ||
        !data.carYear.trim() ||
        !data.carType
      ) {
        setError(
          "Please complete your vehicle information."
        );

        return;
      }
    }

    try {
      setSaving(true);

      /*
       * Send the completed driver setup
       * to the authenticated backend.
       */
      const response = await fetch(
        "/api/profile/driver",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          credentials: "include",

          body: JSON.stringify({
            ownsCar: data.ownsCar,

            car: data.ownsCar
              ? {
                  make: data.carMake.trim(),
                  model: data.carModel.trim(),
                  year: Number(data.carYear),
                  type: data.carType,
                }
              : null,

            interests: data.interests,
          }),
        }
      );

      const result = await response.json();

      /*
       * Backend rejected the request.
       */
      if (!response.ok || !result.success) {
        setError(
          result.error ||
            "Unable to save your driver profile."
        );

        return;
      }

      /*
       * Driver setup is now complete.
       */
      router.push("/profile");
      router.refresh();
    } catch (error) {
      console.error(
        "Driver setup failed:",
        error
      );

      setError(
        "Unable to connect to Revvam. Please try again."
      );
    } finally {
      setSaving(false);
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
        py-10
        text-white
        sm:px-6
      "
    >
      {/* =========================================================
          BACKGROUND
      ========================================================== */}

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

      {/* =========================================================
          CONTENT
      ========================================================== */}

      <div
        className="
          relative
          z-10
          mx-auto
          flex
          min-h-[calc(100vh-5rem)]
          w-full
          max-w-2xl
          items-center
          justify-center
        "
      >
        <div className="w-full">

          {/* =====================================================
              PROGRESS
          ====================================================== */}

          <div className="mb-10">
            <div className="mb-3 flex items-center justify-between">
              <p
                className="
                  text-xs
                  font-medium
                  uppercase
                  tracking-[0.25em]
                  text-red-400/70
                "
              >
                Driver setup
              </p>

              <p className="text-xs text-white/25">
                {step}/3
              </p>
            </div>

            <div
              className="
                h-1
                overflow-hidden
                rounded-full
                bg-white/[0.06]
              "
            >
              <div
                className="
                  h-full
                  rounded-full
                  bg-red-500
                  transition-all
                  duration-500
                "
                style={{
                  width: `${(step / 3) * 100}%`,
                }}
              />
            </div>
          </div>

          {/* =====================================================
              STEP 1
          ====================================================== */}

          {step === 1 && (
            <section>
              <div className="mb-8">
                <p className="mb-3 text-4xl">
                  🚗
                </p>

                <h1
                  className="
                    text-4xl
                    font-black
                    tracking-[-0.045em]
                    sm:text-5xl
                  "
                >
                  What do you drive?
                </h1>

                <p
                  className="
                    mt-4
                    max-w-lg
                    text-sm
                    leading-6
                    text-white/40
                    sm:text-base
                  "
                >
                  First, tell us a little about
                  your relationship with cars.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">

                {/* Owns car */}

                <button
                  type="button"
                  disabled={saving}
                  onClick={() =>
                    updateData({
                      ownsCar: true,
                    })
                  }
                  className={`
                    rounded-3xl
                    border
                    p-6
                    text-left
                    transition-all
                    duration-300
                    disabled:cursor-not-allowed
                    disabled:opacity-50

                    ${
                      data.ownsCar === true
                        ? `
                          border-red-500/50
                          bg-red-500/[0.09]
                          shadow-[0_20px_70px_rgba(239,68,68,0.08)]
                        `
                        : `
                          border-white/[0.09]
                          bg-white/[0.025]
                          hover:border-white/[0.18]
                          hover:bg-white/[0.055]
                        `
                    }
                  `}
                >
                  <div className="mb-5 text-3xl">
                    🔑
                  </div>

                  <h2 className="font-semibold">
                    I own a car
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-white/35">
                    Add your car to your Revvam
                    garage.
                  </p>
                </button>

                {/* Doesn't own car */}

                <button
                  type="button"
                  disabled={saving}
                  onClick={() =>
                    updateData({
                      ownsCar: false,
                    })
                  }
                  className={`
                    rounded-3xl
                    border
                    p-6
                    text-left
                    transition-all
                    duration-300
                    disabled:cursor-not-allowed
                    disabled:opacity-50

                    ${
                      data.ownsCar === false
                        ? `
                          border-red-500/50
                          bg-red-500/[0.09]
                          shadow-[0_20px_70px_rgba(239,68,68,0.08)]
                        `
                        : `
                          border-white/[0.09]
                          bg-white/[0.025]
                          hover:border-white/[0.18]
                          hover:bg-white/[0.055]
                        `
                    }
                  `}
                >
                  <div className="mb-5 text-3xl">
                    👀
                  </div>

                  <h2 className="font-semibold">
                   I don&apos;t own one yet
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-white/35">
                    That&apos;s completely fine.
                    Explore the community first.
                  </p>
                </button>

              </div>
            </section>
          )}

          {/* =====================================================
              STEP 2
          ====================================================== */}

          {step === 2 && (
            <section>
              <div className="mb-8">
                <p className="mb-3 text-4xl">
                  🏎️
                </p>

                <h1
                  className="
                    text-4xl
                    font-black
                    tracking-[-0.045em]
                    sm:text-5xl
                  "
                >
                  Tell us about your car.
                </h1>

                <p
                  className="
                    mt-4
                    text-sm
                    leading-6
                    text-white/40
                    sm:text-base
                  "
                >
                  This will become the first
                  vehicle in your Revvam garage.
                </p>
              </div>

              <div className="space-y-5">

                {/* Make */}

                <div>
                  <label
                    htmlFor="carMake"
                    className="
                      mb-2
                      block
                      text-sm
                      font-medium
                      text-white/60
                    "
                  >
                    Make
                  </label>

                  <input
                    id="carMake"
                    value={data.carMake}
                    disabled={saving}
                    onChange={(event) =>
                      updateData({
                        carMake:
                          event.target.value,
                      })
                    }
                    placeholder="e.g. Toyota"
                    autoComplete="off"
                    className="
                      h-14
                      w-full
                      rounded-2xl
                      border
                      border-white/[0.10]
                      bg-white/[0.04]
                      px-5
                      text-white
                      outline-none
                      placeholder:text-white/20
                      focus:border-red-500/50
                      focus:bg-white/[0.06]
                      disabled:opacity-50
                    "
                  />
                </div>

                {/* Model */}

                <div>
                  <label
                    htmlFor="carModel"
                    className="
                      mb-2
                      block
                      text-sm
                      font-medium
                      text-white/60
                    "
                  >
                    Model
                  </label>

                  <input
                    id="carModel"
                    value={data.carModel}
                    disabled={saving}
                    onChange={(event) =>
                      updateData({
                        carModel:
                          event.target.value,
                      })
                    }
                    placeholder="e.g. Supra"
                    autoComplete="off"
                    className="
                      h-14
                      w-full
                      rounded-2xl
                      border
                      border-white/[0.10]
                      bg-white/[0.04]
                      px-5
                      text-white
                      outline-none
                      placeholder:text-white/20
                      focus:border-red-500/50
                      focus:bg-white/[0.06]
                      disabled:opacity-50
                    "
                  />
                </div>

                <div className="grid gap-5 sm:grid-cols-2">

                  {/* Year */}

                  <div>
                    <label
                      htmlFor="carYear"
                      className="
                        mb-2
                        block
                        text-sm
                        font-medium
                        text-white/60
                      "
                    >
                      Year
                    </label>

                    <input
                      id="carYear"
                      type="number"
                      value={data.carYear}
                      disabled={saving}
                      onChange={(event) =>
                        updateData({
                          carYear:
                            event.target.value,
                        })
                      }
                      placeholder="2020"
                      min="1886"
                      max={
                        new Date().getFullYear() + 1
                      }
                      className="
                        h-14
                        w-full
                        rounded-2xl
                        border
                        border-white/[0.10]
                        bg-white/[0.04]
                        px-5
                        text-white
                        outline-none
                        placeholder:text-white/20
                        focus:border-red-500/50
                        focus:bg-white/[0.06]
                        disabled:opacity-50
                      "
                    />
                  </div>

                  {/* Vehicle type */}

                  <div>
                    <label
                      htmlFor="carType"
                      className="
                        mb-2
                        block
                        text-sm
                        font-medium
                        text-white/60
                      "
                    >
                      Vehicle type
                    </label>

                    <select
                      id="carType"
                      value={data.carType}
                      disabled={saving}
                      onChange={(event) =>
                        updateData({
                          carType:
                            event.target.value,
                        })
                      }
                      className="
                        h-14
                        w-full
                        rounded-2xl
                        border
                        border-white/[0.10]
                        bg-[#111]
                        px-5
                        text-white
                        outline-none
                        focus:border-red-500/50
                        disabled:opacity-50
                      "
                    >
                      <option value="">
                        Select type
                      </option>

                      {carTypes.map((type) => (
                        <option
                          key={type}
                          value={type}
                        >
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>

                </div>
              </div>
            </section>
          )}

          {/* =====================================================
              STEP 3
          ====================================================== */}

          {step === 3 && (
            <section>
              <div className="mb-8">
                <p className="mb-3 text-4xl">
                  🔥
                </p>

                <h1
                  className="
                    text-4xl
                    font-black
                    tracking-[-0.045em]
                    sm:text-5xl
                  "
                >
                  What are you into?
                </h1>

                <p
                  className="
                    mt-4
                    max-w-lg
                    text-sm
                    leading-6
                    text-white/40
                    sm:text-base
                  "
                >
                  Pick the automotive interests
                  that sound like you.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                {interests.map((interest) => {
                  const selected =
                    data.interests.includes(
                      interest
                    );

                  return (
                    <button
                      key={interest}
                      type="button"
                      disabled={saving}
                      onClick={() =>
                        toggleInterest(
                          interest
                        )
                      }
                      className={`
                        rounded-full
                        border
                        px-5
                        py-3
                        text-sm
                        transition-all
                        duration-200
                        disabled:cursor-not-allowed
                        disabled:opacity-50

                        ${
                          selected
                            ? `
                              border-red-500/50
                              bg-red-500/[0.12]
                              text-red-200
                            `
                            : `
                              border-white/[0.09]
                              bg-white/[0.025]
                              text-white/50
                              hover:border-white/[0.18]
                              hover:text-white
                            `
                        }
                      `}
                    >
                      {selected ? "✓ " : ""}
                      {interest}
                    </button>
                  );
                })}
              </div>

              <p className="mt-5 text-xs text-white/20">
                Choose at least one.
              </p>
            </section>
          )}

          {/* =====================================================
              ERROR
          ====================================================== */}

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
                leading-5
                text-red-300
              "
            >
              {error}
            </div>
          )}

          {/* =====================================================
              NAVIGATION
          ====================================================== */}

          <div className="mt-8 flex gap-3">

            {step > 1 && (
              <button
                type="button"
                onClick={previousStep}
                disabled={saving}
                className="
                  h-14
                  rounded-2xl
                  border
                  border-white/[0.10]
                  bg-white/[0.025]
                  px-6
                  text-sm
                  font-medium
                  text-white/60
                  transition-all
                  hover:border-white/[0.18]
                  hover:bg-white/[0.05]
                  hover:text-white
                  disabled:cursor-not-allowed
                  disabled:opacity-40
                "
              >
                Back
              </button>
            )}

            {step < 3 ? (
              <button
                type="button"
                onClick={nextStep}
                disabled={saving}
                className="
                  h-14
                  flex-1
                  rounded-2xl
                  border
                  border-red-400/30
                  bg-red-600/[0.30]
                  text-sm
                  font-semibold
                  text-white
                  transition-all
                  hover:border-red-300/40
                  hover:bg-red-500/[0.45]
                  disabled:cursor-not-allowed
                  disabled:opacity-40
                "
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                disabled={saving}
                className="
                  h-14
                  flex-1
                  rounded-2xl
                  border
                  border-red-400/30
                  bg-red-600/[0.30]
                  text-sm
                  font-semibold
                  text-white
                  transition-all
                  hover:border-red-300/40
                  hover:bg-red-500/[0.45]
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              >
                {saving ? (
                  <span className="flex items-center justify-center gap-2">
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
                  "Finish setup"
                )}
              </button>
            )}

          </div>

          {/* =====================================================
              FOOTER
          ====================================================== */}

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
            You can update your garage later
          </p>

        </div>
      </div>
    </main>
  );
}
import { CarIcon } from "@/components/icons";
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import MobileNav from "@/components/MobileNav";

type User = {
  name: string;
  username: string;
  image?: string | null;
};

type VehiclePhoto = {
  id: string;
  url: string;
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

export default function DriverGaragePage() {
  const [user, setUser] = useState<User | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);
  const [vehicleError, setVehicleError] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const [profileResponse, vehiclesResponse] =
          await Promise.all([
            fetch("/api/profile", {
              method: "GET",
              credentials: "include",
              cache: "no-store",
            }),
            fetch("/api/vehicles", {
              method: "GET",
              credentials: "include",
              cache: "no-store",
            }),
          ]);

        const profileData = await profileResponse.json();
        if (profileResponse.ok && profileData.success) {
          setUser(profileData.user);
        }

        const vehiclesData = await vehiclesResponse.json();
        if (vehiclesResponse.ok && vehiclesData.success) {
          setVehicles(vehiclesData.vehicles ?? []);
        } else {
          setVehicleError(
            vehiclesData.error || "Unable to load your garage."
          );
        }
      } catch (error) {
        console.error("Unable to load driver garage:", error);
        setVehicleError("Unable to load your garage.");
      } finally {
        setLoading(false);
        setVehiclesLoading(false);
      }
    }

    loadData();
  }, []);

  const featuredVehicle =
    vehicles.find((vehicle) => vehicle.isFeatured) ?? null;

  const garageVehicles = featuredVehicle
    ? vehicles.filter((vehicle) => vehicle.id !== featuredVehicle.id)
    : vehicles;

  return (
    <main className="min-h-screen bg-black px-5 py-8 pb-32 text-white sm:px-8">
      <div className="pointer-events-none fixed left-1/2 top-[-280px] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-red-600/[0.07] blur-[150px]" />
      <div className="pointer-events-none fixed bottom-[-250px] right-[-200px] h-[500px] w-[500px] rounded-full bg-red-950/[0.08] blur-[160px]" />

      <div className="relative z-10 mx-auto w-full max-w-5xl">
        <header className="mb-10">
          <Link
            href="/profile"
            className="mb-8 inline-flex items-center gap-2 text-sm text-white/35 transition-colors hover:text-white"
          >
            <BackIcon className="h-4 w-4" />
            Back to profile
          </Link>

          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-3 text-xs font-medium uppercase tracking-[0.25em] text-red-400/70">
                Driver
              </p>
              <h1 className="text-4xl font-black tracking-[-0.045em] sm:text-5xl">
                My Garage
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-white/40 sm:text-base">
                Your cars, builds, and automotive journey in one place.
              </p>
            </div>

            <Link
              href="/profile/cars/add"
              className="inline-flex h-12 items-center justify-center rounded-2xl border border-red-400/30 bg-red-600/[0.25] px-6 text-sm font-semibold text-white backdrop-blur-xl transition-all duration-300 hover:border-red-300/40 hover:bg-red-500/[0.40] active:scale-[0.98]"
            >
              + Add car
            </Link>
          </div>
        </header>

        {!loading && user && (
          <section className="mb-6 flex items-center gap-4 rounded-3xl border border-white/[0.08] bg-white/[0.025] p-5 backdrop-blur-2xl">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/[0.10] bg-white/[0.05]">
              {user.image ? (
                <img
                  src={user.image}
                  alt={user.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-lg font-semibold text-white/50">
                  {user.name?.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate font-medium text-white">{user.name}</p>
              <p className="truncate text-sm text-white/30">@{user.username}</p>
            </div>
          </section>
        )}

        {vehiclesLoading && (
          <section className="flex min-h-[320px] flex-col items-center justify-center rounded-[2rem] border border-white/[0.08] bg-white/[0.025] backdrop-blur-2xl">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-red-500" />
            <p className="mt-4 text-sm text-white/25">Loading your garage...</p>
          </section>
        )}

        {!vehiclesLoading && vehicleError && (
          <div className="rounded-3xl border border-red-500/20 bg-red-500/[0.06] px-5 py-4 text-sm text-red-300">
            {vehicleError}
          </div>
        )}

        {!vehiclesLoading && !vehicleError && vehicles.length === 0 && (
          <section className="flex min-h-[320px] flex-col items-center justify-center rounded-[2rem] border border-dashed border-white/[0.10] bg-white/[0.025] px-6 text-center backdrop-blur-2xl">
            <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl border border-white/[0.08] bg-white/[0.04] text-4xl">
              <CarIcon className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-semibold">Your garage is empty</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-white/30">
              Add your first car and start building your automotive identity on Revvam.
            </p>
            <Link
              href="/profile/cars/add"
              className="mt-6 inline-flex h-12 items-center justify-center rounded-2xl border border-white/[0.10] bg-white/[0.05] px-6 text-sm font-medium text-white/70 transition-all duration-300 hover:border-white/[0.18] hover:bg-white/[0.08] hover:text-white"
            >
              Add your first car
            </Link>
          </section>
        )}

        {!vehiclesLoading && !vehicleError && vehicles.length > 0 && (
          <>
            {featuredVehicle && (
              <section className="mb-6 overflow-hidden rounded-[2rem] border border-red-400/20 bg-gradient-to-br from-red-600/[0.10] via-white/[0.025] to-transparent backdrop-blur-2xl">
                <div className="border-b border-red-400/10 px-6 py-5 sm:px-8">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-400/80">
                    Community spotlight
                  </p>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight">
                    Your featured vehicle
                  </h2>
                  <p className="mt-2 text-sm text-white/30">
                    This is the car you have chosen to represent your garage.
                  </p>
                </div>

                <Link
                  href={`/profile/cars/${featuredVehicle.id}`}
                  className="group grid overflow-hidden sm:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]"
                >
                  <div className="relative h-64 overflow-hidden bg-black sm:h-72">
                    {(featuredVehicle.image || featuredVehicle.photos?.[0]?.url) ? (
                      <img
                        src={featuredVehicle.image ?? featuredVehicle.photos?.[0]?.url ?? ""}
                        alt={`${featuredVehicle.make} ${featuredVehicle.model}`}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-7xl opacity-20">
                        <CarIcon className="h-6 w-6" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    <div className="absolute left-5 top-5 rounded-full border border-red-400/25 bg-red-600/80 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.15em] text-white backdrop-blur-xl">
                      Featured
                    </div>
                  </div>

                  <div className="flex flex-col justify-center p-6 sm:p-8">
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-red-400/70">
                      {featuredVehicle.year ?? "Year unknown"} · {featuredVehicle.type ?? "Vehicle"}
                    </p>
                    <h3 className="mt-2 text-3xl font-black tracking-[-0.04em]">
                      {featuredVehicle.make} {featuredVehicle.model}
                    </h3>
                    <p className="mt-4 text-sm leading-6 text-white/35">
                      Your featured car appears here and in the Revvam community spotlight.
                    </p>
                    <span className="mt-6 inline-flex w-fit rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-white/60 transition-all group-hover:border-red-400/20 group-hover:bg-red-500/10 group-hover:text-white">
                      View vehicle
                    </span>
                  </div>
                </Link>
              </section>
            )}

            <section className="rounded-[2rem] border border-white/[0.08] bg-white/[0.025] p-6 backdrop-blur-2xl sm:p-8">
              <div className="mb-8 flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold">Your cars</h2>
                  <p className="mt-2 text-sm text-white/30">
                    Build your garage by adding the vehicles you own or drive.
                  </p>
                </div>
                <span className="shrink-0 text-xs text-white/25">
                  {vehicles.length} {vehicles.length === 1 ? "vehicle" : "vehicles"}
                </span>
              </div>

              {garageVehicles.length === 0 ? (
                <div className="rounded-3xl border border-white/[0.07] bg-black/20 px-6 py-10 text-center">
                  <p className="text-sm text-white/30">
                    Your featured vehicle is currently your only car.
                  </p>
                  <Link
                    href="/profile/cars/add"
                    className="mt-5 inline-flex h-11 items-center justify-center rounded-xl border border-white/[0.10] bg-white/[0.05] px-5 text-sm font-medium text-white/60 transition hover:bg-white/[0.08] hover:text-white"
                  >
                    + Add another car
                  </Link>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {garageVehicles.map((vehicle) => {
                    const image = vehicle.image ?? vehicle.photos?.[0]?.url ?? null;

                    return (
                      <Link
                        key={vehicle.id}
                        href={`/profile/cars/${vehicle.id}`}
                        className="group block overflow-hidden rounded-3xl border border-white/[0.08] bg-black/20 transition-all duration-300 hover:-translate-y-1 hover:border-white/[0.15] hover:bg-white/[0.035] hover:shadow-[0_20px_70px_rgba(0,0,0,0.35)] active:scale-[0.99]"
                      >
                        <div className="relative flex h-48 items-center justify-center overflow-hidden border-b border-white/[0.06] bg-white/[0.025]">
                          {image ? (
                            <img
                              src={image}
                              alt={`${vehicle.make} ${vehicle.model}`}
                              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className="text-6xl opacity-20 transition-transform duration-500 group-hover:scale-110">
                              <CarIcon className="h-6 w-6" />
                            </div>
                          )}
                          <div className="absolute left-4 top-4 rounded-full border border-white/[0.08] bg-black/40 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.15em] text-white/50 backdrop-blur-xl">
                            {vehicle.type || "Vehicle"}
                          </div>
                          <div className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.10] bg-black/40 text-sm text-white/30 backdrop-blur-xl transition-all duration-300 group-hover:border-red-400/30 group-hover:bg-red-500/20 group-hover:text-red-300">
                            →
                          </div>
                        </div>

                        <div className="p-5">
                          <p className="text-xs uppercase tracking-[0.18em] text-red-400/60">
                            {vehicle.year ?? "Year unknown"}
                          </p>
                          <h3 className="mt-1 text-xl font-semibold">
                            {vehicle.make} {vehicle.model}
                          </h3>
                          <div className="mt-3 flex items-center justify-between">
                            <p className="text-sm text-white/30">View vehicle</p>
                            <span className="text-sm text-white/20 transition-all duration-300 group-hover:translate-x-1 group-hover:text-red-400">
                              →
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      <MobileNav />
    </main>
  );
}

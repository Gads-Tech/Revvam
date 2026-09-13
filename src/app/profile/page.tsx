import Link from "next/link";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

import GlassCard from "@/components/GlassCard";
import Logo from "@/components/Logo";
import MobileNav from "@/components/MobileNav";
import MobileProfileLogout from "@/components/MobileProfileLogout";

const roleLabels: Record<string, string> = {
  USER: "Driver / Car Enthusiast",
  MECHANIC: "Mechanic",
  MECHANIC_SHOP: "Mechanic Shop",
  DEALERSHIP: "Dealership",
  ADMIN: "Administrator",
};

const roleIcons: Record<string, string> = {
  USER: "🚗",
  MECHANIC: "🔧",
  MECHANIC_SHOP: "🏪",
  DEALERSHIP: "🚘",
  ADMIN: "⚙️",
};

export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  /*
   * ============================================================
   * LOAD USER VEHICLES
   * ============================================================
   */

  const vehicles = await prisma.vehicle.findMany({
    where: {
      userId: user.id,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  /*
   * ============================================================
   * PROFILE DATA
   * ============================================================
   */

  const firstLetter =
    user.name?.charAt(0).toUpperCase() || "R";

  const roleLabel =
    roleLabels[user.role] ?? "Revvam Member";

  const roleIcon =
    roleIcons[user.role] ?? "🚗";

  const vehicleCount = vehicles.length;

  return (
    <main className="min-h-screen overflow-x-hidden bg-black text-white">
      {/* ========================================================
          BACKGROUND
      ========================================================= */}

      <div
        className="
          pointer-events-none
          fixed
          left-1/2
          top-[-300px]
          z-0
          h-[600px]
          w-[600px]
          -translate-x-1/2
          rounded-full
          bg-red-600/[0.06]
          blur-[160px]
        "
      />

      <div
        className="
          pointer-events-none
          fixed
          bottom-[-300px]
          right-[-200px]
          z-0
          h-[500px]
          w-[500px]
          rounded-full
          bg-red-950/[0.08]
          blur-[150px]
        "
      />

      {/* ========================================================
          DESKTOP HEADER
      ========================================================= */}

      <header
        className="
          sticky
          top-0
          z-50
          hidden
          border-b
          border-white/[0.06]
          bg-black/70
          backdrop-blur-2xl
          md:block
        "
      >
        <div
          className="
            mx-auto
            flex
            h-20
            max-w-7xl
            items-center
            justify-between
            px-6
            lg:px-8
          "
        >
          <Logo className="h-12 w-auto" />

          <nav className="flex items-center gap-8">
            <Link
              href="/home"
              className="
                text-sm
                font-medium
                text-white/45
                transition-colors
                hover:text-white
              "
            >
              Discover
            </Link>

            <Link
              href="#"
              className="
                text-sm
                font-medium
                text-white/45
                transition-colors
                hover:text-white
              "
            >
              Mechanics
            </Link>

            <Link
              href="#"
              className="
                text-sm
                font-medium
                text-white/45
                transition-colors
                hover:text-white
              "
            >
              Dealerships
            </Link>

            <Link
              href="#"
              className="
                text-sm
                font-medium
                text-white/45
                transition-colors
                hover:text-white
              "
            >
              Events
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            {/* User pill */}

            <Link
              href="/profile"
              className="
                flex
                items-center
                gap-3
                rounded-full
                border
                border-red-500/20
                bg-red-500/[0.05]
                px-4
                py-2
                transition-all
                hover:border-red-500/30
                hover:bg-red-500/[0.08]
              "
            >
              <div
                className="
                  flex
                  h-8
                  w-8
                  items-center
                  justify-center
                  rounded-full
                  bg-red-600/20
                  text-xs
                  font-bold
                  text-red-300
                "
              >
                {firstLetter}
              </div>

              <span
                className="
                  max-w-28
                  truncate
                  text-sm
                  text-white/70
                "
              >
                {user.username}
              </span>
            </Link>

            <form
              action="/api/auth/logout"
              method="POST"
            >
              <button
                type="submit"
                className="
                  rounded-full
                  px-4
                  py-2
                  text-xs
                  font-medium
                  text-white/35
                  transition-colors
                  hover:text-white
                "
              >
                Log out
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* ========================================================
          MAIN
      ========================================================= */}

      <div
        className="
          relative
          z-10
          mx-auto
          max-w-6xl
          px-5
          pb-32
          pt-8
          sm:px-6
          md:pb-20
          md:pt-12
          lg:px-8
        "
      >
        {/* ======================================================
            MOBILE HEADER
        ======================================================= */}

        <div
          className="
            mb-8
            flex
            items-center
            justify-between
            md:hidden
          "
        >
          <Logo className="h-11 w-auto" />

          <Link
            href="/home"
            className="
              rounded-full
              border
              border-white/[0.08]
              bg-white/[0.025]
              px-4
              py-2
              text-xs
              font-medium
              text-white/50
              transition-all
              hover:border-white/[0.16]
              hover:text-white
            "
          >
            Home
          </Link>
        </div>

        {/* ======================================================
            BACK
        ======================================================= */}

        <Link
          href="/home"
          className="
            mb-6
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
          Back to Discover
        </Link>

        {/* ======================================================
            PROFILE HERO
        ======================================================= */}

        <GlassCard className="overflow-hidden">
          <div
            className="
              relative
              px-6
              pb-8
              pt-8
              sm:px-8
              sm:pt-10
            "
          >
            {/* Top glow */}

            <div
              className="
                pointer-events-none
                absolute
                left-1/2
                top-0
                h-px
                w-48
                -translate-x-1/2
                bg-gradient-to-r
                from-transparent
                via-red-500/70
                to-transparent
              "
            />

            <div
              className="
                flex
                flex-col
                gap-7
                sm:flex-row
                sm:items-center
                sm:justify-between
              "
            >
              {/* Profile identity */}

              <div
                className="
                  flex
                  flex-col
                  items-start
                  gap-5
                  sm:flex-row
                  sm:items-center
                "
              >
                <div
                  className="
                    flex
                    h-24
                    w-24
                    shrink-0
                    items-center
                    justify-center
                    rounded-[28px]
                    border
                    border-red-500/20
                    bg-red-600/[0.12]
                    text-3xl
                    font-black
                    text-red-300
                    shadow-[0_0_50px_rgba(239,68,68,0.08)]
                  "
                >
                  {firstLetter}
                </div>

                <div>
                  <p
                    className="
                      text-xs
                      uppercase
                      tracking-[0.25em]
                      text-red-400/70
                    "
                  >
                    Revvam Profile
                  </p>

                  <h1
                    className="
                      mt-2
                      text-3xl
                      font-black
                      tracking-[-0.04em]
                      sm:text-4xl
                    "
                  >
                    {user.name}
                  </h1>

                  <p className="mt-1 text-sm text-white/30">
                    @{user.username}
                  </p>
                </div>
              </div>

              {/* Edit */}

              <Link
                href="/profile/edit"
                className="
                  inline-flex
                  items-center
                  justify-center
                  rounded-2xl
                  border
                  border-white/[0.10]
                  bg-white/[0.025]
                  px-5
                  py-3
                  text-sm
                  font-medium
                  text-white/60
                  backdrop-blur-xl
                  transition-all
                  duration-300
                  hover:border-red-500/25
                  hover:bg-red-500/[0.05]
                  hover:text-white
                "
              >
                Edit profile
              </Link>
            </div>

            {/* ==================================================
                PROFILE TYPE
            =================================================== */}

            <div
              className="
                mt-7
                flex
                items-center
                gap-3
                rounded-2xl
                border
                border-red-500/15
                bg-red-500/[0.045]
                px-4
                py-3
              "
            >
              <span className="text-lg">
                {roleIcon}
              </span>

              <div>
                <p
                  className="
                    text-[10px]
                    uppercase
                    tracking-[0.18em]
                    text-white/25
                  "
                >
                  Profile type
                </p>

                <p
                  className="
                    mt-0.5
                    text-sm
                    font-medium
                    text-white/75
                  "
                >
                  {roleLabel}
                </p>
              </div>
            </div>

            {/* ==================================================
                BIO
            =================================================== */}

            <div className="mt-7">
              <p
                className="
                  text-xs
                  uppercase
                  tracking-[0.2em]
                  text-white/25
                "
              >
                About
              </p>

              <p
                className="
                  mt-3
                  max-w-2xl
                  text-sm
                  leading-6
                  text-white/40
                "
              >
                {user.bio ||
                  "This Revvam member hasn't added a bio yet."}
              </p>
            </div>
          </div>
        </GlassCard>

        {/* ========================================================
            PROFILE STATS
        ========================================================= */}

        <div
          className="
            mt-5
            grid
            grid-cols-3
            gap-3
          "
        >
          <GlassCard className="p-5 text-center">
            <p className="text-2xl font-black">
              0
            </p>

            <p
              className="
                mt-1
                text-[10px]
                uppercase
                tracking-[0.18em]
                text-white/25
              "
            >
              Posts
            </p>
          </GlassCard>

          <GlassCard className="p-5 text-center">
            <p className="text-2xl font-black">
              0
            </p>

            <p
              className="
                mt-1
                text-[10px]
                uppercase
                tracking-[0.18em]
                text-white/25
              "
            >
              Followers
            </p>
          </GlassCard>

          <GlassCard className="p-5 text-center">
            <p className="text-2xl font-black">
              0
            </p>

            <p
              className="
                mt-1
                text-[10px]
                uppercase
                tracking-[0.18em]
                text-white/25
              "
            >
              Following
            </p>
          </GlassCard>
        </div>

        {/* ========================================================
            GARAGE + ACTIVITY
        ========================================================= */}

        <div
          className="
            mt-8
            grid
            gap-5
            lg:grid-cols-[1.35fr_1fr]
          "
        >
          {/* ======================================================
              GARAGE
          ======================================================= */}

          <GlassCard className="p-6 sm:p-7">
            <div className="flex items-center justify-between">
              <div>
                <p
                  className="
                    text-xs
                    uppercase
                    tracking-[0.2em]
                    text-white/25
                  "
                >
                  Your garage
                </p>

                <p className="mt-1 text-sm text-white/25">
                  Your cars on Revvam
                </p>
              </div>

              {vehicleCount > 0 && (
                <span
                  className="
                    rounded-full
                    border
                    border-red-500/15
                    bg-red-500/[0.05]
                    px-3
                    py-1.5
                    text-xs
                    text-red-300/60
                  "
                >
                  {vehicleCount}{" "}
                  {vehicleCount === 1
                    ? "vehicle"
                    : "vehicles"}
                </span>
              )}
            </div>

            {/* ==================================================
                EMPTY GARAGE
            =================================================== */}

            {vehicles.length === 0 ? (
              <div
                className="
                  mt-7
                  rounded-3xl
                  border
                  border-dashed
                  border-white/[0.08]
                  bg-white/[0.015]
                  px-6
                  py-10
                  text-center
                "
              >
                <div
                  className="
                    mx-auto
                    flex
                    h-16
                    w-16
                    items-center
                    justify-center
                    rounded-2xl
                    bg-red-500/[0.06]
                    text-3xl
                  "
                >
                  🚗
                </div>

                <h2 className="mt-5 text-lg font-semibold">
                  Your garage is empty
                </h2>

                <p
                  className="
                    mx-auto
                    mt-2
                    max-w-sm
                    text-sm
                    leading-6
                    text-white/30
                  "
                >
                  Add your first vehicle and start
                  building your Revvam garage.
                </p>

                <Link
                  href="/profile/driver"
                  className="
                    mt-6
                    inline-flex
                    items-center
                    justify-center
                    rounded-2xl
                    border
                    border-red-500/20
                    bg-red-500/[0.07]
                    px-5
                    py-3
                    text-sm
                    font-medium
                    text-red-300/70
                    transition-all
                    hover:border-red-500/35
                    hover:bg-red-500/[0.12]
                    hover:text-red-200
                  "
                >
                  + Add your first car
                </Link>
              </div>
            ) : (
              <div className="mt-7 space-y-3">
                {vehicles.map((vehicle) => (
                  <Link
                    key={vehicle.id}
                    href={`/profile/driver?vehicle=${vehicle.id}`}
                    className="
                      group
                      block
                      rounded-3xl
                      border
                      border-white/[0.08]
                      bg-white/[0.025]
                      p-4
                      transition-all
                      duration-300
                      hover:-translate-y-0.5
                      hover:border-red-500/25
                      hover:bg-white/[0.045]
                    "
                  >
                    <div className="flex items-center gap-4">
                      {/* Vehicle visual */}

                      <div
                        className="
                          relative
                          flex
                          h-20
                          w-20
                          shrink-0
                          items-center
                          justify-center
                          overflow-hidden
                          rounded-2xl
                          border
                          border-red-500/10
                          bg-gradient-to-br
                          from-red-500/[0.12]
                          to-white/[0.02]
                          text-4xl
                        "
                      >
                        🚗

                        <div
                          className="
                            pointer-events-none
                            absolute
                            inset-0
                            bg-gradient-to-br
                            from-white/[0.04]
                            to-transparent
                          "
                        />
                      </div>

                      {/* Vehicle information */}

                      <div className="min-w-0 flex-1">
                        <div
                          className="
                            flex
                            items-start
                            justify-between
                            gap-3
                          "
                        >
                          <div className="min-w-0">
                            <h2
                              className="
                                truncate
                                text-lg
                                font-bold
                                tracking-tight
                                text-white
                                transition-colors
                                group-hover:text-red-100
                              "
                            >
                              {vehicle.make}{" "}
                              {vehicle.model}
                            </h2>

                            <p className="mt-1 text-xs text-white/25">
                              Personal vehicle
                            </p>
                          </div>

                          <span
                            className="
                              shrink-0
                              text-white/20
                              transition-colors
                              group-hover:text-red-300/70
                            "
                          >
                            →
                          </span>
                        </div>

                        <div
                          className="
                            mt-3
                            flex
                            flex-wrap
                            gap-2
                          "
                        >
                          {vehicle.year && (
                            <span
                              className="
                                rounded-full
                                border
                                border-white/[0.08]
                                bg-white/[0.03]
                                px-2.5
                                py-1
                                text-[11px]
                                text-white/40
                              "
                            >
                              {vehicle.year}
                            </span>
                          )}

                          {vehicle.type && (
                            <span
                              className="
                                rounded-full
                                border
                                border-red-500/15
                                bg-red-500/[0.05]
                                px-2.5
                                py-1
                                text-[11px]
                                text-red-300/60
                              "
                            >
                              {vehicle.type}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}

                {/* Add vehicle */}

                <Link
                  href="/profile/driver"
                  className="
                    flex
                    w-full
                    items-center
                    justify-center
                    rounded-2xl
                    border
                    border-dashed
                    border-white/[0.10]
                    bg-white/[0.015]
                    px-4
                    py-3
                    text-sm
                    font-medium
                    text-white/30
                    transition-all
                    hover:border-red-500/25
                    hover:bg-red-500/[0.04]
                    hover:text-white
                  "
                >
                  + Add another vehicle
                </Link>
              </div>
            )}
          </GlassCard>

          {/* ======================================================
              ACTIVITY
          ======================================================= */}

          <GlassCard className="p-6 sm:p-7">
            <p
              className="
                text-xs
                uppercase
                tracking-[0.2em]
                text-white/25
              "
            >
              Your activity
            </p>

            <div
              className="
                mt-7
                rounded-3xl
                border
                border-white/[0.06]
                bg-white/[0.015]
                px-6
                py-10
                text-center
              "
            >
              <div
                className="
                  mx-auto
                  flex
                  h-16
                  w-16
                  items-center
                  justify-center
                  rounded-2xl
                  bg-white/[0.04]
                  text-2xl
                "
              >
                ✦
              </div>

              <h2 className="mt-5 text-lg font-semibold">
                Nothing here yet
              </h2>

              <p
                className="
                  mx-auto
                  mt-2
                  max-w-sm
                  text-sm
                  leading-6
                  text-white/30
                "
              >
                Your posts, likes, comments,
                and other activity will appear
                here.
              </p>

              <Link
                href="/home"
                className="
                  mt-6
                  inline-flex
                  rounded-2xl
                  border
                  border-white/[0.08]
                  bg-white/[0.025]
                  px-4
                  py-3
                  text-sm
                  font-medium
                  text-white/50
                  transition-all
                  hover:border-red-500/25
                  hover:bg-red-500/[0.05]
                  hover:text-white
                "
              >
                Discover Revvam
              </Link>
            </div>
          </GlassCard>
        </div>

        {/* ========================================================
            GARAGE SUMMARY
        ========================================================= */}

        {vehicles.length > 0 && (
          <GlassCard className="mt-5 overflow-hidden">
            <div className="p-6 sm:p-7">
              <div
                className="
                  flex
                  flex-col
                  gap-4
                  sm:flex-row
                  sm:items-center
                  sm:justify-between
                "
              >
                <div>
                  <p
                    className="
                      text-xs
                      uppercase
                      tracking-[0.2em]
                      text-white/25
                    "
                  >
                    Garage status
                  </p>

                  <h2 className="mt-2 text-xl font-bold">
                    {vehicleCount === 1
                      ? "1 vehicle in your garage"
                      : `${vehicleCount} vehicles in your garage`}
                  </h2>

                  <p className="mt-1 text-sm text-white/30">
                    Keep adding vehicles as your collection grows.
                  </p>
                </div>

                <Link
                  href="/profile/driver"
                  className="
                    inline-flex
                    shrink-0
                    items-center
                    justify-center
                    rounded-2xl
                    border
                    border-white/[0.08]
                    bg-white/[0.025]
                    px-5
                    py-3
                    text-sm
                    font-medium
                    text-white/50
                    transition-all
                    hover:border-red-500/25
                    hover:bg-red-500/[0.05]
                    hover:text-white
                  "
                >
                  Manage garage
                </Link>
              </div>
            </div>
          </GlassCard>
        )}

        {/* ========================================================
            ACCOUNT
        ========================================================= */}

        <GlassCard className="mt-5 p-6 sm:p-7">
          <p
            className="
              text-xs
              uppercase
              tracking-[0.2em]
              text-white/25
            "
          >
            Account
          </p>

          <div className="mt-5 divide-y divide-white/[0.06]">
            {/* Email */}

            <div
              className="
                flex
                flex-col
                gap-2
                py-4
                sm:flex-row
                sm:items-center
                sm:justify-between
                sm:gap-4
              "
            >
              <span className="text-sm text-white/35">
                Email
              </span>

              <span
                className="
                  max-w-full
                  truncate
                  text-sm
                  text-white/60
                  sm:max-w-[65%]
                "
              >
                {user.email}
              </span>
            </div>

            {/* Username */}

            <div
              className="
                flex
                flex-col
                gap-2
                py-4
                sm:flex-row
                sm:items-center
                sm:justify-between
                sm:gap-4
              "
            >
              <span className="text-sm text-white/35">
                Username
              </span>

              <span className="text-sm text-white/60">
                @{user.username}
              </span>
            </div>

            {/* Profile type */}

            <div
              className="
                flex
                flex-col
                gap-2
                py-4
                sm:flex-row
                sm:items-center
                sm:justify-between
                sm:gap-4
              "
            >
              <span className="text-sm text-white/35">
                Profile type
              </span>

              <span className="text-sm text-white/60">
                {roleLabel}
              </span>
            </div>

            {/* Vehicles */}

            <div
              className="
                flex
                flex-col
                gap-2
                py-4
                sm:flex-row
                sm:items-center
                sm:justify-between
                sm:gap-4
              "
            >
              <span className="text-sm text-white/35">
                Garage
              </span>

              <span className="text-sm text-white/60">
                {vehicleCount}{" "}
                {vehicleCount === 1
                  ? "vehicle"
                  : "vehicles"}
              </span>
            </div>
          </div>
        </GlassCard>

        <MobileProfileLogout />
      </div>

      <MobileNav />
    </main>
  );
}

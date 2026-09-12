"use client";

import Logo from "./Logo";

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export default function AuthLayout({
  children,
  title,
  subtitle,
}: AuthLayoutProps) {
  return (
    <main
      className="
        relative
        min-h-screen
        overflow-hidden
        bg-black
        text-white
      "
    >
      {/* =====================================================
          SUBTLE RED ATMOSPHERIC GLOW
      ===================================================== */}

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

      {/* =====================================================
          VERY SUBTLE CENTER LIGHT
      ===================================================== */}

      <div
        className="
          pointer-events-none
          absolute
          left-1/2
          top-1/2

          h-[700px]
          w-[700px]

          -translate-x-1/2
          -translate-y-1/2

          rounded-full

          bg-white/[0.012]

          blur-[100px]
        "
      />


      {/* =====================================================
          TOP LOGO
      ===================================================== */}

      <div
        className="
          absolute
          left-5
          top-5
          z-50

          sm:left-8
          sm:top-8
        "
      >
        <Logo
          className="
            h-14
            w-auto

            sm:h-16
          "
        />
      </div>


      {/* =====================================================
          BACK BUTTON
      ===================================================== */}

      <button
        type="button"
        onClick={() => {
          if (window.history.length > 1) {
            window.history.back();
          } else {
            window.location.href = "/";
          }
        }}
        className="
          absolute
          right-5
          top-5
          z-50

          flex
          items-center
          gap-2

          rounded-full

          border
          border-white/[0.10]

          bg-white/[0.025]

          px-5
          py-3

          text-sm
          font-medium
          text-white/55

          backdrop-blur-xl

          transition-all
          duration-300

          hover:border-white/[0.18]
          hover:bg-white/[0.06]
          hover:text-white

          active:scale-95

          sm:right-8
          sm:top-8
        "
      >
        <span
          className="
            text-lg
            leading-none
          "
        >
          ←
        </span>

        Back
      </button>


      {/* =====================================================
          MAIN AUTH CONTENT
      ===================================================== */}

      <div
        className="
          relative
          z-20

          flex
          min-h-screen

          items-center
          justify-center

          px-5

          pb-16
          pt-32

          sm:px-6
          sm:py-32
        "
      >
        <div
          className="
            w-full
            max-w-md
          "
        >

          {/* =================================================
              TITLE
          ================================================= */}

          <div
            className="
              mb-8

              text-center
            "
          >
            <h1
              className="
                text-4xl

                font-black

                tracking-[-0.045em]

                sm:text-5xl
              "
            >
              {title}
            </h1>

            {subtitle && (
              <p
                className="
                  mx-auto

                  mt-4

                  max-w-sm

                  text-sm

                  leading-6

                  text-white/40

                  sm:text-base
                  sm:leading-7
                "
              >
                {subtitle}
              </p>
            )}
          </div>


          {/* =================================================
              FORM CONTAINER
          ================================================= */}

          <div
            className="
              relative

              overflow-hidden

              rounded-[30px]

              border
              border-white/[0.09]

              bg-white/[0.025]

              p-6

              shadow-[0_30px_100px_rgba(0,0,0,0.55)]

              backdrop-blur-2xl

              sm:p-8
            "
          >

            {/* Tiny red accent */}

            <div
              className="
                pointer-events-none

                absolute
                left-1/2
                top-0

                h-px
                w-32

                -translate-x-1/2

                bg-gradient-to-r
                from-transparent
                via-red-500/60
                to-transparent
              "
            />

            {/* Very subtle inner glow */}

            <div
              className="
                pointer-events-none

                absolute
                left-1/2
                top-0

                h-32
                w-64

                -translate-x-1/2

                bg-red-500/[0.025]

                blur-3xl
              "
            />

            <div className="relative z-10">
              {children}
            </div>

          </div>


          {/* =================================================
              BOTTOM BRANDING
          ================================================= */}

          <p
            className="
              mt-7

              text-center

              text-[10px]

              uppercase

              tracking-[0.28em]

              text-white/20
            "
          >
            Built for people who live for cars
          </p>

        </div>
      </div>

    </main>
  );
}
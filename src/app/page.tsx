"use client";

import Navbar from "@/components/Navbar";
import MobileNav from "@/components/MobileNav";
import FrameBackground from "@/components/FrameBackground";
import GlassButton from "@/components/GlassButton";
import GlassCard from "@/components/GlassCard";

export default function Home() {
  function joinRevvam() {
    window.location.href = "/signup";
  }

  function exploreRevvam() {
    document.getElementById("welcome")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <FrameBackground>
        <Navbar />

        <div className="relative z-20 flex h-full items-center justify-center px-6 pb-8 text-center">
          <div className="max-w-6xl">
            <div className="mb-9 inline-flex items-center gap-2.5 rounded-full border border-white/[0.14] bg-white/[0.06] px-6 py-3 text-base text-white/75 shadow-xl shadow-black/10 backdrop-blur-2xl">
              <span className="h-2 w-2 rounded-full bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.8)]" />
              The social platform for car people
            </div>

            <h1 className="text-7xl font-black leading-[0.88] tracking-[-0.055em] sm:text-8xl md:text-9xl lg:text-[10rem]">
              Your car.
              <br />
              Your <span className="text-red-500 drop-shadow-[0_0_35px_rgba(239,68,68,0.18)]">community.</span>
            </h1>

            <p className="mx-auto mt-9 max-w-3xl text-lg leading-8 text-white/60 sm:text-xl">
              Connect with drivers, mechanics, dealerships and people who live for cars.
            </p>

            <div className="mt-11 flex flex-col justify-center gap-4 sm:flex-row">
              <GlassButton type="button" variant="primary" onClick={joinRevvam}>
                Join Revvam <span className="ml-2">→</span>
              </GlassButton>

              <GlassButton type="button" onClick={exploreRevvam}>
                Explore
              </GlassButton>
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 z-30 hidden -translate-x-1/2 text-center md:block">
          <div className="text-[10px] uppercase tracking-[0.35em] text-white/40">Scroll</div>
          <div className="mx-auto mt-3 h-10 w-px bg-gradient-to-b from-white/50 to-transparent" />
        </div>
      </FrameBackground>

      <MobileNav />

      <section id="welcome" className="relative z-10 min-h-screen scroll-mt-8 bg-black px-6 pb-48 pt-32 md:pb-32">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-red-500">Welcome to Revvam</p>

          <h2 className="mt-5 max-w-3xl text-5xl font-black tracking-tight sm:text-6xl">
            More than a
            <br />
            social network.
          </h2>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/45">
            A place where your car, your community and automotive life come together.
          </p>

          <div className="mt-16 grid gap-5 md:grid-cols-3">
            <GlassCard className="group p-8 hover:-translate-y-1">
              <FeatureIcon>🚗</FeatureIcon>
              <h3 className="mt-6 text-xl font-bold text-white">Your Garage</h3>
              <p className="mt-3 leading-7 text-white/40">Show your cars, builds, modifications and automotive journey.</p>
            </GlassCard>

            <GlassCard className="group p-8 hover:-translate-y-1">
              <FeatureIcon>🔧</FeatureIcon>
              <h3 className="mt-6 text-xl font-bold text-white">Find Mechanics</h3>
              <p className="mt-3 leading-7 text-white/40">Discover trusted mechanics and automotive professionals.</p>
            </GlassCard>

            <GlassCard className="group p-8 hover:-translate-y-1">
              <FeatureIcon>📍</FeatureIcon>
              <h3 className="mt-6 text-xl font-bold text-white">Live Issues</h3>
              <p className="mt-3 leading-7 text-white/40">Post a vehicle problem and connect with nearby mechanics.</p>
            </GlassCard>
          </div>
        </div>
      </section>
    </main>
  );
}

function FeatureIcon({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.10] bg-white/[0.05] text-2xl backdrop-blur-xl transition duration-300 group-hover:border-red-500/25 group-hover:bg-red-500/[0.08]">
      {children}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AuthLayout from "@/components/AuthLayout";
import GlassCard from "@/components/GlassCard";
import GlassButton from "@/components/GlassButton";
import { CarIcon, MechanicIcon, StorefrontIcon, UserIcon } from "@/components/icons/RevvamIcons";

type OnboardingType = "DRIVER" | "MECHANIC" | "MECHANIC_SHOP" | "DEALERSHIP" | "EXPLORER";
const options: { type: OnboardingType; icon: React.ReactNode; title: string; description: string }[] = [
  { type: "DRIVER", icon: <CarIcon className="h-6 w-6" />, title: "Driver / Car Enthusiast", description: "Share your cars, discover builds, meet other enthusiasts, and grow your garage." },
  { type: "MECHANIC", icon: <MechanicIcon className="h-6 w-6" />, title: "Mechanic", description: "Showcase your automotive skills, connect with drivers, and find work." },
  { type: "MECHANIC_SHOP", icon: <StorefrontIcon className="h-6 w-6" />, title: "Mechanic Shop", description: "Create a shop presence, showcase your services, and connect with nearby drivers." },
  { type: "DEALERSHIP", icon: <CarIcon className="h-6 w-6" />, title: "Dealership", description: "Build your dealership presence and showcase vehicles to the Revvam community." },
  { type: "EXPLORER", icon: <UserIcon className="h-6 w-6" />, title: "Just Exploring", description: "Explore Revvam, discover cars, people, businesses, and what's happening around you." },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<OnboardingType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleContinue() {
    if (!selected) { setError("Choose an option to continue."); return; }
    try {
      setLoading(true); setError("");
      const response = await fetch("/api/onboarding", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ type: selected }) });
      const data = await response.json();
      if (!response.ok || !data.success) { setError(data.error || "Unable to save your selection."); return; }
      router.replace(selected === "DRIVER" ? "/profile/driver" : "/home");
      router.refresh();
    } catch (error) {
      console.error("Onboarding request failed:", error);
      setError("Unable to connect to Revvam. Please try again.");
    } finally { setLoading(false); }
  }

  return (
    <AuthLayout title="Welcome to Revvam" subtitle="Before we get you on the road, tell us what brings you here.">
      <div className="space-y-3">
        {options.map((option) => {
          const isSelected = selected === option.type;
          return (
            <button key={option.type} type="button" disabled={loading} onClick={() => setSelected(option.type)} className="block w-full text-left">
              <GlassCard className={`relative overflow-hidden p-4 transition-all duration-300 ${isSelected ? "border-red-500/50 bg-red-500/[0.08]" : "hover:border-white/[0.18] hover:bg-white/[0.045]"}`}>
                <div className="flex items-center gap-4">
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white ${isSelected ? "bg-red-500/15" : "bg-white/[0.05]"}`}>{option.icon}</div>
                  <div className="min-w-0 flex-1"><h2 className={`text-sm font-semibold ${isSelected ? "text-white" : "text-white/80"}`}>{option.title}</h2><p className="mt-1 text-xs leading-5 text-white/35">{option.description}</p></div>
                  <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${isSelected ? "border-red-400 bg-red-500" : "border-white/15"}`}>{isSelected && <span className="text-[10px] font-bold text-white">✓</span>}</div>
                </div>
              </GlassCard>
            </button>
          );
        })}
        {error && <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-sm text-red-300">{error}</div>}
        <div className="pt-3"><GlassButton type="button" variant="primary" disabled={!selected || loading} onClick={handleContinue} className="w-full">{loading ? <span className="flex items-center justify-center gap-2"><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />Setting up your Revvam...</span> : "Continue"}</GlassButton></div>
        <p className="pt-2 text-center text-[11px] leading-5 text-white/20">You can change or add additional Revvam identities later.</p>
      </div>
    </AuthLayout>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function MobileProfileLogout() {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");

  const handleLogout = async () => {
    if (loggingOut) return;

    setLoggingOut(true);
    setError("");

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "Unable to log out.");
      }

      router.replace("/login");
      router.refresh();
    } catch (logoutError) {
      setError(
        logoutError instanceof Error ? logoutError.message : "Unable to log out."
      );
      setLoggingOut(false);
    }
  };

  return (
    <section className="mt-5 pb-28 md:hidden" aria-label="Account actions">
      <button
        type="button"
        onClick={handleLogout}
        disabled={loggingOut}
        className="flex min-h-12 w-full items-center justify-center rounded-2xl border border-red-500/25 bg-red-500/[0.08] px-5 text-sm font-semibold text-red-200 transition-colors active:bg-red-500/[0.16] disabled:opacity-50"
      >
        {loggingOut ? "Logging out…" : "Log out"}
      </button>
      {error && <p className="mt-3 text-center text-sm text-red-300">{error}</p>}
    </section>
  );
}

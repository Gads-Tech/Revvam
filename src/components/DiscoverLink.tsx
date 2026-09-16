"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type DiscoverLinkProps = {
  children: ReactNode;
  className?: string;
  "aria-label"?: string;
};

/**
 * Discover is the public Explore entry point for logged-out visitors.
 * Logged-in users are taken to the authenticated Discover feed at /home.
 *
 * We check the existing session-backed profile endpoint instead of trusting
 * client-side state, so this also behaves correctly after logout/session expiry.
 */
export default function DiscoverLink({
  children,
  className,
  "aria-label": ariaLabel,
}: DiscoverLinkProps) {
  const router = useRouter();
  const [checking, setChecking] = useState(false);

  async function handleClick() {
    if (checking) return;
    setChecking(true);

    try {
      const response = await fetch(`/api/profile?_=${Date.now()}`, {
        credentials: "include",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "Cache-Control": "no-cache",
        },
      });

      router.push(response.ok ? "/home" : "/");
    } catch {
      router.push("/");
    } finally {
      setChecking(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={checking}
      aria-label={ariaLabel}
      className={className}
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      {children}
    </button>
  );
}

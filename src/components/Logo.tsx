"use client";

import Link from "next/link";

interface LogoProps {
  variant?: "full" | "mark";
  className?: string;
  href?: string;
}

export default function Logo({
  variant = "full",
  className = "",
  href,
}: LogoProps) {
  const logo = variant === "mark" ? "/logo_mark.svg" : "/logo_light.svg";

  const image = (
    <img
      src={logo}
      alt="Revvam"
      className="h-full w-auto object-contain"
    />
  );

  if (!href) {
    return <span className={`inline-flex items-center ${className}`}>{image}</span>;
  }

  return (
    <Link
      href={href}
      aria-label="Revvam home"
      className={`inline-flex items-center ${className}`}
    >
      {image}
    </Link>
  );
}

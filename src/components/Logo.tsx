"use client";

interface LogoProps {
  variant?: "full" | "mark";
  className?: string;
  href?: string;
}

export default function Logo({
  variant = "full",
  className = "",
  href = "/",
}: LogoProps) {
  const logo =
    variant === "mark"
      ? "/logo_mark.svg"
      : "/logo_light.svg";

  return (
    <a
      href={href}
      aria-label="Revvam home"
      className={`inline-flex items-center ${className}`}
    >
      <img
        src={logo}
        alt="Revvam"
        className="h-full w-auto object-contain"
      />
    </a>
  );
}
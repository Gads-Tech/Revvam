import {
  ButtonHTMLAttributes,
  ReactNode,
} from "react";

type GlassButtonProps =
  ButtonHTMLAttributes<HTMLButtonElement> & {
    children: ReactNode;
    variant?: "primary" | "secondary";
  };

export default function GlassButton({
  children,
  variant = "secondary",
  className = "",
  ...props
}: GlassButtonProps) {
  return (
    <button
      {...props}
      className={`
        rounded-2xl
        border
        px-5
        transition-all
        duration-300
        active:scale-[0.98]
        ${
          variant === "primary"
            ? `
              border-red-500/30
              bg-red-600/90
              text-white
              hover:bg-red-500
            `
            : `
              border-white/[0.12]
              bg-white/[0.045]
              text-white/80
              backdrop-blur-xl
              hover:border-white/[0.20]
              hover:bg-white/[0.08]
              hover:text-white
            `
        }
        ${className}
      `}
    >
      {children}
    </button>
  );
}
interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
}

export default function GlassCard({
  children,
  className = "",
}: GlassCardProps) {
  return (
    <div
      className={`
        rounded-3xl
        border
        border-white/[0.09]
        bg-white/[0.025]
        shadow-2xl
        shadow-black/20
        backdrop-blur-2xl
        transition-all
        duration-500
        hover:border-red-500/25
        hover:bg-white/[0.055]
        ${className}
      `}
    >
      {children}
    </div>
  );
}
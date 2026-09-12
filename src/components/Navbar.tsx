import Logo from "./Logo";
import GlassButton from "./GlassButton";

export default function Navbar() {
  return (
    <nav
      className="
        absolute
        left-0
        right-0
        top-0
        z-50
        px-4
        pt-4
        sm:px-6
        lg:px-8
      "
    >
      <div
        className="
          mx-auto
          flex
          max-w-7xl
          items-center
          justify-between
          rounded-2xl
          border
          border-white/[0.10]
          bg-black/[0.18]
          px-6
          py-4
          shadow-2xl
          shadow-black/20
          backdrop-blur-2xl
          sm:px-7
          sm:py-5
        "
      >
        {/* Logo */}
        <Logo
          className="
            h-16
            w-auto
            max-w-[280px]
            sm:h-16
          "
        />

        {/* Desktop links */}
        <div
          className="
            hidden
            items-center
            gap-10
            text-base
            font-medium
            text-white/60
            md:flex
          "
        >
          <a
            href="#"
            className="
              transition-all
              duration-300
              hover:text-white
            "
          >
            Discover
          </a>

          <a
            href="#"
            className="
              transition-all
              duration-300
              hover:text-white
            "
          >
            Mechanics
          </a>

          <a
            href="#"
            className="
              transition-all
              duration-300
              hover:text-white
            "
          >
            Dealerships
          </a>

          <a
            href="#"
            className="
              transition-all
              duration-300
              hover:text-white
            "
          >
            Events
          </a>
        </div>

        {/* Desktop button */}
        <GlassButton variant="secondary">
          Get Started
        </GlassButton>
      </div>
    </nav>
  );
}
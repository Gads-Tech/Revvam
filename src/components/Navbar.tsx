import Link from "next/link";

import Logo from "./Logo";

export default function Navbar() {
  return (
    <nav className="absolute left-0 right-0 top-0 z-50 px-4 pt-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl items-center justify-between rounded-2xl border border-white/[0.10] bg-black/[0.42] px-4 py-3 shadow-2xl shadow-black/30 backdrop-blur-2xl sm:px-6 sm:py-4">
        <Logo href="/" className="h-11 w-auto sm:h-12" />

        <div className="hidden items-center gap-8 text-sm font-medium text-white/55 md:flex">
          <a href="#community" className="transition hover:text-white">Community</a>
          <a href="#vehicles" className="transition hover:text-white">Vehicles</a>
          <a href="#how-it-works" className="transition hover:text-white">How it works</a>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/login" className="hidden rounded-full px-4 py-2.5 text-sm font-semibold text-white/65 transition hover:text-white sm:inline-flex">
            Log in
          </Link>
          <Link href="/signup" className="inline-flex h-10 items-center justify-center rounded-full border border-red-400/25 bg-red-600/20 px-4 text-sm font-bold text-white shadow-lg shadow-red-950/20 transition hover:bg-red-500/30 sm:px-5">
            Join Now <span className="ml-1">→</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  compress: true,
  generateEtags: true,
  experimental: {
    optimizePackageImports: [],
  },
};

export default nextConfig;

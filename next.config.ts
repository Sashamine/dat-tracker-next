import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "assets.coingecko.com",
        pathname: "/coins/images/**",
      },
      {
        protocol: "https",
        hostname: "coin-images.coingecko.com",
        pathname: "/coins/images/**",
      },
    ],
  },
  // Exclude large SEC filing folders from serverless function bundles
  outputFileTracingExcludes: {
    "*": ["public/sec/**", "public/sec-content/**"],
  },
  // Keep pdf-parse as an external package (not bundled) so its CJS exports
  // resolve correctly at runtime. Bundling it breaks the CJS→ESM interop.
  serverExternalPackages: ["pdf-parse"],
};

export default nextConfig;

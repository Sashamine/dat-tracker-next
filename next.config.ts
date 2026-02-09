import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Exclude large SEC filing folders from serverless function bundles
  outputFileTracingExcludes: {
    "*": ["public/sec/**", "public/sec-content/**"],
  },
};

export default nextConfig;

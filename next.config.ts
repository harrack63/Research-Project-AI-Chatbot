// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/healthChatbot",
  trailingSlash: true,
  images: {
    unoptimized: true, // Required for static export
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
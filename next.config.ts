// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
<<<<<<< HEAD
  basePath: "/healthChatbot",
=======
>>>>>>> clerk-auth
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;

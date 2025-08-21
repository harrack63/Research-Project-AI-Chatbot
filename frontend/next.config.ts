import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Correct key for dev CORS
  allowedDevOrigins: ["http://localhost:3000"],
  basePath: "/healthChatbot",
};

export default nextConfig;

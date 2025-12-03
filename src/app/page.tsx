// app/page.tsx
"use client";

import { useAuthStatus } from "~/app/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const base = process.env.NEXT_PUBLIC_CLERK_BASE_PATH;

export default function HomePage() {
  const { isAuthenticated, isLoaded } = useAuthStatus();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded) {
      console.log("Auth: ", isAuthenticated);
      console.log("IsLoaded", isLoaded)
      if (!isAuthenticated) {
        router.replace(`${base}/sign-in`);
      } else {
        router.replace(`${base}/chat`);
      }
    }
  }, [isLoaded, isAuthenticated, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-linear-to-br from-blue-900 to-blue-950">
      <div className="text-white">Loading...</div>
    </div>
  );
}
// app/page.tsx
"use client";

import { useAuthStatus } from "~/app/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function HomePage() {
  const { isAuthenticated, isLoaded } = useAuthStatus();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded) {
      if (isAuthenticated) {
        router.replace("/chat");
      } else {
        router.replace("/sign-in");
      }
    }
  }, [isLoaded, isAuthenticated, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-linear-to-br from-blue-900 to-blue-950">
      <div className="text-white">Loading...</div>
    </div>
  );
}
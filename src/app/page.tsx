// src/app/page.tsx
"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";
import { Loader2 } from "lucide-react";

function HomeContent() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!isLoaded) return;

    // Handle SPA routing from 404.html
    const route = searchParams.get("route");
    if (route) {
      router.replace(`${route}`);
      return;
    }

    // Normal auth redirect
    if (isSignedIn) {
      router.replace(`/chat`);
    } else {
      router.replace(`/sign-in`);
    }
  }, [isLoaded, isSignedIn, router, searchParams]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-900 to-blue-950">
      <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-900 to-blue-950">
          <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
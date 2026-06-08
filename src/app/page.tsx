"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, Suspense } from "react";
import { Loader2 } from "lucide-react";

function HomeContent() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;
    if (isSignedIn) {
      router.replace("/chat");
    } else {
      router.replace("/sign-in");
    }
  }, [isLoaded, isSignedIn, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-blue-950">
      <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-blue-950">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}

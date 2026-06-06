// src/app/components/AuthGate.tsx
"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function AuthGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace("/healthChatbot/sign-in");
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-blue-950">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    );
  }

  if (!isSignedIn) return null;

  return <>{children}</>;
}

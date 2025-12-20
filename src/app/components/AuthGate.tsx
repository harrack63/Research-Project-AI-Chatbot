// src/app/components/AuthGate.tsx
"use client";

import { useEffect, useMemo } from "react";
import { useAuth } from "~/lib/auth";
import { useRouter } from "next/navigation";

export default function AuthGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace("/sign-in");
    }
  }, [isLoaded, isSignedIn, router]);

  const content = useMemo(() => {
    if (!isLoaded || !isSignedIn) return null; // Show nothing while redirecting
    return <>{children}</>;
  }, [children, isSignedIn, isLoaded]);

  return content;
}
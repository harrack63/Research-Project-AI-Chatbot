// src/app/useAuth.ts
"use client";

import { useAuth, useUser } from ;

export function useAuthStatus() {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();

  return {
    isAuthenticated: isSignedIn ?? false,
    isLoaded,
    userId: user?.id ?? null,
    user: user
      ? {
          id: user.id,
          email: user.emailAddresses[0]?.emailAddress ?? "",
          username: user.username || user.firstName || "User",
          name: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
        }
      : null,
  };
}
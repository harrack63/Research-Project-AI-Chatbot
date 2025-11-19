import { useAuth, useUser } from "@clerk/nextjs";

export function useAuthStatus() {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();

  return {
    isAuthenticated: isSignedIn,
    isLoaded,
    user: user
      ? {
          id: user.id,
          email: user.emailAddresses[0]?.emailAddress,
          username: user.username || user.firstName || "User",
          name: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
        }
      : null,
  };
}
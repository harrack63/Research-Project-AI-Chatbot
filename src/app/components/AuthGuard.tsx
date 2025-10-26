// app/components/AuthGuard.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { isAuthenticated } from "~/lib/auth";

const PUBLIC_ROUTES = ["/login", "/register", "/"];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const isPublic = PUBLIC_ROUTES.includes(pathname);
    const isAuth = isAuthenticated();

    if (!isAuth && !isPublic) {
      // Not authenticated and trying to access protected route
      router.replace("/login");
    } else if (isAuth && (pathname === "/login" || pathname === "/register")) {
      // Authenticated and trying to access auth pages
      router.replace("/chat");
    } else {
      // All checks passed, ready to render
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsReady(true);
    }
  }, [pathname, router]);

  if (!isReady) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 
          border-t-2 border-b-2 border-blue-500" />
      </div>
    );
  }

  return <>{children}</>;
}
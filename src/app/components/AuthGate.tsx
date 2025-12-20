// src/app/components/AuthGate.tsx
"use client";

import { useMemo, useState } from "react";
import { useAuth } from "~/lib/auth";
import AuthComponent from "./AuthComponent";

export default function AuthGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isSignedIn } = useAuth();
  const [open, setOpen] = useState(true);

  const content = useMemo(() => {
    if (isSignedIn) return <>{children}</>;

    return (
      <div className="min-h-screen bg-blue-950 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-xl border shadow-xl p-6">
          <AuthComponent forceOpen={open} onClose={() => setOpen(false)} />
        </div>
      </div>
    );
  }, [children, isSignedIn, open]);

  return content;
}
//src/app/components/AuthComponent.tsx

"use client";

import { useCallback, useMemo, useState } from "react";
import { useAuth } from "~/lib/auth";
import LoginModal from "~/app/components/LoginModal";

export default function AuthComponent({
  forceOpen,
  onClose,
}: {
  forceOpen?: boolean;
  onClose?: () => void;
}) {
  const { isSignedIn, user, signIn, signUp, signOut } = useAuth();

  const [open, setOpen] = useState(!!forceOpen);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState<string | null>(null);

  const handleOpen = useCallback(() => {
    setError(null);
    setOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    onClose?.();
  }, [onClose]);

  const submit = useCallback(
    async (args: { email: string; password: string; name?: string }) => {
      setError(null);
      if (mode === "login") {
        const res = await signIn(args.email, args.password);
        if (res.error) throw new Error(res.error);
        return;
      }

      const res = await signUp(args.email, args.password, args.name ?? "");
      if (res.error) throw new Error(res.error);
    },
    [mode, signIn, signUp]
  );

  const greeting = useMemo(() => {
    const n = user?.name ?? user?.username ?? user?.email ?? "User";
    return `Welcome, ${n.split(" ")[0]}!`;
  }, [user]);

  if (isSignedIn) {
    return (
      <div className="flex items-center space-x-4">
        <span className="text-sm text-gray-700">{greeting}</span>
        <button
          onClick={signOut}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
        >
          Logout
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {error && (
          <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-200">
            {error}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => {
              setMode("login");
              handleOpen();
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors w-full"
          >
            Login
          </button>
          <button
            onClick={() => {
              setMode("register");
              handleOpen();
            }}
            className="bg-gray-900 text-white px-4 py-2 rounded hover:bg-gray-800 transition-colors w-full"
          >
            Register
          </button>
        </div>
      </div>

      <LoginModal
        isOpen={open || !!forceOpen}
        mode={mode}
        onClose={handleClose}
        onSubmit={async (args) => {
          try {
            await submit(args);
          } catch (e) {
            setError(e instanceof Error ? e.message : "Auth failed");
            throw e;
          }
        }}
      />
    </>
  );
}
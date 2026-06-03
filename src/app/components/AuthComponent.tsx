//src/app/components/AuthComponent.tsx

"use client";

import { useCallback, useState } from "react";
import { useAuth } from "~/lib/auth";
import { useRouter } from "next/navigation";

export default function AuthComponent({
  initialMode = "login",
}: {
  forceOpen?: boolean;
  initialMode?: "login" | "register";
  onClose?: () => void;
}) {
  const { isSignedIn, signIn, signUp } = useAuth();
  const router = useRouter();

  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(
    async (args: { email: string; password: string; name?: string }) => {
      setError(null);
      if (mode === "login") {
        const res = await signIn(args.email, args.password);
        if (res.error) throw new Error(res.error);
        router.push("/chat");
        return;
      }

      const res = await signUp(args.email, args.password, args.name ?? "");
      if (res.error) throw new Error(res.error);
      router.push("/chat");
    },
    [mode, signIn, signUp, router]
  );

  if (isSignedIn) {
    return (
      <div className="flex items-center space-x-4">
        <span className="text-white">Already signed in</span>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white tracking-tight">
          {mode === "login" ? "Welcome back" : "Create your account"}
        </h2>
        <p className="text-slate-400 text-sm mt-2">
          {mode === "login" 
            ? "Enter your credentials to access your health data" 
            : "Join HealthBot to start tracking your wellness journey"}
        </p>
      </div>

      {error && (
        <div className="mb-6 text-red-400 text-sm bg-red-950/30 p-4 rounded-lg border border-red-900/50 animate-in fade-in slide-in-from-top-1">
          {error}
        </div>
      )}

      <form 
        onSubmit={async (e) => {
          e.preventDefault();
          e.stopPropagation();
          const formData = new FormData(e.currentTarget);
          const email = formData.get("email") as string;
          const password = formData.get("password") as string;
          const name = formData.get("name") as string;
          
          try {
            await submit({ email, password, name });
          } catch (err) {
            setError(err instanceof Error ? err.message : "Authentication failed");
          }
        }} 
        className="space-y-4"
        method="POST"
        action="javascript:void(0);"
      >
        {mode === "register" && (
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">Name</label>
            <input
              name="name"
              type="text"
              required
              className="w-full bg-slate-900 border border-slate-800 text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
              placeholder="John Doe"
            />
          </div>
        )}
        
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">Email</label>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="w-full bg-slate-900 border border-slate-800 text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
            placeholder="name@company.com"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">Password</label>
          <input
            name="password"
            type="password"
            required
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            className="w-full bg-slate-900 border border-slate-800 text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-lg shadow-lg shadow-blue-900/20 transition-all active:scale-[0.98] mt-2"
        >
          {mode === "login" ? "Sign In" : "Get Started"}
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-slate-800 text-center">
        <p className="text-slate-400 text-sm">
          {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError(null);
            }}
            className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
          >
            {mode === "login" ? "Create one now" : "Log in here"}
          </button>
        </p>
      </div>
    </div>
  );
}
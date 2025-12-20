"use client";

import AuthComponent from "~/app/components/AuthComponent";
import Image from "next/image";
import { basePath } from "~/lib/global_vars";
import { useAuth } from "~/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AuthPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.replace("/chat");
    }
  }, [isLoaded, isSignedIn, router]);

  return (
    <main className="min-h-screen bg-blue-950 flex flex-col items-center justify-center p-6 bg-linear-to-b from-slate-950 to-blue-950">
      <div className="mb-12 flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="p-3 bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl mb-4">
          <Image
            src={`${basePath}/favicon.ico`}
            alt="Healthbot Logo"
            width={48}
            height={48}
            className="rounded-lg"
          />
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">HealthBot AI</h1>
      </div>

      <div className="w-full max-w-md bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-800 p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-500">
        <AuthComponent forceOpen={true} />
      </div>
    </main>
  );
}
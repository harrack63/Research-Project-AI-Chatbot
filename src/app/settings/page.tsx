// app/settings/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "~/lib/auth";
import { useCallback, useState } from "react";
import LogoutModal from "./components/logoutModel";
import { Loader2 } from "lucide-react";
import AuthGate from "~/app/components/AuthGate";

function SettingsContent() {
  const router = useRouter();
  const { signOut, isLoaded, user } = useAuth();

  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleSignOut = useCallback(() => {
    setShowLogoutModal(false);
    signOut();
  }, [signOut]);

  if (!isLoaded) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-200">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-linear-to-b from-slate-950 to-slate-900 text-white font-sans">
      <header className="flex items-center justify-between px-6 py-4 backdrop-blur-md bg-slate-900/40 border-b border-slate-800">
        <button
          onClick={() => router.push("/chat")}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors duration-200 group"
        >
          <svg
            className="w-5 h-5 group-hover:-translate-x-1 transition-transform"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          <span className="text-sm font-medium">Back</span>
        </button>

        <h1 className="text-sm font-bold tracking-widest text-slate-200 uppercase">
          Settings
        </h1>

        <div className="w-16" />
      </header>

      <main className="flex flex-1 justify-center px-4 py-12">
        <section className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden p-8">
          <div className="animate-in fade-in zoom-in-95 duration-300 text-center py-8">
            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-8 h-8 text-slate-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Account</h2>
            <p className="text-sm text-slate-400 mb-8 max-w-xs mx-auto">
              Signed in as {user?.email || "Unknown"}
            </p>

            <button
              onClick={() => setShowLogoutModal(true)}
              className="w-full sm:w-auto px-8 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 hover:border-red-500/40 font-semibold rounded-lg transition-all duration-200"
            >
              Sign Out
            </button>
          </div>
        </section>
      </main>

      <LogoutModal
        isOpen={showLogoutModal}
        onConfirm={handleSignOut}
        onCancel={() => setShowLogoutModal(false)}
      />
    </div>
  );
}

export default function SettingsPage() {
  return (
    <AuthGate>
      <SettingsContent />
    </AuthGate>
  );
}
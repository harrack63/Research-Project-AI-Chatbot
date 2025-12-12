// app/settings/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { useAuth, useUser } from "@clerk/nextjs";
import { useCallback, useEffect, useState } from "react";
import LogoutModal from "./components/logoutModel";
import { Loader2 } from "lucide-react"; // Import spinner icon
import { toast, Toaster } from "sonner"; // Import toast
import { API_ROUTES } from "~/lib/api";
import { basePath } from "~/lib/global_vars";

type Preferences = {
  user_id: string;
  chatName: string;
  personalInfo: string;
};

export default function SettingsPage() {
  const router = useRouter();
  const { signOut, isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();

  const [activeTab, setActiveTab] = useState<"customization" | "account">("customization");
  const [prefs, setPrefs] = useState<Preferences>({
    user_id: "",
    chatName: "",
    personalInfo: "",
  });

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false); // Add loading state

  // Load preferences
  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) router.push("/sign-in");
    
    if (user) {
      setPrefs((p) => ({ ...p, user_id: user.id }));
    }

    try {
      const stored = localStorage.getItem("healthbot_preferences");
      if (stored) {
        const parsed: Preferences = JSON.parse(stored);
        setPrefs((p) => ({
          ...p,
          user_id: user?.id || p.user_id,
          chatName: parsed.chatName || "",
          personalInfo: parsed.personalInfo || "",
        }));
      }
    } catch (err) {
      console.error("Failed to load preferences:", err);
    }
  }, [isLoaded, isSignedIn, router, user]);

  const handleSignOut = useCallback(async () => {
    setShowLogoutModal(false);
    await signOut();
    router.replace(`/sign-in`);
  }, [signOut, router]);

  const handleSavePreferences = async () => {
    setIsSaving(true); // Start loading

    // Optimistic save to local storage
    localStorage.setItem("healthbot_preferences", JSON.stringify(prefs));

    try {
      const res = await fetch(API_ROUTES.userPreferences, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      });

      if (res.ok) {
        toast.success("Preferences saved successfully!");
      } else {
        throw new Error("Failed to save");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to save preferences. Please try again.");
    } finally {
      setIsSaving(false); // Stop loading
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-200">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-linear-to-b from-slate-950 to-slate-900 text-white font-sans">
      {/* Toast Container */}
      <Toaster position="bottom-right" theme="dark" richColors />

      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 backdrop-blur-md bg-slate-900/40 border-b border-slate-800">
        <button
          onClick={() => router.push(`/chat`)}
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

        <div className="w-16" /> {/* Spacer for alignment */}
      </header>

      {/* Tabs */}
      <nav className="flex justify-center mt-8 space-x-12 border-b border-slate-800/60">
        {["customization", "account"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as "customization" | "account")}
            className={`pb-3 px-2 text-sm font-medium transition-all relative ${
              activeTab === tab
                ? "text-blue-400"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            {activeTab === tab && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500 rounded-t-full" />
            )}
          </button>
        ))}
      </nav>

      {/* Content */}
      <main className="flex flex-1 justify-center px-4 py-12">
        <section className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden p-8">
          {activeTab === "customization" && (
            <div className="animate-in fade-in zoom-in-95 duration-300">
              <div className="text-center mb-8">
                <h2 className="text-xl font-bold text-white mb-2">
                  Customize Healthbot
                </h2>
                <p className="text-sm text-slate-400">
                  Personalize your AI interaction experience
                </p>
              </div>

              {/* Chat Name */}
              <div className="space-y-3 mb-8">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  What should Healthbot call you?
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={prefs.chatName}
                    maxLength={50}
                    onChange={(e) =>
                      setPrefs({ ...prefs, chatName: e.target.value })
                    }
                    placeholder="E.g. John Smith"
                    className="w-full rounded-lg bg-slate-950 px-4 py-3 text-slate-100 placeholder-slate-600 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 border border-slate-800 outline-none transition-all"
                  />
                  <div className="absolute right-3 top-3.5 text-xs text-slate-600 font-mono">
                    {prefs.chatName.length}/50
                  </div>
                </div>
              </div>

              {/* Personal Info */}
              <div className="space-y-3 mb-8">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Context & Preferences
                </label>
                <div className="relative">
                  <textarea
                    rows={5}
                    maxLength={500}
                    value={prefs.personalInfo}
                    onChange={(e) =>
                      setPrefs({ ...prefs, personalInfo: e.target.value })
                    }
                    placeholder="Tell Healthbot about your specific needs, conditions, or communication preferences..."
                    className="w-full rounded-lg bg-slate-950 px-4 py-3 text-slate-100 placeholder-slate-600 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 border border-slate-800 outline-none transition-all resize-none leading-relaxed"
                  />
                  <div className="absolute bottom-3 right-3 text-xs text-slate-600 font-mono">
                    {prefs.personalInfo.length}/500
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-4 border-t border-slate-800/50">
                <button
                  onClick={handleSavePreferences}
                  disabled={isSaving}
                  className="flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all duration-200 shadow-lg shadow-blue-900/20 active:scale-95 w-full sm:w-auto"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Preferences</span>
                  )}
                </button>
              </div>
            </div>
          )}

          {activeTab === "account" && (
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
                Signed in as {user?.emailAddresses[0]?.emailAddress}
              </p>
              
              <button
                onClick={() => setShowLogoutModal(true)}
                className="w-full sm:w-auto px-8 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 hover:border-red-500/40 font-semibold rounded-lg transition-all duration-200"
              >
                Sign Out
              </button>
            </div>
          )}
        </section>
      </main>

      {/* Logout Modal */}
      <LogoutModal
        isOpen={showLogoutModal}
        onConfirm={handleSignOut}
        onCancel={() => setShowLogoutModal(false)}
      />
    </div>
  );
}
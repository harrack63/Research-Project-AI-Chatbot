// app/settings/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { useAuth, useUser } from "@clerk/nextjs";
import { useCallback, useEffect, useState } from "react";
import LogoutModal from "./components/logoutModel";
import { API_ROUTES } from "~/lib/api";

type Preferences = {
  user_id: string;
  chatName: string;
  personalInfo: string;
};

export default function SettingsPage() {
  const router = useRouter();
  const { signOut, isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();

  const [activeTab, setActiveTab] = useState<"customization" | "account">(
    "customization"
  );
  const [prefs, setPrefs] = useState<Preferences>({
    user_id: "",
    chatName: "",
    personalInfo: "",
  });

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

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
    router.replace("/sign-in");
  }, [signOut, router]);

  const handleSavePreferences = async () => {
    localStorage.setItem("healthbot_preferences", JSON.stringify(prefs));

    try {
      // Replace w correct API endpoint
      const res = await fetch(API_ROUTES.userPreferences, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      });

      if (res.ok) {
        setSaveMessage("✅ Preferences saved!");
      } else {
        setSaveMessage("⚠️ Failed to save preferences");
      }
    } catch (err) {
      setSaveMessage("❌ Error saving preferences");
      console.error(err);
    } finally {
      setTimeout(() => setSaveMessage(""), 3000);
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-200">
        Loading settings...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-linear-to-b from-slate-950 to-slate-900 text-white">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 backdrop-blur-md bg-slate-900/40 border-b border-slate-800">
        <button
          onClick={() => router.push("/chat")}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition"
        >
          <svg
            className="w-5 h-5"
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
          <span>Back</span>
        </button>

        <h1 className="text-lg font-semibold tracking-wide uppercase">
          Settings
        </h1>

        <div className="w-6" />
      </header>

      {/* Tabs */}
      <nav className="flex justify-center mt-6 space-x-10 text-sm font-medium border-b border-slate-800/60">
        {["customization", "account"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as "customization" | "account")}
            className={`pb-3 transition-colors ${
              activeTab === tab
                ? "border-b-2 border-blue-500 text-white"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </nav>

      {/* Content */}
      <main className="flex flex-1 justify-center px-6 py-10">
        <section className="w-full max-w-xl rounded-2xl bg-slate-900/50 p-6 backdrop-blur-md shadow-xl border border-slate-800/40">
          {activeTab === "customization" && (
            <>
              <h2 className="text-xl font-bold mb-6 text-center">
                Customize Healthbot
              </h2>

              {/* Chat Name */}
              <div className="space-y-2 mb-8">
                <label className="text-sm text-slate-300 font-medium">
                  What should Healthbot call you?
                </label>
                <input
                  type="text"
                  value={prefs.chatName}
                  maxLength={50}
                  onChange={(e) =>
                    setPrefs({ ...prefs, chatName: e.target.value })
                  }
                  placeholder="Enter your name"
                  className="w-full rounded-md bg-slate-800/70 px-4 py-2 text-slate-100 focus:ring-2 focus:ring-blue-500 border border-slate-700/50 outline-none transition"
                />
                <div className="text-xs text-slate-400">
                  {prefs.chatName.length}/50
                </div>
              </div>

              {/* Personal Info */}
              <div className="space-y-2 mb-8">
                <label className="text-sm font-medium text-slate-300">
                  Anything else Healthbot should know about you?
                </label>
                <textarea
                  rows={4}
                  maxLength={500}
                  value={prefs.personalInfo}
                  onChange={(e) =>
                    setPrefs({ ...prefs, personalInfo: e.target.value })
                  }
                  placeholder="Personal context, preferences, etc."
                  className="w-full rounded-md bg-slate-800/70 px-4 py-3 text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-blue-500 border border-slate-700/50 transition resize-none"
                />
                <div className="text-xs text-slate-400">
                  {prefs.personalInfo.length}/500
                </div>
              </div>

              {/* Save */}
              <div className="flex items-center justify-between mt-8">
                <button
                  onClick={handleSavePreferences}
                  className="px-5 py-2 bg-linear-to-r from-blue-600 to-emerald-600 text-white rounded-md font-semibold hover:opacity-90 transition-all"
                >
                  Save Preferences
                </button>
                {saveMessage && (
                  <p className="text-sm text-slate-400">{saveMessage}</p>
                )}
              </div>
            </>
          )}

          {activeTab === "account" && (
            <div className="text-center">
              <h2 className="text-xl font-bold mb-8">Account</h2>
              <button
                onClick={() => setShowLogoutModal(true)}
                className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-md transition"
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

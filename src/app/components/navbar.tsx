// src/app/components/Navbar.tsx
"use client";

import { useAuth } from "~/lib/auth";
import Link from "next/link";

export default function Navbar() {
  const { isSignedIn, isLoaded, user, signOut } = useAuth();

  return (
    <nav className="w-full bg-white/95 backdrop-blur-sm border-b border-gray-200 px-6 py-4 flex justify-between items-center">
      <div className="flex items-center space-x-2">
        <h1 className="text-xl font-semibold text-gray-800">HealthBot</h1>
      </div>
      <div className="flex items-center space-x-4">
        {!isLoaded ? (
          <div className="px-4 py-2 text-gray-600">Loading...</div>
        ) : isSignedIn && user ? (
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-700">
              Welcome, {user.name?.split(" ")[0]}!
            </span>
            <button
              onClick={signOut}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <div className="space-x-2">
            <Link
              href="/sign-in"
              className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Login
            </Link>
            <Link
              href="/sign-up"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Sign Up
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
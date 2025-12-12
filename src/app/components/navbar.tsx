"use client";

import { useAuthStatus } from "~/app/useAuth";
import { UserButton } from ;
import Link from "next/link";

export default function Navbar() {
  const { isAuthenticated, isLoaded, user } = useAuthStatus();

  return (
    <nav className="w-full bg-white/95 backdrop-blur-sm border-b border-gray-200 px-6 py-4 flex justify-between items-center">
      <div className="flex items-center space-x-2">
        <h1 className="text-xl font-semibold text-gray-800">
          PersonalizedChatbot
        </h1>
      </div>
      <div className="flex items-center space-x-4">
        {!isLoaded ? (
          <div className="px-4 py-2 text-gray-600">Loading...</div>
        ) : isAuthenticated && user ? (
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-700">Welcome, {user.username}!</span>
            <UserButton afterSignOutUrl="/sign-in" />
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
// app/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loginUser } from "~/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await loginUser(email, password);

    if (result.isErr()) {
      setError(result.error.message);
      setLoading(false);
      return;
    }

    // Success
    router.replace("/chat");
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-900 
      to-blue-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Health Chat Bot
          </h1>
          <p className="text-blue-200">
            Your personalized health assistant
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-800/50 backdrop-blur border 
          border-slate-700 rounded-lg p-8 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 
                  rounded-lg text-white placeholder-gray-400 
                  focus:outline-none focus:ring-2 focus:ring-blue-500 
                  focus:border-transparent transition"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 
                  rounded-lg text-white placeholder-gray-400 
                  focus:outline-none focus:ring-2 focus:ring-blue-500 
                  focus:border-transparent transition"
                required
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-900/20 border border-red-700 
                rounded-lg text-red-200 text-sm">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-linear-to-r from-blue-600 to-blue-700 
                text-white font-semibold py-2 px-4 rounded-lg 
                hover:from-blue-700 hover:to-blue-800 transition 
                disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          {/* Register Link */}
          <div className="mt-6 text-center text-gray-400">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="text-blue-400 hover:text-blue-300 font-medium"
            >
              Sign up
            </Link>
          </div>
        </div>

        {/* Demo Credentials */}
        <div className="mt-6 p-4 bg-slate-800/30 border border-slate-700 
          rounded-lg text-center text-sm text-gray-400">
          <p className="font-semibold text-gray-300 mb-2">Demo Credentials</p>
          <p>Email: <code className="text-blue-300">test@example.com</code></p>
          <p>Password: <code className="text-blue-300">password123</code></p>
        </div>
      </div>
    </div>
  );
}
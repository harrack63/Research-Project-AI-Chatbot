// src/lib/auth.tsx
"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { API_BASE } from "~/lib/api";

type User = {
  id: string;
  email: string;
  name: string;
};

type AuthContextType = {
  user: User | null;
  isLoaded: boolean;
  isSignedIn: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (
    email: string,
    password: string,
    name: string
  ) => Promise<{ error?: string }>;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

const TOKEN_KEY = "healthbot_token";
const USER_KEY = "healthbot_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const router = useRouter();

  // Load user from localStorage on mount
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem(USER_KEY);
      const storedToken = localStorage.getItem(TOKEN_KEY);
      if (storedUser && storedToken) {
        setUser(JSON.parse(storedUser));
      }
    } catch (e) {
      console.error("Failed to load auth state:", e);
    }
    setIsLoaded(true);
  }, []);

  const signIn = useCallback(
    async (email: string, password: string): Promise<{ error?: string }> => {
      try {
        const res = await fetch(`${API_BASE}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        if (!res.ok) {
          const data = await res.json();
          return { error: data.message || "Invalid credentials" };
        }

        const data = await res.json();
        localStorage.setItem(TOKEN_KEY, data.token);
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        setUser(data.user);
        return {};
      } catch (e) {
        return { error: "Network error. Please try again." };
      }
    },
    []
  );

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      name: string
    ): Promise<{ error?: string }> => {
      try {
        const res = await fetch(`${API_BASE}/api/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, name }),
        });

        if (!res.ok) {
          const data = await res.json();
          return { error: data.message || "Registration failed" };
        }

        const data = await res.json();
        localStorage.setItem(TOKEN_KEY, data.token);
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        setUser(data.user);
        return {};
      } catch (e) {
        return { error: "Network error. Please try again." };
      }
    },
    []
  );

  const signOut = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
    router.push("/sign-in");
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoaded,
        isSignedIn: !!user,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}
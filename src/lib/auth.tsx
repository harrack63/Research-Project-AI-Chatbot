// src/lib/auth.tsx
import { useCallback, useSyncExternalStore } from "react";
import { API_BASE } from "~/lib/api";

type User = {
  id: string;
  email: string;
  name?: string;
  username?: string;
};

const TOKEN_KEY = "healthbot_token";
const USER_KEY = "healthbot_user";
const AUTH_EVENT = "healthbot-auth-changed";

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function readAuthSnapshot(): { user: User | null; token: string | null } {
  if (typeof window === "undefined") return { user: null, token: null };
  const token = window.localStorage.getItem(TOKEN_KEY);
  const user = safeParse<User>(window.localStorage.getItem(USER_KEY));
  if (!token || !user) return { user: null, token: null };
  return { user, token };
}

function writeAuth(user: User, token: string) {
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event(AUTH_EVENT));
}

function clearAuth() {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
  window.dispatchEvent(new Event(AUTH_EVENT));
}

function subscribe(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  const onAuth = () => cb();
  window.addEventListener(AUTH_EVENT, onAuth);
  window.addEventListener("storage", onAuth);
  return () => {
    window.removeEventListener(AUTH_EVENT, onAuth);
    window.removeEventListener("storage", onAuth);
  };
}

type SignInResult = { error?: string };

export function useAuth() {
  const snapshot = useSyncExternalStore(
    subscribe,
    readAuthSnapshot,
    () => ({ user: null, token: null })
  );

  const signIn = useCallback(
    async (email: string, password: string): Promise<SignInResult> => {
      try {
        // Support BOTH backends:
        // - your current: POST /api/auth/login -> { token, user }
        // - JWT router:   POST /auth/login     -> { access_token, user, token_type }
        const tryUrls = [`${API_BASE}/api/auth/login`, `${API_BASE}/auth/login`];

        let lastErr = "Login failed";
        for (const url of tryUrls) {
          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          });

          if (!res.ok) {
            const data = await res.json().catch(() => null);
            lastErr =
              data?.message ||
              data?.detail ||
              (typeof data === "string" ? data : "Invalid credentials");
            continue;
          }

          const data = await res.json();
          const token: string | undefined = data.token ?? data.access_token;
          const user: User | undefined = data.user;

          if (!token || !user) return { error: "Malformed auth response" };

          // Normalize "name" for UI
          const normalizedUser: User = {
            ...user,
            name: user.name ?? user.username ?? user.email,
          };

          writeAuth(normalizedUser, token);
          return {};
        }

        return { error: lastErr };
      } catch {
        return { error: "Network error. Please try again." };
      }
    },
    []
  );

  const signUp = useCallback(
    async (email: string, password: string, name: string) => {
      try {
        // Support BOTH backends:
        // - your current: POST /api/auth/register -> { token, user } (expects name)
        // - JWT router:   POST /auth/register     -> { access_token, user } (expects username)
        const attempts: Array<{ url: string; body: unknown }> = [
          {
            url: `${API_BASE}/api/auth/register`,
            body: { email, password, name },
          },
          {
            url: `${API_BASE}/auth/register`,
            body: { email, password, username: name },
          },
        ];

        let lastErr = "Registration failed";
        for (const a of attempts) {
          const res = await fetch(a.url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(a.body),
          });

          if (!res.ok) {
            const data = await res.json().catch(() => null);
            lastErr =
              data?.message ||
              data?.detail ||
              (typeof data === "string" ? data : "Registration failed");
            continue;
          }

          const data = await res.json();
          const token: string | undefined = data.token ?? data.access_token;
          const user: User | undefined = data.user;
          if (!token || !user) return { error: "Malformed auth response" };

          const normalizedUser: User = {
            ...user,
            name: user.name ?? user.username ?? user.email,
          };
          writeAuth(normalizedUser, token);
          return {};
        }

        return { error: lastErr };
      } catch {
        return { error: "Network error. Please try again." };
      }
    },
    []
  );

  const signOut = useCallback(() => {
    if (typeof window === "undefined") return;
    clearAuth();
  }, []);

  return {
    user: snapshot.user,
    isLoaded: true,
    isSignedIn: !!snapshot.user,
    signIn,
    signUp,
    signOut,
  };
}

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}
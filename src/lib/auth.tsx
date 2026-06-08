// src/lib/auth.tsx
import { useCallback, useSyncExternalStore } from "react";
import { API_BASE } from "~/lib/api";
import { clearCachedPreferences } from "~/lib/userPreferencesStore";

type User = {
  id: string;
  email: string;
  name?: string;
  username?: string;
};

const TOKEN_KEY = "healthbot_token";
const USER_KEY = "healthbot_user";
const AUTH_EVENT = "healthbot-auth-changed";

type AuthSnapshot = { user: User | null; token: string | null };

// IMPORTANT: keep these references stable to avoid infinite loops
const EMPTY_SNAPSHOT: AuthSnapshot = { user: null, token: null };

let cachedKey = "";
let cachedSnapshot: AuthSnapshot = EMPTY_SNAPSHOT;

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function readAuthSnapshot(): AuthSnapshot {
  // GitHub Pages: client-only. Still provide a stable server snapshot.
  if (typeof window === "undefined") return EMPTY_SNAPSHOT;

  const token = window.localStorage.getItem(TOKEN_KEY);
  const userRaw = window.localStorage.getItem(USER_KEY);

  // Key must be purely derived from storage so it only changes when storage does.
  const nextKey = `${token ?? ""}::${userRaw ?? ""}`;
  if (nextKey === cachedKey) return cachedSnapshot;

  if (!token || !userRaw) {
    cachedKey = nextKey;
    cachedSnapshot = EMPTY_SNAPSHOT;
    return cachedSnapshot;
  }

  const user = safeParse<User>(userRaw);
  if (!user) {
    cachedKey = nextKey;
    cachedSnapshot = EMPTY_SNAPSHOT;
    return cachedSnapshot;
  }

  cachedKey = nextKey;
  cachedSnapshot = { user, token };
  return cachedSnapshot;
}

function writeAuth(user: User, token: string) {
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event(AUTH_EVENT));
}

function clearAuth() {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
  clearCachedPreferences();
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
    () => EMPTY_SNAPSHOT
  );

  const signIn = useCallback(
    async (email: string, password: string): Promise<SignInResult> => {
      try {
        const res = await fetch(`${API_BASE}/api/auth/login`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Accept": "application/json", 
          },
          body: JSON.stringify({ email, password }),
          credentials: "include",
        });

          if (!res.ok) {
            const data = await res.json().catch(() => null);
            const errorMessage = data?.detail || data?.message || "Invalid credentials";
            return { 
              error: typeof errorMessage === 'object' ? JSON.stringify(errorMessage) : errorMessage
            };
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
      } catch {
        return { error: "Network error. Please try again." };
      }
    },
    []
  );

  const signUp = useCallback(
    async (email: string, password: string, name: string) => {
      try {
        const res = await fetch(`${API_BASE}/api/auth/register`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Accept": "application/json", 
          },
          body: JSON.stringify({ email, password, name }),
          credentials: "include",
        });

          if (!res.ok) {
            const data = await res.json().catch(() => null);
            const errorMessage = data?.detail || data?.message || "Invalid credentials";
            return { error:
              typeof errorMessage === 'object' ? JSON.stringify(errorMessage) : errorMessage
            };
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
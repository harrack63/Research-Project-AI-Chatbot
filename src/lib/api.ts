function resolveApiBase(): string {
  // Explicit override (recommended)
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl && envUrl.trim().length > 0) return envUrl.replace(/\/$/, "");

  // Client-side fallback: use same origin as the page (keeps https://)
  if (typeof window !== "undefined") {
    // If backend is same domain (different path), set NEXT_PUBLIC_API_URL instead.
    return window.location.origin;
  }

  // SSR/static build fallback
  return "http://127.0.0.1:8000";
}

export const API_BASE = resolveApiBase();

export const API_ROUTES = {
  chatStream: `${API_BASE}/api/chat/stream`,
  userPreferences: `${API_BASE}/api/user/preferences`,
  login: `${API_BASE}/auth/login`,
  register: `${API_BASE}/auth/register`,
  logout: `${API_BASE}/auth/logout`,
};
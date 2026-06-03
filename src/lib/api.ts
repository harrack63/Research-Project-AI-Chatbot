/* eslint-disable @typescript-eslint/no-explicit-any */
function resolveApiBase(): string {
  // Explicit override (recommended)
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  console.log('🔍 DEBUG: NEXT_PUBLIC_API_URL =', envUrl);
  
  if (envUrl && envUrl.trim().length > 0) {
    const cleaned = envUrl.replace(/\/$/, "");
    const final = cleaned.replace("://0.0.0.0", "://127.0.0.1");
    console.log('✅ Using env URL:', final);
    return final;
  }

  // Client-side fallback: use same origin as the page (keeps https://)
  if (typeof window !== "undefined") {
    console.log('⚠️  Using window.location.origin:', window.location.origin);
    return window.location.origin;
  }

  // SSR/static build fallback
  console.log('📡 Using SSR fallback: http://127.0.0.1:8000');
  return "http://127.0.0.1:8000";
}

export const API_BASE = resolveApiBase();

export const API_ROUTES = {
  chatStream: `${API_BASE}/api/chat/stream`,
  userPreferences: `${API_BASE}/api/user/preferences`,
  chats: `${API_BASE}/api/chats`,
  uploadIngest: `${API_BASE}/api/uploads/ingest`,
  login: `${API_BASE}/api/auth/login`,
  register: `${API_BASE}/api/auth/register`,
  logout: `${API_BASE}/auth/logout`,
};

export async function fetchUserPreferences(): Promise<{ ok: boolean; preferences?: { persona?: any; goals?: string | null; updated_at?: string | null } | any; error?: string }> {
  const token = typeof window !== "undefined" ? localStorage.getItem("healthbot_token") : null;
  if (!token) {
    return { ok: false, error: "Not authenticated" };
  }

  const res = await fetch(API_ROUTES.userPreferences, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Failed to fetch preferences" }));
    return { ok: false, error: error.detail || error.message || "Failed to fetch preferences" };
  }

  return await res.json();
}

export async function saveUserPreferences(preferences: { persona: any; goals?: string | null }): Promise<{ ok: boolean; message?: string; updated_at?: string | null; error?: string }> {
  const token = typeof window !== "undefined" ? localStorage.getItem("healthbot_token") : null;
  if (!token) {
    return { ok: false, error: "Not authenticated" };
  }

  const userRaw = typeof window !== "undefined" ? localStorage.getItem("healthbot_user") : null;
  const user = userRaw ? JSON.parse(userRaw) : null;
  const userId = user?.id;

  if (!userId) {
    return { ok: false, error: "User ID not found" };
  }

  const res = await fetch(API_ROUTES.userPreferences, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      user_id: userId,
      persona: preferences.persona,
      goals: preferences.goals || null,
    }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Failed to save preferences" }));
    return { ok: false, error: error.detail || error.message || "Failed to save preferences" };
  }

  return await res.json();
}

export async function fetchChats(): Promise<{ ok: boolean; chats?: any; updated_at?: string | null; error?: string }> {
  const token = typeof window !== "undefined" ? localStorage.getItem("healthbot_token") : null;
  if (!token) {
    return { ok: false, error: "Not authenticated" };
  }

  const res = await fetch(API_ROUTES.chats, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Failed to fetch chats" }));
    return { ok: false, error: error.detail || error.message || "Failed to fetch chats" };
  }

  return await res.json();
}

export async function saveChatsToServer(
  chats: any,
  updatedAt: string
): Promise<{ ok: boolean; updated_at?: string; error?: string }> {
  const token = typeof window !== "undefined" ? localStorage.getItem("healthbot_token") : null;
  if (!token) {
    return { ok: false, error: "Not authenticated" };
  }

  const userRaw = typeof window !== "undefined" ? localStorage.getItem("healthbot_user") : null;
  const user = userRaw ? JSON.parse(userRaw) : null;
  const userId = user?.id;

  if (!userId) {
    return { ok: false, error: "User ID not found" };
  }

  const res = await fetch(API_ROUTES.chats, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      user_id: userId,
      chats,
      updated_at: updatedAt,
    }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Failed to save chats" }));
    return { ok: false, error: error.detail || error.message || "Failed to save chats" };
  }

  return await res.json();
}
export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8001";

export const API_ROUTES = {
  chat: `${API_BASE}/api/chat`,
  chatStream: `${API_BASE}/api/chat/stream`,
  userPreferences: `${API_BASE}/api/user/preferences`,
};
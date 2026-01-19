export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 
  (typeof window !== "undefined" && window.location.hostname !== "localhost"
    ? "https://hcss.cs.purdue.edu/healthChatbot-backend"
    : "http://127.0.0.1:8000");

export const API_ROUTES = {
  chatStream: `${API_BASE}/api/chat/stream`,
  userPreferences: `${API_BASE}/api/user/preferences`,
  login: `${API_BASE}/auth/login`,
  register: `${API_BASE}/auth/register`,
  me: `${API_BASE}/auth/me`,
  logout: `${API_BASE}/auth/logout`,
};
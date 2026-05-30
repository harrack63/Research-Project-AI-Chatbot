// src/utils/auth.ts
import { API_ROUTES } from "~/lib/api";

const TOKEN_KEY = "healthbot_token";
const USER_KEY = "healthbot_user";

export interface UserData {
  id: string;
  email: string;
  name?: string;
  username?: string;
  created_at?: string;
}

interface AuthResponse {
  token?: string;
  access_token?: string;
  token_type?: string;
  user: UserData;
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function getUserData(): UserData | null {
  if (typeof window === "undefined") return null;
  try {
    const data = localStorage.getItem(USER_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function setUserData(user: UserData): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function removeUserData(): void {
  localStorage.removeItem(USER_KEY);
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

export async function loginUser(credentials: {
  email: string;
  password: string;
}): Promise<{ user: UserData }> {
  const res = await fetch(API_ROUTES.login, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.detail || "Invalid credentials");
  }

  const data: AuthResponse = await res.json();
  const token = data.token ?? data.access_token;
  if (!token) throw new Error("Malformed auth response");
  setToken(token);
  setUserData(data.user);
  return { user: data.user };
}

export async function registerUser(credentials: {
  email: string;
  username: string;
  password: string;
}): Promise<{ user: UserData }> {
  const res = await fetch(API_ROUTES.register, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: credentials.email,
      password: credentials.password,
      name: credentials.username,
    }),
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.detail || "Registration failed");
  }

  const data: AuthResponse = await res.json();
  const token = data.token ?? data.access_token;
  if (!token) throw new Error("Malformed auth response");
  setToken(token);
  setUserData(data.user);
  return { user: data.user };
}

export async function getCurrentUser(): Promise<UserData> {
  const token = getToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  const res = await fetch(API_ROUTES.refresh, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    removeToken();
    removeUserData();
    throw new Error("Session expired");
  }

  const data: AuthResponse = await res.json();
  const nextToken = data.token ?? data.access_token;
  if (!nextToken) throw new Error("Malformed auth response");
  setToken(nextToken);
  setUserData(data.user);
  return data.user;
}

export async function logoutUser(): Promise<void> {
  const token = getToken();
  if (token) {
    try {
      await fetch(API_ROUTES.logout, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch {
      // Ignore logout errors
    }
  }
  removeToken();
  removeUserData();
}

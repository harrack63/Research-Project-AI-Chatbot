// ~/lib/auth.ts
import { ok, err, type Result } from "neverthrow";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 
  "http://localhost:8000";
const TOKEN_KEY = "auth_token";
const USER_KEY = "user_data";

// ============================================================================
// Types
// ============================================================================

export interface UserData {
  id: number;
  email: string;
  username: string;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: UserData;
}

export interface TokenPayload {
  sub: string; // email
  exp: number; // Unix timestamp (seconds)
}

// ============================================================================
// Token Management (Client-side)
// ============================================================================

export function setAuthToken(token: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

export function getAuthToken(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem(TOKEN_KEY);
  }
  return null;
}

export function removeAuthToken(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function decodeToken(token: string): TokenPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const payload = JSON.parse(atob(parts[1]));
    return payload as TokenPayload;
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  const payload = decodeToken(token);
  if (!payload) return true;

  const currentTime = Math.floor(Date.now() / 1000);
  return payload.exp < currentTime;
}

export function getTokenExpirationInfo() {
  const token = getAuthToken();
  if (!token) return null;

  const payload = decodeToken(token);
  if (!payload) return null;

  const expTime = new Date(payload.exp * 1000);
  const currentTime = new Date();
  const remainingMs = expTime.getTime() - currentTime.getTime();

  return {
    expiration: expTime,
    remainingMs,
    remainingMinutes: Math.floor(remainingMs / 60000),
    remainingSeconds: Math.floor((remainingMs % 60000) / 1000),
    isExpired: remainingMs <= 0,
  };
}

export function isAuthenticated(): boolean {
  const token = getAuthToken();
  if (!token) return false;

  if (isTokenExpired(token)) {
    removeAuthToken();
    return false;
  }

  return true;
}

// ============================================================================
// User Data Management
// ============================================================================

export function setUserData(userData: UserData): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
  }
}

export function getUserData(): UserData | null {
  if (typeof window !== "undefined") {
    const userData = localStorage.getItem(USER_KEY);
    return userData ? JSON.parse(userData) : null;
  }
  return null;
}

export function removeUserData(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(USER_KEY);
  }
}

export function clearAuthData(): void {
  removeAuthToken();
  removeUserData();
}

// ============================================================================
// HTTP Helper
// ============================================================================

async function authenticatedFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});

  headers.set("Content-Type", "application/json");

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(`${BACKEND_URL}${endpoint}`, {
    ...options,
    headers,
  });
}

function handleAuthError(status: number): void {
  if (status === 401) {
    clearAuthData();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  }
}

// ============================================================================
// Auth API Calls (Using Result type properly)
// ============================================================================

export async function registerUser(
  email: string,
  username: string,
  password: string
): Promise<Result<AuthResponse, Error>> {
  try {
    const response = await authenticatedFetch("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, username, password }),
    });

    const data = await response.json() as AuthResponse;

    if (!response.ok) {
      return err(
        new Error(
          (data as unknown as { detail?: string }).detail || 
          `Registration failed: ${response.status}`
        )
      );
    }

    setAuthToken(data.access_token);
    setUserData(data.user);

    return ok(data);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

export async function loginUser(
  email: string,
  password: string
): Promise<Result<AuthResponse, Error>> {
  try {
    const response = await authenticatedFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json() as AuthResponse;

    if (!response.ok) {
      return err(
        new Error(
          (data as unknown as { detail?: string }).detail || 
          `Login failed: ${response.status}`
        )
      );
    }

    setAuthToken(data.access_token);
    setUserData(data.user);

    return ok(data);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

export async function logoutUser(): Promise<Result<void, Error>> {
  try {
    await authenticatedFetch("/auth/logout", { method: "POST" });
    clearAuthData();
    return ok(undefined);
  } catch (error) {
    clearAuthData();
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

export async function getCurrentUser(): Promise<Result<UserData, Error>> {
  try {
    const response = await authenticatedFetch("/auth/me", {
      method: "GET",
    });

    const data = await response.json() as UserData;

    if (!response.ok) {
      handleAuthError(response.status);
      return err(new Error(`Failed to get user info: ${response.status}`));
    }

    return ok(data);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}
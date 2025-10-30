"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";

/**
 * Get authentication token from Clerk
 * @returns {Promise<string | null>} The auth token or null
 */
export async function getAuthToken(): Promise<string | null> {
  const { sessionId } = await auth();

  if (!sessionId) return null;

  try {
    const client = await clerkClient();
    // If you have a JWT template configured, use it:
    // const token = await client.sessions.getToken(sessionId, "your-template-name");
    // return token.jwt;

    // Otherwise, just return the sessionId
    return sessionId;
  } catch (error) {
    console.error("Failed to get auth token:", error);
    return null;
  }
}
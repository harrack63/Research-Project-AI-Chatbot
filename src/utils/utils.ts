// utils/utils.ts
import { getAuthToken } from "./auth";
import { z } from "zod";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

type Message = z.infer<typeof MessageSchema>;

/**
 * Get the backend URL from environment variables or use default
 * @returns {string} The backend URL
 */
export function getBackendUrl(): string {
  return process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
}

/**
 * Send a chat message to the backend API
 * @param {Array} messages - Array of message objects with role and content
 * @returns {Promise<Object>} Response data from the backend
 * @throws {Error} If the request fails
 */
export async function sendChatMessage(
  messages: Array<{ role: "user" | "assistant"; content: string }>
): Promise<{ messages?: Array<{ role: string; content: string }> }> {
  const backendUrl = getBackendUrl();
  const token = await getAuthToken();

  console.log("Sending message to backend");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${backendUrl}/chat`, {
    method: "POST",
    headers,
    body: JSON.stringify({ messages }),
  });

  if (!response.ok) {
    if (response.status === 401) {
      window.location.href = "/sign-in";
      return {};
    }
    throw new Error(
      `Backend error: ${response.status} ${response.statusText}`
    );
  }

  return await response.json();
}

/**
 * Handle chat message sending with error handling
 * @param {Array} messages - Current messages array
 * @param {string} userInput - User's input message
 * @param {Function} setMessages - Function to update messages state
 * @param {Function} setLoading - Function to update loading state
 * @returns {Promise<void>}
 */
export async function handleSendMessage(
  messages: Message[],
  userInput: string,
  setMessages: (messages: Message[]) => void,
  setLoading: (loading: boolean) => void
): Promise<void> {
  if (!userInput.trim()) return;

  const newMessages: Message[] = [
    ...messages,
    { role: "user", content: userInput },
  ];
  setMessages(newMessages);
  setLoading(true);

  try {
    const data = await sendChatMessage(newMessages);
    const validatedMessages = z.array(MessageSchema).parse(data.messages);
    setMessages(validatedMessages);
  } catch (err) {
    console.error("Error sending message:", err);
    setMessages([
      ...messages,
      { role: "user", content: userInput },
      { role: "assistant", content: "Sorry, there was an error." },
    ]);
  } finally {
    setLoading(false);
  }
}
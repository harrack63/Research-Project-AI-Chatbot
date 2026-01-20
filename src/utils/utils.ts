// utils/utils.ts
import type { ChatImage, Message } from "~/lib/types";
import { API_BASE, API_ROUTES } from "~/lib/api";
import { getAuthToken } from "~/lib/auth";

export async function sendChatMessageStream(
  messages: Message[],
  userId: string,
  onToken: (token: string) => void,
  onImages?: (images: ChatImage[]) => void,
  signal?: AbortSignal
): Promise<void> {
  const token = getAuthToken();
  
  const response = await fetch(API_ROUTES.chatStream, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      "Cache-Control": "no-cache",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ messages, userId }),
    signal,
  });

  if (!response.ok) {
    throw new Error("Failed to stream chat");
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    
    // Split on double newlines (SSE frame boundary)
    const events = buffer.split("\n\n");
    
    // Keep last incomplete event in buffer
    buffer = events.pop() ?? "";

    for (const evt of events) {
      // Find the data line in this event
      const dataLine = evt
        .split("\n")
        .find((l) => l.startsWith("data: "));
      
      if (!dataLine) continue;

      console.log("Received data line:", dataLine);
      
      try {
        const data = JSON.parse(dataLine.slice(6));
        if (data.done) return;
        if (data.error) throw new Error(data.error);
        if (data.token) onToken(data.token);
        if (data.images && onImages) onImages(data.images);
      } catch (e) {
        console.error("Parse error:", e);
      }
    }
  }
}
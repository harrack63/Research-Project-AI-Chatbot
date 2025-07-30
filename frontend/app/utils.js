/**
 * Chat API utilities
 */

/**
 * Get the backend URL from environment variables or use default
 * @returns {string} The backend URL
 */
export function getBackendUrl() {
  return process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
}

/**
 * Send a chat message to the backend API
 * @param {Array} messages - Array of message objects with role and content
 * @returns {Promise<Object>} Response data from the backend
 * @throws {Error} If the request fails
 */
export async function sendChatMessage(messages) {
  const backendUrl = getBackendUrl();

  console.log("Sending message to backend");

  const response = await fetch(`${backendUrl}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messages }),
  });

  console.log("Response from backend", response);

  if (!response.ok) {
    throw new Error(`Backend error: ${response.status} ${response.statusText}`);
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
export async function handleSendMessage(messages, userInput, setMessages, setLoading) {
  if (!userInput.trim()) return;

  const newMessages = [...messages, { role: "user", content: userInput }];
  setMessages(newMessages);
  setLoading(true);

  try {
    const data = await sendChatMessage(newMessages);
    const updatedMessages = data.messages || [];
    setMessages(updatedMessages);
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
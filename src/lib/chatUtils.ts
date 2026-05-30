// src/lib/chatUtils.ts

export function generateUniqueChatId(userId: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const data = `${userId}-${timestamp}-${random}`;

  // Simple hash for browser
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }

  return Math.abs(hash).toString(36) + random.substring(0, 4);
}

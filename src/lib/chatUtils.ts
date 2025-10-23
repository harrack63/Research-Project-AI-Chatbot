// lib/chatUtils.ts
import { createHash } from 'crypto';

export function generateUniqueChatId(userId: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const data = `${userId}-${timestamp}-${random}`;
  
  // Create SHA256 hash and take first 12 characters for a short URL
  const hash = createHash('sha256').update(data).digest('hex');
  return hash.substring(0, 12);
}
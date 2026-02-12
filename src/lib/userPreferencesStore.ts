const CACHE_KEY = "healthbot_persona_cache";
const CACHE_EVENT = "healthbot-preferences-changed";

export type CachedPreferences = {
  userId: string;
  persona: Record<string, unknown>;
  goals?: string | null;
  updatedAt: number;
};

type CacheMap = Record<string, CachedPreferences>;

let memoryCache: CacheMap | null = null;

function readCache(): CacheMap {
  if (memoryCache) return memoryCache;
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    memoryCache = raw ? (JSON.parse(raw) as CacheMap) : {};
  } catch {
    memoryCache = {};
  }
  return memoryCache;
}

function writeCache(next: CacheMap) {
  memoryCache = next;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(CACHE_EVENT));
  } catch {
    // Ignore write errors
  }
}

export function getCachedPreferences(userId: string): CachedPreferences | null {
  const cache = readCache();
  return cache[userId] ?? null;
}

export function getCachedPreferencesUpdatedAtMs(userId: string): number {
  const cached = getCachedPreferences(userId);
  if (!cached?.updatedAt) return 0;
  return Number.isFinite(cached.updatedAt) ? cached.updatedAt : 0;
}

export function setCachedPreferences(next: CachedPreferences) {
  const cache = readCache();
  cache[next.userId] = next;
  writeCache(cache);
}

export function clearCachedPreferences(userId?: string) {
  if (typeof window === "undefined") return;
  if (!userId) {
    memoryCache = {};
    try {
      window.localStorage.removeItem(CACHE_KEY);
      window.dispatchEvent(new Event(CACHE_EVENT));
    } catch {
      // Ignore errors
    }
    return;
  }
  const cache = readCache();
  if (cache[userId]) {
    delete cache[userId];
    writeCache(cache);
  }
}

export function subscribePreferences(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb();
  window.addEventListener(CACHE_EVENT, handler);
  return () => window.removeEventListener(CACHE_EVENT, handler);
}

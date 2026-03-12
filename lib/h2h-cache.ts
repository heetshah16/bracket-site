import { LRUCache } from "lru-cache";
import type { H2HResult } from "@/types/player";

// Shared in-memory LRU cache for h2h results.
// Persists across requests within the same serverless instance.
// Max 500 entries, TTL 1 hour.
const cache = new LRUCache<string, H2HResult>({
  max: 500,
  ttl: 1000 * 60 * 60, // 1 hour
});

function cacheKey(p1: string, p2: string): string {
  // Normalize order so (A,B) and (B,A) hit the same cache entry
  return [p1.toLowerCase(), p2.toLowerCase()].sort().join("::");
}

export function getCachedH2H(p1: string, p2: string): H2HResult | undefined {
  return cache.get(cacheKey(p1, p2));
}

export function setCachedH2H(p1: string, p2: string, result: H2HResult): void {
  cache.set(cacheKey(p1, p2), result);
}

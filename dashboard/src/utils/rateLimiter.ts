/**
 * Client-side rate limiter en request deduplication.
 * Beschermt tegen overmatig API-gebruik (zowel per ongeluk als kwaadwillig).
 */

interface RateLimiterConfig {
  maxRequests: number;   // Max requests per window
  windowMs: number;      // Tijdvenster in milliseconden
}

class RateLimiter {
  private timestamps: number[] = [];
  private config: RateLimiterConfig;

  constructor(config: RateLimiterConfig) {
    this.config = config;
  }

  async acquire(): Promise<void> {
    const now = Date.now();
    // Verwijder verlopen timestamps
    this.timestamps = this.timestamps.filter(t => now - t < this.config.windowMs);

    if (this.timestamps.length >= this.config.maxRequests) {
      // Wacht tot het oudste request buiten het window valt
      const oldestTs = this.timestamps[0];
      const waitMs = this.config.windowMs - (now - oldestTs) + 10;
      await new Promise(resolve => setTimeout(resolve, waitMs));
      return this.acquire();
    }

    this.timestamps.push(now);
  }
}

// Request deduplication: voorkomt dezelfde query meerdere keren tegelijk
const inflight = new Map<string, Promise<unknown>>();

export function deduplicate<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;

  const promise = fn().finally(() => {
    inflight.delete(key);
  });

  inflight.set(key, promise);
  return promise;
}

// Rate limiters per service
// Supabase: 60 requests per minuut (ruim, maar voorkomt extreme burst)
export const supabaseRateLimiter = new RateLimiter({ maxRequests: 60, windowMs: 60_000 });

// PDOK: 20 requests per minuut (extern publiek API, conservatiever)
export const pdokRateLimiter = new RateLimiter({ maxRequests: 20, windowMs: 60_000 });

// Wrapper: rate limit + deduplication voor Supabase queries
export async function rateLimitedQuery<T>(key: string, fn: () => Promise<T>): Promise<T> {
  return deduplicate(key, async () => {
    await supabaseRateLimiter.acquire();
    return fn();
  });
}

// Wrapper voor PDOK fetch calls
export async function rateLimitedFetch(url: string, init?: RequestInit): Promise<Response> {
  await pdokRateLimiter.acquire();
  return fetch(url, init);
}

/**
 * Application Cache - Tiered caching strategy
 * Level 1: In-memory (fastest, lost on refresh)
 * Level 2: LocalStorage (persists across sessions, 5MB limit)
 * 
 * Note: Database caching requires app_cache table - use local caching only until types regenerate
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  createdAt: number;
}

interface CacheOptions {
  ttlSeconds?: number;
  useLocalStorage?: boolean;
}

const DEFAULT_TTL = 300; // 5 minutes
const MEMORY_CACHE_MAX_SIZE = 100;

class AppCache {
  private static instance: AppCache;
  private memoryCache: Map<string, CacheEntry<unknown>> = new Map();
  private readonly prefix = 'app_cache_';

  private constructor() {
    // Cleanup expired entries periodically
    setInterval(() => this.cleanupExpired(), 60000);
  }

  static getInstance(): AppCache {
    if (!AppCache.instance) {
      AppCache.instance = new AppCache();
    }
    return AppCache.instance;
  }

  /**
   * Get cached data with fallback through cache tiers
   */
  async get<T>(key: string, options: CacheOptions = {}): Promise<T | null> {
    const { useLocalStorage = true } = options;
    const now = Date.now();

    // Level 1: Check memory cache
    const memoryEntry = this.memoryCache.get(key) as CacheEntry<T> | undefined;
    if (memoryEntry && memoryEntry.expiresAt > now) {
      return memoryEntry.data;
    }

    // Level 2: Check localStorage
    if (useLocalStorage) {
      try {
        const stored = localStorage.getItem(this.prefix + key);
        if (stored) {
          const entry: CacheEntry<T> = JSON.parse(stored);
          if (entry.expiresAt > now) {
            // Promote to memory cache
            this.setMemory(key, entry.data, entry.expiresAt - now);
            return entry.data;
          } else {
            localStorage.removeItem(this.prefix + key);
          }
        }
      } catch (e) {
        console.warn('Cache localStorage read error:', e);
      }
    }

    return null;
  }

  /**
   * Set cached data across specified tiers
   */
  async set<T>(
    key: string,
    data: T,
    options: CacheOptions = {}
  ): Promise<void> {
    const { 
      ttlSeconds = DEFAULT_TTL, 
      useLocalStorage = true,
    } = options;
    const ttlMs = ttlSeconds * 1000;

    // Always set in memory
    this.setMemory(key, data, ttlMs);

    // Set in localStorage if enabled
    if (useLocalStorage) {
      this.setLocalStorage(key, data, ttlMs);
    }
  }

  private setMemory<T>(key: string, data: T, ttlMs: number): void {
    // Evict oldest entries if cache is full
    if (this.memoryCache.size >= MEMORY_CACHE_MAX_SIZE) {
      const oldestKey = this.memoryCache.keys().next().value;
      if (oldestKey) {
        this.memoryCache.delete(oldestKey);
      }
    }

    this.memoryCache.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
      createdAt: Date.now(),
    });
  }

  private setLocalStorage<T>(key: string, data: T, ttlMs: number): void {
    try {
      const entry: CacheEntry<T> = {
        data,
        expiresAt: Date.now() + ttlMs,
        createdAt: Date.now(),
      };
      localStorage.setItem(this.prefix + key, JSON.stringify(entry));
    } catch (e) {
      // localStorage might be full, try to clear old entries
      this.cleanupLocalStorage();
      console.warn('Cache localStorage write error:', e);
    }
  }

  /**
   * Invalidate cache entries matching a pattern
   */
  async invalidate(pattern: string): Promise<void> {
    const regex = new RegExp(pattern.replace('*', '.*'));

    // Clear from memory
    for (const key of this.memoryCache.keys()) {
      if (regex.test(key)) {
        this.memoryCache.delete(key);
      }
    }

    // Clear from localStorage
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const storageKey = localStorage.key(i);
      if (storageKey?.startsWith(this.prefix)) {
        const cacheKey = storageKey.slice(this.prefix.length);
        if (regex.test(cacheKey)) {
          localStorage.removeItem(storageKey);
        }
      }
    }
  }

  /**
   * Clear all caches
   */
  async clear(): Promise<void> {
    this.memoryCache.clear();
    this.cleanupLocalStorage(true);
  }

  private cleanupExpired(): void {
    const now = Date.now();
    
    // Cleanup memory cache
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.expiresAt <= now) {
        this.memoryCache.delete(key);
      }
    }
  }

  private cleanupLocalStorage(all = false): void {
    const now = Date.now();
    
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.prefix)) {
        if (all) {
          localStorage.removeItem(key);
        } else {
          try {
            const entry = JSON.parse(localStorage.getItem(key) || '{}');
            if (entry.expiresAt && entry.expiresAt <= now) {
              localStorage.removeItem(key);
            }
          } catch {
            localStorage.removeItem(key);
          }
        }
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): { memory: number; localStorage: number } {
    let localStorageCount = 0;
    for (let i = 0; i < localStorage.length; i++) {
      if (localStorage.key(i)?.startsWith(this.prefix)) {
        localStorageCount++;
      }
    }

    return {
      memory: this.memoryCache.size,
      localStorage: localStorageCount,
    };
  }
}

// Export singleton instance
export const cache = AppCache.getInstance();

// Utility function for caching async operations
export async function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  const cached = await cache.get<T>(key, options);
  if (cached !== null) {
    return cached;
  }

  const data = await fetcher();
  await cache.set(key, data, options);
  return data;
}

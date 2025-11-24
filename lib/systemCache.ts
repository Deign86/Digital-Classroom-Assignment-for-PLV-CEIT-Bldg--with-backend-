/**
 * System-wide cache manager with TTL, invalidation, and namespace support.
 * 
 * Provides centralized caching for Firestore queries and documents to:
 * - Reduce redundant network requests
 * - Improve application responsiveness
 * - Lower Firestore read costs
 * - Support offline-first patterns
 * 
 * Features:
 * - Time-to-live (TTL) for automatic cache expiration
 * - Namespace-based organization (users, classrooms, bookingRequests, etc.)
 * - Selective invalidation by key or namespace
 * - Memory-efficient with size limits
 * - Development mode logging for debugging
 */

import { logger } from './logger';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // milliseconds
}

interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  invalidations: number;
  size: number;
}

/**
 * Cache configuration options
 */
export interface CacheConfig {
  /** Default TTL in milliseconds (default: 5 minutes) */
  defaultTTL?: number;
  /** Maximum cache entries before auto-pruning (default: 500) */
  maxSize?: number;
  /** Enable debug logging (default: false in production) */
  debug?: boolean;
}

class SystemCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    invalidations: 0,
    size: 0,
  };
  
  private config: Required<CacheConfig>;

  constructor(config: CacheConfig = {}) {
    this.config = {
      defaultTTL: config.defaultTTL ?? 5 * 60 * 1000, // 5 minutes default
      maxSize: config.maxSize ?? 500,
      debug: config.debug ?? import.meta.env.DEV,
    };

    if (this.config.debug) {
      logger.log('[SystemCache] Initialized with config:', this.config);
    }
  }

  /**
   * Generate a cache key from namespace and identifier
   */
  private generateKey(namespace: string, id: string): string {
    return `${namespace}:${id}`;
  }

  /**
   * Check if a cache entry is still valid
   */
  private isValid<T>(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp < entry.ttl;
  }

  /**
   * Prune expired entries to keep cache size manageable
   */
  private pruneExpired(): void {
    const now = Date.now();
    let pruned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp >= entry.ttl) {
        this.cache.delete(key);
        pruned++;
      }
    }

    if (pruned > 0 && this.config.debug) {
      logger.log(`[SystemCache] Pruned ${pruned} expired entries`);
    }
  }

  /**
   * Enforce maximum cache size by removing oldest entries
   */
  private enforceMaxSize(): void {
    if (this.cache.size <= this.config.maxSize) {
      return;
    }

    // Sort by timestamp (oldest first) and delete oldest entries
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);

    const toDelete = entries.slice(0, this.cache.size - this.config.maxSize);
    toDelete.forEach(([key]) => this.cache.delete(key));

    if (this.config.debug) {
      logger.log(`[SystemCache] Pruned ${toDelete.length} entries to enforce max size`);
    }
  }

  /**
   * Get data from cache
   * @returns cached data or null if not found or expired
   */
  get<T>(namespace: string, id: string): T | null {
    const key = this.generateKey(namespace, id);
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
      this.stats.misses++;
      if (this.config.debug) {
        logger.log(`[SystemCache] MISS: ${key}`);
      }
      return null;
    }

    if (!this.isValid(entry)) {
      this.cache.delete(key);
      this.stats.misses++;
      if (this.config.debug) {
        logger.log(`[SystemCache] EXPIRED: ${key}`);
      }
      return null;
    }

    this.stats.hits++;
    if (this.config.debug) {
      logger.log(`[SystemCache] HIT: ${key}`);
    }
    return entry.data;
  }

  /**
   * Store data in cache
   */
  set<T>(namespace: string, id: string, data: T, ttl?: number): void {
    const key = this.generateKey(namespace, id);
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl ?? this.config.defaultTTL,
    };

    this.cache.set(key, entry as CacheEntry<unknown>);
    this.stats.sets++;
    this.stats.size = this.cache.size;

    if (this.config.debug) {
      logger.log(`[SystemCache] SET: ${key} (TTL: ${entry.ttl}ms)`);
    }

    // Periodic maintenance
    if (this.cache.size % 50 === 0) {
      this.pruneExpired();
    }
    this.enforceMaxSize();
  }

  /**
   * Invalidate a specific cache entry
   */
  invalidate(namespace: string, id: string): void {
    const key = this.generateKey(namespace, id);
    const deleted = this.cache.delete(key);
    
    if (deleted) {
      this.stats.invalidations++;
      this.stats.size = this.cache.size;
      
      if (this.config.debug) {
        logger.log(`[SystemCache] INVALIDATE: ${key}`);
      }
    }
  }

  /**
   * Invalidate all entries in a namespace
   */
  invalidateNamespace(namespace: string): void {
    const prefix = `${namespace}:`;
    let count = 0;

    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
        count++;
      }
    }

    this.stats.invalidations += count;
    this.stats.size = this.cache.size;

    if (this.config.debug) {
      logger.log(`[SystemCache] INVALIDATE NAMESPACE: ${namespace} (${count} entries)`);
    }
  }

  /**
   * Invalidate multiple namespaces at once
   */
  invalidateNamespaces(...namespaces: string[]): void {
    namespaces.forEach(ns => this.invalidateNamespace(ns));
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.stats.invalidations += size;
    this.stats.size = 0;

    if (this.config.debug) {
      logger.log(`[SystemCache] CLEAR ALL (${size} entries)`);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): Readonly<CacheStats> {
    const hitRate = this.stats.hits + this.stats.misses > 0
      ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2)
      : '0.00';

    return {
      ...this.stats,
      hitRate: parseFloat(hitRate),
    } as CacheStats & { hitRate: number };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      invalidations: 0,
      size: this.cache.size,
    };

    if (this.config.debug) {
      logger.log('[SystemCache] Stats reset');
    }
  }

  /**
   * Check if a key exists and is valid in cache
   */
  has(namespace: string, id: string): boolean {
    const key = this.generateKey(namespace, id);
    const entry = this.cache.get(key);
    return entry !== undefined && this.isValid(entry);
  }

  /**
   * Get all keys in a namespace
   */
  getNamespaceKeys(namespace: string): string[] {
    const prefix = `${namespace}:`;
    return Array.from(this.cache.keys())
      .filter(key => key.startsWith(prefix))
      .map(key => key.substring(prefix.length));
  }
}

/**
 * Singleton cache instance
 */
export const systemCache = new SystemCache({
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  maxSize: 500,
  debug: import.meta.env.DEV,
});

/**
 * Cache namespaces for different data types
 */
export const CACHE_NAMESPACES = {
  USERS: 'users',
  USERS_ALL: 'users:all',
  CLASSROOMS: 'classrooms',
  CLASSROOMS_ALL: 'classrooms:all',
  BOOKING_REQUESTS: 'bookingRequests',
  BOOKING_REQUESTS_ALL: 'bookingRequests:all',
  BOOKING_REQUESTS_FACULTY: 'bookingRequests:faculty',
  SCHEDULES: 'schedules',
  SCHEDULES_ALL: 'schedules:all',
  SCHEDULES_FACULTY: 'schedules:faculty',
  SIGNUP_REQUESTS: 'signupRequests',
  SIGNUP_REQUESTS_ALL: 'signupRequests:all',
  SIGNUP_HISTORY: 'signupHistory',
  SIGNUP_HISTORY_ALL: 'signupHistory:all',
} as const;

/**
 * TTL configurations for different data types (in milliseconds)
 */
export const CACHE_TTL = {
  /** User data - 10 minutes (changes infrequently) */
  USERS: 10 * 60 * 1000,
  /** Classrooms - 15 minutes (mostly static) */
  CLASSROOMS: 15 * 60 * 1000,
  /** Booking requests - 2 minutes (frequently updated) */
  BOOKING_REQUESTS: 2 * 60 * 1000,
  /** Schedules - 5 minutes (moderately dynamic) */
  SCHEDULES: 5 * 60 * 1000,
  /** Signup requests - 5 minutes */
  SIGNUP_REQUESTS: 5 * 60 * 1000,
  /** Signup history - 30 minutes (rarely changes) */
  SIGNUP_HISTORY: 30 * 60 * 1000,
  /** List queries - shorter TTL for freshness */
  LIST: 3 * 60 * 1000,
} as const;

export default systemCache;

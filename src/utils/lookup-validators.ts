/**
 * LookupValue Validation Utilities
 *
 * Provides caching and validation for LookupValue-based enums throughout the system.
 * Used by models to validate fields against registered LookupValue entries.
 *
 * Features:
 * - In-memory caching with 5-minute TTL
 * - Async validation against LookupValue table
 * - Cache invalidation methods
 * - Reusable across all models
 *
 * @module utils/lookup-validators
 */

import { LookupValue } from '../models/LookupValue.model';

/**
 * Cache entry structure
 */
interface CacheEntry {
  values: string[];
  expiresAt: number;
}

/**
 * In-memory cache for LookupValue keys by category
 * Key: category name
 * Value: array of valid keys with expiration time
 */
const cache = new Map<string, CacheEntry>();

/**
 * Cache TTL in milliseconds (5 minutes)
 */
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Validate a key exists in a LookupValue category
 *
 * @param category - LookupValue category (e.g., 'activity-event', 'report-type')
 * @param key - Key to validate (e.g., 'content-viewed', 'enrollment-summary')
 * @returns Promise<boolean> - True if key exists and is active, false otherwise
 *
 * @example
 * ```typescript
 * const isValid = await validateLookupValue('activity-event', 'content-viewed');
 * if (!isValid) {
 *   throw new Error('Invalid event type');
 * }
 * ```
 */
export async function validateLookupValue(
  category: string,
  key: string
): Promise<boolean> {
  const validKeys = await getValidKeys(category);
  return validKeys.includes(key);
}

/**
 * Get all valid keys for a LookupValue category
 *
 * Uses in-memory cache with 5-minute TTL to minimize database queries.
 * Cache is automatically refreshed after TTL expires.
 *
 * @param category - LookupValue category
 * @returns Promise<string[]> - Array of valid keys
 *
 * @example
 * ```typescript
 * const eventTypes = await getValidKeys('activity-event');
 * // ['content-viewed', 'content-started', 'enrollment-created', ...]
 * ```
 */
export async function getValidKeys(category: string): Promise<string[]> {
  // Check cache first
  const cached = cache.get(category);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.values;
  }

  // Cache miss or expired - fetch from database
  const lookupValues = await LookupValue.find({
    category,
    isActive: true
  })
    .select('key')
    .lean();

  const values = lookupValues.map((lv: any) => lv.key);

  // Update cache
  cache.set(category, {
    values,
    expiresAt: Date.now() + CACHE_TTL_MS
  });

  return values;
}

/**
 * Invalidate cache for a specific category or all categories
 *
 * Call this when LookupValue entries are created, updated, or deleted
 * to ensure models validate against fresh data.
 *
 * @param category - Optional category to invalidate. If omitted, clears entire cache.
 *
 * @example
 * ```typescript
 * // Invalidate specific category
 * invalidateCache('activity-event');
 *
 * // Invalidate all categories
 * invalidateCache();
 * ```
 */
export function invalidateCache(category?: string): void {
  if (category) {
    cache.delete(category);
  } else {
    cache.clear();
  }
}

/**
 * Get cache statistics for monitoring and debugging
 *
 * @returns Object with cache size and entries
 */
export function getCacheStats(): { size: number; entries: Record<string, number> } {
  const entries: Record<string, number> = {};

  cache.forEach((value, key) => {
    entries[key] = value.values.length;
  });

  return {
    size: cache.size,
    entries
  };
}

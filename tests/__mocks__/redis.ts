// Mock implementation of Cache for testing
const mockCache = new Map<string, { value: any; expiry: number }>();

export class Cache {
  static async get<T>(key: string): Promise<T | null> {
    const item = mockCache.get(key);
    if (!item) return null;
    
    // Check expiry
    if (item.expiry < Date.now()) {
      mockCache.delete(key);
      return null;
    }
    
    return item.value as T;
  }

  static async set(key: string, value: any, ttl = 7200): Promise<void> {
    mockCache.set(key, {
      value,
      expiry: Date.now() + (ttl * 1000)
    });
  }

  static async del(key: string | string[]): Promise<void> {
    if (Array.isArray(key)) {
      key.forEach(k => mockCache.delete(k));
    } else {
      mockCache.delete(key);
    }
  }

  static async delPattern(pattern: string): Promise<void> {
    const regex = new RegExp(pattern.replace('*', '.*'));
    const keysToDelete: string[] = [];
    
    mockCache.forEach((_, key) => {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => mockCache.delete(key));
  }

  static async exists(key: string): Promise<boolean> {
    return mockCache.has(key);
  }

  // Test helper to clear all cache
  static clearAll(): void {
    mockCache.clear();
  }
}

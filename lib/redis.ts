// 禁用Redis功能，避免兼容性问题
console.log('Redis功能已禁用，使用内存缓存');

let redisConnected = false;

// Memory cache fallback when Redis is disabled
const memoryCache = new Map<string, { value: any, expiresAt: number | null }>();

// 模拟Redis客户端
const redisClient = {
  connect: async () => { throw new Error('Redis已禁用'); },
  set: async (key: string, value: string) => {
    memoryCache.set(key, { value, expiresAt: null });
    return 'OK';
  },
  get: async (key: string) => {
    const item = memoryCache.get(key);
    if (!item) return null;
    if (item.expiresAt && item.expiresAt < Date.now()) {
      memoryCache.delete(key);
      return null;
    }
    return item.value;
  },
  del: async (key: string) => {
    memoryCache.delete(key);
    return 1;
  },
  exists: async (key: string) => {
    const item = memoryCache.get(key);
    if (!item) return false;
    if (item.expiresAt && item.expiresAt < Date.now()) {
      memoryCache.delete(key);
      return false;
    }
    return true;
  },
  setEx: async (key: string, seconds: number, value: string) => {
    memoryCache.set(key, { value, expiresAt: Date.now() + seconds * 1000 });
    return 'OK';
  },
  quit: async () => { return null; }
};

export default redisClient

// Helper functions for common Redis operations
export const redis = {
  // Set a key with expiration
  async set(key: string, value: string, expirationInSeconds?: number) {
    try {
      if (expirationInSeconds) {
        return await redisClient.setEx(key, expirationInSeconds, value)
      }
      return await redisClient.set(key, value)
    } catch (error) {
      console.warn('Redis set操作失败:', error);
      return null;
    }
  },

  // Get a key
  async get(key: string) {
    try {
      return await redisClient.get(key)
    } catch (error) {
      console.warn('Redis get操作失败:', error);
      return null;
    }
  },

  // Delete a key
  async del(key: string | string[]) {
    try {
      if (Array.isArray(key)) {
        return await Promise.all(key.map(k => redisClient.del(k)))
      }
      return await redisClient.del(key)
    } catch (error) {
      console.warn('Redis del操作失败:', error);
      return null;
    }
  },

  // Check if key exists
  async exists(key: string) {
    try {
      return await redisClient.exists(key)
    } catch (error) {
      console.warn('Redis exists操作失败:', error);
      return false;
    }
  },

  // Get keys by pattern
  async keys(pattern: string) {
    try {
      // Mock implementation - return empty array for simplicity or implement pattern matching
      return []
    } catch (error) {
      console.warn('Redis keys操作失败:', error);
      return [];
    }
  },

  // Set JSON value
  async setJSON(key: string, value: any, expirationInSeconds?: number) {
    try {
      const jsonValue = JSON.stringify(value)
      if (expirationInSeconds) {
        return await redisClient.setEx(key, expirationInSeconds, jsonValue)
      }
      return await redisClient.set(key, jsonValue)
    } catch (error) {
      console.warn('Redis setJSON操作失败:', error);
      return null;
    }
  },

  // Get JSON value
  async getJSON(key: string) {
    try {
      const value = await redisClient.get(key)
      if (value) {
        return JSON.parse(value)
      }
      return null
    } catch (error) {
      console.warn('Redis getJSON操作失败:', error);
      return null;
    }
  },

  // Close connection
  async quit() {
    try {
      return await redisClient.quit()
    } catch (error) {
      console.warn('Redis quit操作失败:', error);
      return null;
    }
  }
}
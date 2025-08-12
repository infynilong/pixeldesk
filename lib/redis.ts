// 禁用Redis功能，避免兼容性问题
console.log('Redis功能已禁用，使用内存缓存');

let redisConnected = false;

// 模拟Redis客户端
const redisClient = {
  connect: async () => { throw new Error('Redis已禁用'); },
  set: async (key: string, value: string) => { return null; },
  get: async (key: string) => { return null; },
  del: async (key: string) => { return null; },
  exists: async (key: string) => { return false; },
  setEx: async (key: string, seconds: number, value: string) => { return null; },
  quit: async () => { return null; }
};

export default redisClient

// Helper functions for common Redis operations
export const redis = {
  // Set a key with expiration
  async set(key: string, value: string, expirationInSeconds?: number) {
    if (!redisConnected) return null;
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
    if (!redisConnected) return null;
    try {
      return await redisClient.get(key)
    } catch (error) {
      console.warn('Redis get操作失败:', error);
      return null;
    }
  },

  // Delete a key
  async del(key: string | string[]) {
    if (!redisConnected) return null;
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
    if (!redisConnected) return false;
    try {
      return await redisClient.exists(key)
    } catch (error) {
      console.warn('Redis exists操作失败:', error);
      return false;
    }
  },

  // Get keys by pattern
  async keys(pattern: string) {
    if (!redisConnected) return [];
    try {
      // Mock implementation - return empty array since Redis is disabled
      return []
    } catch (error) {
      console.warn('Redis keys操作失败:', error);
      return [];
    }
  },

  // Set JSON value
  async setJSON(key: string, value: any, expirationInSeconds?: number) {
    if (!redisConnected) return null;
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
    if (!redisConnected) return null;
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
    if (!redisConnected) return null;
    try {
      return await redisClient.quit()
    } catch (error) {
      console.warn('Redis quit操作失败:', error);
      return null;
    }
  }
}
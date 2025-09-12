/**
 * Local Storage Caching Utilities
 * Provides caching functionality for chat data to improve performance
 */

const CACHE_PREFIX = 'chat_cache_'
const CACHE_EXPIRY = 5 * 60 * 1000 // 5 minutes

interface CacheItem<T> {
  data: T
  timestamp: number
  expiry: number
}

export function getCacheKey(key: string): string {
  return `${CACHE_PREFIX}${key}`
}

export function setCache<T>(key: string, data: T, expiry: number = CACHE_EXPIRY): void {
  try {
    const cacheKey = getCacheKey(key)
    const cacheItem: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      expiry
    }
    localStorage.setItem(cacheKey, JSON.stringify(cacheItem))
  } catch (error) {
    console.warn('Failed to set cache:', error)
    // LocalStorage might be full or not available
  }
}

export function getCache<T>(key: string): T | null {
  try {
    const cacheKey = getCacheKey(key)
    const cached = localStorage.getItem(cacheKey)
    
    if (!cached) return null
    
    const cacheItem: CacheItem<T> = JSON.parse(cached)
    
    // Check if cache is expired
    if (Date.now() - cacheItem.timestamp > cacheItem.expiry) {
      removeCache(key)
      return null
    }
    
    return cacheItem.data
  } catch (error) {
    console.warn('Failed to get cache:', error)
    return null
  }
}

export function removeCache(key: string): void {
  try {
    const cacheKey = getCacheKey(key)
    localStorage.removeItem(cacheKey)
  } catch (error) {
    console.warn('Failed to remove cache:', error)
  }
}

export function clearAllCache(): void {
  try {
    Object.keys(localStorage)
      .filter(key => key.startsWith(CACHE_PREFIX))
      .forEach(key => localStorage.removeItem(key))
  } catch (error) {
    console.warn('Failed to clear cache:', error)
  }
}

// Chat-specific cache utilities
export const CacheKeys = {
  conversations: (userId: string) => `conversations_${userId}`,
  messages: (conversationId: string) => `messages_${conversationId}`,
  userStatus: (userId: string) => `user_status_${userId}`,
  conversationStatus: (conversationId: string) => `conversation_status_${conversationId}`
}

// Cache conversations list
export function cacheConversations(userId: string, conversations: any[]): void {
  setCache(CacheKeys.conversations(userId), conversations, 2 * 60 * 1000) // 2 minutes
}

// Get cached conversations
export function getCachedConversations(userId: string): any[] | null {
  return getCache<any[]>(CacheKeys.conversations(userId))
}

// Cache messages for a conversation
export function cacheMessages(conversationId: string, messages: any[]): void {
  setCache(CacheKeys.messages(conversationId), messages, 3 * 60 * 1000) // 3 minutes
}

// Get cached messages
export function getCachedMessages(conversationId: string): any[] | null {
  return getCache<any[]>(CacheKeys.messages(conversationId))
}

// Cache user online status
export function cacheUserStatus(userId: string, status: any): void {
  setCache(CacheKeys.userStatus(userId), status, 30 * 1000) // 30 seconds
}

// Get cached user status
export function getCachedUserStatus(userId: string): any | null {
  return getCache<any>(CacheKeys.userStatus(userId))
}

// Message deduplication utility
export function deduplicateMessages(messages: any[]): any[] {
  const seen = new Set()
  return messages.filter(message => {
    if (seen.has(message.id)) {
      return false
    }
    seen.add(message.id)
    return true
  })
}

// Cache cleanup on user logout
export function clearUserCache(userId: string): void {
  removeCache(CacheKeys.conversations(userId))
  // Note: We don't clear message caches as they might be shared between users
}
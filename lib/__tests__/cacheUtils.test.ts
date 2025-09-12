import {
  setCache,
  getCache,
  removeCache,
  clearAllCache,
  cacheMessages,
  getCachedMessages,
  cacheConversations,
  getCachedConversations,
  deduplicateMessages
} from '../cacheUtils'

describe('cacheUtils', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
    jest.clearAllMocks()
  })

  describe('basic cache operations', () => {
    it('should set and get cache items', () => {
      const testData = { message: 'Hello World' }
      setCache('test-key', testData)
      
      const result = getCache('test-key')
      expect(result).toEqual(testData)
    })

    it('should return null for non-existent keys', () => {
      const result = getCache('non-existent-key')
      expect(result).toBeNull()
    })

    it('should remove cache items', () => {
      setCache('test-key', { data: 'test' })
      removeCache('test-key')
      
      const result = getCache('test-key')
      expect(result).toBeNull()
    })

    it('should clear all cache', () => {
      setCache('key1', { data: 'test1' })
      setCache('key2', { data: 'test2' })
      
      clearAllCache()
      
      expect(getCache('key1')).toBeNull()
      expect(getCache('key2')).toBeNull()
    })
  })

  describe('chat-specific cache utilities', () => {
    it('should cache and retrieve messages', () => {
      const messages = [
        { id: '1', content: 'Hello', createdAt: new Date().toISOString() },
        { id: '2', content: 'World', createdAt: new Date().toISOString() }
      ]
      
      cacheMessages('conv-123', messages)
      const result = getCachedMessages('conv-123')
      
      expect(result).toEqual(messages)
    })

    it('should cache and retrieve conversations', () => {
      const conversations = [
        { id: 'conv-1', name: 'Test Conversation', participants: [] },
        { id: 'conv-2', name: 'Another Conversation', participants: [] }
      ]
      
      cacheConversations('user-123', conversations)
      const result = getCachedConversations('user-123')
      
      expect(result).toEqual(conversations)
    })
  })

  describe('message deduplication', () => {
    it('should remove duplicate messages by id', () => {
      const messages = [
        { id: '1', content: 'Hello' },
        { id: '2', content: 'World' },
        { id: '1', content: 'Duplicate Hello' } // Duplicate ID
      ]
      
      const result = deduplicateMessages(messages)
      
      expect(result).toHaveLength(2)
      expect(result.map(m => m.id)).toEqual(['1', '2'])
      // Should keep the first occurrence
      expect(result.find(m => m.id === '1')?.content).toBe('Hello')
    })

    it('should handle empty array', () => {
      const result = deduplicateMessages([])
      expect(result).toEqual([])
    })

    it('should handle array with no duplicates', () => {
      const messages = [
        { id: '1', content: 'Hello' },
        { id: '2', content: 'World' }
      ]
      
      const result = deduplicateMessages(messages)
      expect(result).toEqual(messages)
    })
  })

  describe('cache expiration', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('should return null for expired cache', () => {
      const testData = { message: 'Hello' }
      setCache('test-key', testData, 1000) // 1 second expiry
      
      // Advance time by 2 seconds
      jest.advanceTimersByTime(2000)
      
      const result = getCache('test-key')
      expect(result).toBeNull()
    })

    it('should return data for non-expired cache', () => {
      const testData = { message: 'Hello' }
      setCache('test-key', testData, 5000) // 5 second expiry
      
      // Advance time by 3 seconds
      jest.advanceTimersByTime(3000)
      
      const result = getCache('test-key')
      expect(result).toEqual(testData)
    })
  })
})
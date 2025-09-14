import { useState, useEffect, useCallback } from 'react'
import { PostReply, RepliesResponse, CreateReplyData } from '@/types/social'

interface UsePostRepliesOptions {
  postId: string
  userId: string
  autoFetch?: boolean
}

interface UsePostRepliesReturn {
  replies: PostReply[]
  isLoading: boolean
  isCreatingReply: boolean
  error: string | null
  pagination: {
    page: number
    totalPages: number
    hasNextPage: boolean
  }
  
  // 操作函数
  fetchReplies: (page?: number) => Promise<void>
  createReply: (replyData: CreateReplyData) => Promise<PostReply | null>
  loadMoreReplies: () => Promise<void>
  refreshReplies: () => Promise<void>
}

export function usePostReplies(options: UsePostRepliesOptions): UsePostRepliesReturn {
  const { postId, userId, autoFetch = true } = options
  
  const [replies, setReplies] = useState<PostReply[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isCreatingReply, setIsCreatingReply] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    hasNextPage: false
  })

  // 获取回复列表
  const fetchReplies = useCallback(async (page = 1) => {
    if (!postId) return
    
    try {
      if (page === 1) {
        setIsLoading(true)
      }
      setError(null)

      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: '10'
      })
      
      const response = await fetch(`/api/posts/${postId}/replies?${queryParams.toString()}`)
      const data: RepliesResponse = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch replies')
      }

      if (data.data) {
        const { replies: newReplies, pagination: newPagination } = data.data
        
        if (page === 1) {
          setReplies(newReplies)
        } else {
          setReplies(prev => [...prev, ...newReplies])
        }

        setPagination({
          page: newPagination.page,
          totalPages: newPagination.totalPages,
          hasNextPage: newPagination.hasNextPage
        })
      }

    } catch (err) {
      console.error('Error fetching replies:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch replies')
    } finally {
      setIsLoading(false)
    }
  }, [postId])

  // 创建新回复
  const createReply = useCallback(async (replyData: CreateReplyData): Promise<PostReply | null> => {
    if (!postId || !userId) return null
    
    try {
      setIsCreatingReply(true)
      setError(null)

      const response = await fetch(`/api/posts/${postId}/replies?userId=${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(replyData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create reply')
      }

      if (data.success && data.data) {
        const newReply = data.data
        
        // 将新回复添加到列表末尾
        setReplies(prev => [...prev, newReply])
        
        console.log('✅ [usePostReplies] Reply created successfully:', newReply)
        return newReply
      }

      return null

    } catch (err) {
      console.error('❌ [usePostReplies] Error creating reply:', err)
      setError(err instanceof Error ? err.message : 'Failed to create reply')
      return null
    } finally {
      setIsCreatingReply(false)
    }
  }, [postId, userId])

  // 加载更多回复
  const loadMoreReplies = useCallback(async () => {
    if (pagination.hasNextPage && !isLoading) {
      await fetchReplies(pagination.page + 1)
    }
  }, [fetchReplies, pagination.hasNextPage, pagination.page, isLoading])

  // 刷新回复列表
  const refreshReplies = useCallback(async () => {
    await fetchReplies(1)
  }, [fetchReplies])

  // 自动获取回复
  useEffect(() => {
    if (autoFetch && postId && userId) {
      fetchReplies()
    }
  }, [autoFetch, postId, userId, fetchReplies])

  return {
    replies,
    isLoading,
    isCreatingReply,
    error,
    pagination,
    fetchReplies,
    createReply,
    loadMoreReplies,
    refreshReplies
  }
}
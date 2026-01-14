import { useState, useEffect, useCallback } from 'react'
import { Notification, NotificationsResponse, NotificationUpdateResponse, NotificationType } from '@/types/notifications'

interface UseSocialNotificationsOptions {
  userId: string
  autoFetch?: boolean
  refreshInterval?: number
  unreadOnly?: boolean
}

export interface UseSocialNotificationsReturn {
  notifications: Notification[]
  isLoading: boolean
  isRefreshing: boolean
  error: string | null
  unreadCount: number
  pagination: {
    page: number
    totalPages: number
    hasNextPage: boolean
    total: number
  }

  // 操作函数
  fetchNotifications: (page?: number) => Promise<void>
  markAsRead: (notificationId: string) => Promise<boolean>
  markAllAsRead: () => Promise<boolean>
  deleteNotification: (notificationId: string) => Promise<boolean>
  refreshNotifications: () => Promise<void>
  loadMoreNotifications: () => Promise<void>
}

export function useSocialNotifications(options: UseSocialNotificationsOptions): UseSocialNotificationsReturn {
  const { userId, autoFetch = true, refreshInterval = 0, unreadOnly = false } = options // 保持refreshInterval=0默认禁用轮询

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    hasNextPage: false,
    total: 0
  })

  // 获取通知列表
  const fetchNotifications = useCallback(async (page = 1) => {
    if (!userId) return

    try {
      if (page === 1) {
        setIsLoading(true)
      } else {
        setIsRefreshing(true)
      }
      setError(null)

      const queryParams = new URLSearchParams({
        userId,
        page: page.toString(),
        limit: '10',
        ...(unreadOnly && { unreadOnly: 'true' })
      })

      const response = await fetch(`/api/notifications?${queryParams.toString()}`)
      const data: NotificationsResponse = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch notifications')
      }

      if (data.success && data.data) {
        const { notifications: newNotifications, pagination: newPagination } = data.data

        if (page === 1) {
          setNotifications(newNotifications)
        } else {
          setNotifications(prev => [...prev, ...newNotifications])
        }

        setPagination({
          page: newPagination.page,
          totalPages: newPagination.totalPages,
          hasNextPage: newPagination.hasNextPage,
          total: newPagination.total
        })

        setUnreadCount(newPagination.unreadCount)
      }

    } catch (err) {
      console.error('Error fetching notifications:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch notifications')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [userId, unreadOnly])

  // 标记单个通知为已读
  const markAsRead = useCallback(async (notificationId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isRead: true }),
      })

      const data: NotificationUpdateResponse = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to mark notification as read')
      }

      if (data.success && data.data) {
        // 更新本地状态
        setNotifications(prev =>
          prev.map(notification =>
            notification.id === notificationId
              ? { ...notification, isRead: true }
              : notification
          )
        )

        // 减少未读计数
        setUnreadCount(prev => Math.max(0, prev - 1))
        return true
      }

      return false

    } catch (err) {
      console.error('Error marking notification as read:', err)
      setError(err instanceof Error ? err.message : 'Failed to mark notification as read')
      return false
    }
  }, [])

  // 标记所有通知为已读
  const markAllAsRead = useCallback(async (): Promise<boolean> => {
    if (!userId) return false

    try {
      const response = await fetch(`/api/notifications/mark-all-read?userId=${userId}`, {
        method: 'PATCH',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to mark all notifications as read')
      }

      if (data.success) {
        // 更新本地状态 - 标记所有通知为已读
        setNotifications(prev =>
          prev.map(notification => ({ ...notification, isRead: true }))
        )

        // 重置未读计数
        setUnreadCount(0)
        return true
      }

      return false

    } catch (err) {
      console.error('Error marking all notifications as read:', err)
      setError(err instanceof Error ? err.message : 'Failed to mark all notifications as read')
      return false
    }
  }, [userId])

  // 删除通知
  const deleteNotification = useCallback(async (notificationId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete notification')
      }

      if (data.success) {
        // 从本地状态中移除通知
        const deletedNotification = notifications.find(n => n.id === notificationId)
        setNotifications(prev => prev.filter(notification => notification.id !== notificationId))

        // 如果删除的是未读通知，更新未读计数
        if (deletedNotification && !deletedNotification.isRead) {
          setUnreadCount(prev => Math.max(0, prev - 1))
        }

        return true
      }

      return false

    } catch (err) {
      console.error('Error deleting notification:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete notification')
      return false
    }
  }, [notifications])

  // 刷新通知列表
  const refreshNotifications = useCallback(async () => {
    await fetchNotifications(1)
  }, [fetchNotifications])

  // 加载更多通知
  const loadMoreNotifications = useCallback(async () => {
    if (pagination.hasNextPage && !isRefreshing) {
      await fetchNotifications(pagination.page + 1)
    }
  }, [fetchNotifications, pagination.hasNextPage, pagination.page, isRefreshing])

  // 自动获取通知
  useEffect(() => {
    // 如果已经在加载，则不自动获取
    if (autoFetch && userId && !isLoading && notifications.length === 0) {
      fetchNotifications()
    }
  }, [autoFetch, userId, fetchNotifications]) // Remove isLoading/notifications to avoid loops, handled inside

  // 自动刷新 - 增加页面可见性检查
  useEffect(() => {
    if (refreshInterval > 0 && userId) {
      const handleVisibilityChange = () => {
        if (document.hidden) {
          // 页面不可见时，不需要做任何事，interval会自动暂停逻辑
        } else {
          // 页面变回可见时，立即刷新一次
          refreshNotifications()
        }
      }

      document.addEventListener('visibilitychange', handleVisibilityChange)

      const interval = setInterval(() => {
        // 只有页面可见且未在加载时才刷新
        if (!document.hidden && !isLoading && !isRefreshing) {
          refreshNotifications()
        }
      }, refreshInterval)

      return () => {
        clearInterval(interval)
        document.removeEventListener('visibilitychange', handleVisibilityChange)
      }
    }
  }, [refreshInterval, userId, refreshNotifications, isLoading, isRefreshing])

  return {
    notifications,
    isLoading,
    isRefreshing,
    error,
    unreadCount,
    pagination,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refreshNotifications,
    loadMoreNotifications
  }
}
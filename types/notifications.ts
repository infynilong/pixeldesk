export interface Notification {
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  isRead: boolean
  relatedPostId?: string
  relatedReplyId?: string
  relatedUserId?: string
  createdAt: string
  updatedAt: string

  // 关联数据
  relatedPost?: {
    id: string
    title?: string
    content: string
    author: {
      id: string
      name: string
      avatar?: string
    }
  }
  relatedUser?: {
    id: string
    name: string
    avatar?: string
  }
}

export enum NotificationType {
  POST_REPLY = 'POST_REPLY',
  POST_LIKE = 'POST_LIKE',
  SYSTEM = 'SYSTEM',
  POSTCARD_EXCHANGE_REQUEST = 'POSTCARD_EXCHANGE_REQUEST',
  POSTCARD_EXCHANGE_ACCEPT = 'POSTCARD_EXCHANGE_ACCEPT',
  POSTCARD_EXCHANGE_REJECT = 'POSTCARD_EXCHANGE_REJECT'
}

export interface CreateNotificationData {
  userId: string
  type: NotificationType
  title: string
  message: string
  relatedPostId?: string
  relatedReplyId?: string
  relatedUserId?: string
}

export interface NotificationsResponse {
  success: boolean
  data?: {
    notifications: Notification[]
    pagination: {
      page: number
      totalPages: number
      hasNextPage: boolean
      total: number
      unreadCount: number
    }
  }
  error?: string
}

export interface NotificationUpdateResponse {
  success: boolean
  data?: Notification
  error?: string
}

export interface NotificationStatsResponse {
  success: boolean
  data?: {
    total: number
    unread: number
  }
  error?: string
}
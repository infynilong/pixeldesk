'use client'

import { useState } from 'react'
import { UseSocialNotificationsReturn } from '@/lib/hooks/useSocialNotifications'
// import { useCurrentUser } from '@/lib/hooks/useCurrentUser' // Removed as logic is lifted
import { Notification, NotificationType } from '@/types/notifications'
import LoadingSpinner from '@/components/LoadingSpinner'
import UserAvatar from '@/components/UserAvatar'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/lib/hooks/useTranslation'

interface NotificationsTabProps {
  isActive?: boolean
  isMobile?: boolean
  isTablet?: boolean
  onPostClick?: (postId: string) => void // 点击通知跳转到帖子

  onOpenPostcardRequest?: (request: any) => void
  onSwitchTab?: (tabId: string) => void
  notificationState: UseSocialNotificationsReturn
  filter: 'all' | 'unread'
  onFilterChange: (filter: 'all' | 'unread') => void
}

export default function NotificationsTab({
  isActive = false,
  isMobile = false,
  isTablet = false,
  onPostClick,

  onOpenPostcardRequest,
  onSwitchTab,
  notificationState,
  filter,
  onFilterChange
}: NotificationsTabProps) {
  const router = useRouter()
  const { t } = useTranslation()

  // 获取当前用户信息 - 状态提升到 RightPanel
  // const { userId: currentUserId } = useCurrentUser()

  // 使用社交通知 - 状态提升到 RightPanel
  const {
    notifications,
    isLoading,
    isRefreshing,
    error,
    unreadCount,
    pagination,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refreshNotifications,
    loadMoreNotifications
  } = notificationState

  // Debug logging
  console.log('🔔 NotificationsTab render:', {
    notificationsCount: notifications.length,
    isLoading,
    error,
    filter,
    notifications: notifications.map(n => ({ id: n.id, type: n.type, title: n.title }))
  })

  // 处理名信片交换请求
  const handleExchangeAction = async (e: React.MouseEvent, notification: Notification, action: 'ACCEPT' | 'REJECT') => {
    e.stopPropagation() // 防止触发 notifications click

    if (!notification.relatedExchangeId) return

    try {
      const res = await fetch('/api/postcards/exchange', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exchangeId: notification.relatedExchangeId,
          action
        })
      })
      const data = await res.json()

      if (data.success) {
        // refresh notifications to update status or remove items
        refreshNotifications()
        if (action === 'ACCEPT') {
          // You might want to show a success toast here
          alert('已同意交换！名信片已存入青鸟集。')
        }
      } else {
        alert(data.error || '操作失败')
      }
    } catch (error) {
      console.error('Exchange action error:', error)
      alert('操作失败，请重试')
    }
  }

  // 处理通知点击
  const handleNotificationClick = async (notification: Notification) => {
    // 如果未读，标记为已读
    if (!notification.isRead) {
      await markAsRead(notification.id)
    }

    // If it's a postcard exchange request, open the modal
    if (notification.type === NotificationType.POSTCARD_EXCHANGE_REQUEST && onOpenPostcardRequest) {
      onOpenPostcardRequest({
        exchangeId: notification.relatedExchangeId,
        senderId: notification.relatedUserId,
        senderName: notification.relatedUser?.name || 'Unknown',
        senderAvatar: notification.relatedUser?.avatar
      })
      return // Don't mark as read immediately, let the user decide in modal (or mark read after modal opens?)
      // Actually, user clicking it likely means they saw it. But let's keep it unread until they accept/reject?
      // Or just mark read. The existing logic marks read on click. 
      // User said "clicked message, buttons disappeared". If we open modal, we can mark read. 
    }

    // If it's a postcard exchange acceptance, go to collection
    if (notification.type === NotificationType.POSTCARD_EXCHANGE_ACCEPT) {
      router.push('/collection')
      return
    }

    // 如果有相关帖子，触发跳转
    if (notification.relatedPostId && onPostClick) {
      onPostClick(notification.relatedPostId)
    }
  }

  // 获取通知图标
  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case NotificationType.POST_REPLY:
        return '💬'
      case NotificationType.POST_LIKE:
        return '❤️'
      case NotificationType.SYSTEM:
        return '📢'
      case NotificationType.POSTCARD_EXCHANGE_REQUEST:
        return '🕊️'
      case NotificationType.POSTCARD_EXCHANGE_ACCEPT:
        return '✨'
      case NotificationType.POSTCARD_EXCHANGE_REJECT:
        return '💨'
      default:
        return '📮'
    }
  }

  // 获取通知颜色
  const getNotificationColor = (type: NotificationType) => {
    switch (type) {
      case NotificationType.POST_REPLY:
        return 'text-blue-400'
      case NotificationType.POST_LIKE:
        return 'text-red-400'
      case NotificationType.SYSTEM:
        return 'text-purple-400'
      case NotificationType.POSTCARD_EXCHANGE_REQUEST:
        return 'text-cyan-400'
      case NotificationType.POSTCARD_EXCHANGE_ACCEPT:
        return 'text-emerald-400'
      case NotificationType.POSTCARD_EXCHANGE_REJECT:
        return 'text-red-400'
      default:
        return 'text-gray-400'
    }
  }

  // 格式化时间
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return '刚刚'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}分钟前`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}小时前`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}天前`

    return date.toLocaleDateString('zh-CN')
  }

  // 如果不活跃，显示占位符
  if (!isActive) {
    return (
      <div className="h-full flex items-center justify-center p-4 text-center">
        <div className="text-retro-textMuted">
          <div className="w-12 h-12 bg-retro-purple/20 rounded-full flex items-center justify-center mx-auto mb-2">
            <svg className="w-6 h-6 text-retro-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM11 17H6l5 5v-5zM12 7V2l5 5h-3.5a1.5 1.5 0 00-1.5 1.5z" />
            </svg>
          </div>
          <p className="text-sm">通知中心</p>
        </div>
      </div>
    )
  }

  const containerClasses = "h-full flex flex-col bg-transparent"

  return (
    <div className={containerClasses}>
      {/* 头部 - 深色极客风格 */}
      <div className="flex-shrink-0 p-4 border-b border-gray-800 bg-gray-900/60">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gray-800 border border-gray-700 rounded-lg flex items-center justify-center relative">
                <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM11 17H6l5 5v-5zM12 7V2l5 5h-3.5a1.5 1.5 0 00-1.5 1.5z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-gray-200 text-lg font-medium font-mono uppercase">{t.notifications?.inbox || 'INBOX'}</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${unreadCount > 0 ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-gray-600'}`}></div>
                  <span className="text-gray-500 text-xs font-mono">
                    {unreadCount > 0 ? `${unreadCount} ${t.notifications?.unread || 'UNREAD'}` : (t.notifications?.all + ' ' + t.notifications?.mark_read || 'ALL READ')}
                  </span>
                  {isRefreshing && (
                    <div className="flex items-center gap-1 ml-2">
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Mark Read Button (Icon only on mobile/narrow) */}
            <button
              onClick={() => markAllAsRead()}
              className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
              title={t.notifications?.mark_read || 'Mark all as read'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </button>
          </div>

          {/* 过滤器行 (Separate row for filters to avoid squeezing) */}
          <div className="flex w-full bg-gray-800/60 border border-gray-700/50 rounded-lg overflow-hidden p-0.5">
            <button
              onClick={() => onFilterChange('all')}
              className={`flex-1 py-1.5 text-xs font-mono font-medium rounded-md transition-all ${filter === 'all'
                ? 'bg-gray-700 text-gray-100 shadow-sm'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/30'
                }`}
            >
              {t.notifications?.all || 'ALL'}
            </button>
            <div className="w-px bg-gray-700/50 my-1 mx-0.5"></div>
            <button
              onClick={() => onFilterChange('unread')}
              className={`flex-1 py-1.5 text-xs font-mono font-medium rounded-md transition-all flex items-center justify-center gap-1.5 ${filter === 'unread'
                ? 'bg-gray-700 text-gray-100 shadow-sm'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/30'
                }`}
            >
              {t.notifications?.unread || 'UNREAD'}
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 bg-gray-600 text-white text-[10px] rounded-full min-w-[16px] text-center">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>


      {/* 内容区域 */}
      <div className="flex-1 overflow-hidden">
        {error && (
          <div className="p-4 bg-red-950/30 border border-red-800/30 m-4 rounded-lg">
            <p className="text-red-300 text-sm font-mono">{error}</p>
          </div>
        )
        }

        {
          isLoading ? (
            <div className="flex items-center justify-center h-full">
              <LoadingSpinner />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <div className="w-16 h-16 bg-gray-800 border border-gray-700 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-5 5v-5zM11 17H6l5 5v-5zM12 7V2l5 5h-3.5a1.5 1.5 0 00-1.5 1.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-200 mb-2 font-mono">
                {filter === 'unread' ? 'NO UNREAD' : 'NO NOTIFICATIONS'}
              </h3>
              <p className="text-gray-500 text-sm font-mono">
                {filter === 'unread' ? 'All notifications have been read' : 'Notifications will appear here when someone replies or likes your posts'}
              </p>
            </div>
          ) : (
            <div className="h-full overflow-y-auto">
              <div className="space-y-2 p-3">
                {notifications.map((notification, index) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`group relative cursor-pointer bg-gray-900/90 border  rounded-lg overflow-hidden shadow-lg hover:shadow-xl ${notification.isRead
                      ? 'border-gray-800 hover:border-gray-700'
                      : 'border-blue-800/50 hover:border-blue-700/60 shadow-blue-900/20'
                      }`}
                  >
                    {/* 未读指示器 */}
                    {!notification.isRead && (
                      <div className="absolute top-3 right-3 w-3 h-3 bg-blue-500 rounded-full shadow-lg "></div>
                    )}

                    <div className="relative p-3">
                      <div className="flex items-start space-x-3">
                        {/* 通知图标 */}
                        <div className={`flex-shrink-0 w-8 h-8 bg-gray-800 border border-gray-700 ${getNotificationColor(notification.type)} rounded-lg flex items-center justify-center`}>
                          <span className="text-xs">
                            {getNotificationIcon(notification.type)}
                          </span>
                        </div>

                        {/* 通知内容 */}
                        <div className="flex-1 min-w-0 space-y-1">
                          {/* 通知标题和时间 */}
                          <div className="flex items-start justify-between">
                            <h4 className={`font-bold font-pixel text-sm tracking-wide truncate pr-2 ${notification.isRead ? 'text-retro-textMuted' : 'text-white'
                              }`}>
                              {notification.title}
                            </h4>
                            <span className="text-xs text-retro-textMuted font-retro flex-shrink-0">
                              {formatTimeAgo(notification.createdAt)}
                            </span>
                          </div>

                          {/* 通知消息 */}
                          <p className={`text-sm font-retro leading-relaxed ${notification.isRead ? 'text-retro-textMuted/80' : 'text-retro-text'
                            }`}>
                            {notification.message}
                          </p>

                          {/* 相关用户信息 */}
                          {notification.relatedUser && (
                            <div className="flex items-center space-x-2 pt-1">
                              <UserAvatar
                                userId={notification.relatedUser.id}
                                userName={notification.relatedUser.name}
                                userAvatar={notification.relatedUser.avatar}
                                size="xs"
                                showStatus={false}
                              />
                              <span className="text-xs text-retro-textMuted font-retro">
                                {notification.relatedUser.name}
                              </span>
                            </div>
                          )}

                          {/* 相关帖子预览 */}
                          {notification.relatedPost && (
                            <div className="mt-2 p-2 bg-retro-bg-dark/30 rounded-lg border border-retro-border/30">
                              <div className="flex items-center gap-2 mb-1">
                                <div className="w-3 h-3 bg-retro-cyan/30 rounded flex items-center justify-center">
                                  <span className="text-xs">📄</span>
                                </div>
                                <span className="text-xs font-pixel text-retro-cyan">相关帖子</span>
                              </div>
                              {notification.relatedPost.title && (
                                <h5 className="text-xs font-bold text-white mb-1 truncate">
                                  {notification.relatedPost.title}
                                </h5>
                              )}
                              <p className="text-xs text-retro-textMuted line-clamp-2">
                                {notification.relatedPost.content}
                              </p>
                            </div>
                          )}



                        </div>

                        {/* 删除按钮 */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteNotification(notification.id)
                          }}
                          className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-1 text-retro-textMuted hover:text-retro-red rounded "
                          title="删除通知"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {/* 加载更多按钮 */}
                {pagination.hasNextPage && (
                  <div className="flex justify-center py-4">
                    <button
                      onClick={loadMoreNotifications}
                      disabled={isRefreshing}
                      className="px-4 py-2 bg-retro-surface text-white rounded-lg hover:bg-retro-surface/80  disabled:opacity-50"
                    >
                      {isRefreshing ? '加载中...' : '加载更多'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        }
      </div >
    </div >
  )
}
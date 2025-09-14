'use client'

import { useState } from 'react'
import { useSocialNotifications } from '@/lib/hooks/useSocialNotifications'
import { useCurrentUser } from '@/lib/hooks/useCurrentUser'
import { Notification, NotificationType } from '@/types/notifications'
import LoadingSpinner from '@/components/LoadingSpinner'
import UserAvatar from '@/components/UserAvatar'

interface NotificationsTabProps {
  isActive?: boolean
  isMobile?: boolean
  isTablet?: boolean
  onPostClick?: (postId: string) => void // 点击通知跳转到帖子
}

export default function NotificationsTab({ 
  isActive = false,
  isMobile = false,
  isTablet = false,
  onPostClick
}: NotificationsTabProps) {
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  
  // 获取当前用户信息
  const { userId: currentUserId } = useCurrentUser()
  
  // 使用社交通知hook
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
  } = useSocialNotifications({
    userId: currentUserId || '',
    autoFetch: isActive && !!currentUserId,
    refreshInterval: isActive ? 60000 : 0, // 60秒刷新一次
    unreadOnly: filter === 'unread'
  })

  // 处理通知点击
  const handleNotificationClick = async (notification: Notification) => {
    // 如果未读，标记为已读
    if (!notification.isRead) {
      await markAsRead(notification.id)
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
      default:
        return '📮'
    }
  }

  // 获取通知颜色
  const getNotificationColor = (type: NotificationType) => {
    switch (type) {
      case NotificationType.POST_REPLY:
        return 'from-retro-blue to-retro-cyan'
      case NotificationType.POST_LIKE:
        return 'from-retro-pink to-retro-red'
      case NotificationType.SYSTEM:
        return 'from-retro-purple to-retro-pink'
      default:
        return 'from-retro-border to-retro-textMuted'
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

  const containerClasses = isMobile 
    ? "h-full flex flex-col bg-retro-bg"
    : "h-full flex flex-col bg-retro-bg"

  return (
    <div className={containerClasses}>
      {/* 头部 - 现代像素风格 */}
      <div className="flex-shrink-0 p-4 border-b-2 border-retro-border/50 bg-gradient-to-r from-retro-bg-darker/60 to-retro-bg-dark/60 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="relative w-10 h-10 bg-gradient-to-br from-retro-purple via-retro-pink to-retro-blue rounded-xl flex items-center justify-center shadow-xl border-2 border-white/20 animate-pixel-glow">
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-white/5 rounded-xl"></div>
              <svg className="relative w-5 h-5 text-white drop-shadow-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM11 17H6l5 5v-5zM12 7V2l5 5h-3.5a1.5 1.5 0 00-1.5 1.5z" />
              </svg>
              {/* 未读通知徽章 */}
              {unreadCount > 0 && (
                <div className="absolute -top-2 -right-2 w-5 h-5 bg-gradient-to-br from-retro-red to-retro-pink rounded-full flex items-center justify-center border-2 border-retro-bg-darker">
                  <span className="text-xs text-white font-bold">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                </div>
              )}
            </div>
            <div className="flex-1">
              <h3 className="text-white text-xl font-bold font-pixel tracking-wide drop-shadow-sm">Inbox</h3>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-2 h-2 bg-retro-purple rounded-full animate-pulse"></div>
                <span className="text-retro-textMuted text-xs font-retro tracking-wide">
                  {unreadCount > 0 ? `${unreadCount} 条未读` : '所有消息已读'}
                </span>
                {isRefreshing && (
                  <div className="flex items-center gap-1 ml-2">
                    <div className="w-2 h-2 bg-retro-cyan rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-retro-blue rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-retro-purple rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* 操作按钮 */}
          <div className="flex items-center space-x-3">
            {/* 过滤按钮 */}
            <div className="flex bg-retro-bg-dark/60 rounded-xl border-2 border-retro-border/40 overflow-hidden shadow-lg backdrop-blur-sm">
              <button
                onClick={() => setFilter('all')}
                className={`relative px-4 py-2 text-sm font-pixel font-medium transition-all duration-300 ${
                  filter === 'all' 
                    ? 'bg-gradient-to-r from-retro-purple to-retro-pink text-white shadow-lg' 
                    : 'text-retro-textMuted hover:text-white hover:bg-retro-purple/20'
                }`}
              >
                <span className="relative z-10">全部</span>
                {filter === 'all' && (
                  <div className="absolute inset-0 bg-gradient-to-r from-retro-purple/20 to-retro-pink/20 animate-pulse"></div>
                )}
              </button>
              <div className="w-px bg-retro-border/30"></div>
              <button
                onClick={() => setFilter('unread')}
                className={`relative px-4 py-2 text-sm font-pixel font-medium transition-all duration-300 flex items-center gap-2 ${
                  filter === 'unread' 
                    ? 'bg-gradient-to-r from-retro-purple to-retro-pink text-white shadow-lg' 
                    : 'text-retro-textMuted hover:text-white hover:bg-retro-purple/20'
                }`}
              >
                <span className="relative z-10">未读</span>
                {unreadCount > 0 && (
                  <div className="relative z-10 px-1.5 py-0.5 bg-retro-red/80 text-white text-xs rounded-full font-bold min-w-[18px] text-center">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </div>
                )}
                {filter === 'unread' && (
                  <div className="absolute inset-0 bg-gradient-to-r from-retro-purple/20 to-retro-pink/20 animate-pulse"></div>
                )}
              </button>
            </div>
            
            {/* 刷新按钮 */}
            <button
              onClick={refreshNotifications}
              disabled={isRefreshing}
              className="p-2 text-retro-cyan hover:text-retro-blue hover:bg-retro-blue/10 rounded-lg transition-all duration-200 disabled:opacity-50"
              title="刷新通知"
            >
              <svg className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : 'hover:rotate-180'} transition-transform duration-300`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            
            {/* 全部已读按钮 */}
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="group relative overflow-hidden px-4 py-2 bg-gradient-to-r from-retro-green/20 to-retro-cyan/20 hover:from-retro-green/30 hover:to-retro-cyan/30 text-retro-green hover:text-white rounded-xl border-2 border-retro-green/30 hover:border-retro-green/50 transition-all duration-300 text-sm font-pixel font-medium shadow-lg backdrop-blur-sm"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
                <div className="relative flex items-center gap-2">
                  <div className="w-4 h-4 bg-retro-green/20 rounded flex items-center justify-center">
                    <span className="text-xs">✓</span>
                  </div>
                  <span>全部已读</span>
                </div>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-hidden">
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 m-4 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <LoadingSpinner />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <div className="w-16 h-16 bg-retro-purple/20 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-retro-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM11 17H6l5 5v-5zM12 7V2l5 5h-3.5a1.5 1.5 0 00-1.5 1.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-white mb-2">
              {filter === 'unread' ? '没有未读通知' : '还没有通知'}
            </h3>
            <p className="text-retro-textMuted text-sm">
              {filter === 'unread' ? '所有通知都已查看' : '当有人回复或点赞你的帖子时，会在这里显示'}
            </p>
          </div>
        ) : (
          <div className="h-full overflow-y-auto">
            <div className="space-y-2 p-3">
              {notifications.map((notification, index) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`group relative cursor-pointer bg-gradient-to-br from-retro-bg-darker/90 to-retro-bg-dark/90 border-2 transition-all duration-300 rounded-xl overflow-hidden backdrop-blur-md shadow-lg hover:shadow-xl animate-fade-in ${
                    notification.isRead 
                      ? 'border-retro-border hover:border-retro-purple/40' 
                      : 'border-retro-blue/50 hover:border-retro-cyan/60 shadow-retro-blue/20'
                  }`}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {/* 未读指示器 */}
                  {!notification.isRead && (
                    <div className="absolute top-3 right-3 w-3 h-3 bg-gradient-to-br from-retro-blue to-retro-cyan rounded-full shadow-lg animate-pulse"></div>
                  )}
                  
                  {/* 悬停光效 */}
                  <div className="absolute inset-0 bg-gradient-to-br from-retro-purple/2 via-retro-blue/3 to-retro-pink/2 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  
                  <div className="relative p-3">
                    <div className="flex items-start space-x-3">
                      {/* 通知图标 */}
                      <div className={`flex-shrink-0 w-8 h-8 bg-gradient-to-br ${getNotificationColor(notification.type)} rounded-lg flex items-center justify-center shadow-md border border-white/30`}>
                        <span className="text-xs">
                          {getNotificationIcon(notification.type)}
                        </span>
                      </div>
                      
                      {/* 通知内容 */}
                      <div className="flex-1 min-w-0 space-y-1">
                        {/* 通知标题和时间 */}
                        <div className="flex items-start justify-between">
                          <h4 className={`font-bold font-pixel text-sm tracking-wide truncate pr-2 ${
                            notification.isRead ? 'text-retro-textMuted' : 'text-white'
                          }`}>
                            {notification.title}
                          </h4>
                          <span className="text-xs text-retro-textMuted font-retro flex-shrink-0">
                            {formatTimeAgo(notification.createdAt)}
                          </span>
                        </div>
                        
                        {/* 通知消息 */}
                        <p className={`text-sm font-retro leading-relaxed ${
                          notification.isRead ? 'text-retro-textMuted/80' : 'text-retro-text'
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
                        className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-1 text-retro-textMuted hover:text-retro-red rounded transition-all duration-200"
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
                    className="px-4 py-2 bg-retro-surface text-white rounded-lg hover:bg-retro-surface/80 transition-colors disabled:opacity-50"
                  >
                    {isRefreshing ? '加载中...' : '加载更多'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
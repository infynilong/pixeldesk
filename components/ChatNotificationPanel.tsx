'use client'

import { useState, useEffect } from 'react'
import { ChatNotification } from '../types/chat'
import NotificationBadge from './NotificationBadge'
import NotificationContextMenu from './NotificationContextMenu'

interface ChatNotificationPanelProps {
  notifications: ChatNotification[]
  onNotificationClick: (conversationId: string) => void
  onNotificationDismiss?: (notificationId: string) => void
  onMarkAllRead: () => void
  onMarkConversationRead?: (conversationId: string) => void
  onClearAll?: () => void
  isMobile?: boolean
  isTablet?: boolean
}

export default function ChatNotificationPanel({
  notifications,
  onNotificationClick,
  onNotificationDismiss,
  onMarkAllRead,
  onMarkConversationRead,
  onClearAll,
  isMobile = false,
  isTablet = false
}: ChatNotificationPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [recentNotifications, setRecentNotifications] = useState<ChatNotification[]>([])
  const [animatingNotifications, setAnimatingNotifications] = useState<Set<string>>(new Set())
  const [contextMenu, setContextMenu] = useState<{
    notification: ChatNotification | null
    position: { x: number; y: number }
    isVisible: boolean
  }>({
    notification: null,
    position: { x: 0, y: 0 },
    isVisible: false
  })

  // Update recent notifications when notifications change
  useEffect(() => {
    const newNotifications = notifications.filter(n => !n.isRead)
    setRecentNotifications(newNotifications.slice(0, 5)) // Show only 5 most recent

    // Animate new notifications
    const newIds = new Set(newNotifications.map(n => n.id))
    const existingIds = new Set(recentNotifications.map(n => n.id))
    const addedIds = Array.from(newIds).filter(id => !existingIds.has(id))
    
    if (addedIds.length > 0) {
      setAnimatingNotifications(new Set(addedIds))
      setTimeout(() => {
        setAnimatingNotifications(new Set())
      }, 1000)
    }
  }, [notifications])

  // Auto-collapse on mobile when clicking outside
  useEffect(() => {
    if (isMobile && isExpanded) {
      const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as Element
        if (!target.closest('[data-notification-panel]')) {
          setIsExpanded(false)
        }
      }

      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [isMobile, isExpanded])

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return '刚刚'
    if (diffMins < 60) return `${diffMins}分钟前`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}小时前`
    return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
  }

  const truncateContent = (content: string, maxLength: number = 30) => {
    if (content.length <= maxLength) return content
    return content.substring(0, maxLength) + '...'
  }

  const getTotalUnreadCount = () => {
    return notifications.filter(n => !n.isRead).length
  }

  const handleNotificationClick = (notification: ChatNotification) => {
    onNotificationClick(notification.conversationId)
    if (isMobile) {
      setIsExpanded(false)
    }
  }

  const handleNotificationDismiss = (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation()
    if (onNotificationDismiss) {
      onNotificationDismiss(notificationId)
    }
  }

  const handleMarkConversationRead = (e: React.MouseEvent, conversationId: string) => {
    e.stopPropagation()
    if (onMarkConversationRead) {
      onMarkConversationRead(conversationId)
    }
  }

  const handleClearAll = () => {
    if (onClearAll) {
      onClearAll()
    }
  }

  const getConversationNotifications = (conversationId: string) => {
    return notifications.filter(n => n.conversationId === conversationId)
  }

  const getUniqueConversations = () => {
    const conversationMap = new Map<string, ChatNotification[]>()
    
    notifications.forEach(notification => {
      if (!conversationMap.has(notification.conversationId)) {
        conversationMap.set(notification.conversationId, [])
      }
      conversationMap.get(notification.conversationId)!.push(notification)
    })
    
    return Array.from(conversationMap.entries()).map(([conversationId, notifs]) => ({
      conversationId,
      notifications: notifs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
      latestNotification: notifs[0],
      count: notifs.length
    }))
  }

  const handleContextMenu = (e: React.MouseEvent, notification: ChatNotification) => {
    e.preventDefault()
    setContextMenu({
      notification,
      position: { x: e.clientX, y: e.clientY },
      isVisible: true
    })
  }

  const closeContextMenu = () => {
    setContextMenu(prev => ({ ...prev, isVisible: false }))
  }

  const getNotificationPanelClasses = () => {
    if (isMobile) {
      return {
        container: 'relative',
        panel: isExpanded 
          ? 'absolute top-12 right-0 w-80 max-h-96 bg-retro-bg-darker border border-retro-border rounded-lg shadow-2xl z-50'
          : 'hidden',
        button: 'relative p-3 bg-retro-bg-darker border border-retro-border rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105'
      }
    } else if (isTablet) {
      return {
        container: 'relative',
        panel: isExpanded 
          ? 'absolute top-12 right-0 w-72 max-h-80 bg-retro-bg-darker border border-retro-border rounded-lg shadow-2xl z-50'
          : 'hidden',
        button: 'relative p-2 bg-retro-bg-darker border border-retro-border rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105'
      }
    } else {
      return {
        container: 'relative',
        panel: isExpanded 
          ? 'absolute top-12 right-0 w-80 max-h-96 bg-retro-bg-darker border border-retro-border rounded-lg shadow-2xl z-50'
          : 'hidden',
        button: 'relative p-2 bg-retro-bg-darker border border-retro-border rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105'
      }
    }
  }

  const panelClasses = getNotificationPanelClasses()

  if (getTotalUnreadCount() === 0 && !isExpanded) {
    return null
  }

  return (
    <div className={panelClasses.container} data-notification-panel>
      {/* Notification Toggle Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={panelClasses.button}
        title="聊天通知"
      >
        <div className="flex items-center space-x-2">
          <div className="relative">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            
            {/* Unread count badge */}
            <NotificationBadge
              count={getTotalUnreadCount()}
              variant="glow"
              position="top-right"
              animate={true}
            />
          </div>
          
          {!isMobile && (
            <span className="text-white text-sm font-medium">
              {getTotalUnreadCount() > 0 ? `${getTotalUnreadCount()} 条新消息` : '消息'}
            </span>
          )}
        </div>
      </button>

      {/* Notification Panel */}
      <div className={`${panelClasses.panel} animate-slide-in-right`}>
        {/* Panel Header */}
        <div className="p-4 border-b border-retro-border bg-gradient-to-r from-retro-purple/10 to-retro-pink/10 rounded-t-lg">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-semibold flex items-center space-x-2">
              <span>💬</span>
              <span>聊天通知</span>
              {getTotalUnreadCount() > 0 && (
                <span className="bg-retro-pink text-white text-xs rounded-full px-2 py-1">
                  {getTotalUnreadCount()}
                </span>
              )}
            </h3>
            
            <div className="flex items-center space-x-2">
              {getTotalUnreadCount() > 0 && (
                <>
                  <button
                    onClick={onMarkAllRead}
                    className="text-retro-textMuted hover:text-white text-xs transition-colors px-2 py-1 rounded hover:bg-retro-border/20"
                    title="全部标记为已读"
                  >
                    全部已读
                  </button>
                  {onClearAll && (
                    <button
                      onClick={handleClearAll}
                      className="text-retro-textMuted hover:text-red-400 text-xs transition-colors px-2 py-1 rounded hover:bg-red-500/10"
                      title="清空所有通知"
                    >
                      清空
                    </button>
                  )}
                </>
              )}
              <button
                onClick={() => setIsExpanded(false)}
                className="text-retro-textMuted hover:text-white transition-colors p-1 rounded hover:bg-retro-border/20"
                title="关闭"
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        {/* Notifications List */}
        <div className="max-h-80 overflow-y-auto">
          {recentNotifications.length === 0 ? (
            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-retro-border/30 rounded-full flex items-center justify-center mx-auto mb-3">
                🔔
              </div>
              <p className="text-retro-textMuted text-sm">暂无新通知</p>
              <p className="text-retro-textMuted text-xs mt-1">新消息会在这里显示</p>
            </div>
          ) : (
            <div className="p-2">
              {getUniqueConversations().slice(0, 5).map((conversation) => (
                <div
                  key={conversation.conversationId}
                  className={`relative p-3 hover:bg-retro-border/20 rounded-lg transition-all duration-300 mb-2 group ${
                    animatingNotifications.has(conversation.latestNotification.id) ? 'animate-slide-in-right bg-retro-purple/20' : ''
                  }`}
                >
                  <div 
                    className="flex items-start space-x-3 cursor-pointer"
                    onClick={() => handleNotificationClick(conversation.latestNotification)}
                    onContextMenu={(e) => handleContextMenu(e, conversation.latestNotification)}
                  >
                    {/* Sender Avatar */}
                    <div className="w-10 h-10 bg-gradient-to-r from-retro-purple to-retro-pink rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-medium text-sm">
                        {conversation.latestNotification.senderName?.charAt(0)?.toUpperCase() || '?'}
                      </span>
                    </div>

                    {/* Notification Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-white font-medium text-sm truncate">
                          {conversation.latestNotification.senderName}
                        </p>
                        <div className="flex items-center space-x-2">
                          {conversation.count > 1 && (
                            <NotificationBadge
                              count={conversation.count}
                              size="sm"
                              variant="default"
                              position="inline"
                            />
                          )}
                          <span className="text-retro-textMuted text-xs flex-shrink-0">
                            {formatTimestamp(conversation.latestNotification.timestamp)}
                          </span>
                        </div>
                      </div>
                      
                      <p className="text-retro-text text-sm leading-relaxed">
                        {truncateContent(conversation.latestNotification.content)}
                      </p>
                      
                      {/* Action buttons */}
                      <div className="flex items-center justify-between mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-retro-textMuted text-xs">点击查看对话</span>
                        <div className="flex items-center space-x-1">
                          {onMarkConversationRead && (
                            <button
                              onClick={(e) => handleMarkConversationRead(e, conversation.conversationId)}
                              className="text-retro-textMuted hover:text-retro-green text-xs px-2 py-1 rounded hover:bg-retro-green/10 transition-colors"
                              title="标记此对话为已读"
                            >
                              ✓
                            </button>
                          )}
                          {onNotificationDismiss && (
                            <button
                              onClick={(e) => handleNotificationDismiss(e, conversation.latestNotification.id)}
                              className="text-retro-textMuted hover:text-retro-red text-xs px-2 py-1 rounded hover:bg-retro-red/10 transition-colors"
                              title="忽略此通知"
                            >
                              ✕
                            </button>
                          )}
                          <svg className="w-4 h-4 text-retro-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* New notification indicator */}
                    {animatingNotifications.has(conversation.latestNotification.id) && (
                      <div className="w-2 h-2 bg-retro-pink rounded-full animate-pulse flex-shrink-0"></div>
                    )}
                  </div>
                </div>
              ))}
              
              {/* Show more indicator */}
              {getUniqueConversations().length > 5 && (
                <div className="text-center py-2">
                  <button
                    onClick={() => {
                      // Could implement a "show all" functionality here
                      console.log('Show all notifications')
                    }}
                    className="text-retro-textMuted hover:text-white text-xs transition-colors"
                  >
                    还有 {getUniqueConversations().length - 5} 个对话有新消息...
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Panel Footer */}
        {recentNotifications.length > 0 && (
          <div className="p-3 border-t border-retro-border bg-retro-border/10 rounded-b-lg">
            <div className="flex items-center justify-between text-xs text-retro-textMuted">
              <span>最近通知</span>
              <span>点击查看对话</span>
            </div>
          </div>
        )}
      </div>

      {/* Context Menu */}
      <NotificationContextMenu
        notification={contextMenu.notification}
        position={contextMenu.position}
        isVisible={contextMenu.isVisible}
        onClose={closeContextMenu}
        onMarkAsRead={(notificationId) => {
          if (onNotificationDismiss) {
            onNotificationDismiss(notificationId)
          }
        }}
        onDismiss={onNotificationDismiss}
        onOpenConversation={onNotificationClick}
        onMarkConversationAsRead={onMarkConversationRead}
        onMuteConversation={(conversationId) => {
          // Could implement mute functionality here
          console.log('Mute conversation:', conversationId)
        }}
      />

      {/* Floating notification toasts for new messages */}
      {recentNotifications.slice(0, 3).map((notification, index) => 
        animatingNotifications.has(notification.id) && (
          <div
            key={`toast-${notification.id}`}
            className="fixed top-20 right-4 bg-gradient-to-r from-retro-purple/90 to-retro-pink/90 backdrop-blur-sm text-white p-3 rounded-lg shadow-2xl animate-slide-in-right z-[70] max-w-sm"
            style={{ 
              top: `${80 + index * 70}px`,
              animationDelay: `${index * 100}ms`
            }}
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white font-medium text-xs">
                  {notification.senderName?.charAt(0)?.toUpperCase() || '?'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {notification.senderName}
                </p>
                <p className="text-white/80 text-xs truncate">
                  {truncateContent(notification.content, 25)}
                </p>
              </div>
              <button
                onClick={() => handleNotificationClick(notification)}
                className="text-white/80 hover:text-white transition-colors flex-shrink-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )
      )}
    </div>
  )
}
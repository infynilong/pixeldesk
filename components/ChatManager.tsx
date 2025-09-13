'use client'

import { useState, useEffect, useCallback } from 'react'
import { EventBus } from '../lib/eventBus'
import { useChatEvents } from '../lib/hooks/useChatEvents'
import { useNotifications } from '../lib/hooks/useNotifications'
import { useNotificationKeyboard } from '../lib/hooks/useNotificationKeyboard'
import { ChatConversation, ChatMessage, ChatNotification } from '../types/chat'
import ConversationWindow from './ConversationWindow'
import ChatNotificationPanel from './ChatNotificationPanel'
import NotificationContainer from './NotificationContainer'
import UserAvatar from './UserAvatar'
import { getCachedConversations, cacheConversations } from '../lib/cacheUtils'

interface ChatManagerProps {
  currentUserId: string
  isVisible: boolean
  onToggle: () => void
  className?: string
  isMobile?: boolean
  isTablet?: boolean
}

interface WindowPosition {
  x: number
  y: number
  zIndex: number
}

interface ConversationWindowState {
  conversation: ChatConversation
  position: WindowPosition
  isMinimized: boolean
  isActive: boolean
}

export default function ChatManager({
  currentUserId,
  isVisible,
  onToggle,
  className = '',
  isMobile = false,
  isTablet = false
}: ChatManagerProps) {
  const [conversations, setConversations] = useState<ChatConversation[]>([])
  const [openWindows, setOpenWindows] = useState<Map<string, ConversationWindowState>>(new Map())
  const [isLoading, setIsLoading] = useState(false)
  const [nextWindowPosition, setNextWindowPosition] = useState({ x: 100, y: 100 })
  const [highestZIndex, setHighestZIndex] = useState(1000)

  // Use the new notification management system
  const {
    notifications,
    unreadCount,
    addNotification,
    markConversationAsRead,
    markAllAsRead,
    removeNotifications,
    clearAll,
    getUnreadNotifications,
    getConversationUnreadCount
  } = useNotifications({
    autoSync: true,
    syncInterval: 30000
  })

  // Load conversations on mount
  useEffect(() => {
    if (isVisible) {
      loadConversations()
    }
  }, [isVisible, currentUserId])

  // Chat events integration using the new hook
  const { emitConversationOpened, isConnected } = useChatEvents({
    onMessageReceived: (event) => {
      handleNewMessage(event.message, event.conversationId)
    },
    onConversationUpdated: (event) => {
      // Ensure conversation has all required fields
      const conversation: ChatConversation = {
        ...event.conversation,
        createdAt: event.conversation.createdAt || new Date().toISOString()
      }
      updateConversation(conversation)
    },
    onNotificationNew: (event) => {
      // Add notification using the notification manager
      // Create a proper ChatMessage object from the event data
      const chatMessage: ChatMessage = {
        ...event.latestMessage,
        type: 'text', // Default to text type
        status: 'delivered', // Default status for notifications
        createdAt: event.latestMessage.timestamp,
        updatedAt: event.latestMessage.timestamp,
        senderAvatar: undefined // Can be populated if available
      }
      addNotification(chatMessage, event.latestMessage.conversationId)
    },
    onConnectionStatus: (event) => {
      console.log('[ChatManager] Connection status:', event.isConnected ? 'Connected' : 'Disconnected')
    }
  })

  // Event bus listeners for player interactions
  useEffect(() => {
    const handlePlayerClick = (event: any) => {
      if (event.targetPlayer && event.targetPlayer.id !== currentUserId) {
        openConversationWithPlayer(event.targetPlayer)
      }
    }

    EventBus.on('player:click', handlePlayerClick)

    return () => {
      EventBus.off('player:click', handlePlayerClick)
    }
  }, [currentUserId, emitConversationOpened])

  const loadConversations = async () => {
    setIsLoading(true)
    
    // First try to load from cache
    const cachedConversations = getCachedConversations(currentUserId)
    if (cachedConversations && cachedConversations.length > 0) {
      setConversations(cachedConversations)
    }
    
    try {
      // Then fetch from API to get latest conversations
      const response = await fetch(`/api/chat/conversations?userId=${currentUserId}`)
      if (response.ok) {
        const data = await response.json()
        const apiConversations = data.conversations || []
        
        // Use API conversations (they are always more up-to-date)
        setConversations(apiConversations)
        
        // Cache the conversations
        cacheConversations(currentUserId, apiConversations)
      }
    } catch (error) {
      console.error('Failed to load conversations:', error)
      // If API fails, we still have cached conversations
      if (!cachedConversations || cachedConversations.length === 0) {
        setConversations([])
      }
    } finally {
      setIsLoading(false)
    }
  }



  const openConversationWithPlayer = async (player: any) => {
    // Check if conversation already exists
    const existingConversation = conversations.find(conv => 
      conv.type === 'private' && 
      conv.participants.some(p => p.userId === player.id)
    )

    if (existingConversation) {
      openConversationWindow(existingConversation)
    } else {
      // Create new conversation
      try {
        const response = await fetch('/api/chat/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            participantIds: [player.id],
            type: 'private'
          })
        })

        if (response.ok) {
          const data = await response.json()
          const newConversation = data.conversation
          setConversations(prev => [...prev, newConversation])
          openConversationWindow(newConversation)
        }
      } catch (error) {
        console.error('Failed to create conversation:', error)
      }
    }
  }

  const openConversationWindow = (conversation: ChatConversation) => {
    const existingWindow = openWindows.get(conversation.id)
    
    if (existingWindow) {
      // Bring existing window to front and unminimize
      const newZIndex = highestZIndex + 1
      setHighestZIndex(newZIndex)
      
      setOpenWindows(prev => {
        const updated = new Map(prev)
        updated.set(conversation.id, {
          ...existingWindow,
          isMinimized: false,
          isActive: true,
          position: { ...existingWindow.position, zIndex: newZIndex }
        })
        return updated
      })
    } else {
      // Create new window
      const newZIndex = highestZIndex + 1
      setHighestZIndex(newZIndex)
      
      const windowState: ConversationWindowState = {
        conversation,
        position: {
          x: nextWindowPosition.x,
          y: nextWindowPosition.y,
          zIndex: newZIndex
        },
        isMinimized: false,
        isActive: true
      }

      setOpenWindows(prev => new Map(prev).set(conversation.id, windowState))
      
      // Update next window position (cascade effect)
      setNextWindowPosition(prev => ({
        x: prev.x + 30,
        y: prev.y + 30
      }))
    }

    // Mark notifications as read for this conversation
    markConversationAsRead(conversation.id).catch(error => {
      console.error('Failed to mark conversation notifications as read:', error)
    })
  }

  const closeConversationWindow = (conversationId: string) => {
    setOpenWindows(prev => {
      const updated = new Map(prev)
      updated.delete(conversationId)
      return updated
    })
  }

  const minimizeConversationWindow = (conversationId: string) => {
    setOpenWindows(prev => {
      const updated = new Map(prev)
      const window = updated.get(conversationId)
      if (window) {
        updated.set(conversationId, { ...window, isMinimized: true, isActive: false })
      }
      return updated
    })
  }

  const handleNewMessage = (message: ChatMessage, conversationId: string) => {
    // Update conversation with new message
    setConversations(prev => prev.map(conv => {
      if (conv.id === conversationId) {
        return {
          ...conv,
          lastMessage: message,
          unreadCount: conv.unreadCount + 1,
          updatedAt: message.createdAt
        }
      }
      return conv
    }))

    // Add notification if window is not active
    const window = openWindows.get(conversationId)
    if (!window || window.isMinimized || !window.isActive) {
      addNotification(message, conversationId)
    }

    // Emit notification event
    EventBus.emit('chat:notification:new', {
      count: unreadCount + 1,
      latestMessage: message
    })
  }

  const updateConversation = (updatedConversation: ChatConversation) => {
    setConversations(prev => prev.map(conv => 
      conv.id === updatedConversation.id ? updatedConversation : conv
    ))

    // Update open window if exists
    setOpenWindows(prev => {
      const updated = new Map(prev)
      const window = updated.get(updatedConversation.id)
      if (window) {
        updated.set(updatedConversation.id, {
          ...window,
          conversation: updatedConversation
        })
      }
      return updated
    })
  }

  const markConversationNotificationsAsRead = async (conversationId: string) => {
    try {
      await markConversationAsRead(conversationId)
      
      // Update conversation unread count
      setConversations(prev => prev.map(conv => 
        conv.id === conversationId ? { ...conv, unreadCount: 0 } : conv
      ))
    } catch (error) {
      console.error('Failed to mark conversation notifications as read:', error)
    }
  }

  const handleNotificationClick = (notification: any) => {
    const conversationId = typeof notification === 'string' ? notification : notification.conversationId
    const conversation = conversations.find(conv => conv.id === conversationId)
    if (conversation) {
      openConversationWindow(conversation)
    }
  }

  const handleMarkAllNotificationsRead = async () => {
    try {
      await markAllAsRead()
      setConversations(prev => prev.map(conv => ({ ...conv, unreadCount: 0 })))
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error)
    }
  }

  const handleNotificationDismiss = (notificationId: string) => {
    removeNotifications([notificationId])
  }

  const handleMarkConversationRead = async (conversationId: string) => {
    try {
      await markConversationAsRead(conversationId)
      setConversations(prev => prev.map(conv => 
        conv.id === conversationId ? { ...conv, unreadCount: 0 } : conv
      ))
    } catch (error) {
      console.error('Failed to mark conversation as read:', error)
    }
  }

  const handleClearAllNotifications = () => {
    clearAll()
    setConversations(prev => prev.map(conv => ({ ...conv, unreadCount: 0 })))
  }

  const handleOpenLatestNotification = () => {
    const unreadNotifications = getUnreadNotifications()
    if (unreadNotifications.length > 0) {
      const latest = unreadNotifications[0]
      handleNotificationClick(latest)
    }
  }

  // Set up keyboard shortcuts for notifications
  const { shortcuts } = useNotificationKeyboard({
    enabled: isVisible,
    handlers: {
      onMarkAllRead: handleMarkAllNotificationsRead,
      onClearAll: handleClearAllNotifications,
      onTogglePanel: onToggle,
      onOpenLatest: handleOpenLatestNotification
    }
  })

  const getTotalUnreadCount = () => {
    return conversations.reduce((total, conv) => total + conv.unreadCount, 0)
  }

  const getConversationList = () => {
    return conversations
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 10) // Show only recent conversations
  }

  if (!isVisible) return null

  return (
    <div className={`fixed inset-0 z-50 ${className}`}>
      {/* Notification Toasts */}
      <NotificationContainer
        notifications={getUnreadNotifications()}
        onNotificationClick={handleNotificationClick}
        maxToasts={3}
        position="top-right"
        enableSound={true}
        toastDuration={5000}
      />

      {/* Chat Notification Panel */}
      <div className="absolute top-4 right-4 z-[60]">
        <ChatNotificationPanel
          notifications={getUnreadNotifications()}
          onNotificationClick={handleNotificationClick}
          onNotificationDismiss={handleNotificationDismiss}
          onMarkAllRead={handleMarkAllNotificationsRead}
          onMarkConversationRead={handleMarkConversationRead}
          onClearAll={handleClearAllNotifications}
          isMobile={isMobile}
          isTablet={isTablet}
        />
      </div>

      {/* Conversation List Panel (for mobile/tablet) */}
      {(isMobile || isTablet) && (
        <div className="absolute top-4 left-4 w-80 max-h-96 bg-retro-bg-darker border border-retro-border rounded-lg shadow-lg z-[55]">
          <div className="p-4 border-b border-retro-border">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold">聊天列表</h3>
              <button
                onClick={onToggle}
                className="text-retro-textMuted hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
          </div>
          
          <div className="max-h-80 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <div className="w-2 h-2 bg-retro-purple rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-retro-pink rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-retro-blue rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
                <p className="text-retro-textMuted text-sm">加载对话中...</p>
              </div>
            ) : getConversationList().length === 0 ? (
              <div className="p-4 text-center">
                <div className="w-12 h-12 bg-retro-border/30 rounded-full flex items-center justify-center mx-auto mb-3">
                  💬
                </div>
                <p className="text-retro-textMuted text-sm">暂无对话</p>
                <p className="text-retro-textMuted text-xs mt-1">点击其他玩家开始聊天</p>
              </div>
            ) : (
              <div className="p-2">
                {getConversationList().map(conversation => {
                  const otherParticipant = conversation.participants.find(p => p.userId !== currentUserId)
                  return (
                    <button
                      key={conversation.id}
                      onClick={() => openConversationWindow(conversation)}
                      className="w-full p-3 text-left hover:bg-retro-border/20 rounded-lg transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <UserAvatar
                          userId={otherParticipant?.userId || ''}
                          userName={conversation.name || otherParticipant?.userName || '未知用户'}
                          userAvatar={otherParticipant?.userAvatar}
                          size="md"
                          showStatus={false} // We'll add online status fetching later if needed
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-white font-medium text-sm truncate">
                              {conversation.name || otherParticipant?.userName || '未知用户'}
                            </p>
                            {conversation.unreadCount > 0 && (
                              <span className="bg-retro-pink text-white text-xs rounded-full px-2 py-1 ml-2">
                                {conversation.unreadCount}
                              </span>
                            )}
                          </div>
                          {conversation.lastMessage && (
                            <p className="text-retro-textMuted text-xs truncate mt-1">
                              {conversation.lastMessage.content}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Conversation Windows */}
      {Array.from(openWindows.entries()).map(([conversationId, windowState]) => (
        <ConversationWindow
          key={conversationId}
          conversation={windowState.conversation}
          currentUserId={currentUserId}
          position={windowState.position}
          isMinimized={windowState.isMinimized}
          isActive={windowState.isActive}
          onClose={() => closeConversationWindow(conversationId)}
          onMinimize={() => minimizeConversationWindow(conversationId)}
          onFocus={() => {
            const newZIndex = highestZIndex + 1
            setHighestZIndex(newZIndex)
            setOpenWindows(prev => {
              const updated = new Map(prev)
              const window = updated.get(conversationId)
              if (window) {
                updated.set(conversationId, {
                  ...window,
                  isActive: true,
                  position: { ...window.position, zIndex: newZIndex }
                })
              }
              return updated
            })
            markConversationNotificationsAsRead(conversationId)
          }}
          isMobile={isMobile}
          isTablet={isTablet}
        />
      ))}

      {/* Background overlay for mobile */}
      {(isMobile || isTablet) && (
        <div 
          className="absolute inset-0 bg-black/50 backdrop-blur-sm z-[50]"
          onClick={onToggle}
        />
      )}
    </div>
  )
}
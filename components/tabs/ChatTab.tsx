'use client'

import { useState, useEffect } from 'react'
import { EventBus } from '../../lib/eventBus'
import ChatManager from '../ChatManager'
import { useUser } from '../../contexts/UserContext'

interface ChatTabProps {
  isActive?: boolean
  isMobile?: boolean
  isTablet?: boolean
}

export default function ChatTab({ 
  isActive = false, 
  isMobile = false, 
  isTablet = false 
}: ChatTabProps) {
  const { user, isLoading } = useUser()
  const [unreadCount, setUnreadCount] = useState(0)
  const [isVisible, setIsVisible] = useState(true)

  // Listen for chat events to update unread count
  useEffect(() => {
    const handleNewNotification = (event: any) => {
      if (!isActive) {
        setUnreadCount(prev => prev + event.count)
      }
    }

    const handleConversationOpened = () => {
      // Reset unread count when chat is opened
      setUnreadCount(0)
    }

    EventBus.on('chat:notification:new', handleNewNotification)
    EventBus.on('chat:conversation:opened', handleConversationOpened)

    return () => {
      EventBus.off('chat:notification:new', handleNewNotification)
      EventBus.off('chat:conversation:opened', handleConversationOpened)
    }
  }, [isActive])

  // Reset unread count when tab becomes active
  useEffect(() => {
    if (isActive) {
      setUnreadCount(0)
    }
  }, [isActive])

  return (
    <div className="h-full flex flex-col bg-retro-bg-darker">
      {/* Chat Header */}
      <div className="p-4 border-b border-retro-border bg-gradient-to-r from-retro-purple/10 to-retro-pink/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-retro-purple to-retro-pink rounded-full flex items-center justify-center">
              <span className="text-white text-lg">💬</span>
            </div>
            <div>
              <h3 className="text-white font-semibold">聊天</h3>
              <p className="text-retro-textMuted text-sm">与其他玩家交流</p>
            </div>
          </div>
          
          {/* Unread count badge */}
          {unreadCount > 0 && (
            <div className="bg-gradient-to-r from-retro-pink to-retro-purple text-white text-xs rounded-full px-2 py-1 font-medium">
              {unreadCount > 99 ? '99+' : unreadCount}
            </div>
          )}
        </div>
      </div>

      {/* Chat Content */}
      <div className="flex-1 relative">
        {!isLoading && user && (
          <ChatManager 
            currentUserId={user.id}
            isVisible={isVisible}
            onToggle={() => setIsVisible(!isVisible)}
          />
        )}
        {!isLoading && !user && (
          <div className="flex items-center justify-center h-full text-retro-textMuted">
            <p>请先登录以使用聊天功能</p>
          </div>
        )}
      </div>

      {/* Chat Status */}
      <div className="p-3 border-t border-retro-border bg-retro-bg-dark/50">
        <div className="flex items-center justify-between text-xs text-retro-textMuted">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span>在线聊天</span>
          </div>
          <span>点击玩家开始对话</span>
        </div>
      </div>
    </div>
  )
}
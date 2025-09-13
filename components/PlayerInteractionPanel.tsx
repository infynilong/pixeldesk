'use client'

import { useState, useRef, useEffect, FormEvent } from 'react'
import { EventBus } from '../lib/eventBus'
import { chatEventBridge } from '../lib/chatEventBridge'

interface PlayerData {
  id: string
  name: string
  avatar?: string
  currentStatus?: StatusData
  isOnline: boolean
  lastSeen?: string
}

interface StatusData {
  type: string
  status: string
  emoji?: string
  message?: string
  timestamp: string
}

interface ChatMessage {
  id: string
  senderId: string
  receiverId: string
  content: string
  timestamp: string
  type: 'text' | 'emoji' | 'system'
  status?: 'sending' | 'sent' | 'delivered' | 'failed'
}

interface SocialAction {
  id: string
  type: 'follow' | 'unfollow' | 'block' | 'report' | 'invite'
  targetUserId: string
  timestamp: string
  status: 'pending' | 'completed' | 'failed'
}

interface PlayerInteractionPanelProps {
  player: PlayerData
  onSendMessage?: (message: string) => void
  onFollow?: (playerId: string) => void
  onViewProfile?: (playerId: string) => void
  onStartChat?: (playerId: string) => void
  className?: string
  isMobile?: boolean
  isTablet?: boolean
}

export default function PlayerInteractionPanel({
  player,
  onSendMessage,
  onFollow,
  onViewProfile,
  onStartChat,
  className = '',
  isMobile = false,
  isTablet = false
}: PlayerInteractionPanelProps) {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isPlayerLoading, setIsPlayerLoading] = useState(true)
  const [actionFeedback, setActionFeedback] = useState<{type: string, message: string} | null>(null)
  const [messageSendingId, setMessageSendingId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const currentPlayerIdRef = useRef<string | null>(null)

  // Player loading and message initialization - optimized for stability
  useEffect(() => {
    // Only trigger loading if player actually changed
    if (!player?.id) {
      currentPlayerIdRef.current = null
      setIsPlayerLoading(false)
      setChatMessages([])
      return
    }

    const currentPlayerId = player.id
    
    // Check if this is the same player as before
    if (currentPlayerIdRef.current === currentPlayerId) {
      console.log('[PlayerInteractionPanel] Same player, skipping reload for:', player.name)
      setIsPlayerLoading(false)
      return
    }

    // Check if we should load new player based on existing messages
    const shouldLoadNewPlayer = chatMessages.length === 0 || 
      (chatMessages.length > 0 && !chatMessages.some(msg => 
        msg.senderId === currentPlayerId || msg.receiverId === currentPlayerId
      ))

    if (!shouldLoadNewPlayer && currentPlayerIdRef.current !== null) {
      console.log('[PlayerInteractionPanel] Player messages already exist, skipping reload for:', player.name)
      currentPlayerIdRef.current = currentPlayerId
      setIsPlayerLoading(false)
      return
    }

    console.log('[PlayerInteractionPanel] Loading new player:', player.name)
    currentPlayerIdRef.current = currentPlayerId
    setIsPlayerLoading(true)
    
    // Simulate loading delay for player information
    const loadingTimer = setTimeout(() => {
      // Double-check the player hasn't changed during the loading time
      if (currentPlayerIdRef.current !== currentPlayerId) {
        console.log('[PlayerInteractionPanel] Player changed during loading, aborting')
        return
      }

      const mockMessages: ChatMessage[] = [
        {
          id: `${currentPlayerId}-1`,
          senderId: currentPlayerId,
          receiverId: 'current-user',
          content: '你好！很高兴遇到你',
          timestamp: new Date(Date.now() - 300000).toISOString(),
          type: 'text'
        },
        {
          id: `${currentPlayerId}-2`,
          senderId: 'current-user',
          receiverId: currentPlayerId,
          content: '你好！我也很高兴认识你',
          timestamp: new Date(Date.now() - 240000).toISOString(),
          type: 'text'
        }
      ]
      setChatMessages(mockMessages)
      setIsPlayerLoading(false)
    }, 800)

    return () => clearTimeout(loadingTimer)
  }, [player?.id, player?.name])

  // Clear action feedback after delay
  useEffect(() => {
    if (actionFeedback) {
      const timer = setTimeout(() => {
        setActionFeedback(null)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [actionFeedback])

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  // Listen for incoming messages via EventBus
  useEffect(() => {
    const handleMessageReceived = (event: any) => {
      if (event.message && event.message.senderId === player.id) {
        // Add the received message to the chat
        setChatMessages(prev => [...prev, {
          id: event.message.id,
          senderId: event.message.senderId,
          receiverId: 'current-user',
          content: event.message.content,
          timestamp: event.message.timestamp,
          type: event.message.type as any,
          status: 'sent'
        }])
      }
    }

    EventBus.on('chat:message:received', handleMessageReceived)

    return () => {
      EventBus.off('chat:message:received', handleMessageReceived)
    }
  }, [player.id])

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || isLoading) return

    setIsLoading(true)
    
    const message: ChatMessage = {
      id: Date.now().toString(),
      senderId: 'current-user',
      receiverId: player.id,
      content: newMessage.trim(),
      timestamp: new Date().toISOString(),
      type: 'text',
      status: 'sending'
    }

    // Set sending feedback
    setMessageSendingId(message.id)
    setActionFeedback({ type: 'info', message: '正在发送消息...' })

    // Add message to local state
    setChatMessages(prev => [...prev, message])
    setNewMessage('')

    // Call external handler if provided
    if (onSendMessage) {
      try {
        onSendMessage(message.content)
        // Update message status to sent
        setChatMessages(prev => prev.map(msg => 
          msg.id === message.id ? { ...msg, status: 'sent' } : msg
        ))
        setActionFeedback({ type: 'success', message: '消息发送成功！' })
      } catch (error) {
        console.error('Failed to send message:', error)
        setChatMessages(prev => prev.map(msg => 
          msg.id === message.id ? { ...msg, status: 'failed' } : msg
        ))
        // Show more specific error message if available
        const errorMessage = error instanceof Error ? error.message : '消息发送失败，请重试'
        setActionFeedback({ type: 'error', message: errorMessage })
      }
    } else {
      // Simulate successful send
      setTimeout(() => {
        setChatMessages(prev => prev.map(msg => 
          msg.id === message.id ? { ...msg, status: 'sent' } : msg
        ))
        setActionFeedback({ type: 'success', message: '消息发送成功！' })
      }, 1000)
    }

    setIsLoading(false)
    setMessageSendingId(null)
  }

  const handleFollow = () => {
    setActionFeedback({ type: 'info', message: '正在关注用户...' })
    
    if (onFollow) {
      onFollow(player.id)
    }
    
    // Simulate success feedback
    setTimeout(() => {
      setActionFeedback({ type: 'success', message: `已关注 ${player.name}！` })
    }, 800)
  }

  const handleViewProfile = () => {
    setActionFeedback({ type: 'info', message: '正在加载用户详情...' })
    
    if (onViewProfile) {
      onViewProfile(player.id)
    }
    
    // Simulate success feedback
    setTimeout(() => {
      setActionFeedback({ type: 'success', message: '用户详情已打开' })
    }, 600)
  }

  const handleStartChat = () => {
    setActionFeedback({ type: 'info', message: '正在打开聊天窗口...' })
    
    // Emit conversation opened event through EventBus
    if (chatEventBridge.initialized && player.currentStatus) {
      chatEventBridge.emitConversationOpened('temp-conversation-id', player as any)
    }
    
    // Call external handler if provided
    if (onStartChat) {
      onStartChat(player.id)
    }
    
    // Emit EventBus event for chat conversation opening
    EventBus.emit('chat:conversation:opened', {
      type: 'chat:conversation:opened',
      timestamp: Date.now(),
      conversationId: `conversation-${player.id}`,
      participant: player
    })
    
    // Success feedback
    setTimeout(() => {
      setActionFeedback({ type: 'success', message: `已打开与 ${player.name} 的聊天` })
    }, 600)
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return '刚刚'
    if (diffMins < 60) return `${diffMins}分钟前`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}小时前`
    return date.toLocaleDateString()
  }

  const getStatusBadgeColor = (type: string) => {
    const colors: Record<string, string> = {
      working: 'from-blue-500 to-cyan-500',
      break: 'from-green-500 to-emerald-500',
      meeting: 'from-red-500 to-pink-500',
      lunch: 'from-orange-500 to-yellow-500',
      restroom: 'from-purple-500 to-indigo-500',
      reading: 'from-violet-500 to-purple-500'
    }
    return colors[type] || 'from-gray-500 to-gray-600'
  }

  return (
    <div className={`h-full flex flex-col bg-retro-bg-darker ${className} relative`}>
      {/* Action Feedback Toast */}
      {actionFeedback && (
        <div className="absolute top-4 right-4 z-50 animate-slide-in-right">
          <div className={`px-4 py-2 rounded-lg shadow-lg backdrop-blur-sm border ${
            actionFeedback.type === 'success' ? 'bg-green-500/20 border-green-500/50 text-green-300' :
            actionFeedback.type === 'error' ? 'bg-red-500/20 border-red-500/50 text-red-300' :
            'bg-blue-500/20 border-blue-500/50 text-blue-300'
          }`}>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                actionFeedback.type === 'success' ? 'bg-green-400' :
                actionFeedback.type === 'error' ? 'bg-red-400' :
                'bg-blue-400 animate-pulse'
              }`}></div>
              <span className="text-sm font-medium">{actionFeedback.message}</span>
            </div>
          </div>
        </div>
      )}

      {/* Player Info Header */}
      <div className="p-6 border-b border-retro-border bg-gradient-to-r from-retro-purple/10 to-retro-pink/10 relative">
        {/* Loading overlay */}
        {isPlayerLoading && (
          <div className="absolute inset-0 bg-retro-bg-darker/80 backdrop-blur-sm flex items-center justify-center z-10">
            <div className="text-center">
              <div className="flex items-center space-x-2 mb-3">
                <div className="w-3 h-3 bg-retro-purple rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-3 h-3 bg-retro-pink rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-3 h-3 bg-retro-blue rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
              <div className="text-white text-sm font-medium">加载玩家信息</div>
              <div className="text-retro-textMuted text-xs mt-1">正在获取详细资料...</div>
            </div>
          </div>
        )}

        <div className={`flex items-center space-x-4 transition-all duration-500 ${
          isPlayerLoading ? 'opacity-30 blur-sm' : 'opacity-100 blur-0'
        }`}>
          {/* Avatar */}
          <div className="relative">
            <div className="w-16 h-16 bg-gradient-to-br from-retro-purple to-retro-pink rounded-full flex items-center justify-center shadow-lg animate-pulse-glow">
              {player.avatar ? (
                <img 
                  src={player.avatar} 
                  alt={player.name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span className="text-white font-bold text-xl">
                  {player.name?.charAt(0)?.toUpperCase() || '?'}
                </span>
              )}
            </div>
            {/* Enhanced Online Status Indicator */}
            <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-retro-bg-darker transition-all duration-300 ${
              player.isOnline ? 'bg-green-400 animate-pulse shadow-lg shadow-green-400/50' : 'bg-gray-400'
            }`}></div>
          </div>

          {/* Player Details */}
          <div className="flex-1">
            <h3 className="text-white font-semibold text-lg mb-1">
              {player.name || '未知玩家'}
            </h3>
            
            {/* Status Badge */}
            {player.currentStatus && (
              <div className={`inline-flex items-center px-3 py-1 rounded-full bg-gradient-to-r ${getStatusBadgeColor(player.currentStatus.type)} text-white text-sm font-medium mb-2`}>
                {player.currentStatus.emoji && (
                  <span className="mr-1">{player.currentStatus.emoji}</span>
                )}
                {player.currentStatus.status}
              </div>
            )}
            
            {/* Online Status */}
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                player.isOnline ? 'bg-green-400 animate-pulse' : 'bg-gray-400'
              }`}></div>
              <span className="text-retro-textMuted text-sm">
                {player.isOnline ? '在线' : `最后在线: ${player.lastSeen || '未知'}`}
              </span>
            </div>
          </div>
        </div>

        {/* Status Message */}
        {player.currentStatus?.message && (
          <div className="mt-4 p-3 bg-retro-border/30 rounded-lg">
            <p className="text-retro-text text-sm leading-relaxed">
              {player.currentStatus.message}
            </p>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="p-4 border-b border-retro-border">
        <h4 className="text-white font-medium mb-3 text-sm">快速操作</h4>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <button
            onClick={handleStartChat}
            disabled={isPlayerLoading}
            className="bg-green-500/20 hover:bg-green-500/30 text-white py-2 px-3 rounded-lg transition-all duration-300 text-xs font-medium hover:scale-105 active:scale-95 hover:shadow-lg hover:shadow-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none group"
          >
            <span className="block group-hover:animate-bounce">💬</span>
            <span>开始聊天</span>
          </button>
          <button
            onClick={handleFollow}
            disabled={isPlayerLoading}
            className="bg-retro-purple/20 hover:bg-retro-purple/30 text-white py-2 px-3 rounded-lg transition-all duration-300 text-xs font-medium hover:scale-105 active:scale-95 hover:shadow-lg hover:shadow-retro-purple/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none group"
          >
            <span className="block group-hover:animate-bounce">👥</span>
            <span>关注</span>
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleViewProfile}
            disabled={isPlayerLoading}
            className="bg-retro-pink/20 hover:bg-retro-pink/30 text-white py-2 px-3 rounded-lg transition-all duration-300 text-xs font-medium hover:scale-105 active:scale-95 hover:shadow-lg hover:shadow-retro-pink/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none group"
          >
            <span className="block group-hover:animate-bounce">👁️</span>
            <span>详情</span>
          </button>
          <button 
            disabled={isPlayerLoading}
            className="bg-blue-500/20 hover:bg-blue-500/30 text-white py-2 px-3 rounded-lg transition-all duration-300 text-xs font-medium hover:scale-105 active:scale-95 hover:shadow-lg hover:shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none group"
          >
            <span className="block group-hover:animate-bounce">🎮</span>
            <span>邀请</span>
          </button>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="p-4 border-b border-retro-border">
          <h4 className="text-white font-medium text-sm flex items-center">
            💬 快速聊天
            <div className="ml-2 w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          </h4>
        </div>
        
        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {chatMessages.length === 0 ? (
            <div className="text-center text-retro-textMuted py-8">
              <div className="w-12 h-12 bg-retro-border/30 rounded-full flex items-center justify-center mx-auto mb-3">
                💬
              </div>
              <p className="text-sm">还没有聊天记录</p>
              <p className="text-xs mt-1">发送第一条消息开始对话吧！</p>
            </div>
          ) : (
            chatMessages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.senderId === 'current-user' ? 'justify-end' : 'justify-start'} animate-slide-in-up`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-lg relative transition-all duration-300 ${
                    message.senderId === 'current-user'
                      ? 'bg-gradient-to-r from-retro-purple to-retro-pink text-white shadow-lg'
                      : 'bg-retro-border/30 text-retro-text hover:bg-retro-border/40'
                  } ${
                    message.status === 'sending' ? 'opacity-70 animate-pulse' : 'opacity-100'
                  }`}
                >
                  <p className="text-sm leading-relaxed">{message.content}</p>
                  <div className="flex items-center justify-between mt-1">
                    <p className={`text-xs ${
                      message.senderId === 'current-user' 
                        ? 'text-white/70' 
                        : 'text-retro-textMuted'
                    }`}>
                      {formatTimestamp(message.timestamp)}
                    </p>
                    
                    {/* Message status indicator */}
                    {message.senderId === 'current-user' && message.status && (
                      <div className="flex items-center space-x-1">
                        {message.status === 'sending' && (
                          <div className="w-2 h-2 bg-white/50 rounded-full animate-pulse"></div>
                        )}
                        {message.status === 'sent' && (
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        )}
                        {message.status === 'failed' && (
                          <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Sending animation overlay */}
                  {message.status === 'sending' && messageSendingId === message.id && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer rounded-lg"></div>
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="p-4 border-t border-retro-border">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="输入消息..."
              disabled={isLoading}
              className="flex-1 px-3 py-2 bg-retro-border/30 border border-retro-border rounded-lg focus:outline-none focus:ring-2 focus:ring-retro-purple focus:border-transparent text-white placeholder-retro-textMuted text-sm transition-all duration-200 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || isLoading}
              className="bg-gradient-to-r from-retro-purple to-retro-pink hover:from-retro-blue hover:to-retro-cyan text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-sm"
            >
              {isLoading ? '发送中...' : '发送'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
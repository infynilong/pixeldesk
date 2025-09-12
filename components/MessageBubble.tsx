'use client'

import { useState } from 'react'
import { ChatMessage } from '../types/chat'
import UserAvatar from './UserAvatar'

interface MessageBubbleProps {
  message: ChatMessage
  isOwn: boolean
  showAvatar: boolean
  showTimestamp: boolean
  onRetry?: () => void
}

export default function MessageBubble({
  message,
  isOwn,
  showAvatar,
  showTimestamp,
  onRetry
}: MessageBubbleProps) {
  const [showFullTimestamp, setShowFullTimestamp] = useState(false)

  const formatTimestamp = (timestamp: string, full: boolean = false) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (full) {
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    }
    
    if (diffMins < 1) return '刚刚'
    if (diffMins < 60) return `${diffMins}分钟前`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}小时前`
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const messageDate = new Date(date)
    messageDate.setHours(0, 0, 0, 0)
    
    if (messageDate.getTime() === today.getTime()) {
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    }
    
    return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
  }

  const getStatusIcon = () => {
    switch (message.status) {
      case 'sending':
        return (
          <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin"></div>
        )
      case 'sent':
        return (
          <div className="w-3 h-3 bg-white/70 rounded-full flex items-center justify-center">
            <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        )
      case 'delivered':
        return (
          <div className="w-3 h-3 bg-retro-blue rounded-full flex items-center justify-center">
            <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        )
      case 'read':
        return (
          <div className="w-3 h-3 bg-retro-green rounded-full flex items-center justify-center">
            <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        )
      case 'failed':
        return (
          <div className="w-3 h-3 bg-retro-red rounded-full flex items-center justify-center">
            <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
        )
      default:
        return null
    }
  }

  const getMessageTypeIcon = () => {
    switch (message.type) {
      case 'emoji':
        return '😊'
      case 'system':
        return '🔔'
      case 'image':
        return '🖼️'
      default:
        return null
    }
  }

  const renderMessageContent = () => {
    switch (message.type) {
      case 'emoji':
        return (
          <div className="text-2xl leading-none">
            {message.content}
          </div>
        )
      case 'system':
        return (
          <div className="flex items-center space-x-2">
            <span className="text-lg">🔔</span>
            <span className="text-sm italic">{message.content}</span>
          </div>
        )
      case 'image':
        return (
          <div className="space-y-2">
            <img 
              src={message.content} 
              alt="Shared image"
              className="max-w-full h-auto rounded-lg"
              loading="lazy"
            />
          </div>
        )
      default:
        return (
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
            {message.content}
          </p>
        )
    }
  }

  const getBubbleClasses = () => {
    const baseClasses = "max-w-[80%] p-3 rounded-lg relative transition-all duration-300 group"
    
    if (message.type === 'system') {
      return `${baseClasses} bg-retro-border/20 text-retro-textMuted mx-auto text-center border border-retro-border/30`
    }
    
    if (isOwn) {
      const statusClasses = {
        sending: 'opacity-70 animate-pulse',
        sent: 'opacity-100',
        delivered: 'opacity-100',
        read: 'opacity-100',
        failed: 'opacity-80 border-red-400/50'
      }
      
      return `${baseClasses} bg-gradient-to-r from-retro-purple to-retro-pink text-white shadow-lg hover:shadow-xl hover:scale-[1.02] ${
        statusClasses[message.status] || 'opacity-100'
      }`
    } else {
      return `${baseClasses} bg-retro-border/30 text-retro-text hover:bg-retro-border/40 hover:scale-[1.02] shadow-md`
    }
  }

  return (
    <div className={`flex ${
      message.type === 'system' ? 'justify-center' : isOwn ? 'justify-end' : 'justify-start'
    } animate-slide-in-up`}>
      {/* Avatar for received messages */}
      {showAvatar && !isOwn && message.type !== 'system' && (
        <div className="mr-2 flex-shrink-0">
          <UserAvatar
            userId={message.senderId}
            userName={message.senderName}
            userAvatar={message.senderAvatar}
            size="sm"
            showStatus={false} // Don't show status in message bubbles to keep them clean
          />
        </div>
      )}

      <div className="flex flex-col space-y-1">
        {/* Sender name for received messages */}
        {!isOwn && message.type !== 'system' && (
          <div className="text-xs text-retro-textMuted ml-1">
            {message.senderName}
          </div>
        )}

        {/* Message bubble */}
        <div className={getBubbleClasses()}>
          {/* Message type indicator */}
          {getMessageTypeIcon() && message.type !== 'emoji' && (
            <div className="absolute -top-1 -left-1 w-4 h-4 bg-retro-bg-darker rounded-full flex items-center justify-center text-xs">
              {getMessageTypeIcon()}
            </div>
          )}

          {/* Message content */}
          {renderMessageContent()}

          {/* Message metadata */}
          <div className="flex items-center justify-between mt-2">
            {/* Timestamp */}
            {showTimestamp && (
              <button
                onClick={() => setShowFullTimestamp(!showFullTimestamp)}
                className={`text-xs transition-colors hover:text-white ${
                  isOwn ? 'text-white/70' : 'text-retro-textMuted'
                }`}
                title="点击查看完整时间"
              >
                {formatTimestamp(message.createdAt, showFullTimestamp)}
              </button>
            )}

            {/* Status indicator for own messages */}
            {isOwn && message.status && message.type !== 'system' && (
              <div className="flex items-center space-x-1 ml-2">
                {getStatusIcon()}
              </div>
            )}
          </div>

          {/* Retry button for failed messages */}
          {message.status === 'failed' && onRetry && (
            <button
              onClick={onRetry}
              className="absolute -bottom-8 right-0 bg-retro-red/20 hover:bg-retro-red/30 text-retro-red text-xs px-2 py-1 rounded border border-retro-red/30 transition-colors"
            >
              重试
            </button>
          )}

          {/* Sending animation overlay */}
          {message.status === 'sending' && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer rounded-lg pointer-events-none"></div>
          )}

          {/* Hover tooltip for message status */}
          {isOwn && message.status && message.type !== 'system' && (
            <div className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-black/80 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
              {message.status === 'sending' && '发送中...'}
              {message.status === 'sent' && '已发送'}
              {message.status === 'delivered' && '已送达'}
              {message.status === 'read' && '已读'}
              {message.status === 'failed' && '发送失败'}
            </div>
          )}
        </div>

        {/* Edited indicator */}
        {message.createdAt !== message.updatedAt && (
          <div className={`text-xs italic ${
            isOwn ? 'text-right text-white/50' : 'text-left text-retro-textMuted/70'
          }`}>
            已编辑
          </div>
        )}
      </div>
    </div>
  )
}
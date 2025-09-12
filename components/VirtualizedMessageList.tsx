'use client'

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { ChatMessage } from '../types/chat'
import MessageBubble from './MessageBubble'

interface VirtualizedMessageListProps {
  messages: ChatMessage[]
  currentUserId: string
  onRetry?: (messageId: string) => void
  className?: string
}

const MESSAGE_HEIGHT = 80 // Estimated height of each message bubble
const BUFFER_ITEMS = 5 // Number of items to render above and below visible area

export default function VirtualizedMessageList({
  messages,
  currentUserId,
  onRetry,
  className = ''
}: VirtualizedMessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [containerHeight, setContainerHeight] = useState(0)

  // Update container height on resize
  useEffect(() => {
    const updateContainerHeight = () => {
      if (containerRef.current) {
        setContainerHeight(containerRef.current.clientHeight)
      }
    }

    updateContainerHeight()
    window.addEventListener('resize', updateContainerHeight)
    
    return () => window.removeEventListener('resize', updateContainerHeight)
  }, [])

  // Handle scroll events
  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop)
    }
  }, [])

  // Calculate visible messages
  const { visibleMessages, totalHeight, offset } = useMemo(() => {
    if (messages.length === 0 || containerHeight === 0) {
      return { visibleMessages: [], totalHeight: 0, offset: 0 }
    }

    const totalHeight = messages.length * MESSAGE_HEIGHT
    const scrollBottom = scrollTop + containerHeight

    // Calculate start and end indices
    let startIndex = Math.floor(scrollTop / MESSAGE_HEIGHT) - BUFFER_ITEMS
    let endIndex = Math.floor(scrollBottom / MESSAGE_HEIGHT) + BUFFER_ITEMS

    // Clamp indices to valid range
    startIndex = Math.max(0, startIndex)
    endIndex = Math.min(messages.length - 1, endIndex)

    // Get visible messages
    const visibleMessages = messages.slice(startIndex, endIndex + 1)

    // Calculate offset for positioning
    const offset = startIndex * MESSAGE_HEIGHT

    return { visibleMessages, totalHeight, offset }
  }, [messages, scrollTop, containerHeight])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (containerRef.current && messages.length > 0) {
      const isScrolledNearBottom = 
        containerRef.current.scrollHeight - containerRef.current.scrollTop - containerHeight < 100
      
      if (isScrolledNearBottom) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight
      }
    }
  }, [messages.length, containerHeight])

  if (messages.length === 0) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <div className="text-center text-retro-textMuted">
          <div className="text-4xl mb-2">💬</div>
          <p className="text-sm">还没有消息</p>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={`overflow-y-auto ${className}`}
      onScroll={handleScroll}
      style={{ height: '100%' }}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offset}px)` }}>
          {visibleMessages.map((message) => (
            <div
              key={message.id}
              style={{ height: MESSAGE_HEIGHT }}
              className="flex items-center"
            >
              <MessageBubble
                message={message}
                isOwn={message.senderId === currentUserId}
                showAvatar={message.senderId !== currentUserId}
                showTimestamp={true}
                onRetry={message.status === 'failed' && onRetry ? () => onRetry(message.id) : undefined}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
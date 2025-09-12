'use client'

import { useState, useEffect, useRef } from 'react'
import { ChatNotification } from '../types/chat'

interface NotificationContextMenuProps {
  notification: ChatNotification | null
  position: { x: number; y: number }
  isVisible: boolean
  onClose: () => void
  onMarkAsRead?: (notificationId: string) => void
  onDismiss?: (notificationId: string) => void
  onOpenConversation?: (conversationId: string) => void
  onMarkConversationAsRead?: (conversationId: string) => void
  onMuteConversation?: (conversationId: string) => void
}

export default function NotificationContextMenu({
  notification,
  position,
  isVisible,
  onClose,
  onMarkAsRead,
  onDismiss,
  onOpenConversation,
  onMarkConversationAsRead,
  onMuteConversation
}: NotificationContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isVisible, onClose])

  // Close menu on escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    if (isVisible) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isVisible, onClose])

  if (!isVisible || !notification) {
    return null
  }

  const menuItems = [
    {
      label: '打开对话',
      icon: '💬',
      action: () => {
        onOpenConversation?.(notification.conversationId)
        onClose()
      }
    },
    {
      label: '标记为已读',
      icon: '✓',
      action: () => {
        onMarkAsRead?.(notification.id)
        onClose()
      }
    },
    {
      label: '标记对话为已读',
      icon: '✓✓',
      action: () => {
        onMarkConversationAsRead?.(notification.conversationId)
        onClose()
      }
    },
    {
      label: '忽略通知',
      icon: '✕',
      action: () => {
        onDismiss?.(notification.id)
        onClose()
      },
      className: 'text-red-400 hover:text-red-300 hover:bg-red-500/10'
    },
    {
      label: '静音对话',
      icon: '🔇',
      action: () => {
        onMuteConversation?.(notification.conversationId)
        onClose()
      },
      className: 'text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10'
    }
  ]

  // Adjust position to keep menu within viewport
  const adjustedPosition = {
    x: Math.min(position.x, window.innerWidth - 200),
    y: Math.min(position.y, window.innerHeight - (menuItems.length * 40 + 20))
  }

  return (
    <div
      ref={menuRef}
      className="fixed z-[200] bg-retro-bg-darker border border-retro-border rounded-lg shadow-2xl py-2 min-w-[180px] animate-fade-in"
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y
      }}
    >
      {/* Menu header */}
      <div className="px-3 py-2 border-b border-retro-border">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-gradient-to-br from-retro-purple to-retro-pink rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white font-medium text-xs">
              {notification.senderName?.charAt(0)?.toUpperCase() || '?'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-medium text-sm truncate">
              {notification.senderName}
            </p>
            <p className="text-retro-textMuted text-xs truncate">
              {notification.content.length > 30 
                ? notification.content.substring(0, 30) + '...' 
                : notification.content
              }
            </p>
          </div>
        </div>
      </div>

      {/* Menu items */}
      <div className="py-1">
        {menuItems.map((item, index) => (
          <button
            key={index}
            onClick={item.action}
            className={`w-full px-3 py-2 text-left flex items-center space-x-3 transition-colors ${
              item.className || 'text-retro-text hover:text-white hover:bg-retro-border/20'
            }`}
          >
            <span className="text-sm">{item.icon}</span>
            <span className="text-sm">{item.label}</span>
          </button>
        ))}
      </div>

      {/* Menu footer with keyboard shortcuts */}
      <div className="px-3 py-2 border-t border-retro-border">
        <p className="text-retro-textMuted text-xs">
          右键点击通知查看更多选项
        </p>
      </div>
    </div>
  )
}
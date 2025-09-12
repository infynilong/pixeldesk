'use client'

import { useState, useEffect } from 'react'
import { ChatNotification } from '../types/chat'
import UserAvatar from './UserAvatar'

interface NotificationToastProps {
  notification: ChatNotification
  onClose: () => void
  onClick?: () => void
  duration?: number
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
  index?: number
  playSound?: boolean
}

export default function NotificationToast({
  notification,
  onClose,
  onClick,
  duration = 5000,
  position = 'top-right',
  index = 0,
  playSound = false
}: NotificationToastProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    // Show animation
    const showTimer = setTimeout(() => setIsVisible(true), 100)
    
    // Auto-hide timer
    const hideTimer = setTimeout(() => {
      handleClose()
    }, duration)

    // Play notification sound
    if (playSound) {
      playNotificationSound()
    }

    return () => {
      clearTimeout(showTimer)
      clearTimeout(hideTimer)
    }
  }, [duration, playSound])

  const handleClose = () => {
    setIsExiting(true)
    setTimeout(() => {
      onClose()
    }, 300)
  }

  const handleClick = () => {
    if (onClick) {
      onClick()
    }
    handleClose()
  }

  const playNotificationSound = () => {
    try {
      // Create a simple notification sound using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1)
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2)
      
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.2)
    } catch (error) {
      console.warn('Could not play notification sound:', error)
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return '刚刚'
    if (diffMins < 60) return `${diffMins}分钟前`
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }

  const truncateContent = (content: string, maxLength: number = 50) => {
    if (content.length <= maxLength) return content
    return content.substring(0, maxLength) + '...'
  }

  // Position styles
  const getPositionStyles = () => {
    const baseOffset = 20
    const toastHeight = 80
    const spacing = 10
    const offset = baseOffset + (index * (toastHeight + spacing))

    switch (position) {
      case 'top-right':
        return { top: `${offset}px`, right: '20px' }
      case 'top-left':
        return { top: `${offset}px`, left: '20px' }
      case 'bottom-right':
        return { bottom: `${offset}px`, right: '20px' }
      case 'bottom-left':
        return { bottom: `${offset}px`, left: '20px' }
      default:
        return { top: `${offset}px`, right: '20px' }
    }
  }

  // Animation classes
  const getAnimationClasses = () => {
    if (isExiting) {
      return 'animate-slide-out-right opacity-0 scale-95'
    }
    if (isVisible) {
      return 'animate-slide-in-right opacity-100 scale-100'
    }
    return 'opacity-0 scale-95 translate-x-full'
  }

  return (
    <div
      className={`
        fixed z-[100] max-w-sm w-full
        bg-gradient-to-r from-retro-purple/95 to-retro-pink/95
        backdrop-blur-md border border-retro-border/50
        rounded-lg shadow-2xl
        transform transition-all duration-300 ease-out
        ${getAnimationClasses()}
        cursor-pointer hover:scale-105
      `}
      style={getPositionStyles()}
      onClick={handleClick}
    >
      {/* Progress bar */}
      <div className="absolute top-0 left-0 h-1 bg-gradient-to-r from-retro-purple to-retro-pink rounded-t-lg animate-shrink-width"></div>
      
      <div className="p-4">
        <div className="flex items-start space-x-3">
          {/* Sender Avatar */}
          <div className="flex-shrink-0">
            <UserAvatar
              userId={notification.senderId}
              userName={notification.senderName}
              size="sm"
              showStatus={false}
            />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <p className="text-white font-semibold text-sm truncate">
                {notification.senderName}
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleClose()
                }}
                className="text-white/60 hover:text-white transition-colors ml-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <p className="text-white/90 text-sm leading-relaxed mb-2">
              {truncateContent(notification.content)}
            </p>
            
            <div className="flex items-center justify-between">
              <span className="text-white/60 text-xs">
                {formatTimestamp(notification.timestamp)}
              </span>
              <div className="flex items-center space-x-1 text-white/60">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span className="text-xs">点击查看</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hover glow effect */}
      <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-retro-purple/20 to-retro-pink/20 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
    </div>
  )
}
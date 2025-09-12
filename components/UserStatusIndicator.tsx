'use client'

import { useMemo } from 'react'

interface UserStatusIndicatorProps {
  isOnline: boolean
  lastSeen?: string | null
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
  className?: string
}

export default function UserStatusIndicator({
  isOnline,
  lastSeen,
  size = 'md',
  showText = false,
  className = ''
}: UserStatusIndicatorProps) {
  
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3', 
    lg: 'w-4 h-4'
  }

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  }

  const formatLastSeen = useMemo(() => {
    if (!lastSeen || isOnline) return null

    const lastSeenDate = new Date(lastSeen)
    const now = new Date()
    const diffMs = now.getTime() - lastSeenDate.getTime()
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMinutes < 1) {
      return '刚刚在线'
    } else if (diffMinutes < 60) {
      return `${diffMinutes}分钟前在线`
    } else if (diffHours < 24) {
      return `${diffHours}小时前在线`
    } else if (diffDays < 7) {
      return `${diffDays}天前在线`
    } else {
      return lastSeenDate.toLocaleDateString('zh-CN', {
        month: 'short',
        day: 'numeric'
      }) + '在线'
    }
  }, [lastSeen, isOnline])

  if (showText) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className={`${sizeClasses[size]} rounded-full border border-retro-bg-darker ${
          isOnline 
            ? 'bg-retro-green animate-pulse' 
            : 'bg-retro-textMuted'
        }`} />
        <span className={`${textSizeClasses[size]} ${
          isOnline 
            ? 'text-retro-green' 
            : 'text-retro-textMuted'
        }`}>
          {isOnline ? '在线' : formatLastSeen || '离线'}
        </span>
      </div>
    )
  }

  return (
    <div 
      className={`${sizeClasses[size]} rounded-full border border-retro-bg-darker ${
        isOnline 
          ? 'bg-retro-green animate-pulse' 
          : 'bg-retro-textMuted'
      } ${className}`}
      title={isOnline ? '在线' : formatLastSeen || '离线'}
    />
  )
}
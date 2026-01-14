'use client'

import { useMemo } from 'react'
import { useTranslation } from '@/lib/hooks/useTranslation'

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
  const { t, locale } = useTranslation()

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
      return t.common.online_just_now
    } else if (diffMinutes < 60) {
      return t.common.online_ago.replace('{time}', `${diffMinutes}${t.activity.minutes_unit}`)
    } else if (diffHours < 24) {
      return t.common.online_ago.replace('{time}', `${diffHours}${t.activity.hours_unit}`)
    } else if (diffDays < 7) {
      return t.common.online_ago.replace('{time}', `${diffDays}${t.activity.days_unit}`)
    } else {
      const dateStr = lastSeenDate.toLocaleDateString(locale, {
        month: 'short',
        day: 'numeric'
      })
      return t.common.online_ago.replace('{time}', dateStr)
    }
  }, [lastSeen, isOnline, t, locale])

  if (showText) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className={`${sizeClasses[size]} rounded-full border border-retro-bg-darker ${isOnline
          ? 'bg-retro-green '
          : 'bg-retro-textMuted'
          }`} />
        <span className={`${textSizeClasses[size]} ${isOnline
          ? 'text-retro-green'
          : 'text-retro-textMuted'
          }`}>
          {isOnline ? t.common.online : formatLastSeen || t.common.offline}
        </span>
      </div>
    )
  }

  return (
    <div
      className={`${sizeClasses[size]} rounded-full border border-retro-bg-darker ${isOnline
        ? 'bg-retro-green '
        : 'bg-retro-textMuted'
        } ${className}`}
      title={isOnline ? t.common.online : formatLastSeen || t.common.offline}
    />
  )
}
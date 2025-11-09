'use client'

import { useState } from 'react'
import Image from 'next/image'
import UserStatusIndicator from './UserStatusIndicator'
import { getCharacterImageUrl } from '@/lib/characterUtils'

interface UserAvatarProps {
  userId: string
  userName: string
  userAvatar?: string | null  // 角色形象key
  customAvatar?: string | null // 用户自定义上传的头像URL（优先级更高）
  isOnline?: boolean
  lastSeen?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  showStatus?: boolean
  statusPosition?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  className?: string
  onClick?: () => void
}

export default function UserAvatar({
  userId,
  userName,
  userAvatar,
  customAvatar,
  isOnline = false,
  lastSeen,
  size = 'md',
  showStatus = true,
  statusPosition = 'bottom-right',
  className = '',
  onClick
}: UserAvatarProps) {
  const [imageError, setImageError] = useState(false)

  const sizeClasses = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  }

  const textSizeClasses = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-lg'
  }

  const statusSizeClasses = {
    xs: 'sm',
    sm: 'sm',
    md: 'md',
    lg: 'md',
    xl: 'lg'
  } as const

  const statusPositionClasses = {
    'bottom-right': '-bottom-0.5 -right-0.5',
    'bottom-left': '-bottom-0.5 -left-0.5',
    'top-right': '-top-0.5 -right-0.5',
    'top-left': '-top-0.5 -left-0.5'
  }

  const getInitials = (name: string) => {
    if (!name) return '?'
    const words = name.trim().split(' ')
    if (words.length === 1) {
      return words[0].charAt(0).toUpperCase()
    }
    return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase()
  }

  const handleImageError = () => {
    setImageError(true)
  }

  // 获取头像URL - 优先级：customAvatar > userAvatar（角色形象）
  const getAvatarUrl = () => {
    // 1. 优先使用自定义头像
    if (customAvatar) {
      return customAvatar
    }

    // 2. 如果没有自定义头像，使用角色形象
    if (!userAvatar) return null

    // 如果已经是完整URL（http://或/开头），直接使用
    if (userAvatar.startsWith('http://') || userAvatar.startsWith('https://') || userAvatar.startsWith('/')) {
      return userAvatar
    }

    // 否则当作角色key处理，转换为角色图片URL
    return getCharacterImageUrl(userAvatar)
  }

  const avatarUrl = getAvatarUrl()
  // 只有当使用角色形象且没有自定义头像时，才使用精灵图裁剪
  const isCharacterSprite = !customAvatar && avatarUrl && (avatarUrl.includes('/assets/characters/') || (!avatarUrl.startsWith('http') && !avatarUrl.startsWith('/')))

  return (
    <div
      className={`relative flex-shrink-0 ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      <div className={`${sizeClasses[size]} bg-gradient-to-br from-retro-purple to-retro-pink rounded-full flex items-center justify-center overflow-hidden`}>
        {avatarUrl && !imageError ? (
          isCharacterSprite ? (
            // 角色形象 - 使用background-image裁剪显示第一帧（向下看）
            <>
              <div
                className="w-full h-full"
                style={{
                  backgroundImage: `url(${avatarUrl})`,
                  backgroundSize: '400% 200%', // 精灵图是4列2行
                  backgroundPosition: '0 0', // 显示第一帧（左上角）
                  backgroundRepeat: 'no-repeat',
                  imageRendering: 'pixelated',
                }}
                role="img"
                aria-label={userName}
              />
              {/* 隐藏的img用于错误处理 */}
              <img
                src={avatarUrl}
                alt=""
                style={{ display: 'none' }}
                onError={handleImageError}
              />
            </>
          ) : (
            // 普通头像
            <img
              src={avatarUrl}
              alt={userName}
              className="w-full h-full object-cover"
              onError={handleImageError}
            />
          )
        ) : (
          <span className={`text-white font-medium ${textSizeClasses[size]}`}>
            {getInitials(userName)}
          </span>
        )}
      </div>
      
      {showStatus && (
        <div className={`absolute ${statusPositionClasses[statusPosition]}`}>
          <UserStatusIndicator
            isOnline={isOnline}
            lastSeen={lastSeen}
            size={statusSizeClasses[size]}
          />
        </div>
      )}
    </div>
  )
}
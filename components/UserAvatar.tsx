'use client'

import { useState } from 'react'
import Image from 'next/image'
import UserStatusIndicator from './UserStatusIndicator'
import { getCharacterImageUrl } from '@/lib/characterUtils'

interface UserAvatarProps {
  userId: string
  userName: string
  userAvatar?: string | null
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

  // 获取头像URL - 如果是角色key则转换为角色图片URL
  const getAvatarUrl = () => {
    if (!userAvatar) return null

    // 如果已经是完整URL（http://或/开头），直接使用
    if (userAvatar.startsWith('http://') || userAvatar.startsWith('https://') || userAvatar.startsWith('/')) {
      return userAvatar
    }

    // 否则当作角色key处理，转换为角色图片URL
    return getCharacterImageUrl(userAvatar)
  }

  const avatarUrl = getAvatarUrl()
  const isCharacterSprite = avatarUrl && (avatarUrl.includes('/assets/characters/') || !avatarUrl.startsWith('http'))

  return (
    <div
      className={`relative flex-shrink-0 ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      <div className={`${sizeClasses[size]} bg-gradient-to-br from-retro-purple to-retro-pink rounded-full flex items-center justify-center overflow-hidden`}>
        {avatarUrl && !imageError ? (
          isCharacterSprite ? (
            // 角色形象 - 使用精灵图裁剪显示第一帧（向下看）
            <div
              className="w-full h-full flex items-center justify-center relative overflow-hidden"
              style={{
                imageRendering: 'pixelated',
              }}
            >
              <img
                src={avatarUrl}
                alt={userName}
                className="pixelated"
                style={{
                  imageRendering: 'pixelated',
                  // 精灵图是 192px × 192px (4列2行，每帧48px × 96px)
                  // 使用固定尺寸，然后用transform scale来缩放
                  width: '192px',
                  height: '192px',
                  objectFit: 'none',
                  objectPosition: '0 0', // 从左上角裁剪，只显示第一帧(48px×96px)
                  // 裁剪只显示左上角的48px×96px区域
                  clipPath: 'inset(0 144px 96px 0)', // top right bottom left
                  // 根据容器大小缩放
                  transform: `scale(${
                    size === 'xs' ? 0.125 : // 24/192
                    size === 'sm' ? 0.167 : // 32/192
                    size === 'md' ? 0.208 : // 40/192
                    size === 'lg' ? 0.25 :  // 48/192
                    0.333                    // 64/192 for xl
                  })`,
                  transformOrigin: 'top left',
                }}
                onError={handleImageError}
              />
            </div>
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
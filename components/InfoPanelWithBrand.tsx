'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import UserAvatar from './UserAvatar'
import UserStatusIndicator from './UserStatusIndicator'
import NotificationsTab from './tabs/NotificationsTab'
import BrandHeader from './BrandHeader'

interface InfoPanelProps {
  currentUser?: any
  onLogout?: () => void
  isMobile?: boolean
  isTablet?: boolean
}

/**
 * 使用品牌配置的信息面板示例
 * 这个组件展示了如何将 InfoPanel 从硬编码品牌信息迁移到使用统一配置
 */
export default function InfoPanelWithBrand({
  currentUser,
  onLogout,
  isMobile = false,
  isTablet = false
}: InfoPanelProps) {
  const router = useRouter()
  const [showNotifications, setShowNotifications] = useState(false)

  const containerPadding = isMobile ? "p-3" : "p-6"
  const titleSize = isMobile ? "text-base" : "text-xl"

  return (
    <div className={`h-full flex flex-col bg-gray-950/50 backdrop-blur-sm border-l border-gray-800 ${containerPadding}`}>
      {/* 头部 - 使用 BrandHeader 组件 */}
      <div className="mb-6 pb-4 border-b border-gray-800">
        <BrandHeader showLogo showSlogan size={isMobile ? 'sm' : 'md'} />
      </div>

      {/* 用户信息区域 */}
      {currentUser && (
        <div className="mb-6 pb-4 border-b border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <UserAvatar
              userId={currentUser.id}
              userName={currentUser.name}
              userAvatar={currentUser.avatar}
              customAvatar={currentUser.customAvatar}
              size="lg"
              showStatus={true}
            />
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors relative"
              title="通知"
            >
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>
          </div>

          <div className="space-y-2">
            <div>
              <h3 className={`${titleSize} font-bold text-white truncate`}>
                {currentUser.name}
              </h3>
              {currentUser.email && (
                <p className="text-gray-500 text-sm truncate">
                  {currentUser.email}
                </p>
              )}
            </div>

            {currentUser.points !== undefined && (
              <div className="flex items-center gap-2 p-2 bg-yellow-600/20 border border-yellow-500/30 rounded-lg">
                <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                </svg>
                <span className="text-yellow-400 font-bold">{currentUser.points}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 状态区域 */}
      <div className="mb-6 pb-4 border-b border-gray-800">
        <h3 className="text-sm font-semibold text-gray-400 mb-3">当前状态</h3>
        {currentUser && (
          <UserStatusIndicator
            isOnline={true}
            showText={true}
            size={isMobile ? 'sm' : 'md'}
          />
        )}
      </div>

      {/* 通知面板 */}
      {showNotifications && currentUser && (
        <div className="flex-1 overflow-hidden">
          <NotificationsTab
            isActive={true}
            isMobile={isMobile}
            isTablet={isTablet}
          />
        </div>
      )}

      {/* 底部操作 */}
      <div className="mt-auto pt-4 border-t border-gray-800">
        <div className="flex flex-col gap-2">
          <button
            onClick={() => router.push('/settings')}
            className="w-full px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            设置
          </button>

          {onLogout && (
            <button
              onClick={onLogout}
              className="w-full px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              退出登录
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

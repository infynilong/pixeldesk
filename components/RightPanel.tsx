'use client'

import { useState, useEffect, ReactNode } from 'react'
import { EventBus, CollisionEvent } from '@/lib/eventBus'
import SocialFeedTab from './tabs/SocialFeedTab'
import MyPostsTab from './tabs/MyPostsTab'
import NotificationsTab from './tabs/NotificationsTab'
import PlayerInteractionTab from './tabs/PlayerInteractionTab'

interface RightPanelProps {
  currentUser?: any
  selectedPlayer?: any
  onPostClick?: (postId: string) => void
  isMobile?: boolean
  isTablet?: boolean
  isCollapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
}

interface Tab {
  id: string
  label: string
  icon: ReactNode
  component: ReactNode
  badge?: number
}

export default function RightPanel({
  currentUser,
  selectedPlayer,
  onPostClick,
  isMobile = false,
  isTablet = false,
  isCollapsed: externalIsCollapsed,
  onCollapsedChange
}: RightPanelProps) {
  const [activeTab, setActiveTab] = useState('social')
  const [currentInteractionPlayer, setCurrentInteractionPlayer] = useState<any>(null)
  const [internalIsCollapsed, setInternalIsCollapsed] = useState(false)
  const isCollapsed = externalIsCollapsed !== undefined ? externalIsCollapsed : internalIsCollapsed

  const handleToggle = (collapsed: boolean) => {
    if (onCollapsedChange) {
      onCollapsedChange(collapsed)
    } else {
      setInternalIsCollapsed(collapsed)
    }
  }

  // 监控 currentInteractionPlayer 变化
  useEffect(() => {
    console.log('🔄 [RightPanel] currentInteractionPlayer changed:', currentInteractionPlayer)
  }, [currentInteractionPlayer])

  // 监听玩家碰撞和点击事件，自动切换到互动tab
  useEffect(() => {
    const handleCollisionStart = (event: CollisionEvent) => {
      console.log('🎯 [RightPanel] Collision detected, switching to interaction tab:', event.targetPlayer)
      setCurrentInteractionPlayer(event.targetPlayer)
      setActiveTab('interaction')
    }

    const handleCollisionEnd = (event: CollisionEvent) => {
      console.log('🔚 [RightPanel] Collision ended:', event.targetPlayer)
      // 碰撞结束时切换回动态tab
      if (activeTab === 'interaction') {
        setCurrentInteractionPlayer(null)
        setActiveTab('social')
      }
    }

    const handlePlayerClick = (event: any) => {
      console.log('👆 [RightPanel] Player click detected, switching to interaction tab:', event.targetPlayer)
      setCurrentInteractionPlayer(event.targetPlayer)
      setActiveTab('interaction')
    }

    // 订阅碰撞和点击事件
    EventBus.on('player:collision:start', handleCollisionStart)
    EventBus.on('player:collision:end', handleCollisionEnd)
    EventBus.on('player:click', handlePlayerClick)

    // 清理监听器
    return () => {
      EventBus.off('player:collision:start', handleCollisionStart)
      EventBus.off('player:collision:end', handleCollisionEnd)
      EventBus.off('player:click', handlePlayerClick)
    }
  }, [activeTab])

  // 定义标签页
  const tabs: Tab[] = [
    {
      id: 'social',
      label: '动态',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a2 2 0 01-2-2v-6a2 2 0 012-2h2V4a2 2 0 012-2h4a2 2 0 012 2v4z" />
        </svg>
      ),
      component: (
        <SocialFeedTab
          isActive={activeTab === 'social'}
          isMobile={isMobile}
          isTablet={isTablet}
        />
      )
    },
    {
      id: 'posts',
      label: '我的',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      ),
      component: (
        <MyPostsTab
          isActive={activeTab === 'posts'}
          isMobile={isMobile}
          isTablet={isTablet}
        />
      )
    },
    {
      id: 'inbox',
      label: '消息',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      ),
      component: (
        <NotificationsTab
          isActive={activeTab === 'inbox'}
          isMobile={isMobile}
          isTablet={isTablet}
          onPostClick={onPostClick}
        />
      ),
      badge: 0 // 可以后续添加未读消息数量
    },
    {
      id: 'interaction',
      label: '互动',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
        </svg>
      ),
      component: (
        <PlayerInteractionTab
          collisionPlayer={currentInteractionPlayer || selectedPlayer}
          isActive={activeTab === 'interaction'}
          isMobile={isMobile}
          isTablet={isTablet}
        />
      )
    }
  ]

  // 收起状态下显示最小化的面板
  if (isCollapsed) {
    return (
      <div className="h-full flex flex-col bg-transparent w-12 border-l border-gray-800">
        <div className="flex-1 flex items-center justify-center">
          <button
            onClick={() => handleToggle(false)}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            title="展开面板"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-transparent relative">
      {/* 收起按钮 - 左上角 */}
      <button
        onClick={() => handleToggle(true)}
        className="absolute top-3 left-2 z-10 p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
        title="收起面板"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* 头部标签导航 */}
      <div className="border-b border-gray-800 bg-gray-900/50">
        <div className={isMobile ? "p-3" : "p-4"}>
          <div className={`flex items-center justify-between ${isMobile ? 'mb-3' : 'mb-4'}`}>
            <div className={`flex items-center ${isMobile ? 'space-x-2' : 'space-x-3'}`}>
              <div className={`${isMobile ? 'w-8 h-8' : 'w-10 h-10'} bg-gray-800 border border-gray-700 rounded-lg flex items-center justify-center`}>
                <svg className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'} text-gray-300`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <h1 className={`${isMobile ? 'text-base' : 'text-xl'} font-medium text-gray-200`}>社交中心</h1>
                <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-500 font-mono`}>Social Hub</p>
              </div>
            </div>
            <div className={`${isMobile ? 'w-2 h-2' : 'w-2 h-2'} bg-emerald-400 rounded-full  shadow-sm shadow-emerald-400/50`}></div>
          </div>

          {/* 标签导航 */}
          <div className="flex space-x-1 bg-gray-800/60 border border-gray-700/50 rounded-lg p-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center ${isMobile ? 'flex-col space-y-0.5 px-1.5 py-1.5 min-w-[50px]' : 'space-x-1.5 px-2.5 py-2 min-w-[60px]'} rounded font-mono  flex-1 justify-center ${
                  activeTab === tab.id
                    ? 'bg-gray-700 text-gray-100 border border-gray-600/50'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
                }`}
                style={{ maxWidth: isMobile ? '25%' : '25%' }}
              >
                <div className={`${activeTab === tab.id ? 'text-gray-100' : 'text-gray-400'}  ${isMobile ? 'text-xs' : 'text-sm'}`}>
                  {tab.icon}
                </div>
                <span className={`${activeTab === tab.id ? 'text-gray-100' : 'text-gray-400'} ${isMobile ? 'text-2xs leading-3' : 'text-xs leading-4'} font-mono whitespace-nowrap`}>
                  {tab.label}
                </span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <div className={`absolute -top-1 -right-1 ${isMobile ? 'w-3.5 h-3.5' : 'w-4 h-4'} bg-red-600 border border-red-500/50 text-white ${isMobile ? 'text-2xs' : 'text-xs'} font-mono rounded-full flex items-center justify-center shadow-sm`}>
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-hidden">
        {tabs.find(tab => tab.id === activeTab)?.component}
      </div>

      {/* 底部状态栏 */}
      <div className="border-t border-gray-800 bg-gray-900/50">
        <div className="p-3">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-emerald-400 rounded-full  shadow-sm shadow-emerald-400/50"></div>
              <span className="text-gray-400 font-mono">
                {tabs.find(tab => tab.id === activeTab)?.label.toUpperCase()} MODULE
              </span>
            </div>
            <span className="text-gray-500 font-mono">
              {currentUser ? `${currentUser.name}` : 'GUEST'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
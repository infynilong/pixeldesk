'use client'

import { ReactNode } from 'react'
import TabManager, { TabType } from './TabManager'
import StatusInfoTab from './tabs/StatusInfoTab'
import PlayerInteractionTab from './tabs/PlayerInteractionTab' // Social功能重新启用
import MyPostsTab from './tabs/MyPostsTab' // Posts功能重新启用
import NotificationsTab from './tabs/NotificationsTab' // Inbox功能重新启用
import AuthenticationHeader from './AuthenticationHeader'
import { useBrandConfig } from '@/lib/hooks/useBrandConfig'

interface InfoPanelProps {
  children: ReactNode
  selectedPlayer?: any
  currentUser?: any
  workstationStats?: any
  isMobile?: boolean
  isTablet?: boolean
  onPostClick?: (postId: string) => void // 新增：处理帖子点击
}

export default function InfoPanel({
  children,
  selectedPlayer,
  currentUser,
  workstationStats,
  isMobile = false,
  isTablet = false,
  onPostClick
}: InfoPanelProps) {
  const { config: brandConfig, isLoading: isBrandLoading } = useBrandConfig('zh-CN')

  // Define available tabs
  const tabs: TabType[] = [
    {
      id: 'status-info',
      label: 'Profile',
      icon: '🎮',
      component: (props: any) => (
        <StatusInfoTab
          {...props}
          currentUser={currentUser}
          workstationStats={workstationStats}
        >
          {children}
        </StatusInfoTab>
      ),
      priority: 1
    },
    // Posts标签重新启用
    {
      id: 'my-posts',
      label: 'Posts',
      icon: '🚀',
      component: MyPostsTab,
      priority: 1.5
    },
    // Inbox标签重新启用
    {
      id: 'notifications',
      label: 'Inbox',
      icon: '💎',
      component: (props: any) => (
        <NotificationsTab
          {...props}
          onPostClick={onPostClick}
        />
      ),
      priority: 1.8
    },
    // Social功能重新启用
    {
      id: 'player-interaction',
      label: 'Social',
      icon: '⭐',
      component: PlayerInteractionTab,
      autoSwitch: true,
      priority: 2
    }
  ]

  return (
    <div className="h-full flex flex-col">
      {/* Top header */}
      <div className="p-6 border-b border-retro-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {isBrandLoading ? (
              <div className="w-8 h-8 bg-gray-700 rounded-lg animate-pulse"></div>
            ) : (
              <img
                src={brandConfig.app_logo}
                alt={brandConfig.app_name}
                className="w-8 h-8 rounded-lg object-cover"
                onError={(e) => {
                  e.currentTarget.src = '/assets/icon.png'
                }}
              />
            )}
            <div>
              <h1 className="text-xl font-bold text-white">
                {isBrandLoading ? '加载中...' : brandConfig.app_name}
              </h1>
              <p className="text-xs text-retro-textMuted">
                {isBrandLoading ? 'Loading...' : brandConfig.app_slogan}
              </p>
            </div>
          </div>
          
          {/* Authentication Header */}
          <AuthenticationHeader />
        </div>
      </div>
      
      {/* Tab Manager */}
      <div className="flex-1 flex flex-col">
        <TabManager
          tabs={tabs}
          className="flex-1"
          isMobile={isMobile}
          isTablet={isTablet}
        />
      </div>
      
      {/* Bottom status bar */}
      <div className="p-4 border-t border-retro-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full "></div>
            <span className="text-xs text-retro-textMuted">在线</span>
          </div>
          <div className="text-xs text-gray-500">
            {isBrandLoading ? 'Loading...' : `${brandConfig.app_name} v1.0`}
          </div>
        </div>
      </div>
    </div>
  )
}
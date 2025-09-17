'use client'

import { ReactNode } from 'react'
import TabManager, { TabType } from './TabManager'
import StatusInfoTab from './tabs/StatusInfoTab'
import PlayerInteractionTab from './tabs/PlayerInteractionTab'
import MyPostsTab from './tabs/MyPostsTab'
import NotificationsTab from './tabs/NotificationsTab'
import AuthenticationHeader from './AuthenticationHeader'

interface InfoPanelProps {
  children: ReactNode
  selectedPlayer?: any
  currentUser?: any
  workstationStats?: any
  onTeleportClick?: () => void
  collisionPlayer?: any
  isMobile?: boolean
  isTablet?: boolean
}

export default function InfoPanel({ 
  children, 
  selectedPlayer, 
  currentUser, 
  workstationStats, 
  onTeleportClick,
  collisionPlayer,
  isMobile = false,
  isTablet = false
}: InfoPanelProps) {
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
          onTeleportClick={onTeleportClick}
        >
          {children}
        </StatusInfoTab>
      ),
      priority: 1
    },
    {
      id: 'my-posts',
      label: 'Posts',
      icon: '🚀',
      component: MyPostsTab,
      priority: 1.5
    },
    {
      id: 'notifications',
      label: 'Inbox',
      icon: '💎',
      component: NotificationsTab,
      priority: 1.8
    },
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
            <div className="w-8 h-8 bg-gradient-to-r from-retro-purple to-retro-pink rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">P</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">PixelDesk</h1>
              <p className="text-xs text-retro-textMuted">社交办公空间</p>
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
          collisionPlayer={collisionPlayer}
          className="flex-1"
          isMobile={isMobile}
          isTablet={isTablet}
        />
      </div>
      
      {/* Bottom status bar */}
      <div className="p-4 border-t border-retro-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-xs text-retro-textMuted">在线</span>
          </div>
          <div className="text-xs text-gray-500">
            PixelDesk v1.0
          </div>
        </div>
      </div>
    </div>
  )
}
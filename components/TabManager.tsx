'use client'

import { useState, useEffect, ReactNode, ComponentType } from 'react'
import { EventBus, CollisionEvent, TabSwitchEvent } from '../lib/eventBus'
import NotificationBadge from './NotificationBadge'

// Tab type definitions
export interface TabType {
  id: string
  label: string
  icon: string
  component: ComponentType<any>
  badge?: number
  autoSwitch?: boolean
  priority?: number
}

export interface TabManagerProps {
  tabs: TabType[]
  activeTab?: string
  onTabChange?: (tabId: string) => void
  collisionPlayer?: any
  className?: string
  isMobile?: boolean
  isTablet?: boolean
}

interface TabState {
  activeTabId: string
  animationState: 'idle' | 'switching'
  switchDirection: 'left' | 'right'
  lastSwitchTrigger: 'collision' | 'manual' | 'auto'
}

export default function TabManager({ 
  tabs, 
  activeTab, 
  onTabChange, 
  collisionPlayer,
  className = '',
  isMobile = false,
  isTablet = false
}: TabManagerProps) {
  const [tabState, setTabState] = useState<TabState>({
    activeTabId: activeTab || tabs[0]?.id || '',
    animationState: 'idle',
    switchDirection: 'right',
    lastSwitchTrigger: 'manual'
  })

  const [currentCollisionPlayer, setCurrentCollisionPlayer] = useState<any>(null)
  const [highlightedTab, setHighlightedTab] = useState<string | null>(null)
  const [switchingAnimation, setSwitchingAnimation] = useState(false)
  const [screenSize, setScreenSize] = useState({ width: 0, height: 0 })

  // Detect screen size changes for responsive tab behavior - 优化防抖
  useEffect(() => {
    let resizeTimeout: NodeJS.Timeout
    
    const updateScreenSize = () => {
      setScreenSize({
        width: window.innerWidth,
        height: window.innerHeight
      })
    }
    
    // 防抖版本的resize处理器
    const debouncedUpdateScreenSize = () => {
      clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(updateScreenSize, 300) // 300ms防抖
    }

    updateScreenSize()
    window.addEventListener('resize', debouncedUpdateScreenSize)
    return () => {
      window.removeEventListener('resize', debouncedUpdateScreenSize)
      clearTimeout(resizeTimeout)
    }
  }, [])

  // Handle tab switching with animation
  const handleTabSwitch = (newTabId: string, trigger: 'collision' | 'manual' | 'auto' = 'manual') => {
    if (newTabId === tabState.activeTabId) return

    const currentIndex = tabs.findIndex(tab => tab.id === tabState.activeTabId)
    const newIndex = tabs.findIndex(tab => tab.id === newTabId)
    const direction = newIndex > currentIndex ? 'right' : 'left'

    // Emit tab switch event
    const tabSwitchEvent: TabSwitchEvent = {
      type: 'tab_switch',
      fromTab: tabState.activeTabId,
      toTab: newTabId,
      trigger,
      timestamp: Date.now()
    }
    EventBus.emit('tab:switch', tabSwitchEvent)

    // Enhanced visual feedback for switching
    setSwitchingAnimation(true)
    if (trigger === 'collision') {
      setHighlightedTab(newTabId)
    }

    setTabState(prev => ({
      ...prev,
      animationState: 'switching',
      switchDirection: direction,
      lastSwitchTrigger: trigger
    }))

    // Complete the switch after animation starts
    setTimeout(() => {
      setTabState(prev => ({
        ...prev,
        activeTabId: newTabId,
        animationState: 'idle'
      }))
      setSwitchingAnimation(false)
      onTabChange?.(newTabId)
    }, 300)

    // Clear highlight after a delay
    if (trigger === 'collision') {
      setTimeout(() => {
        setHighlightedTab(null)
      }, 2000)
    }
  }

  // Set up event bus listeners for collision and click events
  useEffect(() => {
    const handleCollisionStart = (event: CollisionEvent) => {
      // 性能优化：只有在player-interaction标签页可用时才处理collision
      const playerInteractionTab = tabs.find(tab => tab.id === 'player-interaction')
      if (!playerInteractionTab) {
        // Social标签页被禁用，跳过collision处理以节省CPU
        return
      }

      setCurrentCollisionPlayer(event.targetPlayer)
      setHighlightedTab(playerInteractionTab.id)
      handleTabSwitch(playerInteractionTab.id, 'collision')
    }

    const handleCollisionEnd = (event: CollisionEvent) => {
      // 性能优化：只有在player-interaction标签页可用时才处理collision end
      const playerInteractionTab = tabs.find(tab => tab.id === 'player-interaction')
      if (!playerInteractionTab) {
        // Social标签页被禁用，跳过collision end处理以节省CPU
        return
      }

      setCurrentCollisionPlayer(null)

      // Switch back to default tab when collision ends (only if switched by collision)
      const defaultTab = tabs.find(tab => tab.id === 'status-info')
      if (defaultTab && tabState.activeTabId === 'player-interaction' && tabState.lastSwitchTrigger === 'collision') {
        handleTabSwitch(defaultTab.id, 'auto')
      }
    }

    const handlePlayerClick = (event: any) => {
      // 性能优化：只有在player-interaction标签页可用时才处理click
      const playerInteractionTab = tabs.find(tab => tab.id === 'player-interaction')
      if (!playerInteractionTab) {
        // Social标签页被禁用，跳过click处理以节省CPU
        return
      }

      // Check if there's an active collision - collision has priority over click
      if (currentCollisionPlayer) {
        return
      }

      // Set the clicked player as current interaction player
      setCurrentCollisionPlayer(event.targetPlayer)
      setHighlightedTab(playerInteractionTab.id)
      handleTabSwitch(playerInteractionTab.id, 'manual')

      // Auto-clear click interaction after a delay
      setTimeout(() => {
        if (!currentCollisionPlayer && tabState.activeTabId === 'player-interaction' && tabState.lastSwitchTrigger === 'manual') {
          setCurrentCollisionPlayer(null)
          const defaultTab = tabs.find(tab => tab.id === 'status-info')
          if (defaultTab) {
            handleTabSwitch(defaultTab.id, 'auto')
          }
        }
      }, 10000)
    }


    // Subscribe to collision and click events
    EventBus.on('player:collision:start', handleCollisionStart)
    EventBus.on('player:collision:end', handleCollisionEnd)
    EventBus.on('player:click', handlePlayerClick)

    // Cleanup on unmount
    return () => {
      EventBus.off('player:collision:start', handleCollisionStart)
      EventBus.off('player:collision:end', handleCollisionEnd)
      EventBus.off('player:click', handlePlayerClick)
    }
  }, [tabs, tabState.activeTabId, tabState.lastSwitchTrigger, currentCollisionPlayer])

  // Legacy collision player prop support (for backward compatibility)
  useEffect(() => {
    if (collisionPlayer && !currentCollisionPlayer) {
      setCurrentCollisionPlayer(collisionPlayer)
      const playerInteractionTab = tabs.find(tab => tab.id === 'player-interaction')
      if (playerInteractionTab) {
        handleTabSwitch(playerInteractionTab.id, 'collision')
      }
    } else if (!collisionPlayer && currentCollisionPlayer) {
      setCurrentCollisionPlayer(null)
      const defaultTab = tabs.find(tab => tab.id === 'status-info')
      if (defaultTab && tabState.activeTabId === 'player-interaction') {
        handleTabSwitch(defaultTab.id, 'auto')
      }
    }
  }, [collisionPlayer, currentCollisionPlayer, tabs, tabState.activeTabId])

  // Update active tab when prop changes
  useEffect(() => {
    if (activeTab && activeTab !== tabState.activeTabId) {
      handleTabSwitch(activeTab, 'manual')
    }
  }, [activeTab])

  // Responsive tab layout configuration
  const getTabLayoutClasses = () => {
    if (isMobile) {
      return {
        container: 'flex flex-col h-full',
        tabNavigation: screenSize.width < 480 
          ? 'flex overflow-x-auto scrollbar-hide border-b border-retro-border bg-retro-dark/50' 
          : 'flex border-b border-retro-border bg-retro-dark/50',
        tabButton: screenSize.width < 480 
          ? 'flex-shrink-0 flex items-center justify-center min-w-[60px] px-2 py-3 text-xs font-medium'
          : 'flex items-center space-x-2 px-3 py-3 text-sm font-medium',
        tabLabel: screenSize.width < 480 ? 'hidden' : 'hidden xs:inline',
        tabIcon: screenSize.width < 480 ? 'text-base' : 'text-lg'
      }
    } else if (isTablet) {
      return {
        container: 'flex flex-col h-full',
        tabNavigation: 'flex border-b border-retro-border bg-retro-dark/50',
        tabButton: 'flex items-center space-x-2 px-3 py-3 text-sm font-medium',
        tabLabel: 'hidden sm:inline',
        tabIcon: 'text-lg'
      }
    } else {
      return {
        container: 'flex flex-col h-full',
        tabNavigation: 'flex border-b border-retro-border bg-retro-dark/50',
        tabButton: 'flex items-center space-x-2 px-4 py-3 text-sm font-medium',
        tabLabel: 'inline',
        tabIcon: 'text-lg'
      }
    }
  }

  const tabLayout = getTabLayoutClasses()

  return (
    <div className={`${tabLayout.container} ${className}`}>
      {/* Tab Navigation - Responsive */}
      <div className={tabLayout.tabNavigation}>
        {tabs.map((tab, index) => {
          const isActive = tab.id === tabState.activeTabId
          const isHighlighted = tab.id === 'player-interaction' && (currentCollisionPlayer || collisionPlayer)
          const isHighlightedBySwitch = highlightedTab === tab.id
          const isSwitching = switchingAnimation && isActive
          const isClickInteraction = tabState.lastSwitchTrigger === 'manual' && isActive && tab.id === 'player-interaction'
          const isCollisionInteraction = tabState.lastSwitchTrigger === 'collision' && isActive && tab.id === 'player-interaction'
          
          return (
            <button
              key={tab.id}
              onClick={() => handleTabSwitch(tab.id, 'manual')}
              className={`
                relative ${tabLayout.tabButton} transition-all duration-300 transform
                ${isActive 
                  ? 'text-white bg-gradient-to-r from-retro-purple/30 to-retro-pink/30 border-b-2 border-retro-purple shadow-lg' 
                  : 'text-retro-textMuted hover:text-white hover:bg-retro-purple/10 hover:scale-105'
                }
                ${isHighlighted || isHighlightedBySwitch ? 'animate-pulse bg-gradient-to-r from-retro-pink/40 to-retro-purple/40 shadow-lg shadow-retro-pink/50' : ''}
                ${isCollisionInteraction ? 'bg-gradient-to-r from-retro-pink/30 to-retro-purple/30 shadow-lg shadow-retro-pink/30' : ''}
                ${isClickInteraction ? 'bg-gradient-to-r from-retro-blue/30 to-retro-cyan/30 shadow-lg shadow-retro-blue/30' : ''}
                ${isSwitching ? 'animate-bounce' : ''}
                ${index === 0 ? 'rounded-tl-lg' : ''}
                ${index === tabs.length - 1 ? 'rounded-tr-lg' : ''}
                hover:shadow-md active:scale-95
                ${isMobile && screenSize.width < 480 ? 'min-w-[60px]' : ''}
              `}
            >
              {/* Tab Icon with enhanced animations */}
              <span className={`${tabLayout.tabIcon} transition-all duration-300 ${
                isActive ? 'scale-110' : ''
              } ${
                isHighlighted || isHighlightedBySwitch ? 'animate-bounce' : ''
              }`}>
                {tab.icon}
              </span>
              
              {/* Tab Label - Responsive visibility */}
              <span className={tabLayout.tabLabel}>{tab.label}</span>
              
              {/* Enhanced Badge with animation - Responsive positioning */}
              {tab.badge && tab.badge > 0 && (
                <NotificationBadge
                  count={tab.badge}
                  size={isMobile && screenSize.width < 480 ? 'sm' : 'md'}
                  variant="pulse"
                  position="top-right"
                  animate={true}
                />
              )}
              
              {/* Enhanced Collision indicator */}
              {(isHighlighted || isHighlightedBySwitch) && (
                <>
                  <div className="absolute top-1 right-1 w-2 h-2 bg-retro-pink rounded-full animate-ping"></div>
                  <div className="absolute top-1 right-1 w-2 h-2 bg-retro-pink rounded-full"></div>
                </>
              )}
              
              
              {/* Active tab glow effect */}
              {isActive && (
                <div className="absolute inset-0 bg-gradient-to-r from-retro-purple/20 to-retro-pink/20 rounded-lg blur-sm -z-10"></div>
              )}
              
              {/* Switching animation overlay */}
              {isSwitching && (
                <div className="absolute inset-0 bg-gradient-to-r from-retro-blue/30 to-retro-cyan/30 rounded-lg animate-pulse"></div>
              )}
            </button>
          )
        })}
      </div>

      {/* Tab Content - 性能优化：只渲染活跃的标签页组件 */}
      <div className="flex-1 relative overflow-hidden">
        {tabs.map((tab) => {
          const isTabActive = tab.id === tabState.activeTabId;

          // 性能优化：只渲染活跃的标签页，避免所有组件同时运行造成CPU消耗
          if (!isTabActive) {
            return null;
          }

          const TabComponent = tab.component;

          return (
            <div
              key={tab.id}
              className={`
                absolute inset-0 transition-all duration-300 ease-in-out
                ${tabState.animationState === 'switching'
                  ? `transform ${tabState.switchDirection === 'right' ? 'translate-x-full scale-95' : '-translate-x-full scale-95'} opacity-0 blur-sm`
                  : 'transform translate-x-0 scale-100 opacity-100 blur-0'
                }
              `}
            >
              <TabComponent
                collisionPlayer={currentCollisionPlayer || collisionPlayer}
                isActive={isTabActive}
                isMobile={isMobile}
                isTablet={isTablet}
              />
            </div>
          );
        })}
        
        {/* Enhanced Loading state during animation */}
        {tabState.animationState === 'switching' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-retro-bg-dark/80 to-retro-bg-darker/80 backdrop-blur-sm z-10">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-3 h-3 bg-retro-purple rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-3 h-3 bg-retro-pink rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-3 h-3 bg-retro-blue rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
            <div className="text-center">
              <div className="text-white text-sm font-medium mb-1">切换标签页</div>
              <div className="text-retro-textMuted text-xs">
                {tabState.lastSwitchTrigger === 'collision' ? '检测到玩家碰撞' : '正在切换...'}
              </div>
            </div>
            
            {/* Animated progress bar */}
            <div className="w-32 h-1 bg-retro-border rounded-full mt-4 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-retro-purple to-retro-pink rounded-full animate-pulse"></div>
            </div>
          </div>
        )}
        
      </div>
    </div>
  )
}
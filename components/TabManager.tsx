'use client'

import { useState, useEffect, useRef, useCallback, ReactNode, ComponentType } from 'react'
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
  className = '',
  isMobile = false,
  isTablet = false
}: TabManagerProps) {
  console.log('🔵 [TabManager] Component rendering/re-rendering')

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

  // 监控 currentCollisionPlayer 变化
  useEffect(() => {
    console.log('🔄 [TabManager] currentCollisionPlayer changed:', currentCollisionPlayer)
  }, [currentCollisionPlayer])

  // 使用 refs 来访问最新状态和函数，避免 EventBus 监听器闭包问题
  const tabsRef = useRef(tabs)
  const tabStateRef = useRef(tabState)
  const currentCollisionPlayerRef = useRef(currentCollisionPlayer)
  const handleTabSwitchRef = useRef<any>(null)

  // 更新 refs
  useEffect(() => {
    tabsRef.current = tabs
    tabStateRef.current = tabState
    currentCollisionPlayerRef.current = currentCollisionPlayer
  }, [tabs, tabState, currentCollisionPlayer])

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
    // 如果是同一个标签页，只更新 trigger（用于点击同一标签页但不同玩家的情况）
    if (newTabId === tabState.activeTabId) {
      console.log('🔄 [TabManager] Same tab, updating trigger:', { tabId: newTabId, trigger })
      setTabState(prev => ({
        ...prev,
        lastSwitchTrigger: trigger
      }))
      return
    }

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

  // 保存 handleTabSwitch 的引用到 ref
  useEffect(() => {
    handleTabSwitchRef.current = handleTabSwitch
  })

  // 使用 useCallback 定义事件处理函数，保持引用稳定
  const handleCollisionStart = useCallback((event: CollisionEvent) => {
    console.log('🎯 [TabManager] handleCollisionStart called with event:', event)
    const playerInteractionTab = tabsRef.current.find(tab => tab.id === 'player-interaction')
    if (!playerInteractionTab) {
      console.warn('⚠️ [TabManager] player-interaction tab not found in handleCollisionStart')
      return
    }

    console.log('🎯 [TabManager] Collision detected, full event:', event)
    console.log('🎯 [TabManager] Target player data:', event.targetPlayer)

    setCurrentCollisionPlayer(event.targetPlayer)
    setHighlightedTab(playerInteractionTab.id)
    handleTabSwitchRef.current?.(playerInteractionTab.id, 'collision')
  }, [])

  const handleCollisionEnd = useCallback((event: CollisionEvent) => {
    const playerInteractionTab = tabsRef.current.find(tab => tab.id === 'player-interaction')
    if (!playerInteractionTab) {
      return
    }

    console.log('🔚 [TabManager] Collision ended, switching back to Profile tab:', event.targetPlayer)
    setCurrentCollisionPlayer(null)

    const defaultTab = tabsRef.current.find(tab => tab.id === 'status-info')
    if (defaultTab &&
        tabStateRef.current.activeTabId === 'player-interaction' &&
        tabStateRef.current.lastSwitchTrigger === 'collision') {
      handleTabSwitchRef.current?.(defaultTab.id, 'auto')
    }
  }, [])

  const handlePlayerClickEvent = useCallback((event: any) => {
    console.log('👆 [TabManager] handlePlayerClickEvent called with event:', event)
    console.log('👆 [TabManager] Player click detected, full event:', event)

    const playerInteractionTab = tabsRef.current.find(tab => tab.id === 'player-interaction')
    if (!playerInteractionTab) {
      console.warn('⚠️ [TabManager] player-interaction tab not found, skipping')
      return
    }

    console.log('👆 [TabManager] Target player data:', event.targetPlayer)
    console.log('👆 [TabManager] Setting currentCollisionPlayer to:', event.targetPlayer)

    setCurrentCollisionPlayer(event.targetPlayer)
    setHighlightedTab(playerInteractionTab.id)
    handleTabSwitchRef.current?.(playerInteractionTab.id, 'manual')

    // 验证设置后的值
    setTimeout(() => {
      console.log('✅ [TabManager] currentCollisionPlayer after setState:', currentCollisionPlayerRef.current)
    }, 100)
  }, [])

  // Set up event bus listeners - 使用稳定的 useCallback 函数
  useEffect(() => {
    console.log('📡 [TabManager] useEffect for EventBus registration RUNNING')
    console.log('📡 [TabManager] Callback references:', {
      handleCollisionStart: typeof handleCollisionStart,
      handleCollisionEnd: typeof handleCollisionEnd,
      handlePlayerClickEvent: typeof handlePlayerClickEvent
    })

    console.log('📡 [TabManager] Registering EventBus listeners...')

    EventBus.on('player:collision:start', handleCollisionStart)
    console.log('📡 [TabManager] Registered player:collision:start, count:', EventBus.listenerCount('player:collision:start'))

    EventBus.on('player:collision:end', handleCollisionEnd)
    console.log('📡 [TabManager] Registered player:collision:end, count:', EventBus.listenerCount('player:collision:end'))

    EventBus.on('player:click', handlePlayerClickEvent)
    console.log('📡 [TabManager] Registered player:click, count:', EventBus.listenerCount('player:click'))

    console.log('📡 [TabManager] All EventBus listeners registered:', {
      'player:collision:start': EventBus.listenerCount('player:collision:start'),
      'player:collision:end': EventBus.listenerCount('player:collision:end'),
      'player:click': EventBus.listenerCount('player:click')
    })

    return () => {
      console.log('🧹 [TabManager] Cleanup function RUNNING - removing EventBus listeners')
      EventBus.off('player:collision:start', handleCollisionStart)
      EventBus.off('player:collision:end', handleCollisionEnd)
      EventBus.off('player:click', handlePlayerClickEvent)
      console.log('🧹 [TabManager] Cleanup complete, remaining listeners:', {
        'player:collision:start': EventBus.listenerCount('player:collision:start'),
        'player:collision:end': EventBus.listenerCount('player:collision:end'),
        'player:click': EventBus.listenerCount('player:click')
      })
    }
  }, [handleCollisionStart, handleCollisionEnd, handlePlayerClickEvent])

  // 注意：collision处理现在完全由EventBus驱动，无需外部prop支持

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
          const isHighlighted = tab.id === 'player-interaction' && currentCollisionPlayer
          const isHighlightedBySwitch = highlightedTab === tab.id
          const isSwitching = switchingAnimation && isActive
          const isClickInteraction = tabState.lastSwitchTrigger === 'manual' && isActive && tab.id === 'player-interaction'
          const isCollisionInteraction = tabState.lastSwitchTrigger === 'collision' && isActive && tab.id === 'player-interaction'
          
          return (
            <button
              key={tab.id}
              onClick={() => handleTabSwitch(tab.id, 'manual')}
              className={`
                relative ${tabLayout.tabButton}  transform
                ${isActive
                  ? 'text-white bg-gradient-to-r from-cyan-600/30 to-teal-600/30 border-b-2 border-cyan-500 shadow-lg shadow-cyan-500/20'
                  : 'text-retro-textMuted hover:text-white hover:bg-cyan-600/10 hover:scale-105'
                }
                ${isHighlighted || isHighlightedBySwitch ? ' bg-gradient-to-r from-cyan-500/40 to-teal-500/40 shadow-lg shadow-cyan-500/50' : ''}
                ${isCollisionInteraction ? 'bg-gradient-to-r from-cyan-500/30 to-teal-500/30 shadow-lg shadow-cyan-500/30' : ''}
                ${isClickInteraction ? 'bg-gradient-to-r from-cyan-600/30 to-teal-600/30 shadow-lg shadow-cyan-500/30' : ''}
                ${isSwitching ? '' : ''}
                ${index === 0 ? 'rounded-tl-lg' : ''}
                ${index === tabs.length - 1 ? 'rounded-tr-lg' : ''}
                hover:shadow-md active:scale-95
                ${isMobile && screenSize.width < 480 ? 'min-w-[60px]' : ''}
              `}
            >
              {/* Tab Icon with enhanced animations */}
              <span className={`${tabLayout.tabIcon}  ${
                isActive ? 'scale-110' : ''
              } ${
                isHighlighted || isHighlightedBySwitch ? '' : ''
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
                  <div className="absolute top-1 right-1 w-2 h-2 bg-cyan-400 rounded-full "></div>
                  <div className="absolute top-1 right-1 w-2 h-2 bg-cyan-400 rounded-full"></div>
                </>
              )}


              {/* Active tab glow effect */}
              {isActive && (
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-600/20 to-teal-600/20 rounded-lg blur-sm -z-10"></div>
              )}

              {/* Switching animation overlay */}
              {isSwitching && (
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-600/30 to-teal-600/30 rounded-lg "></div>
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

          // 调试：显示传递给组件的 collisionPlayer
          if (tab.id === 'player-interaction' && isTabActive) {
            console.log('🔄 [TabManager] Rendering PlayerInteractionTab with collisionPlayer:', currentCollisionPlayer)
          }

          return (
            <div
              key={tab.id}
              className={`
                absolute inset-0  ease-in-out
                ${tabState.animationState === 'switching'
                  ? `transform ${tabState.switchDirection === 'right' ? 'translate-x-full scale-95' : '-translate-x-full scale-95'} opacity-0 blur-sm`
                  : 'transform translate-x-0 scale-100 opacity-100 blur-0'
                }
              `}
            >
              <TabComponent
                collisionPlayer={currentCollisionPlayer}
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
              <div className="w-3 h-3 bg-cyan-500 rounded-full " style={{ animationDelay: '0ms' }}></div>
              <div className="w-3 h-3 bg-teal-500 rounded-full " style={{ animationDelay: '150ms' }}></div>
              <div className="w-3 h-3 bg-cyan-400 rounded-full " style={{ animationDelay: '300ms' }}></div>
            </div>
            <div className="text-center">
              <div className="text-white text-sm font-medium mb-1">切换标签页</div>
              <div className="text-retro-textMuted text-xs">
                {tabState.lastSwitchTrigger === 'collision' ? '检测到玩家碰撞' : '正在切换...'}
              </div>
            </div>

            {/* Animated progress bar */}
            <div className="w-32 h-1 bg-retro-border rounded-full mt-4 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-cyan-500 to-teal-500 rounded-full "></div>
            </div>
          </div>
        )}
        
      </div>
    </div>
  )
}
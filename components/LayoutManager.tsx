'use client'

import { useState, useEffect, ReactNode, useCallback, useMemo } from 'react'
import { EventBus } from '@/lib/eventBus'

/**
 * Props for the LayoutManager component
 */
export interface LayoutManagerProps {
  /** Game component to be displayed in the center area */
  gameComponent: ReactNode
  /** Left panel component (profile, workstation info) */
  leftPanel: ReactNode
  /** Right panel component (social, posts) */
  rightPanel: ReactNode
  /** Optional CSS class name for custom styling */
  className?: string
  /** Optional callback when layout changes */
  onLayoutChange?: (deviceType: DeviceType) => void
  /** Left panel collapsed state */
  leftPanelCollapsed?: boolean
  /** Right panel collapsed state */
  rightPanelCollapsed?: boolean
}

/**
 * Device type enumeration for better type safety
 */
export type DeviceType = 'mobile' | 'tablet' | 'desktop'

/**
 * Screen orientation type
 */
export type Orientation = 'portrait' | 'landscape'

/**
 * Panel position type
 */
export type PanelPosition = 'left' | 'right' | 'top' | 'bottom'

/**
 * Area configuration interface
 */
interface AreaConfig {
  width: string
  height: string
}

/**
 * Panel configuration interface extending area config
 */
interface PanelConfig extends AreaConfig {
  position: PanelPosition
}

/**
 * Layout configuration for different device types
 */
export interface LayoutConfig {
  desktop: {
    leftPanel: PanelConfig
    gameArea: AreaConfig
    rightPanel: PanelConfig
  }
  tablet: {
    leftPanel: PanelConfig
    gameArea: AreaConfig
    rightPanel: PanelConfig
  }
  mobile: {
    gameArea: AreaConfig
    leftPanel: PanelConfig
    rightPanel: PanelConfig
  }
}

/**
 * Screen size and device information
 */
export interface ScreenSize {
  width: number
  height: number
  deviceType: DeviceType
  orientation: Orientation
}

/**
 * Default layout configuration for different device types
 * Three-column layout: Left Panel | Game Area | Right Panel
 */
const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  desktop: {
    leftPanel: {
      width: '360px',
      height: '100vh',
      position: 'left'
    },
    gameArea: {
      width: 'calc(100% - 760px)',
      height: '100vh'
    },
    rightPanel: {
      width: '400px',
      height: '100vh',
      position: 'right'
    }
  },
  tablet: {
    leftPanel: {
      width: '300px',
      height: '100vh',
      position: 'left'
    },
    gameArea: {
      width: 'calc(100% - 640px)',
      height: '100vh'
    },
    rightPanel: {
      width: '340px',
      height: '100vh',
      position: 'right'
    }
  },
  mobile: {
    gameArea: {
      width: '100%',
      height: '50vh'
    },
    leftPanel: {
      width: '50%',
      height: '50vh',
      position: 'bottom'
    },
    rightPanel: {
      width: '50%',
      height: '50vh',
      position: 'bottom'
    }
  }
} as const

/**
 * Responsive breakpoints for device detection
 * Optimized for three-column layout
 */
export const BREAKPOINTS = {
  mobile: 768,    // 小于768px为移动设备
  tablet: 1024,   // 768px-1024px为平板设备
  desktop: 1200   // 大于1200px为桌面设备
} as const

/**
 * Animation and transition constants
 */
const ANIMATION_CONFIG = {
  transitionDuration: 300,
  debounceDelay: 150,
  resizeThreshold: 50
} as const

/**
 * LayoutManager Component
 *
 * Manages responsive three-column layout for game and panel components.
 * Layout: Left Panel | Game Area | Right Panel
 * Automatically adapts to different screen sizes and orientations.
 *
 * @param props - LayoutManager props
 * @returns JSX element with responsive layout
 */
export default function LayoutManager({
  gameComponent,
  leftPanel,
  rightPanel,
  className = '',
  onLayoutChange,
  leftPanelCollapsed = false,
  rightPanelCollapsed = false
}: LayoutManagerProps) {
  // State management
  const [screenSize, setScreenSize] = useState<ScreenSize>({
    width: 0,
    height: 0,
    deviceType: 'desktop',
    orientation: 'landscape'
  })
  const [layoutConfig] = useState<LayoutConfig>(DEFAULT_LAYOUT_CONFIG)
  const [activeTab, setActiveTab] = useState<'world' | 'workspace' | 'social'>('world')

  // 锁定/解锁页面滚动 (保护工作区布局)
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.width = '100%'
    document.body.style.height = '100%'

    return () => {
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
      document.body.style.height = ''
    }
  }, [])

  useEffect(() => {
    console.log('📱 [LayoutManager] State Update:', {
      deviceType: screenSize.deviceType,
      activeTab,
      width: screenSize.width,
      height: screenSize.height
    })
  }, [screenSize, activeTab])

  // 收起面板的宽度
  const COLLAPSED_PANEL_WIDTH = 48



  /**
   * Utility function to determine device type based on screen width
   */
  const getDeviceType = useCallback((width: number): DeviceType => {
    if (width < BREAKPOINTS.mobile) return 'mobile'
    if (width < BREAKPOINTS.desktop) return 'tablet'
    return 'desktop'
  }, [])

  /**
   * Utility function to determine screen orientation
   */
  const getOrientation = useCallback((width: number, height: number): Orientation => {
    return width > height ? 'landscape' : 'portrait'
  }, [])

  /**
   * Get current screen size and device information
   */
  const getCurrentScreenSize = useCallback((): ScreenSize => {
    // Server-side rendering fallback
    if (typeof window === 'undefined') {
      return {
        width: 1920,
        height: 1080,
        deviceType: 'desktop',
        orientation: 'landscape'
      }
    }

    const width = window.innerWidth
    const height = window.innerHeight
    const deviceType = getDeviceType(width)
    const orientation = getOrientation(width, height)

    return { width, height, deviceType, orientation }
  }, [getDeviceType, getOrientation])

  /**
   * Check if screen size change is significant enough to trigger layout update
   */
  const isSignificantSizeChange = useCallback((
    newSize: ScreenSize,
    prevSize: ScreenSize
  ): boolean => {
    return (
      newSize.deviceType !== prevSize.deviceType ||
      newSize.orientation !== prevSize.orientation ||
      Math.abs(newSize.width - prevSize.width) > ANIMATION_CONFIG.resizeThreshold
    )
  }, [])

  // Initialize screen size and set up resize listener
  useEffect(() => {

    // Set initial screen size
    const initialScreenSize = getCurrentScreenSize()
    setScreenSize(initialScreenSize)

    // Debounced resize handler to prevent excessive updates
    let resizeTimeout: NodeJS.Timeout
    const debouncedResize = () => {
      clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(() => {
        const newScreenSize = getCurrentScreenSize()

        // Only update if change is significant
        setScreenSize(prevScreenSize => {
          if (isSignificantSizeChange(newScreenSize, prevScreenSize)) {
            // Notify parent component of layout change
            onLayoutChange?.(newScreenSize.deviceType)

            return newScreenSize
          }
          return prevScreenSize
        })
      }, ANIMATION_CONFIG.debounceDelay)
    }

    window.addEventListener('resize', debouncedResize)
    window.addEventListener('orientationchange', debouncedResize)

    return () => {
      window.removeEventListener('resize', debouncedResize)
      window.removeEventListener('orientationchange', debouncedResize)
      clearTimeout(resizeTimeout)
    }
  }, []) // Empty dependency array to run only once

  // Listen for collision events to switch tabs on mobile
  useEffect(() => {
    if (screenSize.deviceType !== 'mobile') return

    const handleInteraction = () => {
      console.log('🎯 [LayoutManager] Interaction detected on mobile, switching to social tab')
      setActiveTab('social')
    }

    EventBus.on('player:collision:start', handleInteraction)
    EventBus.on('player:click', handleInteraction)

    return () => {
      EventBus.off('player:collision:start', handleInteraction)
      EventBus.off('player:click', handleInteraction)
    }
  }, [screenSize.deviceType])

  // Memoized layout configuration based on current screen size and panel states
  const currentLayoutConfig = useMemo(() => {
    const baseConfig = layoutConfig[screenSize.deviceType]

    // 计算实际面板宽度
    const leftPanelWidth = leftPanelCollapsed ? COLLAPSED_PANEL_WIDTH : parseInt(baseConfig.leftPanel.width)
    const rightPanelWidth = rightPanelCollapsed ? COLLAPSED_PANEL_WIDTH : parseInt(baseConfig.rightPanel.width)

    // 计算游戏区域宽度
    const gameAreaWidth = `calc(100% - ${leftPanelWidth + rightPanelWidth}px)`

    return {
      ...baseConfig,
      leftPanel: {
        ...baseConfig.leftPanel,
        width: `${leftPanelWidth}px`
      },
      rightPanel: {
        ...baseConfig.rightPanel,
        width: `${rightPanelWidth}px`
      },
      gameArea: {
        ...baseConfig.gameArea,
        width: gameAreaWidth
      }
    }
  }, [screenSize.deviceType, layoutConfig, leftPanelCollapsed, rightPanelCollapsed, COLLAPSED_PANEL_WIDTH])

  // CSS classes without animations
  const layoutClasses = useMemo(() => {
    return {
      container: className,
      gameArea: 'relative overflow-hidden',
      infoPanel: 'overflow-hidden'
    }
  }, [className])

  /**
   * Render mobile layout component
   */
  const renderMobileLayout = useCallback(() => {
    // Mobile layout: Tabbed navigation
    return (
      <div className={`fixed inset-0 flex flex-col bg-gray-950 select-none ${layoutClasses.container}`}>
        {/* Main Content Area */}
        <div className="flex-1 relative overflow-hidden min-h-0">
          {/* World Tab (Game) */}
          <div
            className={`absolute inset-0 transition-opacity duration-300 ${activeTab === 'world' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}
          >
            <div className="w-full h-full bg-gray-900 overflow-hidden relative touch-none">
              {gameComponent}
            </div>
          </div>

          {/* Workspace Tab (Left Panel) */}
          <div
            className={`absolute inset-0 transition-transform duration-300 transform bg-gray-950 ${activeTab === 'workspace' ? 'translate-x-0 z-10' : '-translate-x-full z-0 pointer-events-none'}`}
          >
            <div className="w-full h-full p-2 overflow-y-auto overscroll-contain">
              <div className="bg-gray-900/95 rounded-lg border border-gray-800 backdrop-blur-sm min-h-full overflow-hidden">
                {leftPanel}
              </div>
            </div>
          </div>

          {/* Social Tab (Right Panel) */}
          <div
            className={`absolute inset-0 transition-transform duration-300 transform bg-gray-950 ${activeTab === 'social' ? 'translate-x-0 z-10' : 'translate-x-full z-0 pointer-events-none'}`}
          >
            <div className="w-full h-full p-2 overflow-y-auto overscroll-contain">
              <div className="bg-gray-900/95 rounded-lg border border-gray-800 backdrop-blur-sm min-h-full overflow-hidden">
                {rightPanel}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Navigation Bar */}
        <div className="h-16 bg-gray-900/95 border-t border-gray-800 backdrop-blur-md flex items-center justify-around px-4 pb-safe flex-shrink-0">
          <button
            onClick={() => setActiveTab('workspace')}
            className={`flex flex-col items-center gap-1 flex-1 transition-all ${activeTab === 'workspace' ? 'text-blue-400' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <div className={`p-1.5 rounded-lg transition-colors ${activeTab === 'workspace' ? 'bg-blue-500/10' : 'bg-transparent'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
            </div>
            <span className="text-[10px] font-medium font-inter">工位</span>
          </button>

          <button
            onClick={() => setActiveTab('world')}
            className={`flex flex-col items-center gap-1 flex-1 transition-all ${activeTab === 'world' ? 'text-blue-400' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <div className={`p-1.5 rounded-lg transition-colors ${activeTab === 'world' ? 'bg-blue-500/10' : 'bg-transparent'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"></path><path d="M2 12h20"></path></svg>
            </div>
            <span className="text-[10px] font-medium font-inter">世界</span>
          </button>

          <button
            onClick={() => setActiveTab('social')}
            className={`flex flex-col items-center gap-1 flex-1 transition-all ${activeTab === 'social' ? 'text-blue-400' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <div className={`p-1.5 rounded-lg transition-colors ${activeTab === 'social' ? 'bg-blue-500/10' : 'bg-transparent'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 6.1H3" /><path d="M21 12.1H3" /><path d="M15.1 18H3" /></svg>
            </div>
            <span className="text-[10px] font-medium font-inter">社交</span>
          </button>
        </div>
      </div>
    )
  }, [activeTab, gameComponent, leftPanel, rightPanel, layoutClasses])

  /**
   * Render desktop/tablet three-column layout
   */
  const renderThreeColumnLayout = useCallback(() => {
    return (
      <div className={`flex h-screen bg-gray-950 ${layoutClasses.container}`}>
        {/* Left Panel - Profile & Workstation Info */}
        <div
          className={`${layoutClasses.infoPanel} ui-container bg-gray-900/95 border-r border-gray-800 flex flex-col backdrop-blur-sm`}
          style={{
            width: currentLayoutConfig.leftPanel.width,
            height: currentLayoutConfig.leftPanel.height
          }}
          data-ui-element="left-panel"
        >
          <div className="relative z-10 h-full">
            {leftPanel}
          </div>
        </div>

        {/* Center Game Area - Inset Shadow Effect */}
        <div
          className={`${layoutClasses.gameArea} bg-gray-900 relative p-4`}
          style={{
            width: currentLayoutConfig.gameArea.width,
            height: currentLayoutConfig.gameArea.height
          }}
        >
          <div className="w-full h-full bg-gray-800 rounded-lg shadow-inner shadow-gray-950/50 border border-gray-800/50">
            <div className="relative z-10 h-full rounded-lg overflow-hidden">
              {gameComponent}
            </div>
          </div>
        </div>

        {/* Right Panel - Social & Posts */}
        <div
          className={`${layoutClasses.infoPanel} ui-container bg-gray-900/95 border-l border-gray-800 flex flex-col backdrop-blur-sm`}
          style={{
            width: currentLayoutConfig.rightPanel.width,
            height: currentLayoutConfig.rightPanel.height
          }}
          data-ui-element="right-panel"
        >
          <div className="relative z-10 h-full">
            {rightPanel}
          </div>
        </div>
      </div>
    )
  }, [currentLayoutConfig, layoutClasses, gameComponent, leftPanel, rightPanel])

  /**
   * Render transition indicator (disabled)
   */
  const renderTransitionIndicator = useCallback(() => {
    return null
  }, [])

  // Render appropriate layout based on device type
  switch (screenSize.deviceType) {
    case 'mobile':
      return (
        <>
          {renderMobileLayout()}
          {renderTransitionIndicator()}
        </>
      )

    case 'tablet':
    case 'desktop':
    default:
      return (
        <>
          {renderThreeColumnLayout()}
          {renderTransitionIndicator()}
        </>
      )
  }
}
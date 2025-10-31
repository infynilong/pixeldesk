'use client'

import { useState, useEffect, ReactNode, useCallback, useMemo } from 'react'

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
    // Mobile layout: game on top, two panels below side by side
    return (
      <div className={`flex flex-col h-screen bg-gray-950 ${layoutClasses.container}`}>
        {/* Game area with inset shadow */}
        <div
          className={`${layoutClasses.gameArea} bg-gray-900 p-3 border-b border-gray-800 relative overflow-hidden`}
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

        {/* Bottom panels side by side */}
        <div className="flex flex-1 bg-gray-950 gap-1">
          <div
            className={`${layoutClasses.infoPanel} ui-container bg-gray-900/95 border-r border-gray-800 flex flex-col overflow-hidden backdrop-blur-sm`}
            style={{
              width: currentLayoutConfig.leftPanel.width,
              height: currentLayoutConfig.leftPanel.height
            }}
            data-ui-element="left-panel"
          >
            {leftPanel}
          </div>

          <div
            className={`${layoutClasses.infoPanel} ui-container bg-gray-900/95 flex flex-col overflow-hidden backdrop-blur-sm`}
            style={{
              width: currentLayoutConfig.rightPanel.width,
              height: currentLayoutConfig.rightPanel.height
            }}
            data-ui-element="right-panel"
          >
            {rightPanel}
          </div>
        </div>
      </div>
    )
  }, [screenSize, currentLayoutConfig, layoutClasses, gameComponent, leftPanel, rightPanel])

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
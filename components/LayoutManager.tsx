'use client'

import { useState, useEffect, ReactNode, useCallback, useMemo } from 'react'

/**
 * Props for the LayoutManager component
 */
export interface LayoutManagerProps {
  /** Game component to be displayed in the main area */
  gameComponent: ReactNode
  /** Information panel component to be displayed in the side area */
  infoPanel: ReactNode
  /** Optional CSS class name for custom styling */
  className?: string
  /** Optional callback when layout changes */
  onLayoutChange?: (deviceType: DeviceType) => void
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
    gameArea: AreaConfig
    infoPanel: PanelConfig
  }
  tablet: {
    gameArea: AreaConfig
    infoPanel: PanelConfig
  }
  mobile: {
    gameArea: AreaConfig
    infoPanel: PanelConfig
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
 * These values provide optimal user experience across devices
 */
const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  desktop: {
    gameArea: {
      width: 'calc(100% - 400px)',
      height: '100vh'
    },
    infoPanel: {
      width: '400px',
      height: '100vh',
      position: 'right'
    }
  },
  tablet: {
    gameArea: {
      width: 'calc(100% - 320px)',
      height: '100vh'
    },
    infoPanel: {
      width: '320px',
      height: '100vh',
      position: 'right'
    }
  },
  mobile: {
    gameArea: {
      width: '100%',
      height: '60vh'
    },
    infoPanel: {
      width: '100%',
      height: '40vh',
      position: 'bottom'
    }
  }
} as const

/**
 * Responsive breakpoints for device detection
 * Based on common device sizes and best practices
 */
export const BREAKPOINTS = {
  mobile: 640,
  tablet: 1024,
  desktop: 1280
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
 * Manages responsive layout for game and information panel components.
 * Automatically adapts to different screen sizes and orientations.
 * 
 * @param props - LayoutManager props
 * @returns JSX element with responsive layout
 */
export default function LayoutManager({ 
  gameComponent, 
  infoPanel, 
  className = '',
  onLayoutChange 
}: LayoutManagerProps) {
  // State management
  const [screenSize, setScreenSize] = useState<ScreenSize>({
    width: 0,
    height: 0,
    deviceType: 'desktop',
    orientation: 'landscape'
  })
  const [layoutConfig] = useState<LayoutConfig>(DEFAULT_LAYOUT_CONFIG)
  const [isTransitioning, setIsTransitioning] = useState(false)



  /**
   * Utility function to determine device type based on screen width
   */
  const getDeviceType = useCallback((width: number): DeviceType => {
    if (width < BREAKPOINTS.mobile) return 'mobile'
    if (width < BREAKPOINTS.tablet) return 'tablet'
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
            setIsTransitioning(true)
            
            // Notify parent component of layout change
            onLayoutChange?.(newScreenSize.deviceType)
            
            // Clear transition state after animation completes
            setTimeout(() => {
              setIsTransitioning(false)
            }, ANIMATION_CONFIG.transitionDuration)
            
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

  // Memoized layout configuration based on current screen size
  const currentLayoutConfig = useMemo(() => {
    return layoutConfig[screenSize.deviceType]
  }, [screenSize.deviceType, layoutConfig])

  // Memoized CSS classes for smooth transitions
  const layoutClasses = useMemo(() => {
    const baseClasses = 'transition-all duration-300 ease-in-out'
    const transitionClasses = isTransitioning ? 'opacity-90 scale-[0.99]' : 'opacity-100 scale-100'
    
    return {
      container: `${baseClasses} ${transitionClasses} ${className}`,
      gameArea: `${baseClasses} relative overflow-hidden`,
      infoPanel: `${baseClasses} overflow-hidden`
    }
  }, [isTransitioning, className])

  /**
   * Render mobile layout component
   */
  const renderMobileLayout = useCallback(() => {
    // Mobile landscape: try to fit side-by-side if screen is wide enough
    if (screenSize.orientation === 'landscape' && screenSize.width >= BREAKPOINTS.mobile) {
      return (
        <div className={`flex h-screen bg-gradient-to-br from-retro-bg-darker via-retro-bg-dark to-retro-bg-darker ${layoutClasses.container}`}>
          <div 
            className={`${layoutClasses.gameArea} bg-black/30`}
            style={{
              width: 'calc(100% - 280px)',
              height: currentLayoutConfig.gameArea.height
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-purple-900/10 pointer-events-none"></div>
            {gameComponent}
          </div>
          
          <div 
            className={`${layoutClasses.infoPanel} bg-retro-bg-darker/90 backdrop-blur-lg border-l border-retro-border flex flex-col`}
            style={{
              width: '280px',
              height: currentLayoutConfig.infoPanel.height
            }}
          >
            {infoPanel}
          </div>
        </div>
      )
    }
    
    // Mobile portrait: game on top, info on bottom
    return (
      <div className={`flex flex-col h-screen bg-gradient-to-b from-retro-bg-darker via-retro-bg-dark to-retro-bg-darker ${layoutClasses.container}`}>
        <div 
          className={`${layoutClasses.gameArea} bg-black/30`}
          style={{
            width: currentLayoutConfig.gameArea.width,
            height: currentLayoutConfig.gameArea.height
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-purple-900/10 pointer-events-none"></div>
          {gameComponent}
        </div>
        
        <div 
          className={`${layoutClasses.infoPanel} ui-container bg-retro-bg-darker/90 backdrop-blur-lg border-t border-retro-border flex flex-col`}
          style={{
            width: currentLayoutConfig.infoPanel.width,
            height: currentLayoutConfig.infoPanel.height
          }}
          data-ui-element="info-panel"
        >
          {infoPanel}
        </div>
      </div>
    )
  }, [screenSize, currentLayoutConfig, layoutClasses, gameComponent, infoPanel])

  /**
   * Render desktop/tablet layout component
   */
  const renderDesktopLayout = useCallback((opacity: string) => {
    return (
      <div className={`flex h-screen bg-gradient-to-br from-retro-bg-darker via-retro-bg-dark to-retro-bg-darker ${layoutClasses.container}`}>
        <div 
          className={`${layoutClasses.gameArea} bg-black/30`}
          style={{
            width: currentLayoutConfig.gameArea.width,
            height: currentLayoutConfig.gameArea.height
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-purple-900/10 pointer-events-none"></div>
          {gameComponent}
        </div>
        
        <div 
          className={`${layoutClasses.infoPanel} ui-container bg-retro-bg-darker/${opacity} backdrop-blur-lg border-l border-retro-border flex flex-col`}
          style={{
            width: currentLayoutConfig.infoPanel.width,
            height: currentLayoutConfig.infoPanel.height
          }}
          data-ui-element="info-panel"
        >
          {infoPanel}
        </div>
      </div>
    )
  }, [currentLayoutConfig, layoutClasses, gameComponent, infoPanel])

  /**
   * Render transition indicator
   */
  const renderTransitionIndicator = useCallback(() => {
    if (!isTransitioning) return null

    return (
      <div className="fixed top-4 right-4 z-50 bg-retro-bg-darker/90 backdrop-blur-sm border border-retro-border rounded-lg px-3 py-2">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-retro-blue rounded-full animate-pulse"></div>
          <span className="text-xs text-retro-text">调整布局中...</span>
        </div>
      </div>
    )
  }, [isTransitioning])

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
      return (
        <>
          {renderDesktopLayout('85')}
          {renderTransitionIndicator()}
        </>
      )
    
    case 'desktop':
    default:
      return (
        <>
          {renderDesktopLayout('80')}
          {renderTransitionIndicator()}
        </>
      )
  }
}
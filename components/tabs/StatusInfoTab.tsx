'use client'

import { ReactNode } from 'react'

interface StatusInfoTabProps {
  children?: ReactNode
  currentUser?: any
  workstationStats?: any
  isActive?: boolean
  isMobile?: boolean
  isTablet?: boolean
}

export default function StatusInfoTab({
  children,
  currentUser,
  workstationStats,
  isActive = false,
  isMobile = false,
  isTablet = false
}: StatusInfoTabProps) {
  // Responsive layout classes
  const containerPadding = isMobile ? "p-4" : "p-6"
  const titleSize = isMobile ? "text-base" : "text-lg"
  const textSize = isMobile ? "text-xs" : "text-sm"

  return (
    <div className="h-full flex flex-col">
      {/* Scrollable content container */}
      <div className="flex-1 overflow-y-auto">
        {/* Personal status area */}
        <div className={`${containerPadding} border-b border-retro-border`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className={`${titleSize} font-semibold text-white`}>我的状态</h2>
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
        </div>
        {children}
      </div>
        
        {/* Workstation stats area */}
        <div className={`${containerPadding} border-b border-retro-border`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className={`${titleSize} font-semibold text-white`}>工位统计</h2>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
            <span className={`text-xs text-retro-textMuted ${isMobile ? 'hidden' : 'inline'}`}>实时</span>
          </div>
        </div>
        {workstationStats ? (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className={`text-gray-300 ${textSize}`}>工位总数</span>
              <span className={`text-white font-medium ${isMobile ? 'text-sm' : 'text-base'}`}>{workstationStats.totalWorkstations}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className={`text-gray-300 ${textSize}`}>已绑定</span>
              <span className={`text-green-400 font-medium ${isMobile ? 'text-sm' : 'text-base'}`}>{workstationStats.boundWorkstations}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className={`text-gray-300 ${textSize}`}>可用</span>
              <span className={`text-blue-400 font-medium ${isMobile ? 'text-sm' : 'text-base'}`}>{workstationStats.availableWorkstations}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className={`text-gray-300 ${textSize}`}>占用率</span>
              <span className={`text-purple-400 font-medium ${isMobile ? 'text-sm' : 'text-base'}`}>{workstationStats.occupancyRate}</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center py-4">
            <div className="w-4 h-4 bg-purple-400 rounded-full animate-pulse mr-2"></div>
            <span className="text-retro-textMuted text-sm">加载中...</span>
          </div>
        )}
        </div>
      </div>
    </div>
  )
}
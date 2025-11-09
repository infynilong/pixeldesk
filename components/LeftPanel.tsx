'use client'

import { ReactNode, useState } from 'react'
import UserAvatar from './UserAvatar'
import AuthenticationHeader from './AuthenticationHeader'

interface LeftPanelProps {
  currentUser?: any
  workstationStats?: any
  children?: ReactNode
  isMobile?: boolean
  isTablet?: boolean
  isCollapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
}

export default function LeftPanel({
  currentUser,
  workstationStats,
  children,
  isMobile = false,
  isTablet = false,
  isCollapsed: externalIsCollapsed,
  onCollapsedChange
}: LeftPanelProps) {
  const [internalIsCollapsed, setInternalIsCollapsed] = useState(false)
  const isCollapsed = externalIsCollapsed !== undefined ? externalIsCollapsed : internalIsCollapsed

  const handleToggle = (collapsed: boolean) => {
    if (onCollapsedChange) {
      onCollapsedChange(collapsed)
    } else {
      setInternalIsCollapsed(collapsed)
    }
  }
  const containerPadding = isMobile ? "p-3" : "p-6"
  const titleSize = isMobile ? "text-base" : "text-xl"
  const textSize = isMobile ? "text-xs" : "text-base"
  const cardSpacing = isMobile ? "space-y-3" : "space-y-4"

  // 收起状态下显示最小化的面板
  if (isCollapsed) {
    return (
      <div className="h-full flex flex-col bg-transparent w-12 border-r border-gray-800">
        <div className="flex-1 flex items-center justify-center">
          <button
            onClick={() => handleToggle(false)}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            title="展开面板"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-transparent relative">
      {/* 收起按钮 - 右上角 */}
      <button
        onClick={() => handleToggle(true)}
        className="absolute top-3 right-2 z-10 p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
        title="收起面板"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* 头部区域 */}
      <div className="border-b border-gray-800 bg-gray-900/50">
        <div className={containerPadding}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gray-800 border border-gray-700 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <h1 className={`${titleSize} font-medium text-gray-200`}>个人信息</h1>
                <p className="text-sm text-gray-500 font-mono">Profile & Status</p>
              </div>
            </div>
            <div className="w-2 h-2 bg-emerald-400 rounded-full  shadow-sm shadow-emerald-400/50"></div>
          </div>
        </div>
      </div>

      {/* 可滚动内容区域 */}
      <div className="flex-1 overflow-y-auto">
        {/* 用户资料卡片 */}
        {currentUser && (
          <div className={`${containerPadding} border-b border-gray-800`}>
            <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-5 shadow-lg backdrop-blur-sm">
              <div className="flex items-center space-x-4 mb-4">
                <div className="relative">
                  <UserAvatar
                    userId={currentUser.id}
                    userName={currentUser.name}
                    userAvatar={currentUser.avatar}
                    customAvatar={currentUser.customAvatar}
                    size="xl"
                    showStatus={true}
                  />
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white dark:border-gray-800">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-100 mb-1">
                    {currentUser.name}
                  </h3>
                  {currentUser.email && (
                    <p className="text-gray-400 text-sm font-mono">
                      {currentUser.email}
                    </p>
                  )}
                  <div className="flex items-center space-x-2 mt-3">
                    <span className="px-2 py-1 bg-emerald-900/30 border border-emerald-800/50 text-emerald-300 text-xs font-mono rounded">
                      ONLINE
                    </span>
                    {!currentUser.isTemporary && (
                      <span className="px-2 py-1 bg-blue-900/30 border border-blue-800/50 text-blue-300 text-xs font-mono rounded">
                        VERIFIED
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* 积分显示 */}
              {currentUser.points !== undefined && (
                <div className="mb-4 p-3 bg-gradient-to-r from-yellow-600/20 to-orange-600/20 border border-yellow-500/30 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                      </svg>
                      <span className="text-gray-300 text-sm font-mono">我的积分</span>
                    </div>
                    <span className="text-yellow-400 font-bold text-lg">{currentUser.points}</span>
                  </div>
                </div>
              )}

              {/* 快捷操作按钮 */}
              <div className="grid grid-cols-2 gap-2">
                <a
                  href="/shop/characters"
                  className="flex items-center justify-center gap-2 p-3 bg-gradient-to-r from-purple-600/20 to-pink-600/20 hover:from-purple-600/30 hover:to-pink-600/30 border border-purple-500/30 hover:border-purple-500/50 rounded-lg transition-all cursor-pointer"
                >
                  <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  <span className="text-purple-300 text-sm font-medium">商店</span>
                </a>

                <a
                  href="/settings/character"
                  className="flex items-center justify-center gap-2 p-3 bg-gradient-to-r from-cyan-600/20 to-teal-600/20 hover:from-cyan-600/30 hover:to-teal-600/30 border border-cyan-500/30 hover:border-cyan-500/50 rounded-lg transition-all cursor-pointer"
                >
                  <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="text-cyan-300 text-sm font-medium">切换</span>
                </a>
              </div>
            </div>
          </div>
        )}

        {/* 状态更新区域 */}
        <div className={`${containerPadding} border-b border-gray-800`}>
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-8 h-8 bg-gray-800 border border-gray-700 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-medium text-gray-200">当前状态</h2>
              <p className="text-sm text-gray-500 font-mono">Current Status</p>
            </div>
          </div>

          {/* 状态组件容器 */}
          <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-4">
            {children}
          </div>
        </div>

        {/* 工位统计区域 */}
        <div className={`${containerPadding}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gray-800 border border-gray-700 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-medium text-gray-200">工位统计</h2>
                <p className="text-sm text-gray-500 font-mono">Workstation Stats</p>
              </div>
            </div>
          </div>

          {workstationStats ? (
            <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-4">
              <div className="grid grid-cols-1 gap-3">
                <div className="flex items-center justify-between p-3 bg-gray-800/50 border border-gray-700/50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-slate-600/30 border border-slate-600/50 rounded flex items-center justify-center">
                      <span className="text-slate-300 text-xs font-mono">#</span>
                    </div>
                    <span className="text-gray-300 font-mono text-sm">TOTAL</span>
                  </div>
                  <span className="text-gray-100 font-mono font-semibold text-lg">{workstationStats.totalWorkstations}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-800/50 border border-gray-700/50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-emerald-600/30 border border-emerald-600/50 rounded flex items-center justify-center">
                      <svg className="w-3 h-3 text-emerald-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <span className="text-gray-300 font-mono text-sm">BOUND</span>
                  </div>
                  <span className="text-emerald-400 font-mono font-semibold text-lg">{workstationStats.boundWorkstations}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-800/50 border border-gray-700/50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-blue-600/30 border border-blue-600/50 rounded flex items-center justify-center">
                      <svg className="w-3 h-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <span className="text-gray-300 font-mono text-sm">FREE</span>
                  </div>
                  <span className="text-blue-400 font-mono font-semibold text-lg">{workstationStats.availableWorkstations}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-800/50 border border-gray-700/50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-orange-600/30 border border-orange-600/50 rounded flex items-center justify-center">
                      <svg className="w-3 h-3 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <span className="text-gray-300 font-mono text-sm">USAGE</span>
                  </div>
                  <span className="text-orange-400 font-mono font-semibold text-lg">{workstationStats.occupancyRate}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center justify-center py-8">
                <div className="flex flex-col items-center space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                    <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                  </div>
                  <span className="text-gray-400 text-sm font-mono">Loading workstation data...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 底部操作区域 */}
      <div className="border-t border-gray-800 bg-gray-900/50">
        <div className={containerPadding}>
          {/* 认证状态区域 */}
          <div className="mb-3">
            <AuthenticationHeader />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-emerald-400 rounded-full  shadow-sm shadow-emerald-400/50"></div>
              <span className="text-sm text-gray-400 font-mono">ONLINE</span>
            </div>
            <div className="text-xs text-gray-500 font-mono">
              PixelDesk v2.0
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
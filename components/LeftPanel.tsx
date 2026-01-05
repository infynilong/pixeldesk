'use client'

import { ReactNode, useState } from 'react'
import UserAvatar from './UserAvatar'
import AuthenticationHeader from './AuthenticationHeader'
import { useTheme } from '@/contexts/ThemeContext'
import PointsHistory from './PointsHistory'
import UserSettingsModal from './UserSettingsModal'
import ActivityHeatmap from './ActivityHeatmap'
import ActivityStats from './ActivityStats'
import { useBrandConfig } from '@/lib/hooks/useBrandConfig'

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
  const { theme, toggleTheme } = useTheme()
  const [showHistory, setShowHistory] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const { config: brandConfig, isLoading: isBrandLoading } = useBrandConfig('zh-CN')

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
      <div className="h-full flex flex-col bg-transparent w-12 border-r border-gray-800 relative z-50">
        <button
          onClick={() => handleToggle(false)}
          className="absolute top-1/2 -right-4 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-gray-900/80 hover:bg-gray-800 border border-gray-700 rounded-full text-gray-400 hover:text-white transition-all shadow-lg backdrop-blur-sm opacity-50 hover:opacity-100"
          title="展开面板"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-transparent relative">
      {/* 收起按钮 - 右上角 */}
      <button
        onClick={() => handleToggle(true)}
        className="absolute top-1/2 -right-4 -translate-y-1/2 z-50 w-8 h-8 flex items-center justify-center bg-gray-900/80 hover:bg-gray-800 border border-gray-700 rounded-full text-gray-400 hover:text-white transition-all shadow-lg backdrop-blur-sm opacity-50 hover:opacity-100"
        title="收起面板"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* 头部区域 - 紧凑设计 */}
      <div className="border-b border-gray-800 bg-gray-900/50">
        <div className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Logo图片 */}
              {isBrandLoading ? (
                <div className="w-8 h-8 bg-gray-700 rounded-lg animate-pulse"></div>
              ) : (
                <img
                  src={brandConfig.app_logo}
                  alt={brandConfig.app_name}
                  className="w-8 h-8 rounded-lg object-cover border border-gray-700"
                  onError={(e) => {
                    // 图片加载失败时显示默认图标
                    e.currentTarget.style.display = 'none'
                    e.currentTarget.nextElementSibling?.classList.remove('hidden')
                  }}
                />
              )}
              {/* 备用图标（图片加载失败时显示） */}
              <div className="hidden w-8 h-8 bg-gray-800 border border-gray-700 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-sm font-medium text-gray-200">
                    {isBrandLoading ? '加载中...' : brandConfig.app_name}
                  </h1>
                  <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-400 text-[10px] leading-none font-mono rounded border border-blue-500/20">Beta</span>
                </div>
                <p className="text-xs text-gray-500 font-mono">
                  {isBrandLoading ? 'Loading...' : brandConfig.app_slogan}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={toggleTheme}
                className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                title={theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
              >
                {theme === 'dark' ? (
                  <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                )}
              </button>

              <a
                href="/shop/characters"
                className="p-1.5 text-gray-400 hover:text-purple-400 hover:bg-gray-800 rounded-lg transition-colors"
                title="商店"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* 可滚动内容区域 */}
      <div className="flex-1 overflow-y-auto">
        {/* 用户资料卡片 - 紧凑设计 */}
        {currentUser && (
          <div className={`p-3 border-b border-gray-800`}>
            <div className="bg-gray-900/80 border border-gray-800 rounded-lg p-3 shadow-sm">
              {/* 用户头像和基本信息 */}
              <div className="flex items-center gap-2 mb-2">
                <UserAvatar
                  userId={currentUser.id}
                  userName={currentUser.name}
                  userAvatar={currentUser.avatar}
                  customAvatar={currentUser.customAvatar}
                  size="md"
                  showStatus={true}
                />
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-gray-100 truncate">
                    {currentUser.name}
                  </h3>
                  {currentUser.email && (
                    <p className="text-gray-500 text-xs font-mono truncate">
                      {currentUser.email}
                    </p>
                  )}
                </div>

                <button
                  onClick={() => setShowSettings(true)}
                  className="p-1.5 hover:bg-gray-700/50 rounded-lg text-gray-400 hover:text-gray-200 transition-colors"
                  title="用户设置"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              </div>

              {/* 积分和快捷操作 - 一行显示 */}
              <div className="flex items-center gap-2 mb-2">
                {/* 积分 */}
                {currentUser.points !== undefined && (
                  <div
                    onClick={() => setShowHistory(true)}
                    className="flex-1 flex items-center gap-1.5 p-2 bg-yellow-600/10 border border-yellow-500/20 rounded cursor-pointer hover:bg-yellow-600/20 transition-all select-none"
                    title="点击查看积分历史"
                  >
                    <svg className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                    </svg>
                    <span className="text-yellow-400 font-bold text-sm font-mono">{currentUser.points}</span>
                  </div>
                )}

                {/* 快捷按钮 */}


                <a
                  href="/settings/character"
                  className="flex items-center justify-center p-2 bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 rounded transition-all"
                  title="切换角色"
                >
                  <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </a>
              </div>

              {/* 工位信息 */}
              <div className="bg-gray-800/50 border border-gray-700/50 rounded p-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <span className="text-gray-400 text-xs">工位</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {currentUser.workstationId ? (
                      <>
                        <span className="text-emerald-400 text-xs font-mono font-semibold">
                          {currentUser.workstationId}
                        </span>
                        <button
                          onClick={() => {
                            if (typeof window !== "undefined" && window.teleportToWorkstation) {
                              window.teleportToWorkstation().then((result) => {
                                if (result && !result.success) {
                                  console.error("传送失败:", result.error)
                                }
                              })
                            }
                          }}
                          className="px-2 py-0.5 bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 rounded text-cyan-400 text-xs font-mono transition-all"
                          title="快速回到工位"
                        >
                          GO
                        </button>
                      </>
                    ) : (
                      <span className="text-orange-400 text-xs font-mono">未绑定</span>
                    )}
                  </div>
                </div>
                {currentUser.workstationExpiresAt && (
                  <div className="mt-1 flex justify-end">
                    <span className={`text-[10px] font-mono ${new Date(currentUser.workstationExpiresAt) < new Date() ? 'text-red-400' : 'text-gray-500'}`}>
                      {(() => {
                        const date = new Date(currentUser.workstationExpiresAt);
                        const now = new Date();
                        const diffTime = date.getTime() - now.getTime();
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                        if (diffDays < 0) return "已过期";
                        if (diffDays === 0) return "今天到期";
                        return `${diffDays}天后到期 (${date.toLocaleDateString()})`;
                      })()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 状态更新区域 - 紧凑设计 */}
        <div className="p-3 border-b border-gray-800">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 bg-gray-800 border border-gray-700 rounded flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-sm font-medium text-gray-200">当前状态</h2>
          </div>

          {/* 状态组件容器 */}
          <div className="bg-gray-900/80 border border-gray-800/30 rounded-lg p-3">
            {children}
          </div>
        </div>

        {/* 活动统计区域 - 新增 */}
        {currentUser && (
          <div className="p-3 border-b border-gray-800">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 bg-gray-800 border border-gray-700 rounded flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h2 className="text-sm font-medium text-gray-200">活动概览</h2>
            </div>

            <div className="bg-gray-900/80 border border-gray-800 rounded-lg p-3 space-y-3">
              {/* 热力图 */}
              <div>
                <div className="text-xs text-gray-400 mb-2">最近90天</div>
                <ActivityHeatmap userId={currentUser.id} days={90} />
              </div>

              {/* 详细统计 */}
              <ActivityStats userId={currentUser.id} days={90} />
            </div>
          </div>
        )}

        {/* 工位统计区域 - 紧凑设计 */}
        <div className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 bg-gray-800 border border-gray-700 rounded flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h2 className="text-sm font-medium text-gray-200">工位统计</h2>
          </div>

          {workstationStats ? (
            <div className="bg-gray-900/80 border border-gray-800 rounded-lg p-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center justify-between p-2 bg-gray-800/50 border border-gray-700/50 rounded">
                  <span className="text-gray-400 font-mono text-xs">TOTAL</span>
                  <span className="text-gray-100 font-mono font-semibold text-sm">{workstationStats.totalWorkstations}</span>
                </div>

                <div className="flex items-center justify-between p-2 bg-gray-800/50 border border-gray-700/50 rounded">
                  <span className="text-emerald-400 font-mono text-xs">BOUND</span>
                  <span className="text-emerald-400 font-mono font-semibold text-sm">{workstationStats.boundWorkstations}</span>
                </div>

                <div className="flex items-center justify-between p-2 bg-gray-800/50 border border-gray-700/50 rounded">
                  <span className="text-blue-400 font-mono text-xs">FREE</span>
                  <span className="text-blue-400 font-mono font-semibold text-sm">{workstationStats.availableWorkstations}</span>
                </div>

                <div className="flex items-center justify-between p-2 bg-gray-800/50 border border-gray-700/50 rounded">
                  <span className="text-orange-400 font-mono text-xs">USAGE</span>
                  <span className="text-orange-400 font-mono font-semibold text-sm">{workstationStats.occupancyRate}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-900/80 border border-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-center">
                <span className="text-gray-400 text-xs font-mono">Loading...</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 底部操作区域 */}
      <div className="border-t border-gray-800 bg-gray-900/50">
        <div className={containerPadding}>
          {/* 认证状态区域 */}
          {!currentUser && (
            <div className="mb-3">
              <AuthenticationHeader />
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-emerald-400 rounded-full  shadow-sm shadow-emerald-400/50"></div>
              <span className="text-sm text-gray-400 font-mono">ONLINE</span>
            </div>
            <div className="text-xs text-gray-500 font-mono">
              {isBrandLoading ? 'Loading...' : `${brandConfig.app_name} v2.0`}
            </div>
          </div>
        </div>
      </div>

      {/* 积分历史弹窗 */}
      {showHistory && currentUser && (
        <PointsHistory
          userId={currentUser.id}
          isOpen={showHistory}
          onClose={() => setShowHistory(false)}
        />
      )}

      <UserSettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </div>
  )
}
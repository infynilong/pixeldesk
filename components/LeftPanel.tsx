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
import Link from 'next/link'
import { useTranslation } from '@/lib/hooks/useTranslation'



interface LeftPanelProps {
  onOpenPostcardDesigner?: () => void
  currentUser?: any
  workstationStats?: any
  children?: ReactNode
  isMobile?: boolean
  isTablet?: boolean
  isCollapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
  isTemporaryPlayer?: boolean
  onAuthClick?: () => void
}

export default function LeftPanel({
  currentUser,
  workstationStats,
  children,
  isMobile = false,
  isTablet = false,
  isCollapsed: externalIsCollapsed,
  onCollapsedChange,
  onOpenPostcardDesigner,
  isTemporaryPlayer = false,
  onAuthClick
}: LeftPanelProps) {
  const [internalIsCollapsed, setInternalIsCollapsed] = useState(false)
  const isCollapsed = externalIsCollapsed !== undefined ? externalIsCollapsed : internalIsCollapsed
  const { theme, toggleTheme } = useTheme()
  const [showHistory, setShowHistory] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  // Removed local state for PostcardDesignerModal; will be controlled by parent
  const { config: brandConfig, isLoading: isBrandLoading } = useBrandConfig('zh-CN')
  const { t } = useTranslation()

  const handleToggle = (collapsed: boolean) => {
    if (onCollapsedChange) {
      onCollapsedChange(collapsed)
    } else {
      setInternalIsCollapsed(collapsed)
    }
  }
  const containerPadding = isMobile ? "p-3" : "p-6"

  // 收起状态下显示最小化的面板
  if (isCollapsed) {
    return (
      <div className="h-full flex flex-col bg-transparent w-12 border-r border-gray-800 relative z-50">
        <button
          onClick={() => handleToggle(false)}
          className="absolute top-1/2 -right-4 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-gray-900/80 hover:bg-gray-800 border border-gray-700 rounded-full text-gray-400 hover:text-white transition-all shadow-lg backdrop-blur-sm opacity-50 hover:opacity-100"
          title={t.leftPanel.expand}
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
        title={t.leftPanel.collapse}
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
                    {isBrandLoading ? t.common.loading : brandConfig.app_name}
                  </h1>
                  <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-400 text-[10px] leading-none font-mono rounded border border-blue-500/20">{t.common.beta}</span>
                </div>
                <p className="text-xs text-gray-500 font-mono">
                  {isBrandLoading ? t.common.loading : brandConfig.app_slogan}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={toggleTheme}
                className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                title={theme === 'dark' ? t.leftPanel.toggle_light : t.leftPanel.toggle_dark}
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
                href="/shop"
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 text-gray-400 hover:text-purple-400 hover:bg-gray-800 rounded-lg transition-colors"
                title={t.nav.shop}
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
        {/* 临时玩家引导 - 体验模式 */}
        {isTemporaryPlayer && (
          <div className="p-3 border-b border-yellow-500/20 bg-gradient-to-br from-yellow-600/10 to-orange-600/10">
            <button
              onClick={onAuthClick}
              className="w-full group relative overflow-hidden bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 p-3 rounded-xl shadow-lg shadow-orange-950/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="flex items-center justify-center gap-3">
                <span className="text-xl filter drop-shadow-md group-hover:animate-bounce">🎮</span>
                <div className="text-left">
                  <div className="text-white text-sm font-bold leading-tight flex items-center gap-1.5">
                    体验模式
                    <span className="text-[10px] bg-white/20 px-1 rounded uppercase tracking-widest font-normal border border-white/10">Trial</span>
                  </div>
                  <div className="text-yellow-100 text-[11px] font-medium opacity-90 group-hover:opacity-100 transition-opacity">
                    登录与注册以保存进度
                  </div>
                </div>
                <svg className="w-4 h-4 text-white/50 group-hover:text-white transition-colors ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          </div>
        )}

        {/* 用户资料卡片 */}
        {currentUser && (
          <div className="p-3 border-b border-gray-800">
            <div className="bg-gray-900/80 border border-gray-800 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-3">
                <UserAvatar
                  userId={currentUser.id}
                  userName={currentUser.name}
                  userAvatar={currentUser.avatar}
                  customAvatar={currentUser.customAvatar}
                  size="md"
                  showStatus={true}
                />
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-gray-100 truncate">{currentUser.name}</h3>
                  <p className="text-gray-500 text-[10px] font-mono truncate">{currentUser.email}</p>
                </div>
                <button
                  onClick={() => setShowSettings(true)}
                  className="p-1.5 hover:bg-gray-700/50 rounded-lg text-gray-400 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              </div>

              <div className="flex items-center gap-2 mb-3">
                {currentUser.points !== undefined && (
                  <div
                    onClick={() => setShowHistory(true)}
                    className="flex-1 flex items-center gap-1.5 p-2 bg-yellow-600/10 border border-yellow-500/20 rounded cursor-pointer hover:bg-yellow-600/20 transition-all font-mono"
                  >
                    <svg className="w-3.5 h-3.5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                    </svg>
                    <span className="text-yellow-400 font-bold text-sm tracking-tighter">{currentUser.points} P</span>
                  </div>
                )}
                <a
                  href="/settings/character"
                  className="p-2 bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 rounded transition-all text-cyan-400 group"
                  title={t.leftPanel.switch_character}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </a>
                <a
                  href="/collection"
                  className="p-2 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/30 rounded transition-all text-amber-500 group"
                  title={t.postcard.collection}
                >
                  <span className="w-3.5 h-3.5 flex items-center justify-center text-xs">🕊️</span>
                </a>
              </div>

              {/* 工位信息 */}
              <div className="bg-gray-800/50 border border-gray-700/50 rounded p-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <span className="text-gray-400 text-xs font-mono uppercase">{t.leftPanel.station}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {currentUser.workstationId ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-emerald-400 text-xs font-mono font-bold mr-1">{currentUser.workstationId}</span>
                        <button
                          onClick={() => {
                            if (typeof window !== 'undefined' && (window as any).teleportToWorkstation) {
                              (window as any).teleportToWorkstation()
                            }
                          }}
                          className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-950/40 text-emerald-400 border border-emerald-900/50 hover:bg-emerald-900/60 hover:text-white transition-all uppercase tracking-tighter"
                        >
                          {t.leftPanel.go}
                        </button>
                        <button
                          onClick={() => {
                            if (typeof window !== 'undefined' && window.showUnbindingDialog) {
                              window.showUnbindingDialog(parseInt(currentUser.workstationId))
                            }
                          }}
                          className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-950/40 text-red-400 border border-red-900/50 hover:bg-red-900/60 hover:text-white transition-all uppercase tracking-tighter"
                        >
                          {t.leftPanel.terminate_lease}
                        </button>
                      </div>
                    ) : (
                      <span className="text-gray-600 text-[10px] font-mono">{t.leftPanel.none_station}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 状态更新 */}
        <div className="p-3 border-b border-gray-800">
          <div className="flex items-center gap-2 mb-2 font-mono">
            <span className="w-1.5 h-3 bg-cyan-500 rounded-full"></span>
            <h2 className="text-xs font-bold text-gray-400 uppercase">{t.leftPanel.status}</h2>
          </div>
          <div className="bg-gray-900/40 rounded-lg p-1">
            {children}
          </div>
        </div>

        {/* 活动统计 */}
        {currentUser && (
          <div className="p-3 border-b border-gray-800">
            <div className="flex items-center gap-2 mb-2 font-mono">
              <span className="w-1.5 h-3 bg-purple-500 rounded-full"></span>
              <h2 className="text-xs font-bold text-gray-400 uppercase">{t.leftPanel.activity}</h2>
            </div>
            <div className="bg-gray-900/80 border border-gray-800 rounded-lg p-3 space-y-4">
              <ActivityHeatmap userId={currentUser.id} days={90} />
              <ActivityStats userId={currentUser.id} days={90} />
            </div>
          </div>
        )}

        {/* 工位统计 */}
        <div className="p-3">
          <div className="flex items-center gap-2 mb-2 font-mono">
            <span className="w-1.5 h-3 bg-emerald-500 rounded-full"></span>
            <h2 className="text-xs font-bold text-gray-400 uppercase">{t.leftPanel.estate}</h2>
          </div>
          {workstationStats && (
            <div className="grid grid-cols-2 gap-2 font-mono text-[10px]">
              <div className="p-2 bg-gray-900/80 border border-gray-800 rounded flex justify-between">
                <span className="text-gray-500 uppercase">{t.leftPanel.total}</span>
                <span className="text-gray-200">{workstationStats.totalWorkstations}</span>
              </div>
              <div className="p-2 bg-gray-900/80 border border-gray-800 rounded flex justify-between">
                <span className="text-emerald-500 uppercase">{t.leftPanel.used}</span>
                <span className="text-emerald-500">{workstationStats.boundWorkstations}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 底部操作 */}
      <div className="mt-auto p-3 border-t border-gray-800 bg-gray-900/50">
        <div className="flex items-center justify-between text-[10px] font-mono text-gray-600">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
            <span className="uppercase">{t.common.system_online}</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/about"
              target="_blank"
              className="hover:text-gray-400 hover:underline transition-all"
            >
              {t.common.about}
            </Link>
            <span className="text-gray-800">|</span>
            <span>{t.common.version} 2.1.0</span>
          </div>
        </div>
      </div>

      <PointsHistory
        userId={currentUser?.id}
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
      />
      <UserSettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />

    </div>
  )
}
'use client'

import { useState, memo, useCallback, ChangeEvent, useEffect } from 'react'
import { useTranslation } from '../lib/hooks/useTranslation'
import { statusHistoryManager, formatTimestamp, getStatusBadge } from '../lib/statusHistory'
import { usePointsConfig } from '../lib/hooks/usePointsConfig'

interface PostStatusProps {
  onStatusUpdate: (status: any) => void
  currentStatus: any
  userId?: string
  userData?: {
    username?: string
    points?: number
    workstationId?: string
  }
}

const PostStatus = memo(({ onStatusUpdate, currentStatus, userId, userData }: PostStatusProps) => {
  const { t, locale } = useTranslation()
  const [selectedStatus, setSelectedStatus] = useState('working')

  const statusOptions = [
    { id: 'working', label: t.status.mode.working, emoji: '💼', color: 'from-cyan-500 to-teal-500' },
    { id: 'break', label: t.status.mode.break, emoji: '☕', color: 'from-emerald-500 to-teal-500' },
    { id: 'meeting', label: t.status.mode.meeting, emoji: '👥', color: 'from-blue-500 to-cyan-500' },
    { id: 'off_work', label: t.status.mode.off_work, emoji: '🏠', color: 'from-gray-500 to-gray-600' }
  ]
  const [customMessage, setCustomMessage] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [statusHistory, setStatusHistory] = useState<any[]>([])

  // 获取积分配置
  const { getConfig } = usePointsConfig()
  const teleportCost = getConfig('teleport_workstation_cost') || 3

  // 初始化时加载状态历史，添加防抖避免重复调用
  useEffect(() => {
    if (userId) {
      // 防抖延迟加载状态历史
      const timer = setTimeout(() => {
        loadStatusHistory()
      }, 100) // 100ms防抖

      return () => clearTimeout(timer)
    }
  }, [userId]) // 移除loadStatusHistory依赖避免循环

  // 加载状态历史 - 临时禁用API调用以修复性能问题
  const loadStatusHistory = useCallback(async () => {
    if (userId) {
      // 直接使用本地缓存，禁用API调用
      const history = statusHistoryManager.getStatusHistory(userId)
      setStatusHistory(history)
    }
  }, [userId])

  // 优化：避免不必要的重新渲染
  const memoizedHandleSubmit = useCallback(async () => {
    const status = statusOptions.find(s => s.id === selectedStatus)
    if (!status) return

    const fullStatus = {
      type: selectedStatus,
      status: status.label,
      emoji: status.emoji,
      message: customMessage || (locale === 'zh-CN' ? `正在${status.label}` : `is ${status.label.toLowerCase()}`),
      timestamp: new Date().toISOString()
    }

    if (!userId) {
      console.error('Cannot save status: userId is null or undefined')
      return
    }

    try {
      // 临时禁用API保存以修复性能问题
      // Status saving is temporarily disabled for performance
    } catch (error) {
      console.error('Error in disabled status save:', error)
    }

    // 时间跟踪：根据状态类型开始或结束活动
    try {
      const timeTrackingResponse = await fetch('/api/time-tracking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          action: 'start',
          activityType: selectedStatus,
          workstationId: userData?.workstationId,
          notes: customMessage
        })
      })

      if (!timeTrackingResponse.ok) {
        console.error('Failed to start time tracking:', timeTrackingResponse.status)
      }
    } catch (error) {
      console.error('Error starting time tracking:', error)
    }

    // 同时保存到本地缓存（用于快速UI更新）
    statusHistoryManager.addStatusHistory(fullStatus, userId)
    // 不再重新加载状态历史，避免重复API调用，改为直接更新本地状态
    const localHistory = statusHistoryManager.getStatusHistory(userId)
    setStatusHistory(localHistory)

    // 通知 Phaser 游戏更新状态（优先执行，避免延迟）
    if (typeof window !== 'undefined' && (window as any).updateMyStatus) {
      (window as any).updateMyStatus(fullStatus)
    }

    // 更新 React 组件状态（直接同步调用，避免requestAnimationFrame开销）
    onStatusUpdate(fullStatus)

    // 平滑收起面板
    setIsExpanded(false)
    setCustomMessage('')
  }, [selectedStatus, customMessage, onStatusUpdate, userId, userData?.workstationId]) // 移除loadStatusHistory依赖

  // 优化：缓存状态选择处理函数
  const memoizedHandleStatusSelect = useCallback((statusId: string) => {
    setSelectedStatus(statusId)
  }, [])

  // 优化：缓存面板切换处理函数
  const memoizedHandleToggle = useCallback(() => {
    setIsExpanded(!isExpanded)
  }, [isExpanded])

  // 优化：缓存取消处理函数
  const memoizedHandleCancel = useCallback(() => {
    setIsExpanded(false)
  }, [])

  // 优化：缓存消息变化处理函数
  const memoizedHandleMessageChange = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => {
    setCustomMessage(e.target.value)
  }, [])

  // 优化：缓存历史记录切换处理函数
  const memoizedHandleToggleHistory = useCallback(() => {
    setShowHistory(!showHistory)
  }, [showHistory])

  // 本地化的时间格式化
  const localFormatTimestamp = useCallback((timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMinutes < 1) return t.time.just_now
    if (diffMinutes < 60) return `${diffMinutes}${t.time.minutes_ago}`
    if (diffHours < 24) return `${diffHours}${t.time.hours_ago}`
    if (diffDays < 7) return `${diffDays}${t.time.days_ago}`

    return date.toLocaleDateString(locale)
  }, [t, locale])

  return (
    <div className="space-y-3 font-pixel">
      {/* 当前状态显示 - 紧凑版 */}
      {currentStatus && (
        <div className="group relative overflow-hidden">
          {/* 状态卡片 - 紧凑布局 */}
          <div className="relative bg-gradient-to-br from-retro-bg-darker/90 to-retro-bg-dark/85 backdrop-blur-md border border-gray-800 rounded-lg p-3 shadow-xl hover:shadow-2xl  hover:border-retro-purple/60">
            <div className="flex items-center gap-3">
              {/* 紧凑状态图标 */}
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-cyan-600 via-teal-600 to-emerald-600 rounded-lg flex items-center justify-center shadow-lg border border-white/20">
                  <span className="text-lg">{currentStatus.emoji}</span>
                </div>
                {/* 小型活跃指示器 */}
                <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-gray-900">
                  <div className="w-full h-full bg-emerald-400 rounded-full animate-pulse"></div>
                </div>
              </div>

              {/* 紧凑状态信息 */}
              <div className="flex-1">
                <div className="text-white font-bold text-sm font-pixel">
                  {currentStatus.status}
                </div>
                <div className="text-retro-textMuted text-xs font-retro leading-tight">
                  {currentStatus.message}
                </div>
              </div>

              {/* 简化活动指示 */}
              <div className="w-2 h-2 bg-retro-green rounded-full "></div>
            </div>
          </div>
        </div>
      )}

      {/* 紧凑操作按钮区域 - 并排布局 */}
      <div className="flex gap-2">
        {/* 更新状态按钮 */}
        <button
          onClick={memoizedHandleToggle}
          className="flex-1 group relative overflow-hidden bg-gradient-to-r from-cyan-600 via-teal-600 to-emerald-600 hover:from-cyan-500 hover:via-teal-500 hover:to-emerald-500 text-white font-bold py-2.5 px-3 rounded-lg shadow-lg hover:shadow-cyan-500/20 border border-white/20 transition-all active:scale-[0.98]"
        >
          {/* 按钮内容 */}
          <div className="relative flex items-center justify-center gap-2">
            <span className="text-sm">{isExpanded ? "✕" : "📝"}</span>
            <span className="font-pixel text-xs tracking-wide">
              {isExpanded ? t.common.cancel.toUpperCase() : t.leftPanel.update_status.toUpperCase()}
            </span>
          </div>
        </button>

        {/* 状态历史按钮 - 紧凑版 */}
        {userId && (
          <button
            onClick={memoizedHandleToggleHistory}
            className="flex-1 group relative overflow-hidden bg-gradient-to-r from-retro-bg-dark/80 to-retro-bg-darker/80 hover:from-retro-border/60 hover:to-retro-border/80 text-white font-medium py-2.5 px-3 rounded-lg  border border-gray-700 hover:border-retro-blue/60 shadow-lg hover:shadow-xl backdrop-blur-sm"
          >
            {/* 按钮内容 - 紧凑版 */}
            <div className="relative flex items-center justify-center gap-2">
              <span className="text-sm">📊</span>
              <span className="font-retro text-xs tracking-wide">
                {showHistory ? t.status.hide.toUpperCase() : t.leftPanel.history.toUpperCase()}
              </span>
              {/* 小型计数器 */}
              <span className="text-xs bg-cyan-500/50 text-white px-1.5 py-0.5 rounded-full font-pixel">
                {statusHistory.length}
              </span>
            </div>
          </button>
        )}
      </div>

      {/* 详细状态设置 - 超紧凑面板 */}
      {isExpanded && (
        <div
          className="space-y-2 bg-gradient-to-br from-retro-bg-darker/95 via-retro-bg-dark/90 to-retro-bg-darker/95 backdrop-blur-lg border border-gray-800 rounded-lg p-3 shadow-2xl "
          onClick={(e) => {
            // 阻止点击事件冒泡到Phaser游戏
            e.stopPropagation()
          }}
          onKeyDown={(e) => {
            // 阻止键盘事件冒泡到Phaser游戏
            e.stopPropagation()
          }}
        >
          {/* 面板标题 */}
          <div className="flex items-center gap-2 pb-1 border-b border-gray-800/50">
            <div className="w-4 h-4 bg-gradient-to-br from-cyan-500 to-teal-500 rounded flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <span className="text-[10px]">⚙️</span>
            </div>
            <h3 className="text-white font-bold text-xs font-pixel tracking-wide">
              {t.status.config}
            </h3>
          </div>

          {/* 状态类型选择 - 超紧凑网格 */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-white font-pixel tracking-wide">
              {t.status.select_mode}
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {statusOptions.map((status) => (
                <button
                  key={status.id}
                  onClick={() => memoizedHandleStatusSelect(status.id)}
                  className={`group relative overflow-hidden p-2 rounded-lg border transition-all ${selectedStatus === status.id
                    ? `border-white/40 bg-gradient-to-br ${status.color} text-white shadow-lg shadow-cyan-500/10`
                    : "border-gray-700/50 bg-gray-800/40 hover:border-cyan-500/50 hover:bg-gray-800/60 shadow-md"
                    }`}
                >
                  {/* 选择状态的光效 */}
                  {selectedStatus === status.id && (
                    <div className="absolute inset-0 bg-white/10 rounded-lg "></div>
                  )}

                  {/* 按钮内容 - 超紧凑 */}
                  <div className="relative flex flex-col items-center space-y-1">
                    <div className="text-lg">{status.emoji}</div>
                    <div className="text-xs font-bold font-pixel tracking-wide text-center leading-tight">
                      {status.label}
                    </div>
                  </div>

                  {/* 选中指示器 */}
                  {selectedStatus === status.id && (
                    <div className="absolute top-1 right-1 w-2 h-2 bg-white rounded-full shadow-lg">
                      <div className="w-full h-full bg-emerald-400 rounded-full animate-pulse"></div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* 自定义消息输入 - 紧凑文本框 */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-white font-pixel tracking-wide">
              {t.status.custom_message}
            </label>
            <div className="relative">
              <textarea
                value={customMessage}
                onChange={memoizedHandleMessageChange}
                onKeyDown={(e) => {
                  // 阻止键盘事件冒泡到Phaser游戏
                  e.stopPropagation()
                }}
                onKeyUp={(e) => {
                  // 阻止键盘事件冒泡到Phaser游戏
                  e.stopPropagation()
                }}
                onClick={(e) => {
                  // 阻止点击事件冒泡
                  e.stopPropagation()
                }}
                placeholder={t.status.placeholder}
                className="relative w-full p-2 bg-gray-800/50 border border-gray-700 rounded-lg resize-none focus:outline-none focus:border-cyan-500/50 focus:bg-gray-800/80 focus:shadow-lg focus:shadow-cyan-500/10 text-white placeholder-gray-500 backdrop-blur-md font-retro text-sm leading-relaxed transition-all"
                rows={3}
              />
              {/* 字符计数器 */}
              <div className="absolute bottom-1 right-1 text-xs text-retro-textMuted font-retro">
                {customMessage.length}/200
              </div>
            </div>
          </div>

          {/* 操作按钮组 - 紧凑按钮设计 */}
          <div className="flex gap-2 pt-1">
            {/* 发布按钮 */}
            <button
              onClick={memoizedHandleSubmit}
              className="flex-1 group relative overflow-hidden bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-2 px-3 rounded-lg shadow-lg hover:shadow-emerald-500/20 border border-white/20 transition-all active:scale-[0.98]"
            >
              {/* 发布按钮内容 */}
              <div className="relative flex items-center justify-center gap-2">
                <div className="w-4 h-4 bg-white/20 rounded flex items-center justify-center group-hover:bg-white/30 ">
                  <span className="text-xs">🚀</span>
                </div>
                <span className="font-pixel text-xs tracking-wider">
                  {t.status.publish}
                </span>
              </div>
            </button>

            {/* 取消按钮 */}
            <button
              onClick={memoizedHandleCancel}
              className="flex-1 group relative overflow-hidden bg-gray-800/80 hover:bg-gray-700/80 text-white font-medium py-2 px-3 rounded-lg border border-gray-700 hover:border-gray-600 shadow-lg transition-all active:scale-[0.98]"
            >
              {/* 取消按钮内容 */}
              <div className="relative flex items-center justify-center gap-2 text-gray-400 group-hover:text-gray-200">
                <div className="w-4 h-4 bg-gray-700 rounded flex items-center justify-center group-hover:bg-gray-600">
                  <span className="text-xs">✕</span>
                </div>
                <span className="font-pixel text-xs tracking-wide">{t.common.cancel.toUpperCase()}</span>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* 状态历史显示 - 紧凑像素风格 */}
      {showHistory && userId && (
        <div className="space-y-3 bg-gradient-to-br from-retro-bg-darker/95 via-retro-bg-dark/90 to-retro-bg-darker/95 backdrop-blur-lg border border-gray-800 rounded-lg p-3 shadow-2xl ">
          {/* 历史记录标题 */}
          <div className="flex items-center justify-between pb-2 border-b border-gray-800/50">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-gradient-to-br from-retro-cyan to-retro-blue rounded flex items-center justify-center shadow-lg">
                <span className="text-sm">📊</span>
              </div>
              <h3 className="text-white font-bold text-sm font-pixel tracking-wider">
                {t.status.history_title}
              </h3>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 bg-retro-cyan rounded-full "></div>
              <span className="text-xs text-retro-textMuted font-retro tracking-wide">
                {statusHistory.length}
              </span>
            </div>
          </div>

          {/* 历史记录列表 */}
          <div className="space-y-2 max-h-60 overflow-y-auto scrollbar-hide">
            {statusHistory.length === 0 ? (
              <div className="text-center py-8 space-y-3">
                <div className="w-12 h-12 bg-gradient-to-br from-retro-purple/20 to-retro-pink/20 rounded-lg flex items-center justify-center mx-auto border border-gray-700/50">
                  <span className="text-2xl">📝</span>
                </div>
                <div className="space-y-1">
                  <div className="text-white font-bold font-pixel text-sm">
                    {t.status.no_records}
                  </div>
                  <div className="text-retro-textMuted text-xs font-retro">
                    {t.status.start_sharing}
                  </div>
                </div>
              </div>
            ) : (
              statusHistory.map((history, index) => (
                <div
                  key={history.id || index}
                  className="group relative overflow-hidden bg-gradient-to-r from-retro-bg-dark/60 to-retro-bg-darker/60 rounded-lg p-2.5 border border-gray-700/50 hover:border-retro-cyan/50  hover:shadow-lg backdrop-blur-sm"
                >
                  {/* 记录内容 */}
                  <div className="relative space-y-2">
                    {/* 状态标签和时间 */}
                    <div className="flex items-center justify-between">
                      <div
                        className={`flex items-center gap-1.5 px-2 py-1 rounded bg-gradient-to-r ${getStatusBadge(
                          history.type
                        )} border border-white/20 shadow-sm`}
                      >
                        <span className="text-xs">{history.emoji}</span>
                        <span className="text-white text-xs font-bold font-pixel tracking-wide">
                          {history.status}
                        </span>
                      </div>
                      <span className="text-retro-textMuted text-xs font-retro">
                        {localFormatTimestamp(history.timestamp)}
                      </span>
                    </div>

                    {/* 状态消息 */}
                    <p className="text-retro-text text-xs font-retro leading-relaxed pl-2 border-l border-retro-cyan/30">
                      {history.message}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* 状态统计仪表板 */}
          {statusHistory.length > 0 && (
            <div className="pt-2 border-t border-gray-800/50">
              <div className="grid grid-cols-3 gap-2">
                {/* 今日状态 */}
                <div className="text-center space-y-1 bg-gradient-to-br from-retro-green/10 to-retro-blue/10 rounded p-2 border border-retro-green/20">
                  <div className="w-5 h-5 bg-gradient-to-br from-retro-green to-retro-cyan rounded flex items-center justify-center mx-auto shadow-lg">
                    <span className="text-xs">📅</span>
                  </div>
                  <div className="text-lg font-bold text-white font-pixel">
                    {
                      statusHistoryManager.getStatusHistoryStats(userId)
                        .todayCount
                    }
                  </div>
                  <div className="text-xs text-retro-textMuted font-retro tracking-wide uppercase">
                    {t.status.today}
                  </div>
                </div>

                {/* 总记录数 */}
                <div className="text-center space-y-1 bg-gradient-to-br from-retro-purple/10 to-retro-pink/10 rounded p-2 border border-retro-purple/20">
                  <div className="w-5 h-5 bg-gradient-to-br from-retro-purple to-retro-pink rounded flex items-center justify-center mx-auto shadow-lg">
                    <span className="text-xs">📈</span>
                  </div>
                  <div className="text-lg font-bold text-white font-pixel">
                    {statusHistory.length}
                  </div>
                  <div className="text-xs text-retro-textMuted font-retro tracking-wide uppercase">
                    {t.leftPanel.total}
                  </div>
                </div>

                {/* 最常用状态 */}
                <div className="text-center space-y-1 bg-gradient-to-br from-retro-yellow/10 to-retro-orange/10 rounded p-2 border border-retro-yellow/20">
                  <div className="w-5 h-5 bg-gradient-to-br from-retro-yellow to-retro-orange rounded flex items-center justify-center mx-auto shadow-lg">
                    <span className="text-xs">⭐</span>
                  </div>
                  <div className="text-lg font-bold text-white font-pixel">
                    {statusHistoryManager.getStatusHistoryStats(userId)
                      .mostUsedStatus === "working"
                      ? "💼"
                      : statusHistoryManager.getStatusHistoryStats(userId)
                        .mostUsedStatus === "break"
                        ? "☕"
                        : statusHistoryManager.getStatusHistoryStats(userId)
                          .mostUsedStatus === "reading"
                          ? "📚"
                          : statusHistoryManager.getStatusHistoryStats(userId)
                            .mostUsedStatus === "meeting"
                            ? "👥"
                            : statusHistoryManager.getStatusHistoryStats(userId)
                              .mostUsedStatus === "lunch"
                              ? "🍽️"
                              : "🚻"}
                  </div>
                  <div className="text-xs text-retro-textMuted font-retro tracking-wide uppercase">
                    {t.status.popular}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
})

export default PostStatus
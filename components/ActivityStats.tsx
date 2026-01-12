'use client'

import { useTranslation } from '@/lib/hooks/useTranslation'
import { useUserActivity, type TotalStats } from '@/lib/hooks/useUserActivity'

interface ActivityStatsProps {
  userId: string
  days?: number
}

export default function ActivityStats({ userId, days = 90 }: ActivityStatsProps) {
  const { t } = useTranslation()
  const { data: activityData, isLoading, refresh } = useUserActivity(userId, days)
  const stats = activityData?.totalStats || null

  // 格式化时间
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = Math.round(minutes % 60)

    if (hours > 24) {
      const days = Math.floor(hours / 24)
      const remainingHours = hours % 24
      return `${days}${t.activity.days_unit} ${remainingHours}${t.activity.hours_unit}`
    }

    if (hours > 0) {
      return `${hours}${t.activity.hours_unit} ${mins}${t.activity.minutes_unit}`
    }
    return `${mins}${t.activity.minutes_unit}`
  }

  // 获取状态图标
  const getStatusIcon = (status: string) => {
    const icons: { [key: string]: string } = {
      'work': '💼',
      'break': '☕',
      'meeting': '🤝',
      'focus': '🎯',
      'away': '🚶',
      'offline': '🌙',
      'online': '🟢'
    }
    return icons[status.toLowerCase()] || '📍'
  }

  // 获取状态显示名称
  const getStatusLabel = (status: string) => {
    const s = status.toLowerCase() as keyof typeof t.activity.status
    return t.activity.status[s] || status
  }

  if (isLoading && !activityData) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="text-gray-400 text-xs">{t.activity.loading}</div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center py-4 text-gray-500 text-xs">
        {t.activity.no_data}
      </div>
    )
  }

  // 按时长排序状态
  const sortedStatuses = Object.entries(stats.statusBreakdown)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5) // 只显示前5个

  return (
    <div className="space-y-3">
      {/* 总体统计 */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-2">
          <div className="text-[10px] text-gray-500 mb-1">{t.activity.total_active}</div>
          <div className="text-xs font-bold text-emerald-400 font-mono">
            {stats.totalDays}{t.activity.days_unit}
          </div>
        </div>

        <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-2">
          <div className="text-[10px] text-gray-500 mb-1">{t.activity.total_duration}</div>
          <div className="text-xs font-bold text-cyan-400 font-mono">
            {formatTime(stats.totalMinutes)}
          </div>
        </div>

        <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-2">
          <div className="text-[10px] text-gray-500 mb-1">{t.activity.average}</div>
          <div className="text-xs font-bold text-purple-400 font-mono">
            {formatTime(stats.averageMinutesPerDay)}
          </div>
        </div>
      </div>

      {/* 步数统计 */}
      <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-lg p-3 flex items-center justify-between group relative overflow-hidden">
        <div className="flex items-center gap-2">
          <span className="text-xl">👟</span>
          <div>
            <div className="text-[10px] text-amber-500/80 font-bold uppercase tracking-wider">{t.common.daily_steps || '每日步数'}</div>
            <div className="text-sm font-black text-amber-500 font-mono flex items-center gap-2">
              {((stats as any).totalSteps || 0).toLocaleString()}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  refresh();
                }}
                disabled={isLoading}
                className={`p-1 rounded-md hover:bg-amber-500/20 transition-all ${isLoading ? 'opacity-50' : ''}`}
                title={t.common.refresh}
              >
                <svg
                  className={`w-3 h-3 text-amber-500 ${isLoading ? 'animate-spin' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-gray-500 uppercase">{t.activity.total_active}</div>
          <div className="text-xs font-bold text-gray-300">{stats.totalDays} {t.activity.days_unit}</div>
        </div>
      </div>

      {/* 状态分布 */}
      {sortedStatuses.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-gray-400 font-medium">{t.activity.distribution}</div>
          {sortedStatuses.map(([status, minutes]) => {
            const percentage = (minutes / stats.totalMinutes) * 100
            return (
              <div key={status} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span>{getStatusIcon(status)}</span>
                    <span className="text-gray-300">{getStatusLabel(status)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 font-mono text-[10px]">
                      {formatTime(minutes)}
                    </span>
                    <span className="text-emerald-400 font-mono text-[10px] w-10 text-right">
                      {percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
                {/* 进度条 */}
                <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'

interface StatusBreakdown {
  [key: string]: number
}

interface TotalStats {
  totalMinutes: number
  totalDays: number
  statusBreakdown: StatusBreakdown
  averageMinutesPerDay: number
}

interface ActivityStatsProps {
  userId: string
  days?: number
}

export default function ActivityStats({ userId, days = 90 }: ActivityStatsProps) {
  const [stats, setStats] = useState<TotalStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!userId) return

    const fetchStats = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/user/${userId}/activity?days=${days}`)
        const result = await response.json()

        if (result.success) {
          setStats(result.data.totalStats)
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [userId, days])

  // 格式化时间
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = Math.round(minutes % 60)

    if (hours > 24) {
      const days = Math.floor(hours / 24)
      const remainingHours = hours % 24
      return `${days}天 ${remainingHours}时`
    }

    if (hours > 0) {
      return `${hours}时 ${mins}分`
    }
    return `${mins}分`
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
    const labels: { [key: string]: string } = {
      'work': '工作中',
      'break': '休息中',
      'meeting': '会议中',
      'focus': '专注中',
      'away': '离开',
      'offline': '离线',
      'online': '在线'
    }
    return labels[status.toLowerCase()] || status
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="text-gray-400 text-xs">加载统计中...</div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center py-4 text-gray-500 text-xs">
        暂无活动数据
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
          <div className="text-[10px] text-gray-500 mb-1">总活跃</div>
          <div className="text-xs font-bold text-emerald-400 font-mono">
            {stats.totalDays}天
          </div>
        </div>

        <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-2">
          <div className="text-[10px] text-gray-500 mb-1">总时长</div>
          <div className="text-xs font-bold text-cyan-400 font-mono">
            {formatTime(stats.totalMinutes)}
          </div>
        </div>

        <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-2">
          <div className="text-[10px] text-gray-500 mb-1">日均</div>
          <div className="text-xs font-bold text-purple-400 font-mono">
            {formatTime(stats.averageMinutesPerDay)}
          </div>
        </div>
      </div>

      {/* 状态分布 */}
      {sortedStatuses.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-gray-400 font-medium">状态分布</div>
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

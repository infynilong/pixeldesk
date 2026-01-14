'use client'

import { useState } from 'react'
import { useTranslation } from '@/lib/hooks/useTranslation'
import { useUserActivity, type DailyActivity } from '@/lib/hooks/useUserActivity'

interface ActivityHeatmapProps {
  userId: string
  days?: number
}

export default function ActivityHeatmap({ userId, days = 90 }: ActivityHeatmapProps) {
  const { t, locale } = useTranslation()
  const { data: activityData, isLoading } = useUserActivity(userId, days)
  const [hoveredDay, setHoveredDay] = useState<DailyActivity | null>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  const data = activityData?.dailyActivity || []

  // 获取活跃度等级对应的颜色
  const getLevelColor = (level: number) => {
    const colors = [
      'bg-gray-800/50', // 0: 无活动
      'bg-emerald-900/50', // 1: 少量活动
      'bg-emerald-700/60', // 2: 中等活动
      'bg-emerald-500/70', // 3: 高活动
      'bg-emerald-400/80', // 4: 极高活动
    ]
    return colors[level] || colors[0]
  }

  // 格式化时间
  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = Math.round(minutes % 60)
    if (hours > 0) {
      return `${hours}${t.activity.hours_unit} ${mins}${t.activity.minutes_unit}`
    }
    return `${mins}${t.activity.minutes_unit}`
  }

  // 格式化日期
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString(locale, { month: 'short', day: 'numeric' })
  }

  // 按周组织数据
  const organizeByWeeks = () => {
    const weeks: DailyActivity[][] = []
    let currentWeek: DailyActivity[] = []

    // 找到第一天是星期几,前面补空白
    if (data.length > 0) {
      const firstDay = new Date(data[0].date)
      const firstDayOfWeek = firstDay.getDay()

      // 补充前面的空白天
      for (let i = 0; i < firstDayOfWeek; i++) {
        currentWeek.push({
          date: '',
          totalMinutes: 0,
          statusCount: {},
          activities: 0,
          level: 0
        })
      }
    }

    data.forEach((day, index) => {
      currentWeek.push(day)

      // 每7天或最后一天时,保存当前周
      if (currentWeek.length === 7 || index === data.length - 1) {
        // 如果最后一周不足7天,补充空白
        while (currentWeek.length < 7) {
          currentWeek.push({
            date: '',
            totalMinutes: 0,
            statusCount: {},
            activities: 0,
            level: 0
          })
        }
        weeks.push([...currentWeek])
        currentWeek = []
      }
    })

    return weeks
  }

  const weeks = organizeByWeeks()
  const weekDays = ['日', '一', '二', '三', '四', '五', '六']
  const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-gray-400 text-sm">{t.activity.loading_heatmap}</div>
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="flex gap-1">
        {/* 星期标签 */}
        <div className="flex flex-col gap-1 text-[10px] text-gray-500 pr-1">
          {weekDays.map((day, i) => (
            <div key={i} className="h-2.5 flex items-center">
              {i % 2 === 1 && day}
            </div>
          ))}
        </div>

        {/* 热力图网格 */}
        <div className="flex-1 overflow-x-auto">
          <div className="flex gap-1">
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="flex flex-col gap-1">
                {week.map((day, dayIndex) => (
                  <div
                    key={`${weekIndex}-${dayIndex}`}
                    className={`
                      w-2.5 h-2.5 rounded-sm border border-gray-700/30
                      ${day.date ? getLevelColor(day.level) : 'bg-transparent border-transparent'}
                      ${day.date ? 'cursor-pointer hover:ring-1 hover:ring-gray-400' : ''}
                      transition-all
                    `}
                    onMouseEnter={(e) => {
                      if (day.date) {
                        setHoveredDay(day)
                        setMousePos({ x: e.clientX, y: e.clientY })
                      }
                    }}
                    onMouseLeave={() => setHoveredDay(null)}
                    title={day.date ? `${day.date}: ${formatMinutes(day.totalMinutes)}` : ''}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 图例 */}
      <div className="flex items-center gap-2 mt-2 text-[10px] text-gray-500">
        <span>{t.activity.less}</span>
        <div className="flex gap-0.5">
          {[0, 1, 2, 3, 4].map((level) => (
            <div
              key={level}
              className={`w-2.5 h-2.5 rounded-sm border border-gray-700/30 ${getLevelColor(level)}`}
            />
          ))}
        </div>
        <span>{t.activity.more}</span>
      </div>

      {/* Tooltip */}
      {hoveredDay && (
        <div
          className="fixed z-50 bg-gray-900 border border-gray-700 rounded-lg p-2 shadow-xl pointer-events-none"
          style={{
            left: mousePos.x + 10,
            top: mousePos.y + 10,
          }}
        >
          <div className="text-xs text-white font-medium mb-1">
            {formatDate(hoveredDay.date)}
          </div>
          <div className="text-xs text-gray-400">
            <div>{t.activity.total_duration}: {formatMinutes(hoveredDay.totalMinutes)}</div>
            <div>{t.activity.activities}: {hoveredDay.activities}</div>
            {Object.keys(hoveredDay.statusCount).length > 0 && (
              <div className="mt-1 pt-1 border-t border-gray-700">
                {Object.entries(hoveredDay.statusCount).map(([status, minutes]) => (
                  <div key={status} className="flex justify-between gap-2">
                    <span className="text-gray-500">{t.activity.status[status.toLowerCase() as keyof typeof t.activity.status] || status}:</span>
                    <span className="text-emerald-400">{formatMinutes(minutes)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

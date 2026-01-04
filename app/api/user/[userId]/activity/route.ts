import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// 获取用户活动统计数据
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '90') // 默认获取90天的数据

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      )
    }

    // 计算日期范围
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // 获取状态历史记录
    const statusHistory = await prisma.status_history.findMany({
      where: {
        userId,
        timestamp: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: {
        timestamp: 'asc'
      },
      select: {
        id: true,
        status: true,
        type: true,
        timestamp: true,
        emoji: true,
        message: true
      }
    })

    // 获取玩家移动数据
    const player = await prisma.players.findUnique({
      where: { userId },
      select: {
        currentX: true,
        currentY: true,
        totalPlayTime: true,
        playerState: true
      }
    })

    // 按日期分组统计
    const dailyStats = new Map<string, {
      date: string
      totalMinutes: number
      statusCount: {[key: string]: number}
      activities: number
    }>()

    // 初始化所有日期
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0]
      dailyStats.set(dateStr, {
        date: dateStr,
        totalMinutes: 0,
        statusCount: {},
        activities: 0
      })
    }

    // 计算每个状态的持续时间
    for (let i = 0; i < statusHistory.length; i++) {
      const current = statusHistory[i]
      const next = statusHistory[i + 1]

      const currentDate = new Date(current.timestamp)
      const dateStr = currentDate.toISOString().split('T')[0]

      const stats = dailyStats.get(dateStr)
      if (stats) {
        // 计算持续时间
        let duration = 0
        if (next) {
          duration = (new Date(next.timestamp).getTime() - currentDate.getTime()) / (1000 * 60)
        } else {
          // 最后一条记录,假设持续到现在或30分钟
          duration = Math.min(30, (new Date().getTime() - currentDate.getTime()) / (1000 * 60))
        }

        // 限制单个状态最长8小时
        duration = Math.min(duration, 480)

        stats.totalMinutes += duration
        stats.statusCount[current.status] = (stats.statusCount[current.status] || 0) + duration
        stats.activities += 1
      }
    }

    // 转换为数组并计算每日总结
    const dailyActivity = Array.from(dailyStats.values()).map(day => ({
      ...day,
      level: getActivityLevel(day.totalMinutes) // 0-4 的活跃度等级
    }))

    // 计算总体统计
    const totalStats = {
      totalMinutes: dailyActivity.reduce((sum, day) => sum + day.totalMinutes, 0),
      totalDays: dailyActivity.filter(day => day.activities > 0).length,
      statusBreakdown: {} as {[key: string]: number},
      averageMinutesPerDay: 0
    }

    // 汇总所有状态
    dailyActivity.forEach(day => {
      Object.entries(day.statusCount).forEach(([status, minutes]) => {
        totalStats.statusBreakdown[status] = (totalStats.statusBreakdown[status] || 0) + minutes
      })
    })

    totalStats.averageMinutesPerDay = totalStats.totalDays > 0
      ? Math.round(totalStats.totalMinutes / totalStats.totalDays)
      : 0

    return NextResponse.json({
      success: true,
      data: {
        dailyActivity,
        totalStats,
        player: player ? {
          position: { x: player.currentX, y: player.currentY },
          totalPlayTime: player.totalPlayTime,
          playerState: player.playerState
        } : null
      }
    })

  } catch (error) {
    console.error('Error fetching user activity:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user activity' },
      { status: 500 }
    )
  }
}

// 根据活动时长计算活跃度等级 (0-4)
function getActivityLevel(minutes: number): number {
  if (minutes === 0) return 0
  if (minutes < 30) return 1
  if (minutes < 120) return 2
  if (minutes < 240) return 3
  return 4
}

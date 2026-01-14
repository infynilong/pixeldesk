import { PrismaClient } from '@prisma/client'
import { redis } from './redis'

export interface TimeTrackingRecord {
  id: number
  userId: string
  activityType: string
  startTime: Date
  endTime: Date | null
  duration: number | null
  date: Date
  workstationId: string | null
  notes: string | null
  createdAt: Date
  updatedAt: Date
}

export interface WorkSessionRecord {
  id: number
  userId: string
  workstationId: string | null
  startTime: Date
  endTime: Date | null
  totalMinutes: number | null
  createdAt: Date
  updatedAt: Date
}

export class TimeTrackingManager {
  private prisma: PrismaClient
  private readonly CACHE_TTL = 3600 // 1小时

  constructor(prismaClient: PrismaClient) {
    this.prisma = prismaClient
  }

  /**
   * 开始一个活动计时
   */
  async startActivity(userId: string, activityType: string, workstationId?: string, notes?: string): Promise<TimeTrackingRecord> {
    try {
      // 首先检查是否有未结束的活动
      const ongoingActivity = await this.getOngoingActivity(userId)
      if (ongoingActivity) {
        // 结束当前活动
        await this.endActivity(userId)
      }

      // 如果是开始工作，检查是否有未结束的工作会话
      if (activityType === 'working') {
        const ongoingSession = await this.getOngoingWorkSession(userId)
        if (!ongoingSession) {
          // 创建新的工作会话
          await this.prisma.work_sessions.create({
            data: {
              userId,
              workstationId: workstationId || null,
              startTime: new Date(),
              updatedAt: new Date()
            }
          })
        }
      }

      // 创建新的时间记录
      const record = await this.prisma.time_tracking.create({
        data: {
          userId,
          activityType,
          startTime: new Date(),
          date: new Date(),
          workstationId: workstationId || null,
          notes: notes || null,
          updatedAt: new Date()
        }
      })

      // 缓存当前活动状态
      await redis.setJSON(`current_activity:${userId}`, record, this.CACHE_TTL)

      return record
    } catch (error) {
      console.error('Error starting activity:', error)
      throw error
    }
  }

  /**
   * 结束当前活动
   */
  async endActivity(userId: string): Promise<TimeTrackingRecord | null> {
    try {
      const ongoingActivity = await this.getOngoingActivity(userId)
      if (!ongoingActivity) return null

      const endTime = new Date()
      const duration = Math.round((endTime.getTime() - ongoingActivity.startTime.getTime()) / (1000 * 60)) // 分钟

      const updatedRecord = await this.prisma.time_tracking.update({
        where: { id: ongoingActivity.id },
        data: {
          endTime,
          duration,
          updatedAt: new Date()
        }
      })

      // 如果是结束工作，也结束工作会话
      if (ongoingActivity.activityType === 'working') {
        await this.endWorkSession(userId)
      }

      // 清除缓存
      await redis.del(`current_activity:${userId}`)

      return updatedRecord
    } catch (error) {
      console.error('Error ending activity:', error)
      throw error
    }
  }

  /**
   * 结束工作会话
   */
  async endWorkSession(userId: string): Promise<WorkSessionRecord | null> {
    try {
      const ongoingSession = await this.getOngoingWorkSession(userId)
      if (!ongoingSession) return null

      const endTime = new Date()
      const totalMinutes = Math.round((endTime.getTime() - ongoingSession.startTime.getTime()) / (1000 * 60))

      const updatedSession = await this.prisma.work_sessions.update({
        where: { id: ongoingSession.id },
        data: {
          endTime,
          totalMinutes,
          updatedAt: new Date()
        }
      })

      return updatedSession
    } catch (error) {
      console.error('Error ending work session:', error)
      throw error
    }
  }

  /**
   * 获取用户当前正在进行的活动
   */
  async getOngoingActivity(userId: string): Promise<TimeTrackingRecord | null> {
    try {
      // 先尝试从缓存获取
      const cached = await redis.getJSON(`current_activity:${userId}`)
      if (cached) return cached

      // 从数据库获取
      const activity = await this.prisma.time_tracking.findFirst({
        where: {
          userId,
          endTime: null
        },
        orderBy: { startTime: 'desc' }
      })

      if (activity) {
        // 缓存结果
        await redis.setJSON(`current_activity:${userId}`, activity, this.CACHE_TTL)
      }

      return activity
    } catch (error) {
      console.error('Error getting ongoing activity:', error)
      return null
    }
  }

  /**
   * 获取用户当前正在进行的工作会话
   */
  async getOngoingWorkSession(userId: string): Promise<WorkSessionRecord | null> {
    try {
      const session = await this.prisma.work_sessions.findFirst({
        where: {
          userId,
          endTime: null
        },
        orderBy: { startTime: 'desc' }
      })

      return session
    } catch (error) {
      console.error('Error getting ongoing work session:', error)
      return null
    }
  }

  /**
   * 获取用户今日时间统计
   */
  async getTodayStats(userId: string) {
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      const activities = await this.prisma.time_tracking.findMany({
        where: {
          userId,
          startTime: {
            gte: today,
            lt: tomorrow
          },
          endTime: { not: null }
        },
        orderBy: { startTime: 'asc' }
      })

      // 按活动类型分组统计
      const stats = activities.reduce((acc, activity) => {
        if (!activity.duration) return acc
        
        acc[activity.activityType] = (acc[activity.activityType] || 0) + activity.duration
        acc.total = (acc.total || 0) + activity.duration
        return acc
      }, {} as Record<string, number>)

      return {
        activities,
        stats
      }
    } catch (error) {
      console.error('Error getting today stats:', error)
      return { activities: [], stats: {} }
    }
  }

  /**
   * 获取用户工作会话历史
   */
  async getWorkSessions(userId: string, limit: number = 30) {
    try {
      const sessions = await this.prisma.work_sessions.findMany({
        where: { userId },
        orderBy: { startTime: 'desc' },
        take: limit
      })

      return sessions
    } catch (error) {
      console.error('Error getting work sessions:', error)
      return []
    }
  }

  /**
   * 获取用户时间统计概览
   */
  async getTimeOverview(userId: string, days: number = 7) {
    try {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      const activities = await this.prisma.time_tracking.findMany({
        where: {
          userId,
          startTime: { gte: startDate },
          endTime: { not: null }
        },
        orderBy: { startTime: 'asc' }
      })

      // 按日期和活动类型分组
      const dailyStats: Record<string, Record<string, number>> = {}
      
      activities.forEach(activity => {
        if (!activity.duration) return
        
        const dateKey = activity.startTime.toISOString().split('T')[0]
        if (!dailyStats[dateKey]) {
          dailyStats[dateKey] = {}
        }
        
        dailyStats[dateKey][activity.activityType] = (dailyStats[dateKey][activity.activityType] || 0) + activity.duration
        dailyStats[dateKey].total = (dailyStats[dateKey].total || 0) + activity.duration
      })

      return {
        dailyStats,
        totalActivities: activities.length
      }
    } catch (error) {
      console.error('Error getting time overview:', error)
      return { dailyStats: {}, totalActivities: 0 }
    }
  }

  /**
   * 强制结束所有未完成的活动（用于清理）
   */
  async forceEndAllActivities(userId: string): Promise<number> {
    try {
      const ongoingActivities = await this.prisma.time_tracking.findMany({
        where: {
          userId,
          endTime: null
        }
      })

      let endedCount = 0
      for (const activity of ongoingActivities) {
        await this.endActivity(userId)
        endedCount++
      }

      // 也结束未完成的工作会话
      const ongoingSessions = await this.prisma.work_sessions.findMany({
        where: {
          userId,
          endTime: null
        }
      })

      for (const session of ongoingSessions) {
        await this.endWorkSession(userId)
      }

      return endedCount
    } catch (error) {
      console.error('Error force ending activities:', error)
      return 0
    }
  }
}

// 注意：全局实例已移除，需要在API路由中创建实例并传入prisma客户端
// 示例：const timeTrackingManager = new TimeTrackingManager(prisma)
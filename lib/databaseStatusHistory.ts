import { prisma } from '../lib/db'
import redis from '../lib/redis'

export interface StatusHistory {
  id: string
  type: string
  status: string
  emoji: string
  message: string
  timestamp: Date
  userId?: string
}

export class DatabaseStatusHistoryManager {
  private readonly CACHE_TTL = 3600 // 1小时
  private readonly MAX_HISTORY_ITEMS = 50

  /**
   * 获取状态历史
   */
  async getStatusHistory(userId?: string): Promise<StatusHistory[]> {
    try {
      // 先尝试从缓存获取
      if (userId) {
        const cached = await redis.getJSON(`status_history:${userId}`)
        if (cached) {
          return cached
        }
      }

      // 从数据库获取
      const whereClause = userId ? { userId } : {}
      const history = await prisma.statusHistory.findMany({
        where: whereClause,
        orderBy: { timestamp: 'desc' },
        take: this.MAX_HISTORY_ITEMS
      })

      // 缓存结果
      if (userId && history.length > 0) {
        await redis.setJSON(`status_history:${userId}`, history, this.CACHE_TTL)
      }

      return history
    } catch (error) {
      console.error('Error fetching status history:', error)
      return []
    }
  }

  /**
   * 添加状态历史记录
   */
  async addStatusHistory(status: any, userId?: string): Promise<StatusHistory | null> {
    try {
      const historyItem = await prisma.statusHistory.create({
        data: {
          userId,
          type: status.type,
          status: status.status,
          emoji: status.emoji,
          message: status.message,
          timestamp: new Date(status.timestamp || Date.now())
        }
      })

      // 清除用户缓存
      if (userId) {
        await redis.del(`status_history:${userId}`)
      }

      return historyItem
    } catch (error) {
      console.error('Error adding status history:', error)
      return null
    }
  }

  /**
   * 清理状态历史
   */
  async clearStatusHistory(userId?: string): Promise<boolean> {
    try {
      if (userId) {
        // 清理特定用户的历史
        await prisma.statusHistory.deleteMany({
          where: { userId }
        })
        await redis.del(`status_history:${userId}`)
      } else {
        // 清理所有历史
        await prisma.statusHistory.deleteMany({})
        // 清除所有相关缓存
        const keys = await redis.keys('status_history:*')
        if (keys.length > 0) {
          await redis.del(...keys)
        }
      }
      return true
    } catch (error) {
      console.error('Error clearing status history:', error)
      return false
    }
  }

  /**
   * 获取状态历史统计
   */
  async getStatusHistoryStats(userId?: string) {
    try {
      const history = await this.getStatusHistory(userId)
      
      // 计算今日状态数量
      const today = new Date().toDateString()
      const todayCount = history.filter(item => 
        new Date(item.timestamp).toDateString() === today
      ).length
      
      // 计算最常用的状态
      const statusCount = history.reduce((acc, item) => {
        acc[item.type] = (acc[item.type] || 0) + 1
        return acc
      }, {} as Record<string, number>)
      
      const mostUsedStatus = Object.entries(statusCount)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || 'working'
      
      return {
        total: history.length,
        todayCount,
        mostUsedStatus
      }
    } catch (error) {
      console.error('Error getting status history stats:', error)
      return {
        total: 0,
        todayCount: 0,
        mostUsedStatus: 'working'
      }
    }
  }

  /**
   * 获取最近的状态
   */
  async getRecentStatus(userId: string, limit: number = 5): Promise<StatusHistory[]> {
    try {
      const recent = await prisma.statusHistory.findMany({
        where: { userId },
        orderBy: { timestamp: 'desc' },
        take: limit
      })
      return recent
    } catch (error) {
      console.error('Error getting recent status:', error)
      return []
    }
  }

  /**
   * 获取状态分布
   */
  async getStatusDistribution(userId?: string) {
    try {
      const whereClause = userId ? { userId } : {}
      const distribution = await prisma.statusHistory.groupBy({
        by: ['type'],
        where: whereClause,
        _count: {
          type: true
        }
      })

      return distribution.map(item => ({
        type: item.type,
        count: item._count.type
      }))
    } catch (error) {
      console.error('Error getting status distribution:', error)
      return []
    }
  }
}

// 创建全局实例
export const databaseStatusHistoryManager = new DatabaseStatusHistoryManager()
// 状态历史记录管理工具
export interface StatusHistory {
  id: string
  type: string
  status: string
  emoji: string
  message: string
  timestamp: string
}

export interface StatusHistoryManager {
  // 获取状态历史
  getStatusHistory: (userId?: string) => StatusHistory[]
  
  // 添加状态历史记录
  addStatusHistory: (status: any, userId?: string) => void
  
  // 清理状态历史
  clearStatusHistory: (userId?: string) => void
  
  // 获取状态历史统计
  getStatusHistoryStats: (userId?: string) => {
    total: number
    todayCount: number
    mostUsedStatus: string
  }
}

// 状态历史记录管理器实现
export class StatusHistoryManagerImpl implements StatusHistoryManager {
  private readonly STORAGE_KEY = 'pixelDesk_statusHistory'
  private readonly MAX_HISTORY_ITEMS = 50

  // 获取状态历史
  getStatusHistory(userId?: string): StatusHistory[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (!stored) return []
      
      const allHistory = JSON.parse(stored)
      const userHistory = userId 
        ? allHistory.filter((item: any) => item.userId === userId)
        : allHistory
      
      // 按时间戳倒序排列
      return userHistory
        .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, this.MAX_HISTORY_ITEMS)
    } catch (error) {
      console.warn('Failed to load status history:', error)
      return []
    }
  }

  // 添加状态历史记录
  addStatusHistory(status: any, userId?: string): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      const allHistory = stored ? JSON.parse(stored) : []
      
      const newHistoryItem: StatusHistory = {
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: status.type,
        status: status.status,
        emoji: status.emoji,
        message: status.message,
        timestamp: status.timestamp
      }
      
      // 如果有userId，添加到历史记录中
      if (userId) {
        ;(newHistoryItem as any).userId = userId
      }
      
      allHistory.push(newHistoryItem)
      
      // 限制历史记录数量
      if (allHistory.length > this.MAX_HISTORY_ITEMS) {
        // 保留最新的记录
        allHistory.splice(0, allHistory.length - this.MAX_HISTORY_ITEMS)
      }
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(allHistory))
    } catch (error) {
      console.warn('Failed to save status history:', error)
    }
  }

  // 清理状态历史
  clearStatusHistory(userId?: string): void {
    try {
      if (userId) {
        // 清理特定用户的历史
        const stored = localStorage.getItem(this.STORAGE_KEY)
        if (stored) {
          const allHistory = JSON.parse(stored)
          const filteredHistory = allHistory.filter((item: any) => item.userId !== userId)
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredHistory))
        }
      } else {
        // 清理所有历史
        localStorage.removeItem(this.STORAGE_KEY)
      }
    } catch (error) {
      console.warn('Failed to clear status history:', error)
    }
  }

  // 获取状态历史统计
  getStatusHistoryStats(userId?: string) {
    const history = this.getStatusHistory(userId)
    
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
  }

  // 生成模拟状态历史数据（已移除，用于生产环境）
  // generateMockHistory(userId?: string): void {
  //   // 此方法已移除，避免在生产环境中生成测试数据
  // }
}

// 创建全局状态历史管理器实例
export const statusHistoryManager = new StatusHistoryManagerImpl()

// 导入数据库版本的管理器（仅在服务器端使用）
// export { databaseStatusHistoryManager } from './databaseStatusHistory'

// 格式化时间戳的工具函数
export const formatTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffMinutes < 1) return '刚刚'
  if (diffMinutes < 60) return `${diffMinutes}分钟前`
  if (diffHours < 24) return `${diffHours}小时前`
  if (diffDays < 7) return `${diffDays}天前`
  
  return date.toLocaleDateString('zh-CN')
}

// 获取状态徽章样式
export const getStatusBadge = (type: string): string => {
  const badges: Record<string, string> = {
    working: 'from-blue-500 to-cyan-500',
    break: 'from-green-500 to-emerald-500',
    reading: 'from-purple-500 to-violet-500',
    restroom: 'from-yellow-500 to-orange-500',
    meeting: 'from-red-500 to-pink-500',
    lunch: 'from-orange-500 to-amber-500'
  }
  return badges[type] || 'from-gray-500 to-slate-500'
}
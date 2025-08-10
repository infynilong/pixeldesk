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

  // 生成模拟状态历史数据（用于演示）
  generateMockHistory(userId?: string): void {
    const mockStatuses = [
      { type: 'working', status: '工作中', emoji: '💼', messages: ['正在处理一个重要的项目', '专注编程中', '解决复杂问题'] },
      { type: 'break', status: '休息中', emoji: '☕', messages: ['喝杯咖啡放松一下', '短暂休息', '补充能量'] },
      { type: 'reading', status: '阅读中', emoji: '📚', messages: ['在读技术书籍', '学习新知识', '阅读文档'] },
      { type: 'meeting', status: '会议中', emoji: '👥', messages: ['团队讨论', '项目会议', '技术分享'] },
      { type: 'lunch', status: '午餐时间', emoji: '🍽️', messages: ['享受午餐', '与同事共进午餐', '补充营养'] }
    ]
    
    const mockHistory: StatusHistory[] = []
    const now = new Date()
    
    // 生成过去7天的模拟数据
    for (let i = 0; i < 20; i++) {
      const randomStatus = mockStatuses[Math.floor(Math.random() * mockStatuses.length)]
      const randomMessage = randomStatus.messages[Math.floor(Math.random() * randomStatus.messages.length)]
      const randomHours = Math.floor(Math.random() * 24 * 7) // 过去7天内
      
      const timestamp = new Date(now.getTime() - randomHours * 60 * 60 * 1000).toISOString()
      
      const historyItem: StatusHistory = {
        id: `mock_${i}_${Math.random().toString(36).substr(2, 9)}`,
        type: randomStatus.type,
        status: randomStatus.status,
        emoji: randomStatus.emoji,
        message: randomMessage,
        timestamp
      }
      
      if (userId) {
        ;(historyItem as any).userId = userId
      }
      
      mockHistory.push(historyItem)
    }
    
    // 保存模拟数据
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      const existingHistory = stored ? JSON.parse(stored) : []
      
      // 合并现有数据和模拟数据
      const mergedHistory = [...existingHistory, ...mockHistory]
        .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, this.MAX_HISTORY_ITEMS)
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(mergedHistory))
    } catch (error) {
      console.warn('Failed to generate mock history:', error)
    }
  }
}

// 创建全局状态历史管理器实例
export const statusHistoryManager = new StatusHistoryManagerImpl()

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
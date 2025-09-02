'use client'

import { useState, memo, useCallback, ChangeEvent, useEffect } from 'react'
import { statusHistoryManager, formatTimestamp, getStatusBadge } from '../lib/statusHistory'

const statusOptions = [
  { id: 'working', label: '工作中', emoji: '💼', color: 'from-retro-blue to-retro-cyan' },
  { id: 'break', label: '休息中', emoji: '☕', color: 'from-retro-green to-retro-blue' },
  { id: 'reading', label: '阅读中', emoji: '📚', color: 'from-retro-purple to-retro-pink' },
  { id: 'restroom', label: '洗手间', emoji: '🚻', color: 'from-retro-yellow to-retro-orange' },
  { id: 'meeting', label: '会议中', emoji: '👥', color: 'from-retro-red to-retro-pink' },
  { id: 'lunch', label: '午餐时间', emoji: '🍽️', color: 'from-retro-orange to-retro-yellow' },
  { id: 'off_work', label: '下班了', emoji: '🏠', color: 'from-retro-textMuted to-retro-border' }
]

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
  const [selectedStatus, setSelectedStatus] = useState('working')
  const [customMessage, setCustomMessage] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [statusHistory, setStatusHistory] = useState<any[]>([])

  // 初始化时加载状态历史
  useEffect(() => {
    console.log('PostStatus mounted with userId:', userId)
    if (userId) {
      // 加载状态历史
      loadStatusHistory()
    }
  }, [userId])

  // 加载状态历史
  const loadStatusHistory = useCallback(async () => {
    console.log('Loading status history for userId:', userId)
    if (userId) {
      try {
        // 通过API从数据库加载状态历史
        console.log('Loading from API...')
        const response = await fetch(`/api/status-history?userId=${userId}`)
        if (response.ok) {
          const result = await response.json()
          console.log('API history loaded:', result.data.length, 'items')
          setStatusHistory(result.data)
        } else {
          throw new Error(`API error: ${response.status}`)
        }
      } catch (error) {
        console.error('Error loading status history from API:', error)
        // 如果API失败，回退到本地缓存
        console.log('Falling back to localStorage...')
        const history = statusHistoryManager.getStatusHistory(userId)
        console.log('LocalStorage history loaded:', history.length, 'items')
        setStatusHistory(history)
      }
    }
  }, [userId])

  // 优化：避免不必要的重新渲染
  const memoizedHandleSubmit = useCallback(async () => {
    console.log('HandleSubmit called with userId:', userId)
    const status = statusOptions.find(s => s.id === selectedStatus)
    if (!status) return
    
    const fullStatus = {
      type: selectedStatus,
      status: status.label,
      emoji: status.emoji,
      message: customMessage || `正在${status.label}`,
      timestamp: new Date().toISOString()
    }
    
    // 保存状态历史记录到数据库和本地缓存
    console.log('Saving status with userId:', userId, 'status:', fullStatus)
    
    if (!userId) {
      console.error('Cannot save status: userId is null or undefined')
      return
    }
    
    try {
      // 通过API保存到数据库
      console.log('Calling API to save status...')
      const response = await fetch('/api/status-history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          status: fullStatus.status,
          type: fullStatus.type,
          emoji: fullStatus.emoji,
          message: fullStatus.message
        })
      })
      
      if (response.ok) {
        const result = await response.json()
        console.log('Status saved to database via API:', result)
      } else {
        console.error('Failed to save status via API:', response.status)
      }
    } catch (error) {
      console.error('Error saving status via API:', error)
    }
    
    // 时间跟踪：根据状态类型开始或结束活动
    try {
      console.log('Calling time tracking API for status:', selectedStatus)
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
      
      if (timeTrackingResponse.ok) {
        const result = await timeTrackingResponse.json()
        console.log('Time tracking started:', result)
      } else {
        console.error('Failed to start time tracking:', timeTrackingResponse.status)
      }
    } catch (error) {
      console.error('Error starting time tracking:', error)
    }
    
    // 同时保存到本地缓存（用于快速UI更新）
    statusHistoryManager.addStatusHistory(fullStatus, userId)
    // 重新加载状态历史
    loadStatusHistory()
    
    // 通知 Phaser 游戏更新状态（优先执行，避免延迟）
    if (typeof window !== 'undefined' && (window as any).updateMyStatus) {
      (window as any).updateMyStatus(fullStatus)
    }
    
    // 更新 React 组件状态（异步执行，避免阻塞UI）
    requestAnimationFrame(() => {
      onStatusUpdate(fullStatus)
    })
    
    // 平滑收起面板
    setIsExpanded(false)
    setCustomMessage('')
  }, [selectedStatus, customMessage, onStatusUpdate, userId, loadStatusHistory, userData?.workstationId])

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
  
  return (
    <div className="space-y-4">
      {/* 用户信息卡片 */}
      {userData && (
        <div className="group relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-retro-blue/20 to-retro-purple/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="relative bg-retro-bg-darker/80 backdrop-blur-sm border border-retro-border rounded-md p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-retro-blue to-retro-purple rounded-full flex items-center justify-center">
                  <span className="text-xl font-bold text-white">
                    {userData.username?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <div>
                  <div className="text-white font-medium text-lg">{userData.username || '用户'}</div>
                  <div className="text-gray-400 text-sm">ID: {userId || 'unknown'}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-retro-yellow font-bold text-xl">
                  <span className="text-sm">💎</span> {userData.points || 0}
                </div>
                <div className="text-retro-textMuted text-xs">积分</div>
              </div>
            </div>
            
            {/* 工位信息 */}
            <div className="flex items-center justify-between pt-3 border-t border-retro-border">
              <div className="flex items-center gap-2">
                <span className="text-lg">🏢</span>
                <span className="text-retro-text text-sm">工位状态</span>
              </div>
              <div className="text-right">
                {userData.workstationId ? (
                  <div className="text-retro-green text-sm font-medium">
                    已绑定: {userData.workstationId}
                  </div>
                ) : (
                  <div className="text-retro-orange text-sm font-medium">
                    未绑定工位
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}


      {/* 当前状态显示 */}
      {currentStatus && (
        <div className="group relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-retro-purple/20 to-retro-pink/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="relative bg-retro-bg-darker/80 backdrop-blur-sm border border-retro-border rounded-md p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-retro-purple to-retro-pink rounded-full flex items-center justify-center">
                <span className="text-xl">{currentStatus.emoji}</span>
              </div>
              <div className="flex-1">
                <div className="text-white font-medium">{currentStatus.status}</div>
                <div className="text-retro-textMuted text-sm">{currentStatus.message}</div>
              </div>
              <div className="w-2 h-2 bg-retro-green rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>
      )}

      {/* 状态选择按钮 */}
      <button
        onClick={memoizedHandleToggle}
        className="w-full group relative overflow-hidden bg-gradient-to-r from-retro-purple to-retro-pink hover:from-retro-blue hover:to-retro-cyan text-white font-medium py-3 px-6 rounded-md transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-md hover:shadow-lg"
      >
        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
        <div className="relative flex items-center justify-center gap-2">
          <span className="text-lg">📝</span>
          <span>{isExpanded ? '取消' : '更新状态'}</span>
        </div>
      </button>

      {/* 状态历史按钮 */}
      {userId && (
        <button
          onClick={memoizedHandleToggleHistory}
          className="w-full group relative overflow-hidden bg-retro-border/50 hover:bg-retro-border/70 text-white font-medium py-2 px-4 rounded-md transition-all duration-200 border border-retro-border hover:border-retro-blue"
        >
          <div className="relative flex items-center justify-center gap-2">
            <span className="text-lg">📊</span>
            <span>{showHistory ? '隐藏历史' : '查看状态历史'}</span>
            <span className="text-xs bg-retro-purple/50 text-white px-2 py-1 rounded-full">
              {statusHistory.length}
            </span>
          </div>
        </button>
      )}

      {/* 详细状态设置 */}
      {isExpanded && (
        <div 
          className="space-y-4 bg-retro-bg-darker/80 backdrop-blur-sm border border-retro-border rounded-md p-4"
          onClick={(e) => {
            // 阻止点击事件冒泡到Phaser游戏
            e.stopPropagation();
          }}
          onKeyDown={(e) => {
            // 阻止键盘事件冒泡到Phaser游戏
            e.stopPropagation();
          }}
        >
          {/* 状态类型选择 */}
          <div>
            <label className="block text-sm font-medium text-white mb-3">选择状态</label>
            <div className="grid grid-cols-2 gap-3">
              {statusOptions.map((status) => (
                <button
                  key={status.id}
                  onClick={() => memoizedHandleStatusSelect(status.id)}
                  className={`group relative overflow-hidden p-4 rounded-xl border-2 transition-all duration-300 transform hover:scale-[1.02] ${
                    selectedStatus === status.id
                      ? 'border-white/30 bg-gradient-to-br ' + status.color + ' text-white shadow-lg'
                      : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                  }`}
                >
                  <div className="relative flex flex-col items-center">
                    <div className="text-3xl mb-2">{status.emoji}</div>
                    <div className="text-sm font-medium">{status.label}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 自定义消息 */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              自定义消息（可选）
            </label>
            <textarea
              value={customMessage}
              onChange={memoizedHandleMessageChange}
              onKeyDown={(e) => {
                // 阻止键盘事件冒泡到Phaser游戏
                e.stopPropagation();
              }}
              onKeyUp={(e) => {
                // 阻止键盘事件冒泡到Phaser游戏
                e.stopPropagation();
              }}
              onClick={(e) => {
                // 阻止点击事件冒泡
                e.stopPropagation();
              }}
              placeholder="分享你正在做什么..."
              className="w-full p-3 bg-white/5 border border-white/10 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-gray-400 backdrop-blur-sm transition-all duration-300"
              rows={3}
            />
          </div>

          {/* 提交按钮 */}
          <div className="flex gap-3">
            <button
              onClick={memoizedHandleSubmit}
              className="flex-1 bg-gradient-to-r from-retro-green to-retro-blue hover:from-retro-blue hover:to-retro-cyan text-white font-medium py-3 px-6 rounded-md transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-md hover:shadow-lg"
            >
              发布状态
            </button>
            <button
              onClick={memoizedHandleCancel}
              className="flex-1 bg-retro-border/50 hover:bg-retro-border/70 text-white font-medium py-3 px-6 rounded-md transition-all duration-200 border border-retro-border hover:border-retro-blue"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* 状态历史显示 */}
      {showHistory && userId && (
        <div className="space-y-3 bg-retro-bg-darker/80 backdrop-blur-sm border border-retro-border rounded-md p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-medium">我的状态历史</h3>
            <div className="text-xs text-retro-textMuted">
              共 {statusHistory.length} 条记录
            </div>
          </div>
          
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {statusHistory.length === 0 ? (
              <div className="text-center py-8 text-retro-textMuted">
                <div className="text-4xl mb-2">📝</div>
                <div className="text-sm">还没有状态记录</div>
                <div className="text-xs mt-1">发布你的第一个状态吧！</div>
              </div>
            ) : (
              statusHistory.map((history) => (
                <div key={history.id} className="bg-retro-border/30 rounded-md p-3 border border-retro-border">
                  <div className="flex items-center justify-between mb-2">
                    <div className={`px-2 py-1 rounded-full bg-gradient-to-r ${getStatusBadge(history.type)} text-white text-xs font-medium`}>
                      {history.emoji} {history.status}
                    </div>
                    <span className="text-retro-textMuted text-xs">
                      {formatTimestamp(history.timestamp)}
                    </span>
                  </div>
                  <p className="text-retro-text text-sm">{history.message}</p>
                </div>
              ))
            )}
          </div>
          
          {/* 状态统计 */}
          {statusHistory.length > 0 && (
            <div className="mt-4 pt-3 border-t border-retro-border">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-lg font-bold text-white">
                    {statusHistoryManager.getStatusHistoryStats(userId).todayCount}
                  </div>
                  <div className="text-xs text-retro-textMuted">今日状态</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-white">
                    {statusHistory.length}
                  </div>
                  <div className="text-xs text-retro-textMuted">总记录数</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-white">
                    {statusHistoryManager.getStatusHistoryStats(userId).mostUsedStatus === 'working' ? '💼' : 
                     statusHistoryManager.getStatusHistoryStats(userId).mostUsedStatus === 'break' ? '☕' :
                     statusHistoryManager.getStatusHistoryStats(userId).mostUsedStatus === 'reading' ? '📚' :
                     statusHistoryManager.getStatusHistoryStats(userId).mostUsedStatus === 'meeting' ? '👥' :
                     statusHistoryManager.getStatusHistoryStats(userId).mostUsedStatus === 'lunch' ? '🍽️' : '🚻'}
                  </div>
                  <div className="text-xs text-retro-textMuted">最常用</div>
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
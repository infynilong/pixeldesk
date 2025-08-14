'use client'

import { useState, memo, useCallback, ChangeEvent, useEffect } from 'react'
import { statusHistoryManager, formatTimestamp, getStatusBadge } from '../lib/statusHistory'

const statusOptions = [
  { id: 'working', label: '工作中', emoji: '💼', color: 'from-blue-500 to-cyan-500' },
  { id: 'break', label: '休息中', emoji: '☕', color: 'from-green-500 to-emerald-500' },
  { id: 'reading', label: '阅读中', emoji: '📚', color: 'from-purple-500 to-violet-500' },
  { id: 'restroom', label: '洗手间', emoji: '🚻', color: 'from-yellow-500 to-orange-500' },
  { id: 'meeting', label: '会议中', emoji: '👥', color: 'from-red-500 to-pink-500' },
  { id: 'lunch', label: '午餐时间', emoji: '🍽️', color: 'from-orange-500 to-amber-500' }
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
  workstationStats?: {
    totalWorkstations?: number
    boundWorkstations?: number
    availableWorkstations?: number
  }
}

const PostStatus = memo(({ onStatusUpdate, currentStatus, userId, userData, workstationStats }: PostStatusProps) => {
  const [selectedStatus, setSelectedStatus] = useState('working')
  const [customMessage, setCustomMessage] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [statusHistory, setStatusHistory] = useState<any[]>([])

  // 初始化时加载状态历史
  useEffect(() => {
    if (userId) {
      // 加载状态历史
      loadStatusHistory()
    }
  }, [userId])

  // 加载状态历史
  const loadStatusHistory = useCallback(() => {
    if (userId) {
      const history = statusHistoryManager.getStatusHistory(userId)
      setStatusHistory(history)
    }
  }, [userId])

  // 优化：避免不必要的重新渲染
  const memoizedHandleSubmit = useCallback(() => {
    const status = statusOptions.find(s => s.id === selectedStatus)
    if (!status) return
    
    const fullStatus = {
      type: selectedStatus,
      status: status.label,
      emoji: status.emoji,
      message: customMessage || `正在${status.label}`,
      timestamp: new Date().toISOString()
    }
    
    // 保存状态历史记录
    if (userId) {
      statusHistoryManager.addStatusHistory(fullStatus, userId)
      // 重新加载状态历史
      loadStatusHistory()
    }
    
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
  }, [selectedStatus, customMessage, onStatusUpdate, userId, loadStatusHistory])

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
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
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
                <div className="text-yellow-400 font-bold text-xl">
                  <span className="text-sm">💎</span> {userData.points || 0}
                </div>
                <div className="text-gray-400 text-xs">积分</div>
              </div>
            </div>
            
            {/* 工位信息 */}
            <div className="flex items-center justify-between pt-3 border-t border-white/10">
              <div className="flex items-center gap-2">
                <span className="text-lg">🏢</span>
                <span className="text-gray-300 text-sm">工位状态</span>
              </div>
              <div className="text-right">
                {userData.workstationId ? (
                  <div className="text-green-400 text-sm font-medium">
                    已绑定: {userData.workstationId}
                  </div>
                ) : (
                  <div className="text-orange-400 text-sm font-medium">
                    未绑定工位
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 工位统计信息 */}
      {workstationStats && (
        <div className="group relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🏢</span>
                <span className="text-white font-medium">工位统计</span>
              </div>
              <div className="text-xs text-gray-400">实时更新</div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-lg font-bold text-blue-400">
                  {workstationStats.totalWorkstations || 0}
                </div>
                <div className="text-xs text-gray-400">总工位</div>
              </div>
              <div>
                <div className="text-lg font-bold text-green-400">
                  {workstationStats.boundWorkstations || 0}
                </div>
                <div className="text-xs text-gray-400">已绑定</div>
              </div>
              <div>
                <div className="text-lg font-bold text-orange-400">
                  {workstationStats.availableWorkstations || 0}
                </div>
                <div className="text-xs text-gray-400">可用</div>
              </div>
            </div>
            
            {/* 进度条 */}
            <div className="mt-3 pt-3 border-t border-white/10">
              <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                <span>占用率</span>
                <span>
                  {workstationStats.totalWorkstations && workstationStats.boundWorkstations ? 
                    Math.round((workstationStats.boundWorkstations / workstationStats.totalWorkstations) * 100) : 
                    0}%
                </span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-green-400 to-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${workstationStats.totalWorkstations && workstationStats.boundWorkstations ? 
                      (workstationStats.boundWorkstations / workstationStats.totalWorkstations) * 100 : 
                      0}%` 
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 当前状态显示 */}
      {currentStatus && (
        <div className="group relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <span className="text-xl">{currentStatus.emoji}</span>
              </div>
              <div className="flex-1">
                <div className="text-white font-medium">{currentStatus.status}</div>
                <div className="text-gray-400 text-sm">{currentStatus.message}</div>
              </div>
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>
      )}

      {/* 状态选择按钮 */}
      <button
        onClick={memoizedHandleToggle}
        className="w-full group relative overflow-hidden bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
      >
        <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        <div className="relative flex items-center justify-center gap-2">
          <span className="text-lg">📝</span>
          <span>{isExpanded ? '取消' : '更新状态'}</span>
        </div>
      </button>

      {/* 状态历史按钮 */}
      {userId && (
        <button
          onClick={memoizedHandleToggleHistory}
          className="w-full group relative overflow-hidden bg-white/10 hover:bg-white/20 text-white font-medium py-2 px-4 rounded-xl transition-all duration-300 border border-white/10 hover:border-white/20"
        >
          <div className="relative flex items-center justify-center gap-2">
            <span className="text-lg">📊</span>
            <span>{showHistory ? '隐藏历史' : '查看状态历史'}</span>
            <span className="text-xs bg-purple-500/30 text-white px-2 py-1 rounded-full">
              {statusHistory.length}
            </span>
          </div>
        </button>
      )}

      {/* 详细状态设置 */}
      {isExpanded && (
        <div className="space-y-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
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
              placeholder="分享你正在做什么..."
              className="w-full p-3 bg-white/5 border border-white/10 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-gray-400 backdrop-blur-sm transition-all duration-300"
              rows={3}
            />
          </div>

          {/* 提交按钮 */}
          <div className="flex gap-3">
            <button
              onClick={memoizedHandleSubmit}
              className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-medium py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
            >
              发布状态
            </button>
            <button
              onClick={memoizedHandleCancel}
              className="flex-1 bg-white/10 hover:bg-white/20 text-white font-medium py-3 px-6 rounded-xl transition-all duration-300 border border-white/10 hover:border-white/20"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* 状态历史显示 */}
      {showHistory && userId && (
        <div className="space-y-3 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-medium">我的状态历史</h3>
            <div className="text-xs text-gray-400">
              共 {statusHistory.length} 条记录
            </div>
          </div>
          
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {statusHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <div className="text-4xl mb-2">📝</div>
                <div className="text-sm">还没有状态记录</div>
                <div className="text-xs mt-1">发布你的第一个状态吧！</div>
              </div>
            ) : (
              statusHistory.map((history) => (
                <div key={history.id} className="bg-white/5 rounded-lg p-3 border border-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <div className={`px-2 py-1 rounded-full bg-gradient-to-r ${getStatusBadge(history.type)} text-white text-xs font-medium`}>
                      {history.emoji} {history.status}
                    </div>
                    <span className="text-gray-400 text-xs">
                      {formatTimestamp(history.timestamp)}
                    </span>
                  </div>
                  <p className="text-gray-300 text-sm">{history.message}</p>
                </div>
              ))
            )}
          </div>
          
          {/* 状态统计 */}
          {statusHistory.length > 0 && (
            <div className="mt-4 pt-3 border-t border-white/10">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-lg font-bold text-white">
                    {statusHistoryManager.getStatusHistoryStats(userId).todayCount}
                  </div>
                  <div className="text-xs text-gray-400">今日状态</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-white">
                    {statusHistory.length}
                  </div>
                  <div className="text-xs text-gray-400">总记录数</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-white">
                    {statusHistoryManager.getStatusHistoryStats(userId).mostUsedStatus === 'working' ? '💼' : 
                     statusHistoryManager.getStatusHistoryStats(userId).mostUsedStatus === 'break' ? '☕' :
                     statusHistoryManager.getStatusHistoryStats(userId).mostUsedStatus === 'reading' ? '📚' :
                     statusHistoryManager.getStatusHistoryStats(userId).mostUsedStatus === 'meeting' ? '👥' :
                     statusHistoryManager.getStatusHistoryStats(userId).mostUsedStatus === 'lunch' ? '🍽️' : '🚻'}
                  </div>
                  <div className="text-xs text-gray-400">最常用</div>
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
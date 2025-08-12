'use client'

import { useState, useCallback, memo, useEffect } from 'react'

interface WorkstationInfoModalProps {
  isVisible: boolean
  workstationId: number | null
  userId: string | null
  onClose: () => void
}

interface BindingInfo {
  id: number
  userId: string
  workstationId: number
  cost: number
  boundAt: string
}

interface UserInfo {
  id: string
  name: string
  email?: string
  avatar?: string
  points: number
  gold: number
  createdAt: string
  updatedAt: string
}

const WorkstationInfoModal = memo(({ 
  isVisible, 
  workstationId, 
  userId, 
  onClose 
}: WorkstationInfoModalProps) => {
  const [bindingInfo, setBindingInfo] = useState<BindingInfo | null>(null)
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 计算时间信息
  const calculateTimeInfo = useCallback((boundAt: string) => {
    const boundDate = new Date(boundAt)
    const now = new Date()
    
    // 租赁开始时间
    const rentalStart = boundDate.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
    
    // 租赁时长（30天）
    const rentalEnd = new Date(boundDate.getTime() + 30 * 24 * 60 * 60 * 1000)
    const rentalEndStr = rentalEnd.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
    
    // 已使用时间
    const timeUsed = now.getTime() - boundDate.getTime()
    const daysUsed = Math.floor(timeUsed / (1000 * 60 * 60 * 24))
    const hoursUsed = Math.floor((timeUsed % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutesUsed = Math.floor((timeUsed % (1000 * 60 * 60)) / (1000 * 60))
    
    // 剩余时间
    const timeRemaining = rentalEnd.getTime() - now.getTime()
    const daysRemaining = Math.max(0, Math.floor(timeRemaining / (1000 * 60 * 60 * 24)))
    const hoursRemaining = Math.max(0, Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)))
    
    // 是否已过期
    const isExpired = timeRemaining <= 0
    
    // 使用进度百分比
    const usagePercentage = Math.min(100, Math.max(0, (timeUsed / (30 * 24 * 60 * 60 * 1000)) * 100))
    
    return {
      rentalStart,
      rentalEnd: rentalEndStr,
      timeUsed: `${daysUsed}天 ${hoursUsed}小时 ${minutesUsed}分钟`,
      timeRemaining: isExpired ? '已过期' : `${daysRemaining}天 ${hoursRemaining}小时`,
      isExpired,
      totalDays: 30,
      usagePercentage
    }
  }, [])

  // 获取绑定信息
  const fetchBindingInfo = useCallback(async () => {
    if (!isVisible || !userId || !workstationId) return
    
    setLoading(true)
    setError(null)
    
    try {
      // 并行获取绑定信息和用户信息
      const [bindingResponse, userResponse] = await Promise.all([
        fetch(`/api/workstations/user-bindings?userId=${userId}`),
        fetch(`/api/users?userId=${userId}`)
      ])
      
      const bindingResult = await bindingResponse.json()
      const userResult = await userResponse.json()
      
      if (bindingResult.success) {
        // 查找指定工位的绑定信息
        const binding = bindingResult.data.find((b: BindingInfo) => b.workstationId === workstationId)
        if (binding) {
          setBindingInfo(binding)
        } else {
          setError('未找到该工位的绑定信息')
        }
      } else {
        setError(bindingResult.error || '获取绑定信息失败')
      }
      
      if (userResult.success) {
        setUserInfo(userResult.data)
      } else {
        console.warn('获取用户信息失败:', userResult.error)
        // 用户信息获取失败不影响主要功能
      }
    } catch (error) {
      console.error('获取信息失败:', error)
      setError('获取信息失败')
    } finally {
      setLoading(false)
    }
  }, [isVisible, userId, workstationId])

  // 处理关闭
  const handleClose = useCallback(() => {
    onClose()
  }, [onClose])

  // 当弹窗显示时获取数据
  useEffect(() => {
    if (isVisible) {
      fetchBindingInfo()
    }
  }, [isVisible, fetchBindingInfo])

  // 如果弹窗不可见，返回null
  if (!isVisible || !userId || !workstationId) {
    return null
  }

  const timeInfo = bindingInfo ? calculateTimeInfo(bindingInfo.boundAt) : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 半透明背景 */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* 弹窗容器 */}
      <div className="relative bg-gray-900 border border-green-500/30 rounded-xl p-4 w-full max-w-sm mx-4 shadow-2xl">
        {/* 关闭按钮 */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* 标题 */}
        <div className="mb-4">
          <h2 className="text-lg font-bold text-white mb-1">工位信息</h2>
          <div className="w-8 h-1 bg-gradient-to-r from-green-500 to-emerald-500 rounded"></div>
        </div>

        {/* 加载状态 */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="ml-2 text-gray-400">加载中...</span>
          </div>
        )}

        {/* 错误状态 */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* 绑定信息 */}
        {bindingInfo && timeInfo && (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {/* 用户信息 - 横向布局 */}
            {userInfo && (
              <div className="bg-gray-800/50 rounded-lg p-3">
                <h3 className="text-xs font-medium text-gray-400 mb-2">绑定用户</h3>
                <div className="flex items-center space-x-3">
                  {userInfo.avatar ? (
                    <img 
                      src={userInfo.avatar} 
                      alt={userInfo.name}
                      className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-xs">
                        {userInfo.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-medium truncate">{userInfo.name}</div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-yellow-400 text-xs font-bold">{userInfo.points} 积分</span>
                      <span className="text-gray-400 text-xs">{userInfo.id.slice(0, 8)}...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 工位基本信息 - 紧凑布局 */}
            <div className="bg-gray-800/50 rounded-lg p-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-xs text-gray-400">工位ID</div>
                  <div className="text-white text-sm font-mono">{workstationId}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">绑定费用</div>
                  <div className="text-yellow-400 text-sm font-bold">{bindingInfo.cost} 积分</div>
                </div>
              </div>
            </div>

            {/* 时间信息 - 紧凑布局 */}
            <div className="bg-gray-800/50 rounded-lg p-3">
              <h3 className="text-xs font-medium text-gray-400 mb-2">租赁时间</h3>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">开始:</span>
                  <span className="text-white">{timeInfo.rentalStart}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">到期:</span>
                  <span className={`font-medium ${timeInfo.isExpired ? 'text-red-400' : 'text-green-400'}`}>
                    {timeInfo.rentalEnd}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">时长:</span>
                  <span className="text-white">{timeInfo.totalDays} 天</span>
                </div>
              </div>
            </div>

            {/* 使用情况和进度 - 组合布局 */}
            <div className="bg-gray-800/50 rounded-lg p-3">
              <h3 className="text-xs font-medium text-gray-400 mb-2">使用情况</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">已用:</span>
                  <span className="text-blue-400 font-medium">{timeInfo.timeUsed}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">剩余:</span>
                  <span className={`font-medium ${timeInfo.isExpired ? 'text-red-400' : 'text-green-400'}`}>
                    {timeInfo.timeRemaining}
                  </span>
                </div>
                
                {/* 进度条 */}
                <div className="pt-1">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>进度</span>
                    <span>{Math.round(timeInfo.usagePercentage)}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-1.5">
                    <div 
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        timeInfo.isExpired 
                          ? 'bg-red-500' 
                          : 'bg-gradient-to-r from-green-500 to-emerald-500'
                      }`}
                      style={{ 
                        width: `${timeInfo.usagePercentage}%` 
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* 状态指示器 - 更紧凑 */}
            <div className={`p-2 rounded-lg border ${
              timeInfo.isExpired 
                ? 'bg-red-500/20 border-red-500/30' 
                : 'bg-green-500/20 border-green-500/30'
            }`}>
              <div className="flex items-center justify-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  timeInfo.isExpired ? 'bg-red-400' : 'bg-green-400 animate-pulse'
                }`}></div>
                <span className={`text-xs font-medium ${
                  timeInfo.isExpired ? 'text-red-400' : 'text-green-400'
                }`}>
                  {timeInfo.isExpired ? '租赁已过期' : '租赁有效中'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 底部按钮 */}
        <div className="flex gap-2 mt-4 pt-3 border-t border-gray-700">
          <button
            onClick={handleClose}
            className="flex-1 py-2 px-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-all duration-200"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  )
})

export default WorkstationInfoModal
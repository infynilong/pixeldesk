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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 现代像素风格背景 */}
      <div
        className="absolute inset-0 bg-retro-bg-darker animate-fade-in"
        onClick={handleClose}
      />
      
      {/* 模态框容器 - 现代像素艺术设计 */}
      <div className="relative bg-retro-bg-darker border-2 border-retro-border rounded-2xl p-6 w-full max-w-md shadow-2xl shadow-retro-green/20 animate-slide-in-up">
        {/* 装饰性光效 */}
        <div className="absolute inset-0 bg-gradient-to-br from-retro-green/5 via-retro-cyan/8 to-retro-blue/5 rounded-2xl "></div>
        <div className="absolute inset-0 border border-retro-green/20 rounded-2xl "></div>
        
        {/* 关闭按钮 - 像素化设计 */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 w-8 h-8 bg-gradient-to-br from-retro-red/20 to-retro-orange/20 hover:from-retro-red/30 hover:to-retro-orange/30 text-white/80 hover:text-white rounded-lg border-2 border-retro-red/30 hover:border-retro-red/50 transition-all duration-200 flex items-center justify-center shadow-lg group"
        >
          <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg"></div>
          <span className="relative font-bold">✕</span>
        </button>

        {/* 标题区域 - 现代像素艺术风格 */}
        <div className="relative mb-6">
          <div className="flex items-center gap-4 mb-4">
            {/* 工位图标 */}
            <div className="w-12 h-12 bg-gradient-to-br from-retro-green via-retro-cyan to-retro-blue rounded-xl flex items-center justify-center shadow-xl border-2 border-white/20">
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-white/5 rounded-xl"></div>
              <span className="relative text-2xl drop-shadow-lg">🏢</span>
            </div>
            
            {/* 标题文本 */}
            <div className="flex-1">
              <h2 className="text-white text-xl font-bold font-pixel tracking-wide drop-shadow-sm">
                WORKSTATION INFO
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-2 h-2 bg-retro-green rounded-full "></div>
                <span className="text-retro-textMuted text-xs font-retro tracking-wide">RENTAL DETAILS</span>
              </div>
            </div>
          </div>
          
          {/* 装饰性分割线 */}
          <div className="w-16 h-2 bg-gradient-to-r from-retro-green via-retro-cyan to-retro-blue rounded-full shadow-lg"></div>
        </div>

        {/* 加载状态 - 像素化加载器 */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-retro-green/20 to-retro-cyan/20 rounded-xl flex items-center justify-center border-2 border-retro-green/30 ">
                <div className="w-6 h-6 border-2 border-retro-green border-t-transparent rounded-full animate-spin"></div>
              </div>
              <div className="absolute inset-0 border-2 border-retro-green/20 rounded-xl "></div>
            </div>
            <div className="text-center space-y-2">
              <div className="text-white font-bold font-pixel text-sm tracking-wide">LOADING</div>
              <div className="text-retro-textMuted text-xs font-retro">Fetching workstation data...</div>
            </div>
          </div>
        )}

        {/* 错误状态 - 像素化错误显示 */}
        {error && (
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-retro-red/10 to-retro-orange/10 rounded-xl opacity-60 pointer-events-none"></div>
            <div className="relative bg-gradient-to-br from-retro-red/15 to-retro-orange/15 backdrop-blur-sm border-2 border-retro-red/30 rounded-xl p-4 shadow-lg">
              <div className="absolute inset-0 bg-retro-red/5 rounded-xl "></div>
              <div className="relative flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-retro-red to-retro-orange rounded-lg flex items-center justify-center shadow-lg">
                  <span className="text-sm">⚠️</span>
                </div>
                <div>
                  <div className="text-retro-red font-bold text-sm font-pixel tracking-wide">ERROR</div>
                  <p className="text-retro-red/80 text-xs font-retro">{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 绑定信息 - 现代像素风格 */}
        {bindingInfo && timeInfo && (
          <div className="relative space-y-5 max-h-[60vh] overflow-y-auto pr-2 scrollbar-hide">
            {/* 背景装饰 */}
            <div className="absolute inset-0 bg-gradient-to-br from-retro-green/2 via-retro-cyan/4 to-retro-blue/2 rounded-xl opacity-60 pointer-events-none"></div>
            
            {/* 用户信息 - 像素艺术卡片 */}
            {userInfo && (
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-retro-purple/5 to-retro-pink/5 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
                <div className="relative bg-gradient-to-br from-retro-bg-dark/50 to-retro-bg-darker/50 backdrop-blur-sm border-2 border-retro-border/50 rounded-xl p-4 shadow-lg hover:border-retro-purple/40 transition-all duration-300">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-6 h-6 bg-gradient-to-br from-retro-purple/30 to-retro-pink/30 rounded-lg flex items-center justify-center shadow-lg">
                      <span className="text-sm">👤</span>
                    </div>
                    <h3 className="text-white font-bold text-sm font-pixel tracking-wide">BOUND USER</h3>
                  </div>
                  <div className="flex items-center space-x-4">
                    {userInfo.avatar ? (
                      <div className="relative">
                        <img 
                          src={userInfo.avatar} 
                          alt={userInfo.name}
                          className="w-12 h-12 rounded-xl object-cover flex-shrink-0 border-2 border-white/20 shadow-lg"
                        />
                        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-white/5 rounded-xl"></div>
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-retro-purple to-retro-pink flex items-center justify-center flex-shrink-0 border-2 border-white/20 shadow-lg">
                        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-white/5 rounded-xl"></div>
                        <span className="relative text-white font-bold text-base font-pixel drop-shadow-lg">
                          {userInfo.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="text-white text-base font-bold font-pixel tracking-wide truncate">{userInfo.name}</div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-gradient-to-br from-retro-yellow/30 to-retro-orange/30 rounded flex items-center justify-center">
                            <span className="text-xs">💎</span>
                          </div>
                          <span className="text-retro-yellow text-sm font-bold font-pixel">{userInfo.points}</span>
                        </div>
                        <span className="text-retro-textMuted text-xs font-retro tracking-wide">{userInfo.id.slice(0, 8)}...</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 工位基本信息 - 像素化信息卡片 */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-retro-cyan/5 to-retro-blue/5 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
              <div className="relative bg-gradient-to-br from-retro-bg-dark/50 to-retro-bg-darker/50 backdrop-blur-sm border-2 border-retro-border/50 rounded-xl p-4 shadow-lg hover:border-retro-cyan/40 transition-all duration-300">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-6 h-6 bg-gradient-to-br from-retro-cyan/30 to-retro-blue/30 rounded-lg flex items-center justify-center shadow-lg">
                    <span className="text-sm">🏢</span>
                  </div>
                  <h3 className="text-white font-bold text-sm font-pixel tracking-wide">WORKSTATION</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="text-xs text-retro-textMuted font-pixel tracking-wide">ID</div>
                    <div className="text-white text-base font-bold font-retro">{workstationId}</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-xs text-retro-textMuted font-pixel tracking-wide">RENTAL COST</div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-gradient-to-br from-retro-yellow/30 to-retro-orange/30 rounded flex items-center justify-center">
                        <span className="text-xs">💰</span>
                      </div>
                      <span className="text-retro-yellow text-sm font-bold font-pixel">{bindingInfo.cost}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 时间信息 - 像素化时间卡片 */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-retro-green/5 to-retro-cyan/5 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
              <div className="relative bg-gradient-to-br from-retro-bg-dark/50 to-retro-bg-darker/50 backdrop-blur-sm border-2 border-retro-border/50 rounded-xl p-4 shadow-lg hover:border-retro-green/40 transition-all duration-300">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-6 h-6 bg-gradient-to-br from-retro-green/30 to-retro-cyan/30 rounded-lg flex items-center justify-center shadow-lg">
                    <span className="text-sm">⏰</span>
                  </div>
                  <h3 className="text-white font-bold text-sm font-pixel tracking-wide">RENTAL TIME</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-gradient-to-r from-retro-bg-darker/30 to-retro-bg-dark/30 rounded-lg p-2 border border-retro-border/30">
                    <span className="text-retro-textMuted text-xs font-pixel tracking-wide">START</span>
                    <span className="text-white text-xs font-retro">{timeInfo.rentalStart}</span>
                  </div>
                  <div className="flex items-center justify-between bg-gradient-to-r from-retro-bg-darker/30 to-retro-bg-dark/30 rounded-lg p-2 border border-retro-border/30">
                    <span className="text-retro-textMuted text-xs font-pixel tracking-wide">EXPIRES</span>
                    <span className={`text-xs font-bold font-retro ${timeInfo.isExpired ? 'text-retro-red' : 'text-retro-green'}`}>
                      {timeInfo.rentalEnd}
                    </span>
                  </div>
                  <div className="flex items-center justify-between bg-gradient-to-r from-retro-bg-darker/30 to-retro-bg-dark/30 rounded-lg p-2 border border-retro-border/30">
                    <span className="text-retro-textMuted text-xs font-pixel tracking-wide">DURATION</span>
                    <span className="text-white text-xs font-retro">{timeInfo.totalDays} DAYS</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 使用情况和进度 - 像素化进度卡片 */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-retro-blue/5 to-retro-purple/5 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
              <div className="relative bg-gradient-to-br from-retro-bg-dark/50 to-retro-bg-darker/50 backdrop-blur-sm border-2 border-retro-border/50 rounded-xl p-4 shadow-lg hover:border-retro-blue/40 transition-all duration-300">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-6 h-6 bg-gradient-to-br from-retro-blue/30 to-retro-purple/30 rounded-lg flex items-center justify-center shadow-lg">
                    <span className="text-sm">📈</span>
                  </div>
                  <h3 className="text-white font-bold text-sm font-pixel tracking-wide">USAGE STATUS</h3>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gradient-to-r from-retro-bg-darker/30 to-retro-bg-dark/30 rounded-lg p-3 border border-retro-border/30">
                      <div className="text-xs text-retro-textMuted font-pixel tracking-wide mb-1">USED</div>
                      <div className="text-retro-blue text-sm font-bold font-retro">{timeInfo.timeUsed}</div>
                    </div>
                    <div className="bg-gradient-to-r from-retro-bg-darker/30 to-retro-bg-dark/30 rounded-lg p-3 border border-retro-border/30">
                      <div className="text-xs text-retro-textMuted font-pixel tracking-wide mb-1">REMAINING</div>
                      <div className={`text-sm font-bold font-retro ${timeInfo.isExpired ? 'text-retro-red' : 'text-retro-green'}`}>
                        {timeInfo.timeRemaining}
                      </div>
                    </div>
                  </div>
                  
                  {/* 像素化进度条 */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-retro-textMuted font-pixel tracking-wide">PROGRESS</span>
                      <span className="text-xs text-white font-bold font-pixel">{Math.round(timeInfo.usagePercentage)}%</span>
                    </div>
                    <div className="relative w-full bg-gradient-to-r from-retro-bg-darker to-retro-bg-dark rounded-full h-3 border border-retro-border/30 shadow-inner">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 shadow-lg ${
                          timeInfo.isExpired 
                            ? 'bg-gradient-to-r from-retro-red to-retro-orange' 
                            : 'bg-gradient-to-r from-retro-green via-retro-cyan to-retro-blue'
                        }`}
                        style={{ 
                          width: `${Math.min(100, timeInfo.usagePercentage)}%` 
                        }}
                      >
                        <div className="absolute inset-0 bg-white/20 rounded-full "></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 状态指示器 - 像素化状态卡片 */}
            <div className={`relative group bg-gradient-to-br backdrop-blur-sm rounded-xl p-4 border-2 shadow-lg transition-all duration-300 ${
              timeInfo.isExpired 
                ? 'from-retro-red/15 to-retro-orange/15 border-retro-red/30 hover:border-retro-red/50' 
                : 'from-retro-green/15 to-retro-cyan/15 border-retro-green/30 hover:border-retro-green/50'
            }`}>
              <div className={`absolute inset-0 rounded-xl  opacity-50 ${
                timeInfo.isExpired ? 'bg-retro-red/5' : 'bg-retro-green/5'
              }`}></div>
              <div className="relative flex items-center justify-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-lg border border-white/20 ${
                  timeInfo.isExpired 
                    ? 'bg-gradient-to-br from-retro-red/30 to-retro-orange/30' 
                    : 'bg-gradient-to-br from-retro-green/30 to-retro-cyan/30'
                }`}>
                  <span className="text-lg">{timeInfo.isExpired ? '🛑' : '✅'}</span>
                </div>
                <div className="text-center">
                  <div className={`text-sm font-bold font-pixel tracking-wide ${
                    timeInfo.isExpired ? 'text-retro-red' : 'text-retro-green'
                  }`}>
                    {timeInfo.isExpired ? 'EXPIRED' : 'ACTIVE'}
                  </div>
                  <div className="text-xs text-retro-textMuted font-retro">
                    {timeInfo.isExpired ? 'Rental period ended' : 'Rental in progress'}
                  </div>
                </div>
                <div className={`w-3 h-3 rounded-full shadow-lg ${
                  timeInfo.isExpired ? 'bg-retro-red' : 'bg-retro-green '
                }`}></div>
              </div>
            </div>
          </div>
        )}

        {/* 底部按钮 - 现代像素风格 */}
        <div className="relative flex gap-3 mt-6 pt-6 border-t-2 border-retro-border/50">
          {/* 背景装饰 */}
          <div className="absolute inset-0 bg-gradient-to-r from-retro-green/3 via-retro-cyan/5 to-retro-blue/3 opacity-60 pointer-events-none rounded-xl"></div>
          
          {/* 关闭按钮 */}
          <button
            onClick={handleClose}
            className="relative flex-1 group overflow-hidden bg-gradient-to-r from-retro-bg-dark/80 to-retro-bg-darker/80 hover:from-retro-border/60 hover:to-retro-border/80 text-white font-medium py-3 px-4 rounded-xl border-2 border-retro-border hover:border-retro-cyan/60 transition-all duration-300 shadow-lg hover:shadow-xl backdrop-blur-sm transform hover:scale-[1.02] active:scale-[0.98]"
          >
            {/* 按钮光效 */}
            <div className="absolute inset-0 bg-gradient-to-r from-retro-cyan/5 to-retro-blue/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            
            {/* 按钮内容 */}
            <div className="relative flex items-center justify-center gap-2">
              <div className="w-5 h-5 bg-retro-cyan/20 rounded-lg flex items-center justify-center group-hover:bg-retro-cyan/30 transition-all duration-200">
                <span className="text-sm">✅</span>
              </div>
              <span className="font-pixel text-sm tracking-wide">CLOSE</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
})

export default WorkstationInfoModal
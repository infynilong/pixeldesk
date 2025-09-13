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
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

  // 初始化时加载状态历史，添加防抖避免重复调用
  useEffect(() => {
    console.log('PostStatus mounted with userId:', userId)
    if (userId && !isLoadingHistory) { // 添加isLoadingHistory检查避免重复请求
      // 防抖延迟加载状态历史
      const timer = setTimeout(() => {
        loadStatusHistory()
      }, 100) // 100ms防抖
      
      return () => clearTimeout(timer)
    }
  }, [userId]) // 移除loadStatusHistory依赖避免循环

  // 加载状态历史 - 临时禁用API调用以修复性能问题
  const loadStatusHistory = useCallback(async () => {
    console.log('🚫 [PostStatus] API调用已禁用以修复性能问题，使用本地缓存')
    if (userId) {
      // 直接使用本地缓存，禁用API调用
      const history = statusHistoryManager.getStatusHistory(userId)
      console.log('LocalStorage history loaded:', history.length, 'items')
      setStatusHistory(history)
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
      // 临时禁用API保存以修复性能问题
      console.log('🚫 [PostStatus] 状态保存API调用已临时禁用以修复性能问题')
      console.log('Status would be saved:', { userId, status: fullStatus.status, type: fullStatus.type })
    } catch (error) {
      console.error('Error in disabled status save:', error)
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
    // 不再重新加载状态历史，避免重复API调用，改为直接更新本地状态
    const localHistory = statusHistoryManager.getStatusHistory(userId)
    setStatusHistory(localHistory)
    
    // 通知 Phaser 游戏更新状态（优先执行，避免延迟）
    if (typeof window !== 'undefined' && (window as any).updateMyStatus) {
      (window as any).updateMyStatus(fullStatus)
    }
    
    // 更新 React 组件状态（异步执行，避免阻塞UI）
    requestAnimationFrame(() => {
      onStatusUpdate(fullStatus)
    })
    
    // 同步生成社交帖子
    try {
      const statusEmoji = statusOptions.find(s => s.id === selectedStatus)?.emoji || '📝'
      const postContent = customMessage || `${statusEmoji} ${statusOptions.find(s => s.id === selectedStatus)?.label || selectedStatus}`
      
      console.log('🎯 [PostStatus] 同步生成社交帖子:', { postContent, userId })
      
      const postResponse = await fetch(`/api/posts?userId=${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: null,
          content: postContent,
          type: 'TEXT'
        })
      })
      
      if (postResponse.ok) {
        const postResult = await postResponse.json()
        console.log('✅ [PostStatus] 状态同步帖子创建成功:', postResult)
      } else {
        console.error('❌ [PostStatus] 状态同步帖子创建失败:', postResponse.status)
      }
    } catch (error) {
      console.error('Error creating status sync post:', error)
    }
    
    // 平滑收起面板
    setIsExpanded(false)
    setCustomMessage('')
  }, [selectedStatus, customMessage, onStatusUpdate, userId, userData?.workstationId]) // 移除loadStatusHistory依赖

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
    <div className="space-y-6 font-pixel">
      {/* 用户信息卡片 - 现代像素艺术风格 */}
      {userData && (
        <div className="group relative overflow-hidden">
          {/* 背景光效 */}
          <div className="absolute inset-0 bg-gradient-135 from-retro-blue/10 via-retro-purple/15 to-retro-pink/10 opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-retro-cyan/5 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-700 animate-shimmer"></div>
          
          {/* 主卡片 */}
          <div className="relative bg-gradient-to-br from-retro-bg-darker/95 via-retro-bg-darker/90 to-retro-bg-dark/95 backdrop-blur-md border-2 border-retro-border rounded-lg p-5 shadow-xl hover:shadow-2xl transition-all duration-300 hover:border-retro-blue/50">
            {/* 用户头像和基本信息 */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                {/* 像素化头像 */}
                <div className="relative">
                  <div className="w-14 h-14 bg-gradient-to-br from-retro-blue via-retro-purple to-retro-pink rounded-lg flex items-center justify-center shadow-lg border-2 border-white/20 group-hover:shadow-retro-blue/50 transition-all duration-300">
                    <span className="text-xl font-bold text-white font-pixel drop-shadow-md">
                      {userData.username?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                  {/* 在线状态指示器 */}
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-retro-green rounded-full border-2 border-retro-bg-darker shadow-lg">
                    <div className="w-full h-full bg-retro-green rounded-full animate-ping opacity-75"></div>
                  </div>
                </div>
                
                {/* 用户信息 */}
                <div className="space-y-1">
                  <div className="text-white font-bold text-lg font-pixel tracking-wider drop-shadow-sm">
                    {userData.username || '玩家'}
                  </div>
                  <div className="text-retro-textMuted text-xs font-retro tracking-wide">
                    ID: {userId?.slice(-6).toUpperCase() || 'UNKNOWN'}
                  </div>
                </div>
              </div>
              
              {/* 积分显示 */}
              <div className="text-right space-y-1">
                <div className="flex items-center gap-2 text-retro-yellow font-bold text-xl font-pixel">
                  <span className="text-lg animate-bounce">💎</span>
                  <span className="drop-shadow-lg">{userData.points || 0}</span>
                </div>
                <div className="text-retro-textMuted text-xs font-retro tracking-wide">POINTS</div>
              </div>
            </div>
            
            {/* 工位信息 - 像素化状态栏 */}
            <div className="bg-gradient-to-r from-retro-bg-dark/50 to-retro-bg-darker/50 rounded-md p-3 border border-retro-border/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-gradient-to-br from-retro-orange to-retro-yellow rounded flex items-center justify-center">
                    <span className="text-xs">🏢</span>
                  </div>
                  <span className="text-retro-text text-sm font-retro">工位状态</span>
                </div>
                <div className="text-right">
                  {userData.workstationId ? (
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-retro-green rounded-full animate-pulse"></div>
                      <span className="text-retro-green text-sm font-bold font-pixel">
                        {userData.workstationId}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-retro-orange rounded-full animate-pulse"></div>
                      <span className="text-retro-orange text-sm font-bold font-pixel">
                        未绑定
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* 当前状态显示 - 像素艺术风格 */}
      {currentStatus && (
        <div className="group relative overflow-hidden">
          {/* 动态背景效果 */}
          <div className="absolute inset-0 bg-gradient-to-r from-retro-purple/15 via-retro-pink/20 to-retro-blue/15 opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
          <div className="absolute inset-0 border border-retro-purple/30 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 animate-pulse"></div>
          
          {/* 状态卡片 */}
          <div className="relative bg-gradient-to-br from-retro-bg-darker/90 to-retro-bg-dark/85 backdrop-blur-md border-2 border-retro-border rounded-lg p-4 shadow-xl hover:shadow-2xl transition-all duration-300 hover:border-retro-purple/60">
            <div className="flex items-center gap-4">
              {/* 状态图标 */}
              <div className="relative">
                <div className="w-14 h-14 bg-gradient-to-br from-retro-purple via-retro-pink to-retro-blue rounded-lg flex items-center justify-center shadow-lg border-2 border-white/20 group-hover:shadow-retro-purple/50 transition-all duration-300">
                  <span className="text-2xl">{currentStatus.emoji}</span>
                </div>
                {/* 活跃指示器 */}
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-retro-green rounded-full border-2 border-retro-bg-darker shadow-lg">
                  <div className="w-full h-full bg-gradient-to-br from-retro-green to-retro-cyan rounded-full animate-pulse"></div>
                </div>
              </div>
              
              {/* 状态信息 */}
              <div className="flex-1 space-y-1">
                <div className="text-white font-bold text-lg font-pixel tracking-wide drop-shadow-sm">
                  {currentStatus.status}
                </div>
                <div className="text-retro-textMuted text-sm font-retro leading-tight">
                  {currentStatus.message}
                </div>
              </div>
              
              {/* 时间戳和活动指示 */}
              <div className="text-right space-y-2">
                <div className="w-3 h-3 bg-retro-green rounded-full animate-ping shadow-lg"></div>
                <div className="text-retro-textMuted text-xs font-retro">
                  ACTIVE
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 主要操作按钮区域 */}
      <div className="space-y-3">
        {/* 更新状态按钮 - 现代像素风格 */}
        <button
          onClick={memoizedHandleToggle}
          className="w-full group relative overflow-hidden bg-gradient-to-r from-retro-purple via-retro-pink to-retro-blue hover:from-retro-blue hover:via-retro-cyan hover:to-retro-green text-white font-bold py-4 px-6 rounded-lg transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-xl hover:shadow-2xl border-2 border-white/20 hover:border-white/40"
        >
          {/* 按钮光效 */}
          <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-white/20 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-all duration-200 animate-shimmer"></div>
          
          {/* 按钮内容 */}
          <div className="relative flex items-center justify-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center group-hover:bg-white/30 transition-all duration-200">
              <span className="text-lg">{isExpanded ? '✕' : '📝'}</span>
            </div>
            <span className="font-pixel text-lg tracking-wider drop-shadow-lg">
              {isExpanded ? 'CANCEL' : 'UPDATE STATUS'}
            </span>
          </div>
        </button>

        {/* 状态历史按钮 - 次要操作风格 */}
        {userId && (
          <button
            onClick={memoizedHandleToggleHistory}
            className="w-full group relative overflow-hidden bg-gradient-to-r from-retro-bg-dark/80 to-retro-bg-darker/80 hover:from-retro-border/60 hover:to-retro-border/80 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 border-2 border-retro-border hover:border-retro-blue/60 shadow-lg hover:shadow-xl backdrop-blur-sm"
          >
            {/* 次要按钮光效 */}
            <div className="absolute inset-0 bg-gradient-to-r from-retro-blue/5 to-retro-purple/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            
            {/* 按钮内容 */}
            <div className="relative flex items-center justify-center gap-3">
              <div className="w-6 h-6 bg-retro-purple/30 rounded flex items-center justify-center group-hover:bg-retro-purple/50 transition-all duration-200">
                <span className="text-sm">📊</span>
              </div>
              <span className="font-retro text-sm tracking-wide">
                {showHistory ? 'HIDE HISTORY' : 'VIEW HISTORY'}
              </span>
              {/* 历史记录计数器 */}
              <div className="flex items-center gap-1">
                <div className="w-1 h-1 bg-retro-purple rounded-full animate-pulse"></div>
                <span className="text-xs bg-gradient-to-r from-retro-purple/50 to-retro-pink/50 text-white px-2 py-1 rounded-full font-pixel border border-retro-purple/30">
                  {statusHistory.length}
                </span>
              </div>
            </div>
          </button>
        )}
      </div>

      {/* 详细状态设置 - 现代像素风格面板 */}
      {isExpanded && (
        <div 
          className="space-y-6 bg-gradient-to-br from-retro-bg-darker/95 via-retro-bg-dark/90 to-retro-bg-darker/95 backdrop-blur-lg border-2 border-retro-border rounded-xl p-6 shadow-2xl animate-slide-in-up"
          onClick={(e) => {
            // 阻止点击事件冒泡到Phaser游戏
            e.stopPropagation();
          }}
          onKeyDown={(e) => {
            // 阻止键盘事件冒泡到Phaser游戏
            e.stopPropagation();
          }}
        >
          {/* 面板标题 */}
          <div className="flex items-center gap-3 pb-4 border-b border-retro-border/50">
            <div className="w-8 h-8 bg-gradient-to-br from-retro-purple to-retro-pink rounded-lg flex items-center justify-center shadow-lg">
              <span className="text-lg">⚙️</span>
            </div>
            <h3 className="text-white font-bold text-lg font-pixel tracking-wider drop-shadow-sm">
              STATUS CONFIG
            </h3>
          </div>

          {/* 状态类型选择 - 像素化网格 */}
          <div className="space-y-4">
            <label className="block text-sm font-bold text-white font-pixel tracking-wide">SELECT MODE</label>
            <div className="grid grid-cols-2 gap-4">
              {statusOptions.map((status) => (
                <button
                  key={status.id}
                  onClick={() => memoizedHandleStatusSelect(status.id)}
                  className={`group relative overflow-hidden p-5 rounded-xl border-2 transition-all duration-300 transform hover:scale-[1.03] active:scale-[0.97] ${
                    selectedStatus === status.id
                      ? `border-white/40 bg-gradient-to-br ${status.color} text-white shadow-xl shadow-retro-purple/25`
                      : 'border-retro-border bg-gradient-to-br from-retro-bg-dark/50 to-retro-bg-darker/50 hover:border-retro-purple/50 hover:bg-gradient-to-br hover:from-retro-bg-dark/70 hover:to-retro-bg-darker/70 shadow-lg'
                  }`}
                >
                  {/* 选择状态的光效 */}
                  {selectedStatus === status.id && (
                    <div className="absolute inset-0 bg-white/10 rounded-xl animate-pulse"></div>
                  )}
                  
                  {/* 按钮内容 */}
                  <div className="relative flex flex-col items-center space-y-2">
                    <div className="text-4xl mb-1 drop-shadow-lg">{status.emoji}</div>
                    <div className="text-sm font-bold font-pixel tracking-wide text-center">
                      {status.label}
                    </div>
                  </div>
                  
                  {/* 选中指示器 */}
                  {selectedStatus === status.id && (
                    <div className="absolute top-2 right-2 w-3 h-3 bg-white rounded-full shadow-lg">
                      <div className="w-full h-full bg-retro-green rounded-full animate-ping opacity-75"></div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* 自定义消息输入 - 像素化文本框 */}
          <div className="space-y-3">
            <label className="block text-sm font-bold text-white font-pixel tracking-wide">
              CUSTOM MESSAGE
            </label>
            <div className="relative">
              {/* 输入框装饰边框 */}
              <div className="absolute inset-0 bg-gradient-to-r from-retro-purple/20 to-retro-blue/20 rounded-lg blur-sm"></div>
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
                placeholder="Share what you're doing..."
                className="relative w-full p-4 bg-gradient-to-br from-retro-bg-dark/80 to-retro-bg-darker/80 border-2 border-retro-border rounded-lg resize-none focus:outline-none focus:border-retro-purple focus:shadow-lg focus:shadow-retro-purple/25 text-white placeholder-retro-textMuted backdrop-blur-md transition-all duration-300 font-retro text-base leading-relaxed"
                rows={4}
              />
              {/* 字符计数器 */}
              <div className="absolute bottom-2 right-2 text-xs text-retro-textMuted font-retro">
                {customMessage.length}/200
              </div>
            </div>
          </div>

          {/* 操作按钮组 - 像素化按钮设计 */}
          <div className="flex gap-4 pt-2">
            {/* 发布按钮 */}
            <button
              onClick={memoizedHandleSubmit}
              className="flex-1 group relative overflow-hidden bg-gradient-to-r from-retro-green via-retro-blue to-retro-cyan hover:from-retro-blue hover:via-retro-cyan hover:to-retro-green text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-xl hover:shadow-2xl border-2 border-white/20 hover:border-white/40"
            >
              {/* 按钮光效 */}
              <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-white/20 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              
              {/* 发布按钮内容 */}
              <div className="relative flex items-center justify-center gap-3">
                <div className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center group-hover:bg-white/30 transition-all duration-200">
                  <span className="text-sm">🚀</span>
                </div>
                <span className="font-pixel text-base tracking-wider drop-shadow-lg">
                  PUBLISH
                </span>
              </div>
            </button>
            
            {/* 取消按钮 */}
            <button
              onClick={memoizedHandleCancel}
              className="flex-1 group relative overflow-hidden bg-gradient-to-r from-retro-bg-dark/80 to-retro-bg-darker/80 hover:from-retro-border/60 hover:to-retro-border/80 text-white font-medium py-4 px-6 rounded-xl transition-all duration-200 border-2 border-retro-border hover:border-retro-red/60 shadow-lg hover:shadow-xl backdrop-blur-sm"
            >
              {/* 取消按钮光效 */}
              <div className="absolute inset-0 bg-gradient-to-r from-retro-red/5 to-retro-orange/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              
              {/* 取消按钮内容 */}
              <div className="relative flex items-center justify-center gap-3">
                <div className="w-6 h-6 bg-retro-red/20 rounded-lg flex items-center justify-center group-hover:bg-retro-red/30 transition-all duration-200">
                  <span className="text-sm">✕</span>
                </div>
                <span className="font-pixel text-base tracking-wide">
                  CANCEL
                </span>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* 状态历史显示 - 现代像素风格 */}
      {showHistory && userId && (
        <div className="space-y-5 bg-gradient-to-br from-retro-bg-darker/95 via-retro-bg-dark/90 to-retro-bg-darker/95 backdrop-blur-lg border-2 border-retro-border rounded-xl p-6 shadow-2xl animate-slide-in-up">
          {/* 历史记录标题 */}
          <div className="flex items-center justify-between pb-4 border-b border-retro-border/50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-retro-cyan to-retro-blue rounded-lg flex items-center justify-center shadow-lg">
                <span className="text-lg">📊</span>
              </div>
              <h3 className="text-white font-bold text-lg font-pixel tracking-wider drop-shadow-sm">
                STATUS HISTORY
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-retro-cyan rounded-full animate-pulse"></div>
              <span className="text-xs text-retro-textMuted font-retro tracking-wide">
                {statusHistory.length} RECORDS
              </span>
            </div>
          </div>
          
          {/* 历史记录列表 */}
          <div className="space-y-3 max-h-80 overflow-y-auto scrollbar-hide">
            {statusHistory.length === 0 ? (
              <div className="text-center py-12 space-y-4">
                <div className="w-16 h-16 bg-gradient-to-br from-retro-purple/20 to-retro-pink/20 rounded-xl flex items-center justify-center mx-auto border-2 border-retro-border/30">
                  <span className="text-4xl">📝</span>
                </div>
                <div className="space-y-2">
                  <div className="text-white font-bold font-pixel text-base">NO RECORDS</div>
                  <div className="text-retro-textMuted text-sm font-retro">Start sharing your status!</div>
                </div>
              </div>
            ) : (
              statusHistory.map((history, index) => (
                <div key={history.id || index} className="group relative overflow-hidden bg-gradient-to-r from-retro-bg-dark/60 to-retro-bg-darker/60 rounded-lg p-4 border border-retro-border/50 hover:border-retro-cyan/50 transition-all duration-300 hover:shadow-lg backdrop-blur-sm">
                  {/* 悬停光效 */}
                  <div className="absolute inset-0 bg-gradient-to-r from-retro-cyan/5 to-retro-blue/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  
                  {/* 记录内容 */}
                  <div className="relative space-y-3">
                    {/* 状态标签和时间 */}
                    <div className="flex items-center justify-between">
                      <div className={`flex items-center gap-2 px-3 py-1 rounded-lg bg-gradient-to-r ${getStatusBadge(history.type)} border border-white/20 shadow-sm`}>
                        <span className="text-sm">{history.emoji}</span>
                        <span className="text-white text-xs font-bold font-pixel tracking-wide">
                          {history.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-1 bg-retro-textMuted rounded-full animate-pulse"></div>
                        <span className="text-retro-textMuted text-xs font-retro">
                          {formatTimestamp(history.timestamp)}
                        </span>
                      </div>
                    </div>
                    
                    {/* 状态消息 */}
                    <p className="text-retro-text text-sm font-retro leading-relaxed pl-2 border-l-2 border-retro-cyan/30">
                      {history.message}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
          
          {/* 状态统计仪表板 */}
          {statusHistory.length > 0 && (
            <div className="pt-4 border-t border-retro-border/50">
              <div className="grid grid-cols-3 gap-4">
                {/* 今日状态 */}
                <div className="text-center space-y-2 bg-gradient-to-br from-retro-green/10 to-retro-blue/10 rounded-lg p-4 border border-retro-green/20">
                  <div className="w-8 h-8 bg-gradient-to-br from-retro-green to-retro-cyan rounded-lg flex items-center justify-center mx-auto shadow-lg">
                    <span className="text-sm">📅</span>
                  </div>
                  <div className="text-2xl font-bold text-white font-pixel drop-shadow-lg">
                    {statusHistoryManager.getStatusHistoryStats(userId).todayCount}
                  </div>
                  <div className="text-xs text-retro-textMuted font-retro tracking-wide">TODAY</div>
                </div>
                
                {/* 总记录数 */}
                <div className="text-center space-y-2 bg-gradient-to-br from-retro-purple/10 to-retro-pink/10 rounded-lg p-4 border border-retro-purple/20">
                  <div className="w-8 h-8 bg-gradient-to-br from-retro-purple to-retro-pink rounded-lg flex items-center justify-center mx-auto shadow-lg">
                    <span className="text-sm">📈</span>
                  </div>
                  <div className="text-2xl font-bold text-white font-pixel drop-shadow-lg">
                    {statusHistory.length}
                  </div>
                  <div className="text-xs text-retro-textMuted font-retro tracking-wide">TOTAL</div>
                </div>
                
                {/* 最常用状态 */}
                <div className="text-center space-y-2 bg-gradient-to-br from-retro-yellow/10 to-retro-orange/10 rounded-lg p-4 border border-retro-yellow/20">
                  <div className="w-8 h-8 bg-gradient-to-br from-retro-yellow to-retro-orange rounded-lg flex items-center justify-center mx-auto shadow-lg">
                    <span className="text-sm">⭐</span>
                  </div>
                  <div className="text-2xl font-bold text-white font-pixel drop-shadow-lg">
                    {statusHistoryManager.getStatusHistoryStats(userId).mostUsedStatus === 'working' ? '💼' : 
                     statusHistoryManager.getStatusHistoryStats(userId).mostUsedStatus === 'break' ? '☕' :
                     statusHistoryManager.getStatusHistoryStats(userId).mostUsedStatus === 'reading' ? '📚' :
                     statusHistoryManager.getStatusHistoryStats(userId).mostUsedStatus === 'meeting' ? '👥' :
                     statusHistoryManager.getStatusHistoryStats(userId).mostUsedStatus === 'lunch' ? '🍽️' : '🚻'}
                  </div>
                  <div className="text-xs text-retro-textMuted font-retro tracking-wide">POPULAR</div>
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
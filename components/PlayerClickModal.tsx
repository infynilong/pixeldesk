'use client'

import { useState, useCallback, memo } from 'react'

interface PlayerClickModalProps {
  isVisible: boolean
  player: any
  onClose: () => void
}

const PlayerClickModal = memo(({ 
  isVisible, 
  player, 
  onClose 
}: PlayerClickModalProps) => {
  const [activeTab, setActiveTab] = useState<'status' | 'interaction' | 'info'>('status')

  // 处理关闭
  const handleClose = useCallback(() => {
    onClose()
  }, [onClose])

  // 如果弹窗不可见或没有玩家数据，返回null
  if (!isVisible || !player) {
    return null
  }

  // 获取状态徽章样式
  const getStatusBadge = (type: string) => {
    const badges: Record<string, string> = {
      working: 'from-retro-blue to-retro-cyan',
      break: 'from-retro-green to-retro-blue',
      reading: 'from-retro-purple to-retro-pink',
      restroom: 'from-retro-yellow to-retro-orange',
      meeting: 'from-retro-red to-retro-pink',
      lunch: 'from-retro-orange to-retro-yellow'
    }
    return badges[type] || 'from-retro-textMuted to-retro-border'
  }

  // 获取状态图标
  const getStatusIcon = (type: string) => {
    const icons: Record<string, string> = {
      working: '💼',
      break: '☕',
      reading: '📚',
      restroom: '🚻',
      meeting: '👥',
      lunch: '🍽️'
    }
    return icons[type] || '👤'
  }

  // 模拟玩家历史状态
  const playerHistory = [
    {
      id: 1,
      type: 'working',
      status: '工作中',
      emoji: '💼',
      message: '正在处理一个重要的项目',
      timestamp: '2分钟前'
    },
    {
      id: 2,
      type: 'break',
      status: '休息时间',
      emoji: '☕',
      message: '刚喝完咖啡，准备继续加油',
      timestamp: '15分钟前'
    },
    {
      id: 3,
      type: 'reading',
      status: '正在看书',
      emoji: '📚',
      message: '在读《深度工作》，很有启发',
      timestamp: '1小时前'
    }
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 现代像素风格背景 */}
      <div 
        className="absolute inset-0 bg-gradient-to-br from-black/60 via-retro-bg-dark/80 to-black/60 backdrop-blur-md animate-fade-in"
        onClick={handleClose}
      />
      
      {/* 模态框容器 - 现代像素艺术设计 */}
      <div className="relative bg-gradient-to-br from-retro-bg-darker/95 via-retro-bg-dark/90 to-retro-bg-darker/95 backdrop-blur-xl border-2 border-retro-border rounded-2xl p-8 w-full max-w-lg shadow-2xl shadow-retro-purple/20 animate-slide-in-up">
        {/* 装饰性光效 */}
        <div className="absolute inset-0 bg-gradient-to-br from-retro-purple/5 via-retro-blue/8 to-retro-pink/5 rounded-2xl animate-pulse"></div>
        <div className="absolute inset-0 border border-retro-purple/20 rounded-2xl animate-pulse"></div>
        
        {/* 关闭按钮 - 像素化设计 */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 w-8 h-8 bg-gradient-to-br from-retro-red/20 to-retro-orange/20 hover:from-retro-red/30 hover:to-retro-orange/30 text-white/80 hover:text-white rounded-lg border-2 border-retro-red/30 hover:border-retro-red/50 transition-all duration-200 flex items-center justify-center shadow-lg group"
        >
          <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg"></div>
          <span className="relative font-bold">✕</span>
        </button>

        {/* 玩家信息头部 - 现代像素艺术卡片 */}
        <div className="relative mb-8">
          {/* 背景装饰 */}
          <div className="absolute inset-0 bg-gradient-to-r from-retro-purple/10 to-retro-pink/10 rounded-xl opacity-60 pointer-events-none"></div>
          
          <div className="relative bg-gradient-to-br from-retro-bg-dark/50 to-retro-bg-darker/50 backdrop-blur-sm border-2 border-retro-border/50 rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-5 mb-4">
              {/* 像素化头像容器 */}
              <div className="relative">
                <div className="w-20 h-20 bg-gradient-to-br from-retro-purple via-retro-pink to-retro-blue rounded-xl flex items-center justify-center shadow-xl border-2 border-white/20 group-hover:shadow-retro-purple/50 transition-all duration-300">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-white/5 rounded-xl"></div>
                  <span className="relative text-2xl font-bold text-white font-pixel drop-shadow-lg">
                    {player.name?.charAt(0) || 'P'}
                  </span>
                </div>
                {/* 在线状态指示器 */}
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-to-br from-retro-green to-retro-cyan rounded-full border-2 border-retro-bg-darker shadow-lg">
                  <div className="w-full h-full bg-retro-green rounded-full animate-ping opacity-60"></div>
                </div>
              </div>
              
              {/* 用户信息区域 */}
              <div className="flex-1 space-y-3">
                <h2 className="text-white text-2xl font-bold font-pixel tracking-wide drop-shadow-sm">
                  {player.name || '未知玩家'}
                </h2>
                <div className="flex items-center gap-3">
                  <div className={`px-3 py-2 rounded-lg bg-gradient-to-r ${getStatusBadge(player.currentStatus?.type || 'working')} border border-white/20 shadow-lg`}>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{player.currentStatus?.emoji || '💼'}</span>
                      <span className="text-white text-sm font-bold font-pixel tracking-wide">
                        {player.currentStatus?.status || '在线'}
                      </span>
                    </div>
                  </div>
                  <div className="w-3 h-3 bg-retro-green rounded-full animate-pulse shadow-lg"></div>
                </div>
              </div>
            </div>
            
            {/* 装饰性分割线 */}
            <div className="w-16 h-2 bg-gradient-to-r from-retro-purple via-retro-pink to-retro-blue rounded-full shadow-lg"></div>
          </div>
        </div>

        {/* 选项卡导航 - 现代像素风格 */}
        <div className="relative flex space-x-3 mb-8 pb-4 border-b-2 border-retro-border/50">
          {[
            { id: 'status', label: 'HISTORY', icon: '📊' },
            { id: 'interaction', label: 'INTERACT', icon: '🎮' },
            { id: 'info', label: 'INFO', icon: '👤' }
          ].map((tab) => {
            const isActive = activeTab === tab.id
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`group relative overflow-hidden flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all duration-300 ${
                  isActive
                    ? 'bg-gradient-to-r from-retro-purple/30 to-retro-blue/30 text-white border-retro-purple/50 shadow-lg shadow-retro-purple/20' 
                    : 'text-retro-textMuted hover:text-white border-retro-border hover:border-retro-blue/30 hover:bg-gradient-to-r hover:from-retro-blue/10 hover:to-retro-cyan/10'
                } ${isActive ? '' : 'hover:scale-105'}`}
              >
                {/* 激活状态光效 */}
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-white/5 rounded-xl animate-pulse"></div>
                )}
                
                {/* 选项卡内容 */}
                <div className="relative flex items-center gap-2">
                  <div className={`w-5 h-5 ${isActive ? 'bg-white/20' : 'bg-retro-textMuted/20'} rounded flex items-center justify-center transition-all duration-200`}>
                    <span className="text-xs">{tab.icon}</span>
                  </div>
                  <span className={`text-sm font-bold tracking-wide ${isActive ? 'font-pixel' : 'font-retro'}`}>
                    {tab.label}
                  </span>
                </div>
                
                {/* 激活指示器 */}
                {isActive && (
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-retro-purple rounded-full animate-ping"></div>
                )}
              </button>
            )
          })}
        </div>

        {/* 标签页内容 - 现代像素风格 */}
        <div className="relative space-y-6">
          {/* 背景装饰 */}
          <div className="absolute inset-0 bg-gradient-to-br from-retro-orange/2 via-retro-yellow/4 to-retro-red/2 rounded-xl opacity-60 pointer-events-none"></div>
          
          {activeTab === 'status' && (
            <div className="relative space-y-4">
              {/* 状态历史标题 */}
              <div className="flex items-center gap-3 pb-3 border-b border-retro-border/30">
                <div className="w-6 h-6 bg-gradient-to-br from-retro-orange to-retro-yellow rounded-lg flex items-center justify-center shadow-lg">
                  <span className="text-sm">📊</span>
                </div>
                <h3 className="text-white font-bold text-base font-pixel tracking-wide">STATUS TIMELINE</h3>
                <div className="flex items-center gap-2 ml-auto">
                  <div className="w-2 h-2 bg-retro-orange rounded-full animate-pulse"></div>
                  <span className="text-xs text-retro-textMuted font-retro">{playerHistory.length} RECORDS</span>
                </div>
              </div>
              
              {/* 状态历史列表 */}
              <div className="space-y-4 max-h-72 overflow-y-auto pr-2 scrollbar-hide">
                {playerHistory.map((history, index) => (
                  <div key={history.id} className="group relative animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
                    <div className="absolute inset-0 bg-gradient-to-r from-retro-purple/5 to-retro-pink/5 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
                    <div className="relative bg-gradient-to-br from-retro-bg-dark/60 to-retro-bg-darker/60 backdrop-blur-sm border-2 border-retro-border/50 rounded-xl p-4 shadow-lg hover:border-retro-purple/40 hover:shadow-xl transition-all duration-300">
                      <div className="flex items-start justify-between mb-3">
                        {/* 状态标签 */}
                        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r ${getStatusBadge(history.type)} border border-white/20 shadow-lg`}>
                          <span className="text-sm">{history.emoji}</span>
                          <span className="text-white text-sm font-bold font-pixel tracking-wide">
                            {history.status}
                          </span>
                        </div>
                        
                        {/* 时间戳 */}
                        <div className="flex items-center gap-2">
                          <div className="w-1 h-1 bg-retro-textMuted rounded-full"></div>
                          <span className="text-retro-textMuted text-xs font-retro tracking-wide">
                            {history.timestamp}
                          </span>
                        </div>
                      </div>
                      
                      {/* 状态消息 */}
                      <p className="text-retro-text text-sm font-retro leading-relaxed pl-2 border-l-2 border-retro-purple/30">
                        {history.message}
                      </p>
                      
                      {/* 历史记录序号 */}
                      <div className="absolute top-2 right-2 w-6 h-6 bg-gradient-to-br from-retro-textMuted/20 to-retro-border/20 rounded-full flex items-center justify-center border border-retro-textMuted/30">
                        <span className="text-xs font-bold font-pixel text-retro-textMuted">
                          {playerHistory.length - index}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'interaction' && (
            <div className="relative space-y-5">
              {/* 互动区域标题 */}
              <div className="flex items-center gap-3 pb-3 border-b border-retro-border/30">
                <div className="w-6 h-6 bg-gradient-to-br from-retro-blue to-retro-cyan rounded-lg flex items-center justify-center shadow-lg">
                  <span className="text-sm">🎮</span>
                </div>
                <h3 className="text-white font-bold text-base font-pixel tracking-wide">QUICK INTERACTIONS</h3>
              </div>
              
              {/* 快速互动按钮组 */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-retro-blue/5 to-retro-cyan/5 rounded-xl opacity-60 pointer-events-none"></div>
                <div className="relative bg-gradient-to-br from-retro-bg-dark/50 to-retro-bg-darker/50 backdrop-blur-sm border-2 border-retro-border/50 rounded-xl p-5 shadow-lg">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { emoji: '👋', label: 'WAVE', action: 'wave', color: 'from-retro-blue/20 to-retro-cyan/20 border-retro-blue/30' },
                      { emoji: '🎉', label: 'CELEBRATE', action: 'celebrate', color: 'from-retro-green/20 to-retro-blue/20 border-retro-green/30' },
                      { emoji: '👍', label: 'LIKE', action: 'like', color: 'from-retro-purple/20 to-retro-pink/20 border-retro-purple/30' },
                      { emoji: '❤️', label: 'LOVE', action: 'love', color: 'from-retro-pink/20 to-retro-red/20 border-retro-pink/30' }
                    ].map((action) => (
                      <button
                        key={action.action}
                        className={`group relative overflow-hidden bg-gradient-to-br ${action.color} hover:shadow-lg text-white py-3 px-4 rounded-xl border-2 transition-all duration-300 shadow-md hover:shadow-xl transform hover:scale-105 active:scale-95 backdrop-blur-sm`}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <div className="relative flex flex-col items-center gap-2">
                          <div className="w-6 h-6 bg-white/20 rounded flex items-center justify-center">
                            <span className="text-sm">{action.emoji}</span>
                          </div>
                          <span className="text-xs font-bold font-pixel tracking-wide">{action.label}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* 消息发送区域 */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-retro-purple/5 to-retro-pink/5 rounded-xl opacity-60 pointer-events-none"></div>
                <div className="relative bg-gradient-to-br from-retro-bg-dark/50 to-retro-bg-darker/50 backdrop-blur-sm border-2 border-retro-border/50 rounded-xl p-5 shadow-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-5 h-5 bg-gradient-to-br from-retro-purple/30 to-retro-pink/30 rounded flex items-center justify-center">
                      <span className="text-xs">💬</span>
                    </div>
                    <span className="text-xs text-retro-textMuted font-pixel tracking-wide">SEND MESSAGE</span>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1 relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-retro-purple/10 to-retro-pink/10 rounded-xl opacity-0 group-focus-within:opacity-100 transition-all duration-300 blur-sm"></div>
                      <input
                        type="text"
                        placeholder="Type your message..."
                        className="relative w-full bg-gradient-to-br from-retro-bg-dark/80 to-retro-bg-darker/80 border-2 border-retro-border focus:border-retro-purple rounded-xl px-4 py-3 text-white placeholder-retro-textMuted focus:outline-none backdrop-blur-md transition-all duration-300 font-retro text-sm focus:shadow-lg focus:shadow-retro-purple/20"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      />
                    </div>
                    <button className="group relative overflow-hidden bg-gradient-to-br from-retro-purple/30 to-retro-pink/30 hover:from-retro-purple/40 hover:to-retro-pink/40 text-white px-6 py-3 rounded-xl border-2 border-retro-purple/40 hover:border-retro-purple/60 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 backdrop-blur-sm">
                      <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <div className="relative flex items-center gap-2">
                        <div className="w-4 h-4 bg-white/20 rounded flex items-center justify-center">
                          <span className="text-xs">🚀</span>
                        </div>
                        <span className="font-pixel text-sm tracking-wide">SEND</span>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'info' && (
            <div className="relative space-y-5">
              {/* 信息区域标题 */}
              <div className="flex items-center gap-3 pb-3 border-b border-retro-border/30">
                <div className="w-6 h-6 bg-gradient-to-br from-retro-cyan to-retro-blue rounded-lg flex items-center justify-center shadow-lg">
                  <span className="text-sm">👤</span>
                </div>
                <h3 className="text-white font-bold text-base font-pixel tracking-wide">PLAYER INFO</h3>
              </div>
              
              {/* 基本信息卡片 */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-retro-cyan/5 to-retro-blue/5 rounded-xl opacity-60 pointer-events-none"></div>
                <div className="relative bg-gradient-to-br from-retro-bg-dark/50 to-retro-bg-darker/50 backdrop-blur-sm border-2 border-retro-border/50 rounded-xl p-5 shadow-lg">
                  <div className="space-y-4">
                    {[
                      { label: 'PLAYER ID', value: player.id, icon: '🆔' },
                      { label: 'CURRENT STATUS', value: player.currentStatus?.status || '在线', icon: '📊' },
                      { label: 'STATUS MESSAGE', value: player.currentStatus?.message || '无', icon: '💬' },
                      { label: 'LAST UPDATE', value: new Date(player.currentStatus?.timestamp).toLocaleTimeString() || '刚刚', icon: '⏰' }
                    ].map((info, index) => (
                      <div key={index} className="group relative bg-gradient-to-r from-retro-bg-darker/30 to-retro-bg-dark/30 rounded-lg p-3 border border-retro-border/30 hover:border-retro-cyan/40 transition-all duration-300">
                        <div className="absolute inset-0 bg-gradient-to-r from-retro-cyan/3 to-retro-blue/3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg"></div>
                        <div className="relative flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-retro-cyan/30 to-retro-blue/30 rounded-lg flex items-center justify-center shadow-lg">
                              <span className="text-sm">{info.icon}</span>
                            </div>
                            <span className="text-retro-textMuted text-sm font-pixel tracking-wide">{info.label}</span>
                          </div>
                          <span className="text-white text-sm font-retro max-w-[200px] truncate">
                            {info.value}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 底部操作按钮 - 现代像素风格 */}
        <div className="relative flex gap-4 mt-8 pt-6 border-t-2 border-retro-border/50">
          {/* 背景装饰 */}
          <div className="absolute inset-0 bg-gradient-to-r from-retro-purple/3 via-retro-blue/5 to-retro-pink/3 opacity-60 pointer-events-none rounded-xl"></div>
          
          {/* 关闭按钮 */}
          <button
            onClick={handleClose}
            className="relative flex-1 group overflow-hidden bg-gradient-to-r from-retro-bg-dark/80 to-retro-bg-darker/80 hover:from-retro-border/60 hover:to-retro-border/80 text-white font-medium py-4 px-6 rounded-xl border-2 border-retro-border hover:border-retro-red/60 transition-all duration-300 shadow-lg hover:shadow-xl backdrop-blur-sm transform hover:scale-[1.02] active:scale-[0.98]"
          >
            {/* 按钮光效 */}
            <div className="absolute inset-0 bg-gradient-to-r from-retro-red/5 to-retro-orange/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            
            {/* 按钮内容 */}
            <div className="relative flex items-center justify-center gap-3">
              <div className="w-6 h-6 bg-retro-red/20 rounded-lg flex items-center justify-center group-hover:bg-retro-red/30 transition-all duration-200">
                <span className="text-sm">✕</span>
              </div>
              <span className="font-pixel text-base tracking-wide">CLOSE</span>
            </div>
          </button>
          
          {/* 关注按钮 */}
          <button
            onClick={() => {
              // 这里可以添加关注功能
              console.log('关注玩家:', player.name)
            }}
            className="relative flex-1 group overflow-hidden bg-gradient-to-r from-retro-purple via-retro-pink to-retro-blue hover:from-retro-blue hover:via-retro-cyan hover:to-retro-green text-white font-bold py-4 px-6 rounded-xl border-2 border-white/20 hover:border-white/40 transition-all duration-300 shadow-lg hover:shadow-2xl transform hover:scale-[1.02] active:scale-[0.98] backdrop-blur-sm"
          >
            {/* 按钮光效 */}
            <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-white/20 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-all duration-200 animate-shimmer"></div>
            
            {/* 按钮内容 */}
            <div className="relative flex items-center justify-center gap-3">
              <div className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center group-hover:bg-white/30 transition-all duration-200">
                <span className="text-sm">➕</span>
              </div>
              <span className="font-pixel text-base tracking-wide drop-shadow-lg">FOLLOW</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
})

export default PlayerClickModal
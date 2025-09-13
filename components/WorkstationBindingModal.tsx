'use client'

import { useState, useCallback, memo } from 'react'

interface WorkstationBindingModalProps {
  isVisible: boolean
  workstation: any
  user: any
  onConfirm: () => Promise<any>
  onCancel: () => void
  onClose: () => void
}

const WorkstationBindingModal = memo(({ 
  isVisible, 
  workstation, 
  user, 
  onConfirm, 
  onCancel,
  onClose 
}: WorkstationBindingModalProps) => {
  const [isProcessing, setIsProcessing] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [messageType, setMessageType] = useState<'info' | 'success' | 'error'>('info')

  // 重置状态
  const resetState = useCallback(() => {
    setIsProcessing(false)
    setMessage(null)
    setMessageType('info')
  }, [])

  // 处理确认绑定
  const handleConfirm = useCallback(async () => {
    if (isProcessing) return
    
    setIsProcessing(true)
    setMessage(null)
    
    try {
      // 调用确认回调
      const result = await onConfirm()
      
      if (result.success) {
        setMessageType('success')
        setMessage('绑定成功！')
        
        // 延迟关闭弹窗
        setTimeout(() => {
          onClose()
          resetState()
        }, 1500)
      } else {
        setMessageType('error')
        setMessage(result.error || '绑定失败')
      }
    } catch (error) {
      setMessageType('error')
      setMessage('绑定失败，请重试')
      console.error('绑定失败:', error)
    } finally {
      setIsProcessing(false)
    }
  }, [onConfirm, onClose, resetState, isProcessing])

  // 处理取消
  const handleCancel = useCallback(() => {
    if (isProcessing) return
    
    onCancel()
    onClose()
    resetState()
  }, [onCancel, onClose, resetState, isProcessing])

  // 处理关闭
  const handleClose = useCallback(() => {
    if (isProcessing) return
    
    onClose()
    resetState()
  }, [onClose, resetState, isProcessing])

  // 如果弹窗不可见，返回null
  if (!isVisible || !workstation || !user) {
    return null
  }

  // 计算用户可用积分
  const userPoints = user.points || user.gold || 0
  const canAfford = userPoints >= 5

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 现代像素风格背景 */}
      <div 
        className="absolute inset-0 bg-gradient-to-br from-black/60 via-retro-bg-dark/80 to-black/60 backdrop-blur-md animate-fade-in"
        onClick={handleClose}
      />
      
      {/* 模态框容器 - 现代像素艺术设计 */}
      <div className="relative bg-gradient-to-br from-retro-bg-darker/95 via-retro-bg-dark/90 to-retro-bg-darker/95 backdrop-blur-xl border-2 border-retro-border rounded-2xl p-8 w-full max-w-md shadow-2xl shadow-retro-blue/20 animate-slide-in-up">
        {/* 装饰性光效 */}
        <div className="absolute inset-0 bg-gradient-to-br from-retro-blue/5 via-retro-purple/8 to-retro-cyan/5 rounded-2xl animate-pulse"></div>
        <div className="absolute inset-0 border border-retro-blue/20 rounded-2xl animate-pulse"></div>
        
        {/* 关闭按钮 - 像素化设计 */}
        <button
          onClick={handleClose}
          disabled={isProcessing}
          className="absolute top-4 right-4 w-8 h-8 bg-gradient-to-br from-retro-red/20 to-retro-orange/20 hover:from-retro-red/30 hover:to-retro-orange/30 disabled:from-retro-textMuted/20 disabled:to-retro-border/20 text-white/80 hover:text-white disabled:text-retro-textMuted rounded-lg border-2 border-retro-red/30 hover:border-retro-red/50 disabled:border-retro-textMuted/20 transition-all duration-200 flex items-center justify-center shadow-lg group disabled:cursor-not-allowed"
        >
          <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 group-disabled:opacity-0 transition-opacity duration-300 rounded-lg"></div>
          <span className="relative font-bold">✕</span>
        </button>

        {/* 标题区域 - 现代像素艺术风格 */}
        <div className="relative mb-8">
          <div className="flex items-center gap-4 mb-4">
            {/* 绑定图标 */}
            <div className="w-12 h-12 bg-gradient-to-br from-retro-blue via-retro-purple to-retro-cyan rounded-xl flex items-center justify-center shadow-xl border-2 border-white/20">
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-white/5 rounded-xl"></div>
              <span className="relative text-2xl drop-shadow-lg">🔗</span>
            </div>
            
            {/* 标题文本 */}
            <div className="flex-1">
              <h2 className="text-white text-xl font-bold font-pixel tracking-wide drop-shadow-sm">
                WORKSTATION BINDING
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-2 h-2 bg-retro-blue rounded-full animate-pulse"></div>
                <span className="text-retro-textMuted text-xs font-retro tracking-wide">RENTAL CONFIRMATION</span>
              </div>
            </div>
          </div>
          
          {/* 装饰性分割线 */}
          <div className="w-16 h-2 bg-gradient-to-r from-retro-blue via-retro-purple to-retro-cyan rounded-full shadow-lg"></div>
        </div>

        {/* 工位信息 - 现代像素风格信息卡片 */}
        <div className="relative space-y-5 mb-8 max-h-[50vh] overflow-y-auto pr-2 scrollbar-hide">
          {/* 背景装饰 */}
          <div className="absolute inset-0 bg-gradient-to-br from-retro-blue/2 via-retro-purple/4 to-retro-cyan/2 rounded-xl opacity-60 pointer-events-none"></div>
          
          {/* 工位基本信息卡片 */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-retro-blue/5 to-retro-cyan/5 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
            <div className="relative bg-gradient-to-br from-retro-bg-dark/50 to-retro-bg-darker/50 backdrop-blur-sm border-2 border-retro-border/50 rounded-xl p-5 shadow-lg hover:border-retro-blue/40 transition-all duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-6 h-6 bg-gradient-to-br from-retro-blue/30 to-retro-cyan/30 rounded-lg flex items-center justify-center shadow-lg">
                  <span className="text-sm">🏢</span>
                </div>
                <h3 className="text-white font-bold text-sm font-pixel tracking-wide">WORKSTATION INFO</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-gradient-to-r from-retro-bg-darker/30 to-retro-bg-dark/30 rounded-lg p-3 border border-retro-border/30">
                  <span className="text-retro-textMuted text-xs font-pixel tracking-wide">STATION ID</span>
                  <span className="text-white text-sm font-bold font-retro">{workstation.id}</span>
                </div>
                <div className="flex items-center justify-between bg-gradient-to-r from-retro-bg-darker/30 to-retro-bg-dark/30 rounded-lg p-3 border border-retro-border/30">
                  <span className="text-retro-textMuted text-xs font-pixel tracking-wide">POSITION</span>
                  <span className="text-white text-sm font-retro">
                    ({Math.floor(workstation.position.x)}, {Math.floor(workstation.position.y)})
                  </span>
                </div>
                <div className="flex items-center justify-between bg-gradient-to-r from-retro-bg-darker/30 to-retro-bg-dark/30 rounded-lg p-3 border border-retro-border/30">
                  <span className="text-retro-textMuted text-xs font-pixel tracking-wide">TYPE</span>
                  <span className="text-white text-sm font-retro">{workstation.type}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 费用信息卡片 - 像素化设计 */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-retro-yellow/5 to-retro-orange/5 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
            <div className="relative bg-gradient-to-br from-retro-bg-dark/50 to-retro-bg-darker/50 backdrop-blur-sm border-2 border-retro-border/50 rounded-xl p-5 shadow-lg hover:border-retro-yellow/40 transition-all duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-6 h-6 bg-gradient-to-br from-retro-yellow/30 to-retro-orange/30 rounded-lg flex items-center justify-center shadow-lg">
                  <span className="text-sm">💰</span>
                </div>
                <h3 className="text-white font-bold text-sm font-pixel tracking-wide">RENTAL COST</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-gradient-to-r from-retro-bg-darker/30 to-retro-bg-dark/30 rounded-lg p-3 border border-retro-border/30">
                  <span className="text-retro-textMuted text-xs font-pixel tracking-wide">BINDING FEE</span>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-retro-yellow/30 rounded flex items-center justify-center">
                      <span className="text-xs">💎</span>
                    </div>
                    <span className="text-retro-yellow font-bold text-sm font-pixel">5</span>
                  </div>
                </div>
                <div className="flex items-center justify-between bg-gradient-to-r from-retro-bg-darker/30 to-retro-bg-dark/30 rounded-lg p-3 border border-retro-border/30">
                  <span className="text-retro-textMuted text-xs font-pixel tracking-wide">DURATION</span>
                  <span className="text-retro-green text-sm font-bold font-pixel">30 DAYS</span>
                </div>
              </div>
            </div>
          </div>

          {/* 用户积分信息 - 像素化积分卡片 */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-retro-purple/5 to-retro-pink/5 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
            <div className="relative bg-gradient-to-br from-retro-bg-dark/50 to-retro-bg-darker/50 backdrop-blur-sm border-2 border-retro-border/50 rounded-xl p-5 shadow-lg hover:border-retro-purple/40 transition-all duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-6 h-6 bg-gradient-to-br from-retro-purple/30 to-retro-pink/30 rounded-lg flex items-center justify-center shadow-lg">
                  <span className="text-sm">👤</span>
                </div>
                <h3 className="text-white font-bold text-sm font-pixel tracking-wide">YOUR BALANCE</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-gradient-to-r from-retro-bg-darker/30 to-retro-bg-dark/30 rounded-lg p-3 border border-retro-border/30">
                  <span className="text-retro-textMuted text-xs font-pixel tracking-wide">CURRENT POINTS</span>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-retro-cyan/30 rounded flex items-center justify-center">
                      <span className="text-xs">💎</span>
                    </div>
                    <span className={`font-bold text-sm font-pixel ${canAfford ? 'text-retro-green' : 'text-retro-red'}`}>
                      {userPoints}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between bg-gradient-to-br from-retro-green/15 to-retro-cyan/15 rounded-lg p-3 border-2 border-retro-green/30 shadow-lg">
                  <span className="text-retro-green text-xs font-bold font-pixel tracking-wide">AFTER RENTAL</span>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-retro-green/30 rounded flex items-center justify-center">
                      <span className="text-xs">✓</span>
                    </div>
                    <span className="text-retro-green font-bold text-sm font-pixel">{Math.max(0, userPoints - 5)}</span>
                  </div>
                </div>
              </div>
              
              {/* 积分不足警告 - 像素化警告面板 */}
              {!canAfford && (
                <div className="relative mt-4 animate-slide-in-up">
                  <div className="absolute inset-0 bg-gradient-to-r from-retro-red/10 to-retro-orange/10 rounded-xl opacity-60 pointer-events-none"></div>
                  <div className="relative bg-gradient-to-br from-retro-red/15 to-retro-orange/15 backdrop-blur-sm border-2 border-retro-red/30 rounded-xl p-4 shadow-lg">
                    <div className="absolute inset-0 bg-retro-red/5 rounded-xl animate-pulse"></div>
                    <div className="relative flex items-center justify-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-retro-red to-retro-orange rounded-lg flex items-center justify-center shadow-lg">
                        <span className="text-lg">⚠️</span>
                      </div>
                      <div className="text-center">
                        <div className="text-retro-red font-bold text-sm font-pixel tracking-wide">INSUFFICIENT POINTS</div>
                        <p className="text-retro-red/80 text-xs font-retro mt-1">
                          Need at least 5 points to bind workstation
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 消息显示 */}
        {message && (
          <div className={`mb-4 p-3 rounded-lg border ${
            messageType === 'success' 
              ? 'bg-green-500/20 border-green-500/30 text-green-400' 
              : 'bg-red-500/20 border-red-500/30 text-red-400'
          }`}>
            <p className="text-sm font-medium">{message}</p>
          </div>
        )}

        {/* 操作按钮组 - 现代像素风格 */}
        <div className="relative flex gap-4">
          {/* 背景装饰 */}
          <div className="absolute inset-0 bg-gradient-to-r from-retro-blue/3 via-retro-purple/5 to-retro-cyan/3 opacity-60 pointer-events-none rounded-xl"></div>
          
          {/* 确认绑定按钮 */}
          <button
            onClick={handleConfirm}
            disabled={isProcessing || !canAfford}
            className="relative flex-1 group overflow-hidden bg-gradient-to-r from-retro-blue via-retro-purple to-retro-cyan hover:from-retro-cyan hover:via-retro-blue hover:to-retro-green disabled:from-retro-textMuted/30 disabled:to-retro-border/30 text-white font-bold py-4 px-6 rounded-xl border-2 border-white/20 hover:border-white/40 disabled:border-retro-textMuted/20 transition-all duration-300 shadow-lg hover:shadow-2xl disabled:shadow-none transform hover:scale-[1.02] active:scale-[0.98] disabled:scale-100 backdrop-blur-sm disabled:cursor-not-allowed"
          >
            {/* 按钮光效 */}
            <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-white/20 to-white/10 opacity-0 group-hover:opacity-100 group-disabled:opacity-0 transition-opacity duration-300"></div>
            
            {/* 按钮内容 */}
            <div className="relative flex items-center justify-center gap-3">
              {isProcessing ? (
                <>
                  <div className="w-5 h-5 bg-white/20 rounded-lg flex items-center justify-center">
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  </div>
                  <span className="font-pixel text-base tracking-wide">PROCESSING...</span>
                </>
              ) : (
                <>
                  <div className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center group-disabled:bg-retro-textMuted/20">
                    <span className="text-sm">🔗</span>
                  </div>
                  <span className="font-pixel text-base tracking-wide drop-shadow-lg">CONFIRM BINDING</span>
                </>
              )}
            </div>
          </button>
          
          {/* 取消按钮 */}
          <button
            onClick={handleCancel}
            disabled={isProcessing}
            className="relative flex-1 group overflow-hidden bg-gradient-to-r from-retro-bg-dark/80 to-retro-bg-darker/80 hover:from-retro-border/60 hover:to-retro-border/80 disabled:from-retro-textMuted/20 disabled:to-retro-border/20 text-white font-medium py-4 px-6 rounded-xl border-2 border-retro-border hover:border-retro-red/60 disabled:border-retro-textMuted/20 transition-all duration-300 shadow-lg hover:shadow-xl disabled:shadow-none backdrop-blur-sm disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98] disabled:scale-100"
          >
            {/* 取消按钮光效 */}
            <div className="absolute inset-0 bg-gradient-to-r from-retro-red/5 to-retro-orange/5 opacity-0 group-hover:opacity-100 group-disabled:opacity-0 transition-opacity duration-300"></div>
            
            {/* 取消按钮内容 */}
            <div className="relative flex items-center justify-center gap-3">
              <div className="w-5 h-5 bg-retro-red/20 rounded-lg flex items-center justify-center group-hover:bg-retro-red/30 group-disabled:bg-retro-textMuted/20 transition-all duration-200">
                <span className="text-sm">✕</span>
              </div>
              <span className="font-pixel text-base tracking-wide">CANCEL</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
})

export default WorkstationBindingModal
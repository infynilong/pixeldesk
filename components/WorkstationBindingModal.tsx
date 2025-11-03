'use client'

import { useState, useCallback, memo, useEffect } from 'react'

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
  const [bindCost, setBindCost] = useState(10) // 默认10积分，从配置加载

  // 加载积分配置
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const response = await fetch('/api/points-config?key=bind_workstation_cost')
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.data) {
            setBindCost(data.data.value)
            console.log('✅ 加载绑定工位积分配置:', data.data.value)
          }
        }
      } catch (error) {
        console.error('加载积分配置失败:', error)
        // 使用默认值
      }
    }

    if (isVisible) {
      loadConfig()
    }
  }, [isVisible])

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
  const userPoints = user.points || 0
  const canAfford = userPoints >= bindCost

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* 深色背景蒙板 */}
      <div
        className="absolute inset-0 bg-black/70"
        onClick={handleClose}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
      />

      {/* 模态框容器 - 现代像素艺术设计 */}
      <div
        className="relative bg-retro-bg-darker border-2 border-retro-border rounded-2xl p-8 w-full max-w-md shadow-2xl shadow-retro-blue/20 "
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 装饰性光效 */}
        <div className="absolute inset-0 bg-gradient-to-br from-retro-blue/5 via-retro-purple/8 to-retro-cyan/5 rounded-2xl"></div>
        <div className="absolute inset-0 border border-retro-blue/20 rounded-2xl"></div>
        
        {/* 关闭按钮 - 像素化设计 */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleClose()
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onMouseUp={(e) => e.stopPropagation()}
          disabled={isProcessing}
          className="absolute top-4 right-4 w-8 h-8 bg-gradient-to-br from-retro-red/20 to-retro-orange/20 hover:from-retro-red/30 hover:to-retro-orange/30 disabled:from-retro-textMuted/20 disabled:to-retro-border/20 text-white/80 hover:text-white disabled:text-retro-textMuted rounded-lg border-2 border-retro-red/30 hover:border-retro-red/50 disabled:border-retro-textMuted/20  flex items-center justify-center shadow-lg group disabled:cursor-not-allowed"
        >
          <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 group-disabled:opacity-0  rounded-lg"></div>
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
                <div className="w-2 h-2 bg-retro-blue rounded-full"></div>
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
            <div className="absolute inset-0 bg-gradient-to-r from-retro-blue/5 to-retro-cyan/5 rounded-xl opacity-0 group-hover:opacity-100 "></div>
            <div className="relative bg-retro-bg-dark/80 backdrop-blur-sm border-2 border-retro-border/50 rounded-xl p-5 shadow-lg hover:border-retro-blue/40 ">
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
            <div className="absolute inset-0 bg-gradient-to-r from-retro-yellow/5 to-retro-orange/5 rounded-xl opacity-0 group-hover:opacity-100 "></div>
            <div className="relative bg-retro-bg-dark/80 backdrop-blur-sm border-2 border-retro-border/50 rounded-xl p-5 shadow-lg hover:border-retro-yellow/40 ">
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
                    <span className="text-retro-yellow font-bold text-sm font-pixel">{bindCost}</span>
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
            <div className="absolute inset-0 bg-gradient-to-r from-retro-purple/5 to-retro-pink/5 rounded-xl opacity-0 group-hover:opacity-100 "></div>
            <div className="relative bg-retro-bg-dark/80 backdrop-blur-sm border-2 border-retro-border/50 rounded-xl p-5 shadow-lg hover:border-retro-purple/40 ">
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
                    <span className="text-retro-green font-bold text-sm font-pixel">{Math.max(0, userPoints - bindCost)}</span>
                  </div>
                </div>
              </div>
              
              {/* 积分不足警告 - 像素化警告面板 */}
              {!canAfford && (
                <div className="relative mt-4 ">
                  <div className="absolute inset-0 bg-gradient-to-r from-retro-red/10 to-retro-orange/10 rounded-xl opacity-60 pointer-events-none"></div>
                  <div className="relative bg-retro-red/40 backdrop-blur-sm border-2 border-retro-red/50 rounded-xl p-4 shadow-lg">
                    <div className="absolute inset-0 bg-retro-red/5 rounded-xl"></div>
                    <div className="relative flex items-center justify-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-retro-red to-retro-orange rounded-lg flex items-center justify-center shadow-lg">
                        <span className="text-lg">⚠️</span>
                      </div>
                      <div className="text-center">
                        <div className="text-retro-red font-bold text-sm font-pixel tracking-wide">INSUFFICIENT POINTS</div>
                        <p className="text-retro-red/80 text-xs font-retro mt-1">
                          Need at least {bindCost} points to bind workstation
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
            onClick={(e) => {
              e.stopPropagation()
              handleConfirm()
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
            disabled={isProcessing || !canAfford}
            className="relative flex-1 group overflow-hidden bg-gradient-to-r from-retro-blue via-retro-purple to-retro-cyan hover:from-retro-cyan hover:via-retro-blue hover:to-retro-green disabled:from-retro-textMuted/60 disabled:to-retro-border/60 text-white font-bold py-4 px-6 rounded-xl border-2 border-white/20 hover:border-white/40 disabled:border-retro-textMuted/20  shadow-lg hover:shadow-2xl disabled:shadow-none  disabled:scale-100 backdrop-blur-sm disabled:cursor-not-allowed"
          >
            {/* 按钮光效 */}
            <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-white/20 to-white/10 opacity-0 group-hover:opacity-100 group-disabled:opacity-0 "></div>
            
            {/* 按钮内容 */}
            <div className="relative flex items-center justify-center gap-3">
              {isProcessing ? (
                <>
                  <div className="w-5 h-5 bg-white/20 rounded-lg flex items-center justify-center">
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full "></div>
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
            onClick={(e) => {
              e.stopPropagation()
              handleCancel()
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
            disabled={isProcessing}
            className="relative flex-1 group overflow-hidden bg-retro-bg-dark/80 hover:bg-retro-border/80 disabled:bg-retro-textMuted/60 text-white font-medium py-4 px-6 rounded-xl border-2 border-retro-border hover:border-retro-red/60 disabled:border-retro-textMuted/20  shadow-lg hover:shadow-xl disabled:shadow-none backdrop-blur-sm disabled:cursor-not-allowed  disabled:scale-100"
          >
            {/* 取消按钮光效 */}
            <div className="absolute inset-0 bg-gradient-to-r from-retro-red/5 to-retro-orange/5 opacity-0 group-hover:opacity-100 group-disabled:opacity-0 "></div>
            
            {/* 取消按钮内容 */}
            <div className="relative flex items-center justify-center gap-3">
              <div className="w-5 h-5 bg-retro-red/20 rounded-lg flex items-center justify-center group-hover:bg-retro-red/30 group-disabled:bg-retro-textMuted/20 ">
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
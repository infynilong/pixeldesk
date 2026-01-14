'use client'

import { useState, useEffect } from 'react'

interface TeleportConfirmModalProps {
  isVisible: boolean
  onConfirm: () => Promise<void>
  onCancel: () => void
  currentPoints?: number
}

export default function TeleportConfirmModal({ 
  isVisible, 
  onConfirm, 
  onCancel, 
  currentPoints = 0 
}: TeleportConfirmModalProps) {
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    if (!isVisible) {
      setIsProcessing(false)
    }
  }, [isVisible])

  const handleConfirm = async () => {
    setIsProcessing(true)
    try {
      await onConfirm()
    } catch (error) {
      console.error('Teleport failed:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 bg-retro-bg-darker flex items-center justify-center z-50 p-4 ">
      <div className="relative bg-retro-bg-darker border-2 border-retro-border rounded-2xl p-8 w-full max-w-md shadow-2xl shadow-retro-purple/20 ">
        {/* 装饰性光效 */}
        <div className="absolute inset-0 bg-gradient-to-br from-retro-purple/5 via-retro-pink/8 to-retro-blue/5 rounded-2xl "></div>
        <div className="absolute inset-0 border border-retro-purple/20 rounded-2xl "></div>
        
        {/* 传送确认内容 - 现代像素艺术风格 */}
        <div className="relative text-center mb-8">
          {/* 传送图标 */}
          <div className="relative mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-retro-purple via-retro-pink to-retro-blue rounded-xl flex items-center justify-center mx-auto shadow-xl border-2 border-white/20">
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-white/5 rounded-xl"></div>
              <span className="relative text-4xl drop-shadow-lg">🚀</span>
            </div>
            {/* 脉冲环装饰 */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-24 h-24 border-2 border-retro-purple/30 rounded-xl "></div>
            </div>
          </div>
          
          {/* 标题和说明 */}
          <h3 className="text-white text-2xl font-bold font-pixel tracking-wide drop-shadow-sm mb-3">
            QUICK TELEPORT
          </h3>
          <p className="text-retro-textMuted font-retro text-base leading-relaxed">
            Return to your workstation instantly?
          </p>
        </div>

        {/* 象素币消费信息 - 像素化信息面板 */}
        <div className="relative group mb-8">
          <div className="absolute inset-0 bg-gradient-to-r from-retro-yellow/5 to-retro-orange/5 rounded-xl opacity-0 group-hover:opacity-100 "></div>
          <div className="relative bg-gradient-to-br from-retro-bg-dark/50 to-retro-bg-darker/50 backdrop-blur-sm border-2 border-retro-border/50 rounded-xl p-5 shadow-lg hover:border-retro-yellow/40 ">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-6 h-6 bg-gradient-to-br from-retro-yellow/30 to-retro-orange/30 rounded-lg flex items-center justify-center shadow-lg">
                <span className="text-sm">💰</span>
              </div>
              <h4 className="text-white font-bold text-sm font-pixel tracking-wide">COST BREAKDOWN</h4>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center bg-gradient-to-r from-retro-bg-darker/30 to-retro-bg-dark/30 rounded-lg p-3 border border-retro-border/30">
                <span className="text-retro-textMuted text-sm font-pixel tracking-wide">TELEPORT COST</span>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-retro-red/30 rounded flex items-center justify-center">
                    <span className="text-xs">-</span>
                  </div>
                  <span className="text-retro-red font-bold text-sm font-pixel">1</span>
                </div>
              </div>
              <div className="flex justify-between items-center bg-gradient-to-r from-retro-bg-darker/30 to-retro-bg-dark/30 rounded-lg p-3 border border-retro-border/30">
                <span className="text-retro-textMuted text-sm font-pixel tracking-wide">CURRENT POINTS</span>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-retro-cyan/30 rounded flex items-center justify-center">
                    <span className="text-xs">💎</span>
                  </div>
                  <span className="text-white font-bold text-sm font-pixel">{currentPoints}</span>
                </div>
              </div>
              <div className="flex justify-between items-center bg-gradient-to-br from-retro-green/15 to-retro-cyan/15 rounded-lg p-3 border-2 border-retro-green/30 shadow-lg">
                <span className="text-retro-green text-sm font-bold font-pixel tracking-wide">REMAINING</span>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-retro-green/30 rounded flex items-center justify-center">
                    <span className="text-xs">✓</span>
                  </div>
                  <span className="text-retro-green font-bold text-base font-pixel">{currentPoints - 1}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 操作按钮 - 现代像素风格 */}
        <div className="relative flex gap-4">
          {/* 背景装饰 */}
          <div className="absolute inset-0 bg-gradient-to-r from-retro-purple/3 via-retro-pink/5 to-retro-blue/3 opacity-60 pointer-events-none rounded-xl"></div>
          
          {/* 确认按钮 */}
          <button
            onClick={handleConfirm}
            disabled={isProcessing || currentPoints < 1}
            className="relative flex-1 group overflow-hidden bg-gradient-to-r from-retro-purple via-retro-pink to-retro-blue hover:from-retro-blue hover:via-retro-cyan hover:to-retro-green disabled:from-retro-textMuted/30 disabled:to-retro-border/30 text-white font-bold py-4 px-6 rounded-xl border-2 border-white/20 hover:border-white/40 disabled:border-retro-textMuted/20  shadow-lg hover:shadow-2xl disabled:shadow-none  disabled:scale-100 backdrop-blur-sm disabled:cursor-not-allowed"
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
                  <span className="font-pixel text-base tracking-wide">TELEPORTING...</span>
                </>
              ) : (
                <>
                  <div className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center group-disabled:bg-retro-textMuted/20">
                    <span className="text-sm">🚀</span>
                  </div>
                  <span className="font-pixel text-base tracking-wide drop-shadow-lg">CONFIRM</span>
                </>
              )}
            </div>
          </button>
          
          {/* 取消按钮 */}
          <button
            onClick={onCancel}
            disabled={isProcessing}
            className="relative flex-1 group overflow-hidden bg-gradient-to-r from-retro-bg-dark/80 to-retro-bg-darker/80 hover:from-retro-border/60 hover:to-retro-border/80 disabled:from-retro-textMuted/20 disabled:to-retro-border/20 text-white font-medium py-4 px-6 rounded-xl border-2 border-retro-border hover:border-retro-red/60 disabled:border-retro-textMuted/20  shadow-lg hover:shadow-xl disabled:shadow-none backdrop-blur-sm disabled:cursor-not-allowed  disabled:scale-100"
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

        {/* 象素币不足警告 - 像素化警告面板 */}
        {currentPoints < 1 && (
          <div className="relative mt-6 ">
            <div className="absolute inset-0 bg-gradient-to-r from-retro-red/10 to-retro-orange/10 rounded-xl opacity-60 pointer-events-none"></div>
            <div className="relative bg-gradient-to-br from-retro-red/15 to-retro-orange/15 backdrop-blur-sm border-2 border-retro-red/30 rounded-xl p-4 shadow-lg">
              <div className="absolute inset-0 bg-retro-red/5 rounded-xl "></div>
              <div className="relative flex items-center justify-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-retro-red to-retro-orange rounded-lg flex items-center justify-center shadow-lg">
                  <span className="text-lg">⚠️</span>
                </div>
                <div className="text-center">
                  <div className="text-retro-red font-bold text-sm font-pixel tracking-wide">INSUFFICIENT POINTS</div>
                  <p className="text-retro-red/80 text-xs font-retro mt-1">
                    Need at least 1 point to teleport
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
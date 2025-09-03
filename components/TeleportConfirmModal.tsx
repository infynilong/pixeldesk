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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-retro-bg-darker border border-retro-border rounded-lg p-6 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🚀</span>
          </div>
          <h3 className="text-white text-xl font-bold mb-2">快速回到工位</h3>
          <p className="text-retro-textMuted">
            确定要快速回到你的工位吗？
          </p>
        </div>

        <div className="bg-retro-border/30 rounded-md p-4 mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-retro-text">消耗积分</span>
            <span className="text-retro-yellow font-bold">-1</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-retro-text">当前积分</span>
            <span className="text-white font-medium">{currentPoints}</span>
          </div>
          <div className="flex justify-between items-center mt-2 pt-2 border-t border-retro-border">
            <span className="text-retro-text">剩余积分</span>
            <span className="text-green-400 font-bold">{currentPoints - 1}</span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleConfirm}
            disabled={isProcessing || currentPoints < 1}
            className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-600 text-white font-medium py-3 px-6 rounded-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <div className="flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                传送中...
              </div>
            ) : (
              '确认传送'
            )}
          </button>
          <button
            onClick={onCancel}
            disabled={isProcessing}
            className="flex-1 bg-retro-border/50 hover:bg-retro-border/70 text-white font-medium py-3 px-6 rounded-md transition-all duration-200 border border-retro-border hover:border-retro-blue disabled:opacity-50 disabled:cursor-not-allowed"
          >
            取消
          </button>
        </div>

        {currentPoints < 1 && (
          <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-md">
            <p className="text-red-300 text-sm text-center">
              ❌ 积分不足，无法使用快速回到工位功能
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
'use client'

import { useState } from 'react'

const statusOptions = [
  { id: 'working', label: '工作中', emoji: '💼', color: 'bg-blue-100 text-blue-800' },
  { id: 'break', label: '休息中', emoji: '☕', color: 'bg-green-100 text-green-800' },
  { id: 'reading', label: '阅读中', emoji: '📚', color: 'bg-purple-100 text-purple-800' },
  { id: 'restroom', label: '洗手间', emoji: '🚻', color: 'bg-yellow-100 text-yellow-800' },
  { id: 'meeting', label: '会议中', emoji: '👥', color: 'bg-red-100 text-red-800' },
  { id: 'lunch', label: '午餐时间', emoji: '🍽️', color: 'bg-orange-100 text-orange-800' }
]

export default function PostStatus({ onStatusUpdate, currentStatus }) {
  const [selectedStatus, setSelectedStatus] = useState('working')
  const [customMessage, setCustomMessage] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)

  const handleSubmit = () => {
    const status = statusOptions.find(s => s.id === selectedStatus)
    const fullStatus = {
      type: selectedStatus,
      status: status.label,
      emoji: status.emoji,
      message: customMessage || `正在${status.label}`,
      timestamp: new Date().toISOString()
    }
    
    // 更新 React 组件状态
    onStatusUpdate(fullStatus)
    
    // 通知 Phaser 游戏更新状态
    if (typeof window !== 'undefined' && window.updateMyStatus) {
      window.updateMyStatus(fullStatus)
    }
    
    setIsExpanded(false)
    setCustomMessage('')
  }

  return (
    <div className="space-y-3">
      {/* 当前状态显示 */}
      {currentStatus && (
        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
          <span className="text-2xl">{currentStatus.emoji}</span>
          <div className="flex-1">
            <div className="font-medium">{currentStatus.status}</div>
            <div className="text-sm text-gray-600">{currentStatus.message}</div>
          </div>
        </div>
      )}

      {/* 状态选择按钮 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full btn-primary flex items-center justify-center gap-2"
      >
        <span>📝</span>
        <span>{isExpanded ? '取消' : '更新状态'}</span>
      </button>

      {/* 详细状态设置 */}
      {isExpanded && (
        <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
          {/* 状态类型选择 */}
          <div>
            <label className="block text-sm font-medium mb-2">选择状态</label>
            <div className="grid grid-cols-2 gap-2">
              {statusOptions.map((status) => (
                <button
                  key={status.id}
                  onClick={() => setSelectedStatus(status.id)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    selectedStatus === status.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-2xl mb-1">{status.emoji}</div>
                  <div className="text-sm font-medium">{status.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 自定义消息 */}
          <div>
            <label className="block text-sm font-medium mb-2">
              自定义消息（可选）
            </label>
            <textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="分享你正在做什么..."
              className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>

          {/* 提交按钮 */}
          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              className="flex-1 btn-primary"
            >
              发布状态
            </button>
            <button
              onClick={() => setIsExpanded(false)}
              className="flex-1 btn-secondary"
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
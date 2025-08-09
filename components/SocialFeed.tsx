'use client'

import { useState } from 'react'

export default function SocialFeed({ player }) {
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')

  // 模拟玩家动态数据
  const playerStatuses = [
    {
      id: 1,
      status: '正在工作中...',
      type: 'working',
      timestamp: '2分钟前',
      content: '正在处理一个重要的项目，专注模式开启！'
    },
    {
      id: 2,
      status: '休息时间',
      type: 'break',
      timestamp: '15分钟前',
      content: '刚喝完咖啡，准备继续加油！'
    },
    {
      id: 3,
      status: '正在看书',
      type: 'reading',
      timestamp: '1小时前',
      content: '在读《深度工作》，很有启发的一本书。'
    }
  ]

  const handleSubmitComment = (e) => {
    e.preventDefault()
    if (newComment.trim()) {
      const comment = {
        id: Date.now(),
        text: newComment,
        timestamp: '刚刚',
        author: '我'
      }
      setComments([...comments, comment])
      setNewComment('')
    }
  }

  const getStatusBadge = (type) => {
    const badges = {
      working: 'bg-blue-100 text-blue-800',
      break: 'bg-green-100 text-green-800',
      reading: 'bg-purple-100 text-purple-800',
      restroom: 'bg-yellow-100 text-yellow-800'
    }
    return badges[type] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="p-4">
      {/* 玩家信息 */}
      <div className="flex items-center mb-4">
        <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center mr-3">
          <span className="text-lg font-bold">
            {player?.name?.charAt(0) || 'P'}
          </span>
        </div>
        <div>
          <h3 className="font-semibold text-lg">{player?.name || '未知玩家'}</h3>
          <span className={`text-xs px-2 py-1 rounded-full ${getStatusBadge(player?.currentStatus?.type || 'working')}`}>
            {player?.currentStatus?.status || '在线'}
          </span>
        </div>
      </div>

      {/* 动态列表 */}
      <div className="space-y-4">
        {playerStatuses.map((status) => (
          <div key={status.id} className="social-card">
            <div className="flex items-center justify-between mb-2">
              <span className={`status-badge ${getStatusBadge(status.type)}`}>
                {status.status}
              </span>
              <span className="text-sm text-gray-500">{status.timestamp}</span>
            </div>
            <p className="text-gray-700 mb-3">{status.content}</p>
            
            {/* 留言区域 */}
            <div className="border-t pt-3">
              <div className="space-y-2 mb-3">
                {comments
                  .filter(comment => comment.statusId === status.id)
                  .map((comment) => (
                    <div key={comment.id} className="bg-gray-50 p-2 rounded">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{comment.author}</span>
                        <span className="text-xs text-gray-500">{comment.timestamp}</span>
                      </div>
                      <p className="text-sm text-gray-700">{comment.text}</p>
                    </div>
                  ))}
              </div>
              
              <form onSubmit={handleSubmitComment} className="flex gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="说点什么..."
                  className="comment-input"
                />
                <button type="submit" className="btn-primary text-sm">
                  发送
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
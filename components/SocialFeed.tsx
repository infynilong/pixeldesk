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
      working: 'from-blue-500 to-cyan-500',
      break: 'from-green-500 to-emerald-500',
      reading: 'from-purple-500 to-violet-500',
      restroom: 'from-yellow-500 to-orange-500',
      meeting: 'from-red-500 to-pink-500',
      lunch: 'from-orange-500 to-amber-500'
    }
    return badges[type] || 'from-gray-500 to-slate-500'
  }

  return (
    <div className="p-4 space-y-6">
      {/* 玩家信息 */}
      <div className="group relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        <div className="relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <span className="text-xl font-bold text-white">
                {player?.name?.charAt(0) || 'P'}
              </span>
            </div>
            <div className="flex-1">
              <h3 className="text-white font-semibold text-lg">{player?.name || '未知玩家'}</h3>
              <div className="flex items-center gap-2 mt-1">
                <div className={`px-3 py-1 rounded-full bg-gradient-to-r ${getStatusBadge(player?.currentStatus?.type || 'working')} text-white text-xs font-medium`}>
                  {player?.currentStatus?.status || '在线'}
                </div>
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 动态列表 */}
      <div className="space-y-4">
        {playerStatuses.map((status) => (
          <div key={status.id} className="group relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className={`px-3 py-1 rounded-full bg-gradient-to-r ${getStatusBadge(status.type)} text-white text-xs font-medium`}>
                  {status.status}
                </div>
                <span className="text-gray-400 text-sm">{status.timestamp}</span>
              </div>
              <p className="text-gray-300 mb-4 leading-relaxed">{status.content}</p>
              
              {/* 留言区域 */}
              <div className="border-t border-white/10 pt-4">
                <div className="space-y-3 mb-4">
                  {comments
                    .filter(comment => comment.statusId === status.id)
                    .map((comment) => (
                      <div key={comment.id} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white font-medium text-sm">{comment.author}</span>
                          <span className="text-gray-400 text-xs">{comment.timestamp}</span>
                        </div>
                        <p className="text-gray-300 text-sm leading-relaxed">{comment.text}</p>
                      </div>
                    ))}
                </div>
                
                <form onSubmit={handleSubmitComment} className="flex gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="说点什么..."
                    className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-gray-400 backdrop-blur-sm transition-all duration-300"
                  />
                  <button type="submit" className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium py-2 px-4 rounded-lg transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl">
                    发送
                  </button>
                </form>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
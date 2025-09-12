'use client'

import { useState, FormEvent } from 'react'

interface SocialFeedProps {
  player: any
}

export default function SocialFeed({ player }: SocialFeedProps) {
  const [comments, setComments] = useState<any[]>([])
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

  const handleSubmitComment = (e: FormEvent) => {
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

  const getStatusBadge = (type: string) => {
    const badges: Record<string, string> = {
      working: 'from-retro-purple to-retro-pink',
      break: 'from-retro-green to-retro-purple',
      reading: 'from-retro-purple to-retro-pink',
      restroom: 'from-retro-yellow to-retro-orange',
      meeting: 'from-retro-red to-retro-pink',
      lunch: 'from-retro-orange to-retro-yellow'
    }
    return badges[type] || 'from-retro-textMuted to-retro-border'
  }

  return (
    <div className="p-4 space-y-6">
      {/* 玩家信息 */}
      <div className="group relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-retro-purple/20 to-retro-pink/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        <div className="relative bg-retro-bg-darker/80 backdrop-blur-sm border border-retro-border rounded-md p-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-retro-purple to-retro-pink rounded-full flex items-center justify-center">
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
                <div className="w-2 h-2 bg-retro-green rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 动态列表 */}
      <div className="space-y-4">
        {playerStatuses.map((status) => (
          <div key={status.id} className="group relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-retro-purple/10 to-retro-pink/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative bg-retro-bg-darker/80 backdrop-blur-sm border border-retro-border rounded-md p-4">
              <div className="flex items-center justify-between mb-3">
                <div className={`px-3 py-1 rounded-full bg-gradient-to-r ${getStatusBadge(status.type)} text-white text-xs font-medium`}>
                  {status.status}
                </div>
                <span className="text-retro-textMuted text-sm">{status.timestamp}</span>
              </div>
              <p className="text-retro-text mb-4 leading-relaxed">{status.content}</p>
              
              {/* 留言区域 */}
              <div className="border-t border-retro-border pt-4">
                <div className="space-y-3 mb-4">
                  {comments
                    .filter(comment => comment.statusId === status.id)
                    .map((comment) => (
                      <div key={comment.id} className="bg-retro-border/30 backdrop-blur-sm border border-retro-border rounded-md p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white font-medium text-sm">{comment.author}</span>
                          <span className="text-retro-textMuted text-xs">{comment.timestamp}</span>
                        </div>
                        <p className="text-retro-text text-sm leading-relaxed">{comment.text}</p>
                      </div>
                    ))}
                </div>
                
                <form onSubmit={handleSubmitComment} className="flex gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="说点什么..."
                    className="flex-1 px-4 py-2 bg-retro-border/30 border border-retro-border rounded-md focus:outline-none focus:ring-2 focus:ring-retro-purple focus:border-transparent text-white placeholder-retro-textMuted backdrop-blur-sm transition-all duration-200"
                  />
                  <button type="submit" className="bg-gradient-to-r from-retro-purple to-retro-pink hover:from-retro-purple/90 hover:to-retro-pink/90 text-white font-medium py-2 px-4 rounded-md transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-md hover:shadow-lg">
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
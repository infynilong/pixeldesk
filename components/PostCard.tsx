'use client'

import { useState } from 'react'
import { Post } from '@/types/social'
import UserAvatar from './UserAvatar'

interface PostCardProps {
  post: Post
  currentUserId: string
  onLike: () => void
  isMobile?: boolean
}

export default function PostCard({ post, currentUserId, onLike, isMobile = false }: PostCardProps) {
  const [showReplies, setShowReplies] = useState(false)
  const [isLiking, setIsLiking] = useState(false)

  const handleLike = async () => {
    if (isLiking) return
    setIsLiking(true)
    await onLike()
    setIsLiking(false)
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return '刚刚'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}分钟前`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}小时前`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}天前`
    
    return date.toLocaleDateString('zh-CN')
  }

  const cardClasses = isMobile
    ? "group relative bg-gradient-to-br from-retro-bg-darker/90 via-retro-bg-dark/85 to-retro-bg-darker/90 border-2 border-retro-border rounded-xl overflow-hidden backdrop-blur-md shadow-xl transition-all duration-300"
    : "group relative bg-gradient-to-br from-retro-bg-darker/90 via-retro-bg-dark/85 to-retro-bg-darker/90 border-2 border-retro-border rounded-xl hover:border-retro-purple/60 hover:shadow-2xl hover:shadow-retro-purple/10 transition-all duration-300 overflow-hidden backdrop-blur-md shadow-xl pixel-hover"

  return (
    <div className={cardClasses}>
      {/* 卡片悬停光效 */}
      <div className="absolute inset-0 bg-gradient-to-br from-retro-purple/3 via-retro-blue/5 to-retro-pink/3 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      
      {/* 帖子头部 - 现代像素风格 */}
      <div className="relative p-5 pb-4">
        <div className="flex items-start space-x-4">
          {/* 头像区域 */}
          <div className="relative">
            <UserAvatar
              userId={post.author.id}
              userName={post.author.name}
              userAvatar={post.author.avatar}
              size={isMobile ? 'sm' : 'md'}
              showStatus={false}
            />
            {/* 作者标识 */}
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-gradient-to-br from-retro-blue to-retro-cyan rounded-full border-2 border-retro-bg-darker shadow-lg">
              <div className="w-full h-full bg-retro-blue rounded-full"></div>
            </div>
          </div>
          
          {/* 作者信息和时间 */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center space-x-3">
              <h4 className="font-bold text-white truncate font-pixel text-base tracking-wide drop-shadow-sm">
                {post.author.name}
              </h4>
              <div className="flex items-center gap-2">
                <div className="w-1 h-1 bg-retro-textMuted rounded-full"></div>
                <span className="text-xs text-retro-textMuted font-retro tracking-wide">
                  {formatTimeAgo(post.createdAt)}
                </span>
              </div>
            </div>
            
            {/* 帖子标题 */}
            {post.title && (
              <h3 className="text-lg font-bold text-white mt-2 mb-1 font-pixel tracking-wide drop-shadow-sm">
                {post.title}
              </h3>
            )}
          </div>
        </div>
      </div>

      {/* 帖子内容 - 精致的内容展示 */}
      <div className="relative px-5 pb-4">
        {/* 内容文本 */}
        <div className="relative bg-gradient-to-r from-retro-bg-dark/30 to-retro-bg-darker/30 rounded-lg p-4 border border-retro-border/30">
          <p className="text-retro-text whitespace-pre-wrap leading-relaxed font-retro text-base">
            {post.content}
          </p>
        </div>
        
        {/* 图片内容 */}
        {post.imageUrl && (
          <div className="mt-4">
            <div className="relative overflow-hidden rounded-xl border-2 border-retro-border/50 shadow-lg group-hover:border-retro-purple/40 transition-all duration-300">
              <img
                src={post.imageUrl}
                alt="Post image"
                className="w-full max-h-96 object-cover transition-transform duration-300 group-hover:scale-105"
              />
              {/* 图片叠加装饰 */}
              <div className="absolute inset-0 bg-gradient-to-t from-retro-bg-darker/20 via-transparent to-transparent pointer-events-none"></div>
            </div>
          </div>
        )}
      </div>

      {/* 帖子统计 - 像素化统计条 */}
      <div className="relative px-5 pb-4">
        <div className="flex items-center justify-between bg-gradient-to-r from-retro-bg-dark/50 to-retro-bg-darker/50 rounded-lg p-3 border border-retro-border/30">
          <div className="flex items-center space-x-6">
            {/* 浏览数统计 */}
            <div className="flex items-center space-x-2 text-retro-textMuted">
              <div className="w-5 h-5 bg-retro-cyan/20 rounded flex items-center justify-center">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <span className="text-xs font-pixel tracking-wide">{post.viewCount}</span>
            </div>
            
            {/* 回复数统计 */}
            <div className="flex items-center space-x-2 text-retro-textMuted">
              <div className="w-5 h-5 bg-retro-blue/20 rounded flex items-center justify-center">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <span className="text-xs font-pixel tracking-wide">{post.replyCount}</span>
            </div>
          </div>
          
          {/* 帖子类型标签 */}
          <div className="px-2 py-1 bg-gradient-to-r from-retro-purple/20 to-retro-blue/20 rounded border border-retro-purple/30">
            <span className="text-xs text-retro-purple font-bold font-pixel tracking-wide">
              {post.type}
            </span>
          </div>
        </div>
      </div>

      {/* 操作按钮区域 - 现代像素风格 */}
      <div className="relative px-5 py-4 border-t-2 border-retro-border/50 bg-gradient-to-r from-retro-bg-darker/60 to-retro-bg-dark/60 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* 点赞按钮 - 像素化设计 */}
            <button
              onClick={handleLike}
              disabled={isLiking}
              className={`group relative overflow-hidden flex items-center space-x-3 px-4 py-2 rounded-xl transition-all duration-300 border-2 shadow-lg ${
                post.isLiked
                  ? 'text-retro-pink bg-gradient-to-r from-retro-pink/20 to-retro-purple/20 border-retro-pink/40 shadow-retro-pink/20'
                  : 'text-retro-textMuted hover:text-retro-pink hover:bg-gradient-to-r hover:from-retro-pink/10 hover:to-retro-purple/10 border-retro-border hover:border-retro-pink/30'
              } ${isLiking ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}
            >
              {/* 点赞按钮光效 */}
              {post.isLiked && (
                <div className="absolute inset-0 bg-gradient-to-r from-retro-pink/10 to-retro-purple/10 animate-pulse"></div>
              )}
              
              {/* 点赞图标和数量 */}
              <div className="relative flex items-center gap-2">
                <div className={`w-5 h-5 ${post.isLiked ? 'bg-retro-pink/30' : 'bg-retro-textMuted/20'} rounded flex items-center justify-center transition-all duration-200`}>
                  <svg 
                    className={`w-3 h-3 ${post.isLiked ? 'fill-current text-retro-pink' : ''} transition-all duration-200`} 
                    fill={post.isLiked ? 'currentColor' : 'none'} 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <span className="text-sm font-pixel tracking-wide">{post.likeCount}</span>
              </div>
            </button>

            {/* 回复按钮 */}
            <button
              onClick={() => setShowReplies(!showReplies)}
              className="group relative overflow-hidden flex items-center space-x-3 px-4 py-2 rounded-xl text-retro-textMuted hover:text-retro-blue hover:bg-gradient-to-r hover:from-retro-blue/10 hover:to-retro-cyan/10 border-2 border-retro-border hover:border-retro-blue/30 transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg"
            >
              {/* 回复按钮光效 */}
              <div className="absolute inset-0 bg-gradient-to-r from-retro-blue/5 to-retro-cyan/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              
              {/* 回复图标和数量 */}
              <div className="relative flex items-center gap-2">
                <div className="w-5 h-5 bg-retro-blue/20 rounded flex items-center justify-center group-hover:bg-retro-blue/30 transition-all duration-200">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <span className="text-sm font-pixel tracking-wide">
                  {showReplies ? 'HIDE' : 'REPLY'} ({post.replyCount})
                </span>
              </div>
            </button>
          </div>

          {/* 删除按钮（仅作者可见） */}
          {post.author.id === currentUserId && (
            <button className="group relative overflow-hidden p-2 text-retro-textMuted hover:text-retro-red rounded-lg border-2 border-transparent hover:border-retro-red/30 hover:bg-retro-red/10 transition-all duration-200 shadow-lg">
              <div className="absolute inset-0 bg-retro-red/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <svg className="relative w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* 回复区域 - 现代像素风格 */}
      {showReplies && post.replies && (
        <div className="border-t-2 border-retro-border/50 bg-gradient-to-br from-retro-bg-darker/40 to-retro-bg-dark/40 backdrop-blur-sm animate-slide-in-up">
          <div className="p-5 space-y-4">
            {/* 回复列表标题 */}
            <div className="flex items-center gap-3 pb-3 border-b border-retro-border/30">
              <div className="w-6 h-6 bg-gradient-to-br from-retro-blue to-retro-cyan rounded-lg flex items-center justify-center shadow-sm">
                <span className="text-xs">💬</span>
              </div>
              <span className="text-sm font-bold font-pixel tracking-wide text-white">
                REPLIES
              </span>
            </div>
            
            {/* 回复列表 */}
            {post.replies.slice(0, 3).map((reply, index) => (
              <div key={reply.id} className="group relative bg-gradient-to-r from-retro-bg-dark/30 to-retro-bg-darker/30 rounded-lg p-3 border border-retro-border/30 hover:border-retro-blue/30 transition-all duration-300 animate-fade-in" style={{ animationDelay: `${index * 150}ms` }}>
                {/* 回复悬停效果 */}
                <div className="absolute inset-0 bg-gradient-to-r from-retro-blue/3 to-retro-cyan/3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg"></div>
                
                <div className="relative flex items-start space-x-3">
                  {/* 回复者头像 */}
                  <div className="flex-shrink-0">
                    <UserAvatar
                      userId={reply.author.id}
                      userName={reply.author.name}
                      userAvatar={reply.author.avatar}
                      size="xs"
                      showStatus={false}
                    />
                  </div>
                  
                  {/* 回复内容 */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center space-x-3">
                      <span className="font-bold text-white text-sm font-pixel tracking-wide">
                        {reply.author.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-1 bg-retro-textMuted rounded-full"></div>
                        <span className="text-xs text-retro-textMuted font-retro">
                          {formatTimeAgo(reply.createdAt)}
                        </span>
                      </div>
                    </div>
                    <p className="text-retro-text text-sm font-retro leading-relaxed pl-2 border-l-2 border-retro-blue/30">
                      {reply.content}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            
            {/* 查看更多回复按钮 */}
            {post.replyCount > 3 && (
              <div className="flex justify-center pt-3">
                <button className="group relative overflow-hidden flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-retro-purple/20 to-retro-blue/20 hover:from-retro-purple/30 hover:to-retro-blue/30 text-retro-purple hover:text-white rounded-lg border border-retro-purple/30 hover:border-retro-purple/50 transition-all duration-200 shadow-lg">
                  <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative flex items-center gap-2">
                    <div className="w-4 h-4 bg-retro-purple/20 rounded flex items-center justify-center">
                      <span className="text-xs">⬇️</span>
                    </div>
                    <span className="text-sm font-pixel tracking-wide">
                      MORE ({post.replyCount - 3})
                    </span>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
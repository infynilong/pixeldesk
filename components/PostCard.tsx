'use client'

import { useState } from 'react'
import { Post, CreateReplyData } from '@/types/social'
import UserAvatar from './UserAvatar'
import CreateReplyForm from './CreateReplyForm'
import { usePostReplies } from '@/lib/hooks/usePostReplies'

interface PostCardProps {
  post: Post
  currentUserId: string
  onLike: () => void
  onReplyCountUpdate?: (postId: string, newCount: number) => void
  isMobile?: boolean
  isAuthenticated?: boolean
  onShowLoginPrompt?: () => void
}

export default function PostCard({
  post,
  currentUserId,
  onLike,
  onReplyCountUpdate,
  isMobile = false,
  isAuthenticated = true,
  onShowLoginPrompt
}: PostCardProps) {
  const [showReplies, setShowReplies] = useState(false)
  const [isLiking, setIsLiking] = useState(false)

  // 使用回复hook来管理回复数据
  const {
    replies,
    isLoading: isLoadingReplies,
    isCreatingReply,
    error: repliesError,
    pagination: repliesPagination,
    fetchReplies,
    createReply,
    loadMoreReplies,
    refreshReplies
  } = usePostReplies({
    postId: post.id,
    userId: currentUserId,
    autoFetch: showReplies // 只有在显示回复时才自动获取
  })

  const handleLike = async () => {
    if (isLiking) return
    setIsLiking(true)
    await onLike()
    setIsLiking(false)
  }

  // 处理回复提交
  const handleReplySubmit = async (replyData: CreateReplyData) => {
    // 检查登录状态
    if (!isAuthenticated) {
      if (onShowLoginPrompt) {
        onShowLoginPrompt()
      }
      return false
    }

    const newReply = await createReply(replyData)

    if (newReply) {
      // 更新帖子的回复计数
      if (onReplyCountUpdate) {
        onReplyCountUpdate(post.id, (post.replyCount || 0) + 1)
      }
    }
    return !!newReply
  }

  // 处理显示/隐藏回复
  const handleToggleReplies = () => {
    const newShowReplies = !showReplies
    setShowReplies(newShowReplies)
    
    // 如果要显示回复且还没有数据，则获取数据
    if (newShowReplies && replies.length === 0) {
      fetchReplies()
    }
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
    ? "group relative bg-gray-900/90 rounded-lg overflow-hidden border border-gray-800 "
    : "group relative bg-gray-900/90 rounded-lg overflow-hidden border border-gray-800 hover:border-gray-700 "

  return (
    <div className={cardClasses}>
      {/* 帖子头部 */}
      <div className="p-4">
        <div className="flex items-start space-x-3">
          {/* 头像区域 */}
          <div className="flex-shrink-0">
            <UserAvatar
              userId={post.author.id}
              userName={post.author.name}
              userAvatar={post.author.avatar}
              size={isMobile ? 'sm' : 'md'}
              showStatus={true}
              isOnline={post.author.isOnline}
              lastSeen={post.author.lastSeen}
            />
          </div>

          {/* 作者信息和时间 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <h4 className="font-medium text-gray-200 text-sm truncate">
                {post.author.name}
              </h4>
              <span className="text-gray-600">•</span>
              <span className="text-xs text-gray-500 font-mono">
                {formatTimeAgo(post.createdAt)}
              </span>
            </div>

            {/* 帖子标题 */}
            {post.title && (
              <h3 className="text-base font-medium text-gray-100 mt-1 leading-snug">
                {post.title}
              </h3>
            )}
          </div>
        </div>
      </div>

      {/* 帖子内容 */}
      <div className="px-4 pb-4">
        {/* 博客类型标识 */}
        {post.type === 'MARKDOWN' && (
          <div className="flex items-center gap-3 mb-3">
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-retro-purple/20 text-retro-purple border border-retro-purple/30 rounded text-xs font-pixel">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              博客文章
            </span>
            {post.readTime && (
              <span className="text-xs text-gray-500 font-mono">
                {post.readTime} 分钟阅读
              </span>
            )}
          </div>
        )}

        {/* 封面图片 */}
        {post.type === 'MARKDOWN' && post.coverImage && (
          <div className="relative overflow-hidden rounded-lg border border-gray-800 mb-3">
            <img
              src={post.coverImage}
              alt="Cover"
              className="w-full h-48 object-cover"
            />
          </div>
        )}

        {/* 内容文本 - 博客显示摘要，普通帖子显示全文 */}
        <p className="text-gray-300 whitespace-pre-wrap leading-relaxed text-sm mb-3 font-sans">
          {post.type === 'MARKDOWN' && post.summary ? post.summary : post.content}
        </p>

        {/* 博客标签 */}
        {post.type === 'MARKDOWN' && post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {post.tags.map((tag, index) => (
              <span
                key={index}
                className="inline-block px-2 py-0.5 bg-gray-800/50 text-gray-400 border border-gray-700 rounded text-xs"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* 阅读全文按钮 - 只对博客类型显示 */}
        {post.type === 'MARKDOWN' && (
          <a
            href={`/posts/${post.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-retro-blue hover:text-retro-cyan text-sm font-medium transition-colors"
          >
            阅读全文
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </a>
        )}

        {/* 图片内容 - 非博客类型 */}
        {post.type !== 'MARKDOWN' && post.imageUrl && (
          <div className="relative overflow-hidden rounded-lg border border-gray-800">
            <img
              src={post.imageUrl}
              alt="Post image"
              className="w-full max-h-64 object-cover"
            />
          </div>
        )}
      </div>

      {/* 统计和操作区域 */}
      <div className="px-4 py-3 border-t border-gray-800/50 bg-gray-900/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* 浏览数 */}
            <div className="flex items-center space-x-2 text-gray-500">
              <div className="w-4 h-4 bg-gray-800 rounded flex items-center justify-center">
                <svg className="w-2.5 h-2.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <span className="text-xs font-mono">{post.viewCount}</span>
            </div>

            {/* 回复数 - 可点击 */}
            <button
              onClick={handleToggleReplies}
              className="flex items-center space-x-2 px-2 py-1 rounded text-gray-500 hover:text-gray-300 hover:bg-gray-800/50 "
            >
              <div className="w-4 h-4 bg-gray-800 rounded flex items-center justify-center">
                <svg className="w-2.5 h-2.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <span className="text-xs font-mono">{post.replyCount}</span>
            </button>

            {/* 点赞按钮 */}
            <button
              onClick={handleLike}
              disabled={isLiking}
              className={`flex items-center space-x-2 px-2 py-1 rounded  ${
                post.isLiked
                  ? 'text-red-400 bg-red-950/30 border border-red-800/30'
                  : 'text-gray-500 hover:text-red-400 hover:bg-gray-800/50'
              } ${isLiking ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className={`w-4 h-4 ${post.isLiked ? 'bg-red-900/40' : 'bg-gray-800'} rounded flex items-center justify-center `}>
                <svg
                  className={`w-2.5 h-2.5 ${post.isLiked ? 'fill-current text-red-400' : 'text-gray-400'} `}
                  fill={post.isLiked ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <span className="text-xs font-mono">{post.likeCount}</span>
            </button>
          </div>

          {/* 删除按钮（仅作者可见） */}
          {post.author.id === currentUserId && (
            <button className="p-2 text-gray-500 hover:text-red-400 rounded hover:bg-gray-800/50 ">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* 回复区域 */}
      {showReplies && (
        <div className="border-t border-gray-800/50">
          <div className="p-4 space-y-3 bg-gray-950/30">
            {/* 回复输入表单 */}
            <CreateReplyForm
              onSubmit={handleReplySubmit}
              onCancel={() => {}}
              isMobile={isMobile}
              isSubmitting={isCreatingReply}
              variant="dark"
            />

            {/* 错误显示 */}
            {repliesError && (
              <div className="p-3 bg-red-950/30 border border-red-800/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-900/40 rounded flex items-center justify-center">
                    <span className="text-xs">⚠️</span>
                  </div>
                  <span className="text-red-300 text-sm font-mono">{repliesError}</span>
                </div>
              </div>
            )}

            {/* 回复列表标题 */}
            <div className="flex items-center gap-2 pt-2">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <h4 className="text-sm font-medium text-gray-300 font-mono">
                REPLIES ({post.replyCount || 0})
              </h4>
            </div>
            
            {/* 加载状态 */}
            {isLoadingReplies && replies.length === 0 && (
              <div className="flex items-center justify-center py-6">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-gray-600 rounded-full " style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-gray-500 rounded-full " style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-gray-600 rounded-full " style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            )}
            
            {/* 回复列表 */}
            {replies.length > 0 && (
              <div className="space-y-3">
                {replies.map((reply) => (
                  <div key={reply.id} className="bg-gray-800/40 rounded-lg p-3 border border-gray-800/60">
                    <div className="flex items-start space-x-3">
                      {/* 回复者头像 */}
                      <div className="flex-shrink-0">
                        <UserAvatar
                          userId={reply.author.id}
                          userName={reply.author.name}
                          userAvatar={reply.author.avatar}
                          size="sm"
                          showStatus={true}
                          isOnline={reply.author.isOnline}
                          lastSeen={reply.author.lastSeen}
                        />
                      </div>

                      {/* 回复内容 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="font-medium text-gray-300 text-sm">
                            {reply.author.name}
                          </span>
                          <span className="text-gray-600">•</span>
                          <span className="text-xs text-gray-500 font-mono">
                            {formatTimeAgo(reply.createdAt)}
                          </span>
                        </div>
                        <p className="text-gray-300 text-sm leading-relaxed">
                          {reply.content}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* 没有回复时的空状态 */}
            {!isLoadingReplies && replies.length === 0 && (
              <div className="text-center py-6">
                <div className="w-10 h-10 bg-gray-800 border border-gray-700 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <p className="text-sm text-gray-400 font-mono">NO REPLIES</p>
                <p className="text-xs text-gray-500 font-mono mt-1">Be the first to reply</p>
              </div>
            )}
            
            {/* 加载更多回复按钮 */}
            {repliesPagination.hasNextPage && (
              <div className="flex justify-center pt-2">
                <button
                  onClick={loadMoreReplies}
                  disabled={isLoadingReplies}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 rounded-lg  disabled:opacity-50 text-xs font-mono"
                >
                  {isLoadingReplies ? 'LOADING...' : `LOAD MORE (${repliesPagination.totalPages - repliesPagination.page})`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
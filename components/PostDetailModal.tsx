'use client'

import { useState, useEffect, useCallback } from 'react'
import { Post, PostReply } from '@/types/social'
import UserAvatar from './UserAvatar'
import CreateReplyForm from './CreateReplyForm'
import { usePostReplies } from '@/lib/hooks/usePostReplies'
import LoadingSpinner from './LoadingSpinner'

interface PostDetailModalProps {
  isOpen: boolean
  postId: string | null
  currentUserId: string
  onClose: () => void
  onNavigateToPage?: (postId: string) => void // 可选的页面跳转功能
}

export default function PostDetailModal({
  isOpen,
  postId,
  currentUserId,
  onClose,
  onNavigateToPage
}: PostDetailModalProps) {
  const [post, setPost] = useState<Post | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
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
    postId: postId || '',
    userId: currentUserId,
    autoFetch: isOpen && !!postId
  })

  // 获取帖子详情
  const fetchPostDetail = useCallback(async (id: string) => {
    if (!id) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/posts/${id}?userId=${currentUserId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch post')
      }

      if (data.success) {
        setPost(data.data)
      } else {
        throw new Error(data.error || 'Failed to fetch post')
      }
    } catch (err) {
      console.error('Error fetching post detail:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch post')
    } finally {
      setIsLoading(false)
    }
  }, [currentUserId])

  // 处理点赞
  const handleLike = async () => {
    if (!post || isLiking) return

    setIsLiking(true)
    try {
      const response = await fetch(`/api/posts/${post.id}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: currentUserId }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setPost(prev => prev ? {
          ...prev,
          isLiked: data.data.isLiked,
          likeCount: data.data.likeCount
        } : prev)
      }
    } catch (error) {
      console.error('Error liking post:', error)
    } finally {
      setIsLiking(false)
    }
  }

  // 处理回复提交
  const handleReplySubmit = async (replyData: { content: string }) => {
    if (!post) return false

    const newReply = await createReply(replyData)

    if (newReply) {
      // 更新帖子的回复计数
      setPost(prev => prev ? {
        ...prev,
        replyCount: (prev.replyCount || 0) + 1
      } : prev)
    }
    return !!newReply
  }

  // 处理弹窗打开/关闭
  useEffect(() => {
    if (isOpen && postId) {
      fetchPostDetail(postId)
      // 同时获取回复数据
      if (fetchReplies) {
        fetchReplies()
      }
    } else {
      setPost(null)
      setError(null)
    }
  }, [isOpen, postId, fetchPostDetail, fetchReplies])

  // 处理键盘事件
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'auto'
    }
  }, [isOpen, onClose])

  // 格式化时间
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

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn"
      style={{
        background: 'linear-gradient(135deg, rgba(0,0,0,0.95) 0%, rgba(30,20,60,0.98) 50%, rgba(0,0,0,0.95) 100%)'
      }}
    >
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative bg-white dark:bg-gray-900 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden animate-slideUp border border-gray-200/20 dark:border-gray-800/50">
        {/* 现代化头部设计 */}
        <div className="relative bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border-b border-gray-200/50 dark:border-gray-700/50">
          {/* 头部装饰线 */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500"></div>

          <div className="flex items-center justify-between p-6">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg transform rotate-3">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white dark:border-gray-900 animate-pulse"></div>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">帖子详情</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">PixelDesk 社交平台</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {/* 跳转到页面按钮 - 现代化设计 */}
              {onNavigateToPage && postId && (
                <button
                  onClick={() => onNavigateToPage(postId)}
                  className="group relative overflow-hidden px-4 py-2.5 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                  title="在新页面中打开"
                >
                  <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="relative flex items-center space-x-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    <span>新页面打开</span>
                  </div>
                </button>
              )}

              {/* 关闭按钮 - 现代化设计 */}
              <button
                onClick={onClose}
                className="group p-2.5 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-xl transition-all duration-200 hover:scale-110"
              >
                <svg className="w-5 h-5 transform group-hover:rotate-90 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* 弹窗内容 - 现代化设计 */}
        <div className="overflow-y-auto max-h-[calc(90vh-80px)] bg-gray-50 dark:bg-gray-900">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center space-y-4">
                <LoadingSpinner />
                <p className="text-gray-500 dark:text-gray-400 font-medium">正在加载帖子内容...</p>
              </div>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-red-400 to-red-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">加载失败</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">{error}</p>
              <button
                onClick={() => postId && fetchPostDetail(postId)}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
              >
                重新加载
              </button>
            </div>
          ) : post ? (
            <div className="p-6 space-y-6">
              {/* 帖子内容卡片 - 现代化设计 */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
                <div className="p-8">
                  {/* 作者信息 */}
                  <div className="flex items-start space-x-6 mb-6">
                    <div className="relative">
                      <UserAvatar
                        userId={post.author.id}
                        userName={post.author.name}
                        userAvatar={post.author.avatar}
                        size="lg"
                        showStatus={true}
                      />
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="font-bold text-gray-900 dark:text-white text-xl">
                          {post.author.name}
                        </h4>
                        <span className="px-3 py-1 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 text-purple-700 dark:text-purple-300 text-xs font-medium rounded-full">
                          作者
                        </span>
                        <span className="text-gray-400 dark:text-gray-500">•</span>
                        <span className="text-gray-500 dark:text-gray-400 font-medium">
                          {formatTimeAgo(post.createdAt)}
                        </span>
                      </div>

                      {/* 帖子标题 */}
                      {post.title && (
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 leading-tight">
                          {post.title}
                        </h3>
                      )}
                    </div>
                  </div>

                  {/* 帖子内容 */}
                  <div className="mb-6">
                    <div className="prose dark:prose-invert max-w-none">
                      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed text-lg">
                        {post.content}
                      </p>
                    </div>

                    {/* 图片内容 */}
                    {post.imageUrl && (
                      <div className="mt-6 overflow-hidden rounded-2xl shadow-lg">
                        <img
                          src={post.imageUrl}
                          alt="Post image"
                          className="w-full max-h-96 object-cover hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}
                  </div>

                  {/* 统计和操作 - 现代化设计 */}
                  <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center space-x-6">
                      {/* 浏览数 */}
                      <div className="flex items-center space-x-3 text-gray-500 dark:text-gray-400">
                        <div className="w-8 h-8 bg-gradient-to-br from-cyan-100 to-blue-100 dark:from-cyan-900/30 dark:to-blue-900/30 rounded-xl flex items-center justify-center">
                          <svg className="w-4 h-4 text-cyan-600 dark:text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </div>
                        <span className="font-medium">{post.viewCount} 次浏览</span>
                      </div>

                      {/* 回复数 */}
                      <div className="flex items-center space-x-3 text-gray-500 dark:text-gray-400">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-xl flex items-center justify-center">
                          <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                        </div>
                        <span className="font-medium">{post.replyCount} 条回复</span>
                      </div>

                      {/* 点赞按钮 - 现代化设计 */}
                      <button
                        onClick={handleLike}
                        disabled={isLiking}
                        className={`group flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-all duration-300 font-medium shadow-sm ${
                          post.isLiked
                            ? 'bg-gradient-to-r from-pink-500 to-red-500 text-white shadow-lg'
                            : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 hover:shadow-md'
                        } ${isLiking ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}
                      >
                        <div className={`w-8 h-8 ${post.isLiked ? 'bg-white/20' : 'bg-gradient-to-br from-pink-100 to-red-100 dark:from-pink-900/30 dark:to-red-900/30'} rounded-xl flex items-center justify-center transition-all duration-300`}>
                          <svg
                            className={`w-4 h-4 ${post.isLiked ? 'text-white fill-current' : 'text-pink-600 dark:text-pink-400'} transition-all duration-300 ${!post.isLiked && 'group-hover:scale-110'}`}
                            fill={post.isLiked ? 'currentColor' : 'none'}
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                        </div>
                        <span className={post.isLiked ? 'text-white' : ''}>{post.likeCount} 赞</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 回复区域 - 现代化设计 */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
                <div className="p-6 space-y-6">
                  {/* 回复标题 */}
                  <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-2xl flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-xl font-bold text-gray-900 dark:text-white">
                          回复
                        </h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          共 {post.replyCount || 0} 条回复
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 回复输入表单 */}
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50">
                    <CreateReplyForm
                      onSubmit={handleReplySubmit}
                      onCancel={() => {}}
                      isMobile={false}
                      isSubmitting={isCreatingReply}
                      variant="light"
                    />
                  </div>

                  {/* 错误显示 */}
                  {repliesError && (
                    <div className="bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 border border-red-200 dark:border-red-800/50 rounded-2xl p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-pink-500 rounded-xl flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium text-red-700 dark:text-red-300">回复失败</p>
                          <p className="text-sm text-red-600 dark:text-red-400">{repliesError}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 加载状态 */}
                  {isLoadingReplies && replies.length === 0 && (
                    <div className="flex items-center justify-center py-12">
                      <div className="flex flex-col items-center space-y-4">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                          <div className="w-3 h-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                          <div className="w-3 h-3 bg-gradient-to-r from-pink-500 to-red-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 font-medium">正在加载回复...</p>
                      </div>
                    </div>
                  )}

                  {/* 回复列表 */}
                  {replies.length > 0 && (
                    <div className="space-y-4">
                      {replies.map((reply, index) => (
                        <div key={reply.id} className="bg-gray-50 dark:bg-gray-900/50 rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50 hover:shadow-lg transition-all duration-200" style={{ animationDelay: `${index * 100}ms` }}>
                          <div className="flex items-start space-x-4">
                            {/* 回复者头像 */}
                            <div className="flex-shrink-0">
                              <div className="relative">
                                <UserAvatar
                                  userId={reply.author.id}
                                  userName={reply.author.name}
                                  userAvatar={reply.author.avatar}
                                  size="md"
                                  showStatus={true}
                                />
                                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                                  <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                </div>
                              </div>
                            </div>

                            {/* 回复内容 */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-3 mb-3">
                                <span className="font-bold text-gray-900 dark:text-white">
                                  {reply.author.name}
                                </span>
                                <span className="px-2 py-1 bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 text-green-700 dark:text-green-300 text-xs font-medium rounded-full">
                                  回复者
                                </span>
                                <span className="text-gray-400 dark:text-gray-500">•</span>
                                <span className="text-gray-500 dark:text-gray-400 font-medium">
                                  {formatTimeAgo(reply.createdAt)}
                                </span>
                              </div>
                              <div className="prose dark:prose-invert max-w-none">
                                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                                  {reply.content}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 没有回复时的空状态 */}
                  {!isLoadingReplies && replies.length === 0 && (
                    <div className="text-center py-12">
                      <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                        <svg className="w-10 h-10 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </div>
                      <h5 className="text-xl font-bold text-gray-900 dark:text-white mb-2">还没有回复</h5>
                      <p className="text-gray-500 dark:text-gray-400">成为第一个回复的人，分享你的想法!</p>
                    </div>
                  )}

                  {/* 加载更多回复按钮 */}
                  {repliesPagination.hasNextPage && (
                    <div className="flex justify-center pt-6 border-t border-gray-200 dark:border-gray-700">
                      <button
                        onClick={loadMoreReplies}
                        disabled={isLoadingReplies}
                        className="group relative overflow-hidden px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50"
                      >
                        <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="relative flex items-center space-x-2">
                          {isLoadingReplies ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                              <span>加载中...</span>
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                              </svg>
                              <span>加载更多回复 ({repliesPagination.totalPages - repliesPagination.page})</span>
                            </>
                          )}
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
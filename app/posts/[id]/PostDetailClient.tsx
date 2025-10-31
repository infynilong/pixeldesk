'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Post } from '@/types/social'
import { useCurrentUser } from '@/lib/hooks/useCurrentUser'
import { useUser } from '@/contexts/UserContext'
import { usePostReplies } from '@/lib/hooks/usePostReplies'
import UserAvatar from '@/components/UserAvatar'
import CreateReplyForm from '@/components/CreateReplyForm'
import MarkdownRenderer from '@/components/MarkdownRenderer'

interface PostDetailClientProps {
  initialPost: Post
}

export default function PostDetailClient({ initialPost }: PostDetailClientProps) {
  const router = useRouter()
  const { userId: currentUserId } = useCurrentUser()
  const { user } = useUser()

  // 正确的登录状态判断：只有 UserContext 的 user 存在才算真正登录
  const isAuthenticated = !!user

  const [post, setPost] = useState<Post>(initialPost)
  const [isLiking, setIsLiking] = useState(false)
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)

  // 使用回复hook来管理回复数据
  const {
    replies,
    isLoading: isLoadingReplies,
    isCreatingReply,
    error: repliesError,
    pagination: repliesPagination,
    createReply,
    loadMoreReplies
  } = usePostReplies({
    postId: post.id,
    userId: currentUserId || '',
    autoFetch: !!post.id && !!currentUserId
  })

  // 处理点赞
  const handleLike = async () => {
    // 检查登录状态
    if (!isAuthenticated) {
      setShowLoginPrompt(true)
      return
    }

    if (!post || isLiking || !currentUserId) return

    setIsLiking(true)
    try {
      const response = await fetch(`/api/posts/${post.id}/like?userId=${currentUserId}`, {
        method: 'POST'
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setPost(prev => ({
          ...prev,
          isLiked: data.data.isLiked,
          likeCount: data.data.likeCount
        }))
      }
    } catch (error) {
      console.error('Error liking post:', error)
    } finally {
      setIsLiking(false)
    }
  }

  // 处理回复提交
  const handleReplySubmit = async (replyData: { content: string }) => {
    // 检查登录状态
    if (!isAuthenticated) {
      setShowLoginPrompt(true)
      return false
    }

    if (!post) return false

    const newReply = await createReply(replyData)

    if (newReply) {
      // 更新帖子的回复计数
      setPost(prev => ({
        ...prev,
        replyCount: (prev.replyCount || 0) + 1
      }))
    }
    return !!newReply
  }

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

  // 检查是否是作者
  const isAuthor = currentUserId === post.author.id

  return (
    <>
      {/* 登录提示模态框 */}
      {showLoginPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-retro-purple/30 rounded-xl p-6 max-w-md mx-4">
            <div className="text-center space-y-4">
              {/* 图标 */}
              <div className="w-16 h-16 bg-gradient-to-br from-retro-purple to-retro-blue rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>

              {/* 标题和消息 */}
              <div>
                <h3 className="text-xl font-bold text-white mb-2 font-retro">需要登录</h3>
                <p className="text-gray-300 text-sm font-pixel">请先登录后再进行操作</p>
              </div>

              {/* 按钮 */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowLoginPrompt(false)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg border border-gray-600 font-pixel text-sm"
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    setShowLoginPrompt(false)
                    router.push('/')
                  }}
                  className="flex-1 bg-gradient-to-r from-retro-purple to-retro-blue hover:from-retro-blue hover:to-retro-cyan text-white font-bold py-2 px-4 rounded-lg border border-white/20 font-pixel text-sm"
                >
                  前往登录
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 导航栏 */}
      <nav className="bg-retro-bg-dark/95 backdrop-blur-sm border-b border-retro-border/20 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-retro-purple to-retro-pink rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white font-pixel">帖子详情</h1>
                <p className="text-xs text-retro-textMuted">PixelDesk 社交平台</p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {isAuthor && (
                <button
                  onClick={() => router.push(`/posts/${post.id}/edit`)}
                  className="px-4 py-2 bg-retro-purple/20 hover:bg-retro-purple/30 text-retro-purple rounded-lg border border-retro-purple/30 hover:border-retro-purple/50 text-sm font-medium"
                >
                  编辑
                </button>
              )}
              <button
                onClick={() => router.push('/')}
                className="px-4 py-2 bg-retro-blue/20 hover:bg-retro-blue/30 text-retro-blue rounded-lg border border-retro-blue/30 hover:border-retro-blue/50 text-sm font-medium"
              >
                返回主页
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* 主要内容 */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* 帖子内容卡片 */}
          <article className="bg-retro-bg-dark/95 rounded-xl border border-retro-border/10">
            <div className="p-8">
              {/* 作者信息 */}
              <header className="flex items-start space-x-6 mb-6">
                <UserAvatar
                  userId={post.author.id}
                  userName={post.author.name}
                  userAvatar={post.author.avatar}
                  size="xl"
                  showStatus={true}
                />
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h2 className="font-bold text-white text-2xl">
                      {post.author.name}
                    </h2>
                    <span className="text-retro-textMuted">•</span>
                    <time className="text-retro-textMuted" dateTime={post.createdAt}>
                      {formatTimeAgo(post.createdAt)}
                    </time>
                  </div>

                  {/* 帖子标题 */}
                  {post.title && (
                    <h1 className="text-3xl font-bold text-white mb-4 leading-tight">
                      {post.title}
                    </h1>
                  )}

                  {/* 博客元信息 */}
                  {post.type === 'MARKDOWN' && (
                    <div className="flex items-center gap-4 text-sm text-gray-400 mt-3">
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-retro-purple/20 text-retro-purple border border-retro-purple/20 rounded font-pixel text-xs">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        博客
                      </span>
                      {post.readTime && (
                        <span className="font-mono">
                          <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {post.readTime} 分钟阅读
                        </span>
                      )}
                      {post.wordCount && (
                        <span className="font-mono">{post.wordCount.toLocaleString()} 字</span>
                      )}
                    </div>
                  )}

                  {/* 标签 */}
                  {post.type === 'MARKDOWN' && post.tags && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {post.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-block px-2 py-1 bg-gray-800/50 text-gray-400 border border-gray-700/50 rounded text-xs"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </header>

              {/* 封面图片 */}
              {post.type === 'MARKDOWN' && post.coverImage && (
                <div className="mb-6 overflow-hidden rounded-xl border border-retro-border/10">
                  <img
                    src={post.coverImage}
                    alt="Cover"
                    className="w-full max-h-[400px] object-cover"
                  />
                </div>
              )}

              {/* 帖子内容 */}
              <div className="mb-6">
                {post.type === 'MARKDOWN' ? (
                  <MarkdownRenderer content={post.content} />
                ) : (
                  <p className="text-retro-text whitespace-pre-wrap leading-relaxed text-lg">
                    {post.content}
                  </p>
                )}

                {/* 图片内容 - 非博客类型 */}
                {post.type !== 'MARKDOWN' && post.imageUrl && (
                  <div className="mt-6 overflow-hidden rounded-xl">
                    <img
                      src={post.imageUrl}
                      alt="Post image"
                      className="w-full max-h-[500px] object-cover"
                    />
                  </div>
                )}
              </div>

              {/* 统计和操作 */}
              <footer className="flex items-center justify-between pt-6 border-t border-retro-border/10">
                <div className="flex items-center space-x-6">
                  {/* 浏览数 */}
                  <div className="flex items-center space-x-3 text-retro-textMuted">
                    <div className="w-6 h-6 bg-retro-cyan/20 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </div>
                    <span className="font-medium">{post.viewCount} 次浏览</span>
                  </div>

                  {/* 回复数 */}
                  <div className="flex items-center space-x-3 text-retro-textMuted">
                    <div className="w-6 h-6 bg-retro-blue/20 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <span className="font-medium">{post.replyCount} 条回复</span>
                  </div>

                  {/* 点赞按钮 */}
                  <button
                    onClick={handleLike}
                    disabled={isLiking}
                    className={`flex items-center space-x-3 px-4 py-2 rounded-xl font-medium ${
                      post.isLiked
                        ? 'text-retro-pink bg-retro-pink/15 border border-retro-pink/30'
                        : 'text-retro-textMuted hover:text-retro-pink hover:bg-retro-pink/10 border border-retro-border/20 hover:border-retro-pink/30'
                    } ${isLiking ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}
                  >
                    <div className={`w-6 h-6 ${post.isLiked ? 'bg-retro-pink/30' : 'bg-retro-textMuted/20'} rounded-lg flex items-center justify-center`}>
                      <svg
                        className={`w-4 h-4 ${post.isLiked ? 'fill-current text-retro-pink' : ''}`}
                        fill={post.isLiked ? 'currentColor' : 'none'}
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </div>
                    <span>{post.likeCount} 赞</span>
                  </button>
                </div>
              </footer>
            </div>
          </article>

          {/* 回复区域 */}
          <section className="bg-retro-bg-dark/95 rounded-xl border border-retro-border/10">
            <div className="p-8 space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-retro-border/10">
                <svg className="w-6 h-6 text-retro-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <h3 className="text-2xl font-bold text-white">
                  回复 ({post.replyCount || 0})
                </h3>
              </div>

              {/* 回复输入表单 */}
              {currentUserId && (
                <CreateReplyForm
                  onSubmit={handleReplySubmit}
                  onCancel={() => {}}
                  isMobile={false}
                  isSubmitting={isCreatingReply}
                  variant="light"
                />
              )}

              {/* 错误显示 */}
              {repliesError && (
                <div className="p-4 bg-retro-red/10 border border-retro-red/20 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 bg-retro-red/20 rounded flex items-center justify-center">
                      <span className="text-sm">⚠️</span>
                    </div>
                    <span className="text-retro-red font-pixel">{repliesError}</span>
                  </div>
                </div>
              )}

              {/* 加载状态 */}
              {isLoadingReplies && replies.length === 0 && (
                <div className="flex items-center justify-center py-12">
                  <div className="flex items-center gap-4">
                    <div className="w-4 h-4 bg-retro-blue rounded-full animate-pulse"></div>
                    <div className="w-4 h-4 bg-retro-cyan rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-4 h-4 bg-retro-green rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              )}

              {/* 回复列表 */}
              {replies.length > 0 && (
                <div className="space-y-4">
                  {replies.map((reply) => (
                    <div key={reply.id} className="bg-retro-bg-darker/40 rounded-xl p-6 border border-retro-border/10">
                      <div className="flex items-start space-x-4">
                        {/* 回复者头像 */}
                        <div className="flex-shrink-0 pt-1">
                          <UserAvatar
                            userId={reply.author.id}
                            userName={reply.author.name}
                            userAvatar={reply.author.avatar}
                            size="md"
                            showStatus={true}
                          />
                        </div>

                        {/* 回复内容 */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-3 mb-3">
                            <span className="font-bold text-white">
                              {reply.author.name}
                            </span>
                            <span className="text-retro-textMuted">•</span>
                            <time className="text-sm text-retro-textMuted" dateTime={reply.createdAt}>
                              {formatTimeAgo(reply.createdAt)}
                            </time>
                          </div>
                          <p className="text-retro-text leading-relaxed">
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
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-retro-blue/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-retro-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <h4 className="text-xl font-semibold text-white mb-2">还没有回复</h4>
                  <p className="text-retro-textMuted">成为第一个回复的人!</p>
                </div>
              )}

              {/* 加载更多回复按钮 */}
              {repliesPagination.hasNextPage && (
                <div className="flex justify-center pt-6">
                  <button
                    onClick={loadMoreReplies}
                    disabled={isLoadingReplies}
                    className="px-8 py-3 bg-retro-purple/10 hover:bg-retro-purple/20 text-retro-purple rounded-xl border border-retro-purple/20 hover:border-retro-purple/50 disabled:opacity-50 font-medium"
                  >
                    {isLoadingReplies ? '加载中...' : `加载更多回复 (${repliesPagination.totalPages - repliesPagination.page})`}
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </>
  )
}

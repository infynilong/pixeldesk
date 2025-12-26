'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Post } from '@/types/social'
import { useCurrentUser } from '@/lib/hooks/useCurrentUser'
import { useUser } from '@/contexts/UserContext'
import { usePostReplies } from '@/lib/hooks/usePostReplies'
import UserAvatar from '@/components/UserAvatar'
import CreateReplyForm from '@/components/CreateReplyForm'
import MarkdownRenderer from '@/components/MarkdownRenderer'
import PostSidebar from '@/components/blog/PostSidebar'
import Link from 'next/link'

interface PostDetailClientProps {
  initialPost: Post
}

export default function PostDetailClient({ initialPost }: PostDetailClientProps) {
  const router = useRouter()
  const { userId: currentUserId } = useCurrentUser()
  const { user } = useUser()

  // 本地主题状态管理
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')
  const [mounted, setMounted] = useState(false)

  // 初始化主题
  useEffect(() => {
    setMounted(true)
    const savedTheme = localStorage.getItem('pixeldesk-blog-theme') as 'light' | 'dark'
    if (savedTheme) {
      setTheme(savedTheme)
      document.documentElement.classList.toggle('light', savedTheme === 'light')
    }
  }, [])

  // 切换主题
  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
    localStorage.setItem('pixeldesk-blog-theme', newTheme)
    document.documentElement.classList.toggle('light', newTheme === 'light')
  }

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
    <div className="min-h-screen bg-gray-950 relative">
      {/* 动态背景装饰 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* 渐变光晕 - 紫色 */}
        <div className="absolute top-20 -left-20 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
        {/* 渐变光晕 - 蓝色 */}
        <div className="absolute top-40 right-20 w-80 h-80 bg-cyan-600/10 rounded-full blur-3xl" />
        {/* 渐变光晕 - 粉色 */}
        <div className="absolute bottom-40 left-1/3 w-96 h-96 bg-pink-600/8 rounded-full blur-3xl" />

        {/* 网格背景 */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:32px_32px]" />
      </div>

      {/* 登录提示模态框 */}
      {showLoginPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-xl p-6 max-w-md mx-4 shadow-2xl">
            <div className="text-center space-y-4">
              {/* 图标 */}
              <div className="w-16 h-16 bg-gradient-to-br from-cyan-600 to-teal-600 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-cyan-500/20">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>

              {/* 标题和消息 */}
              <div>
                <h3 className="text-xl font-bold text-white mb-2">需要登录</h3>
                <p className="text-gray-300 text-sm">请先登录后再进行操作</p>
              </div>

              {/* 按钮 */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowLoginPrompt(false)}
                  className="cursor-pointer flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg border border-gray-600 text-sm transition-all"
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    setShowLoginPrompt(false)
                    router.push('/')
                  }}
                  className="cursor-pointer flex-1 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-bold py-2 px-4 rounded-lg text-sm transition-all"
                >
                  前往登录
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 导航栏 - 精简高度 */}
      <nav className="bg-gray-900/80 backdrop-blur-sm border-b border-gray-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-2">
          <div className="flex items-center justify-between">
            {/* Logo - 精简版 */}
            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-white font-bold text-base">PixelDesk</span>
            </button>

            <div className="flex items-center space-x-2">
              {/* 主题切换按钮 */}
              <button
                onClick={toggleTheme}
                className="p-1.5 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg border border-gray-700 transition-all"
                title={theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
              >
                {theme === 'dark' ? (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                )}
              </button>

              {isAuthor && (
                <button
                  onClick={() => router.push(`/posts/${post.id}/edit`)}
                  className="cursor-pointer px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-cyan-400 rounded-lg border border-gray-700 hover:border-cyan-500/50 text-sm font-medium transition-all"
                >
                  编辑
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* 主要内容 - 左右布局 */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        <div className="flex gap-8 items-start">
          {/* 左侧主要内容区 */}
          <div className="flex-1 min-w-0 space-y-8">
          {/* 帖子内容卡片 */}
          <article className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl overflow-hidden">
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
                    <Link
                      href={`/profile/${post.author.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-white hover:text-cyan-400 text-2xl transition-colors"
                    >
                      {post.author.name}
                    </Link>
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
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 rounded font-pixel text-xs">
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
                <div className="mb-6 overflow-hidden rounded-xl">
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
                  <p className="text-gray-200 whitespace-pre-wrap leading-relaxed text-lg">
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
              <footer className="flex items-center justify-between pt-6 border-t border-gray-800">
                <div className="flex items-center space-x-6">
                  {/* 浏览数 */}
                  <div className="flex items-center space-x-2 text-gray-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <span className="text-sm font-medium">{post.viewCount}</span>
                  </div>

                  {/* 回复数 */}
                  <div className="flex items-center space-x-2 text-gray-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <span className="text-sm font-medium">{post.replyCount}</span>
                  </div>

                  {/* 点赞按钮 */}
                  <button
                    onClick={handleLike}
                    disabled={isLiking}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all ${
                      post.isLiked
                        ? 'text-orange-400 bg-orange-500/10 hover:bg-orange-500/20'
                        : 'text-gray-400 hover:text-orange-400 hover:bg-gray-800'
                    } ${isLiking ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}
                  >
                    <svg
                      className={`w-5 h-5 ${post.isLiked ? 'fill-current' : ''}`}
                      fill={post.isLiked ? 'currentColor' : 'none'}
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    <span className="text-sm">{post.likeCount}</span>
                  </button>
                </div>
              </footer>
            </div>
          </article>

          {/* 回复区域 */}
          <section className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl overflow-hidden">
            <div className="p-8 space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-gray-800">
                <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                <div className="p-4 bg-red-900/20 border border-red-800/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-red-300 text-sm">{repliesError}</span>
                  </div>
                </div>
              )}

              {/* 加载状态 */}
              {isLoadingReplies && replies.length === 0 && (
                <div className="flex items-center justify-center py-12">
                  <div className="flex items-center gap-4">
                    <div className="w-3 h-3 bg-cyan-500 rounded-full animate-pulse"></div>
                    <div className="w-3 h-3 bg-teal-500 rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              )}

              {/* 回复列表 */}
              {replies.length > 0 && (
                <div className="space-y-4">
                  {replies.map((reply) => (
                    <div key={reply.id} className="bg-gray-800/50 hover:bg-gray-800/70 rounded-xl p-6 transition-all">
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
                            <Link
                              href={`/profile/${reply.author.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-bold text-white hover:text-cyan-400 transition-colors"
                            >
                              {reply.author.name}
                            </Link>
                            <span className="text-gray-600">•</span>
                            <time className="text-sm text-gray-400" dateTime={reply.createdAt}>
                              {formatTimeAgo(reply.createdAt)}
                            </time>
                          </div>
                          <p className="text-gray-200 leading-relaxed">
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
                  <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <h4 className="text-xl font-semibold text-white mb-2">还没有回复</h4>
                  <p className="text-gray-400">成为第一个回复的人!</p>
                </div>
              )}

              {/* 加载更多回复按钮 */}
              {repliesPagination.hasNextPage && (
                <div className="flex justify-center pt-6">
                  <button
                    onClick={loadMoreReplies}
                    disabled={isLoadingReplies}
                    className="cursor-pointer px-8 py-3 bg-gray-800 hover:bg-gray-700 text-cyan-400 rounded-lg border border-gray-700 hover:border-cyan-500/50 disabled:opacity-50 font-medium transition-all"
                  >
                    {isLoadingReplies ? '加载中...' : `加载更多回复 (${repliesPagination.totalPages - repliesPagination.page})`}
                  </button>
                </div>
              )}
            </div>
          </section>
          </div>

          {/* 右侧边栏 */}
          <aside className="hidden lg:block w-80 flex-shrink-0 sticky top-20">
            <PostSidebar
              currentPostId={post.id}
              currentUserId={currentUserId || undefined}
            />
          </aside>
        </div>
      </main>
    </div>
  )
}

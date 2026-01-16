'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useUser } from '@/contexts/UserContext'
import { useCurrentUser } from '@/lib/hooks/useCurrentUser'
import BlogSidebar from '@/components/blog/BlogSidebar'
import BlogEditor from '@/components/blog/BlogEditor'
import UserAvatar from '@/components/UserAvatar'
import { SocialUser, Post } from '@/types/social'
import { useTranslation } from '@/lib/hooks/useTranslation'

export default function EditBlogPage() {
  const params = useParams()
  const router = useRouter()
  const postId = params.id as string
  const { user } = useUser()
  const { currentUser, userId: currentUserId } = useCurrentUser()
  const { t } = useTranslation()

  const isAuthenticated = !!user

  const [selectedBlog, setSelectedBlog] = useState<Post | null>(null)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // 加载文章数据
  useEffect(() => {
    const fetchPost = async () => {
      if (!postId || !currentUserId) return

      setIsLoading(true)
      try {
        const response = await fetch(`/api/posts/${postId}?userId=${currentUserId}`)
        const data = await response.json()

        if (!response.ok || !data.success) {
          throw new Error(data.error || '加载文章失败')
        }

        const post = data.data

        // 检查是否是作者
        if (post.author.id !== currentUserId) {
          setError('只有作者可以编辑这篇文章')
          setTimeout(() => router.push(`/posts/${postId}`), 2000)
          return
        }

        setSelectedBlog(post)
      } catch (err) {
        console.error('Error loading post:', err)
        setError(err instanceof Error ? err.message : '加载文章失败')
      } finally {
        setIsLoading(false)
      }
    }

    fetchPost()
  }, [postId, currentUserId, router])

  // 处理选择其他博客
  const handleSelectBlog = (blog: Post) => {
    router.push(`/posts/${blog.id}/edit`)
  }

  // 处理新建博客
  const handleNewBlog = () => {
    router.push('/posts/create')
  }

  // 处理保存后的刷新
  const handleSaved = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  // 处理发布后
  const handlePublished = () => {
    setRefreshTrigger(prev => prev + 1)
    router.push(`/posts/${postId}`)
  }

  // 未登录提示
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-xl p-8 max-w-md text-center shadow-2xl">
          <div className="w-16 h-16 bg-gradient-to-br from-cyan-600 to-teal-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-cyan-500/20">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">{t.social.login_required}</h2>
          <p className="text-gray-300 mb-6">{t.social.login_required_desc}</p>
          <button
            onClick={() => router.push('/')}
            className="cursor-pointer w-full bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-bold py-3 px-6 rounded-lg transition-all"
          >
            {t.social.go_to_login}
          </button>
        </div>
      </div>
    )
  }

  // 构建 SocialUser 对象
  const socialUser: SocialUser = {
    id: user.id,
    name: user.name || currentUser?.name || '用户',
    avatar: user.avatar || currentUser?.avatar || null,
    points: user.points || currentUser?.points || 0
  }

  return (
    <div className="h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex flex-col overflow-hidden">
      {/* 顶部导航栏 */}
      <nav className="flex-shrink-0 bg-gray-900/80 backdrop-blur-sm border-b border-gray-800 z-50">
        <div className="px-6 py-3">
          <div className="flex items-center justify-between">
            {/* 左侧 - Logo */}
            <div className="flex items-center gap-8">
              <button
                onClick={() => router.push('/')}
                className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer shrink-0"
              >
                <div className="w-9 h-9 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-white font-bold text-base leading-tight">象素工坊</span>
                  <span className="text-gray-500 text-[10px] font-mono leading-tight">Blog Admin</span>
                </div>
              </button>

              <div className="h-6 w-px bg-gray-800 hidden md:block"></div>

              {/* Portal for Editor Title */}
              <div id="editor-title-portal" className="flex items-center"></div>

              <div className="h-6 w-px bg-gray-800 hidden lg:block"></div>

              {/* Portal for Blog Stats */}
              <div id="editor-stats-portal" className="hidden lg:flex items-center"></div>
            </div>

            {/* 右侧 - 按钮组合 + 用户信息 */}
            <div className="flex items-center gap-6">
              {/* Portal for Editor Actions */}
              <div id="editor-actions-portal" className="flex items-center gap-2"></div>

              <div className="h-6 w-px bg-gray-800 hidden sm:block"></div>

              <div className="flex items-center gap-3">
                <div className="text-right flex flex-col justify-center">
                  <p className="text-xs font-bold text-white tracking-wide">{user.name}</p>
                  <p className="text-[10px] text-yellow-500/80 font-bold uppercase tracking-tighter">
                    {user.points || 0} {t.leftPanel.points}
                  </p>
                </div>
                <UserAvatar
                  userId={user.id}
                  userName={user.name || ''}
                  customAvatar={user.avatar}
                  userAvatar={currentUser?.avatar}
                  size="sm"
                  showStatus={false}
                  className="ring-1 ring-white/10 p-0.5 rounded-full"
                />
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* 主内容区域 - 左右布局 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧 - 博客列表侧边栏 */}
        <BlogSidebar
          key={refreshTrigger}
          user={socialUser}
          selectedBlogId={postId}
          onSelectBlog={handleSelectBlog}
          onNewBlog={handleNewBlog}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />

        {/* 右侧 - 博客编辑器或加载状态 */}
        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center p-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mb-4"></div>
              <p className="text-gray-500 text-sm font-pixel animate-pulse">正在获取文章内容...</p>
            </div>
          ) : error ? (
            <div className="h-full flex flex-col items-center justify-center p-4">
              <div className="bg-red-900/20 border border-red-800/50 rounded-xl p-8 max-w-md text-center shadow-2xl">
                <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/30">
                  <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-red-200 font-bold mb-4">{error}</p>
                <button
                  onClick={() => router.push('/')}
                  className="text-sm text-gray-400 hover:text-white underline cursor-pointer"
                >
                  返回首页
                </button>
              </div>
            </div>
          ) : selectedBlog && (
            <BlogEditor
              key={selectedBlog.id}
              blog={selectedBlog}
              userId={currentUserId || ''}
              onSaved={handleSaved}
              onPublished={handlePublished}
            />
          )}
        </div>
      </div>
    </div>
  )
}

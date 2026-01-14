'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/contexts/UserContext'
import { useCurrentUser } from '@/lib/hooks/useCurrentUser'
import BlogSidebar from '@/components/blog/BlogSidebar'
import BlogEditor from '@/components/blog/BlogEditor'
import UserAvatar from '@/components/UserAvatar'
import { SocialUser } from '@/types/social'
import { useTranslation } from '@/lib/hooks/useTranslation'

interface BlogPost {
  id: string
  title: string
  content: string
  tags: string[]
  coverImage?: string
  isDraft: boolean
}

export default function BlogManagementPage() {
  const router = useRouter()
  const { user } = useUser()
  const { currentUser, userId: currentUserId } = useCurrentUser()
  const { t } = useTranslation()

  const isAuthenticated = !!user

  const [selectedBlog, setSelectedBlog] = useState<BlogPost | null>(null)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isCreatingNew, setIsCreatingNew] = useState(true)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // 处理选择博客
  const handleSelectBlog = (blog: BlogPost) => {
    setSelectedBlog(blog)
    setIsCreatingNew(false)
  }

  // 处理新建博客
  const handleNewBlog = () => {
    setSelectedBlog(null)
    setIsCreatingNew(true)
  }

  // 处理保存后的刷新
  const handleSaved = () => {
    // 触发侧边栏刷新列表
    setRefreshTrigger(prev => prev + 1)
  }

  // 处理发布后
  const handlePublished = (blogId: string) => {
    // 触发侧边栏刷新
    setRefreshTrigger(prev => prev + 1)
    // 可以选择跳转到博客详情页
    // router.push(`/posts/${blogId}`)
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

  // 等待用户数据加载
  if (!currentUser || !currentUserId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
      </div>
    )
  }

  // 构建 SocialUser 对象 - 优先使用 UserContext 的 user 数据
  const socialUser: SocialUser = {
    id: user.id,
    name: user.name || currentUser.name || '用户',
    avatar: user.avatar || currentUser.avatar || null,
    points: user.points || currentUser.points || 0
  }

  return (
    <div className="h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex flex-col overflow-hidden">
      {/* 顶部导航栏 */}
      <nav className="flex-shrink-0 bg-gray-900/80 backdrop-blur-sm border-b border-gray-800 z-50">
        <div className="px-6 py-3">
          <div className="flex items-center justify-between">
            {/* 左侧 - Logo + 动态插入的标题 */}
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
                  userAvatar={currentUser.avatar}
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
          key={refreshTrigger} // 使用 key 强制刷新
          user={socialUser}
          selectedBlogId={selectedBlog?.id}
          onSelectBlog={handleSelectBlog}
          onNewBlog={handleNewBlog}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />

        {/* 右侧 - 博客编辑器 */}
        <div className="flex-1 overflow-hidden">
          <BlogEditor
            key={selectedBlog?.id || 'new'} // 使用 key 在切换博客时重置编辑器
            blog={isCreatingNew ? null : selectedBlog}
            userId={currentUserId}
            onSaved={handleSaved}
            onPublished={handlePublished}
          />
        </div>
      </div>
    </div>
  )
}

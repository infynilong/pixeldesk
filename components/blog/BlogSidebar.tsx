'use client'

import { useState, useEffect } from 'react'
import { SocialUser } from '@/types/social'
import BlogUserProfile from './BlogUserProfile'

interface BlogPost {
  id: string
  title: string
  content: string
  summary?: string
  tags: string[]
  coverImage?: string
  isDraft: boolean
  publishedAt?: string
  createdAt: string
  updatedAt: string
  viewCount: number
  likeCount: number
  replyCount: number
  wordCount?: number
  readTime?: number
}

interface BlogSidebarProps {
  user: SocialUser
  selectedBlogId?: string
  onSelectBlog: (blog: BlogPost) => void
  onNewBlog: () => void
  isCollapsed?: boolean
  onToggleCollapse?: () => void
}

export default function BlogSidebar({
  user,
  selectedBlogId,
  onSelectBlog,
  onNewBlog,
  isCollapsed = false,
  onToggleCollapse
}: BlogSidebarProps) {
  const [blogs, setBlogs] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all')
  const [page, setPage] = useState(1)
  const [stats, setStats] = useState({ total: 0, published: 0, draft: 0 })
  const [pagination, setPagination] = useState({
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false
  })

  // 加载博客列表
  const loadBlogs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        userId: user.id,
        page: page.toString(),
        limit: '10',
        status: statusFilter,
        ...(searchQuery && { search: searchQuery })
      })

      const response = await fetch(`/api/posts/my-blogs?${params}`)
      const data = await response.json()

      if (data.success) {
        setBlogs(data.data.posts)
        setStats(data.data.stats)
        setPagination({
          totalPages: data.data.pagination.totalPages,
          hasNextPage: data.data.pagination.hasNextPage,
          hasPrevPage: data.data.pagination.hasPrevPage
        })
      }
    } catch (error) {
      console.error('Failed to load blogs:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBlogs()
  }, [user.id, page, statusFilter])

  // 搜索处理（防抖）
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1) // 重置页码
      loadBlogs()
    }, 500)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // 格式化时间
  const formatDate = (date: string) => {
    const d = new Date(date)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) return '今天'
    if (days === 1) return '昨天'
    if (days < 7) return `${days}天前`
    return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
  }

  // 收起状态的简化显示
  if (isCollapsed) {
    return (
      <div className="w-16 h-full bg-gray-900/95 backdrop-blur-sm border-r border-gray-800 flex flex-col items-center py-4 gap-4">
        <button
          onClick={onToggleCollapse}
          className="cursor-pointer p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
          title="展开侧边栏"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <button
          onClick={onNewBlog}
          className="cursor-pointer p-2 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 rounded-lg text-white transition-all shadow-lg shadow-cyan-500/20"
          title="新建博客"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>

        <div className="flex-1 flex flex-col gap-2 overflow-y-auto w-full px-2">
          {blogs.slice(0, 5).map((blog) => (
            <button
              key={blog.id}
              onClick={() => onSelectBlog(blog)}
              className={`w-full h-10 rounded-lg transition-colors ${selectedBlogId === blog.id
                  ? 'bg-gradient-to-r from-cyan-600 to-teal-600'
                  : 'bg-gray-800 hover:bg-gray-700'
                }`}
              title={blog.title}
            >
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-xs font-bold">
                  {blog.title.charAt(0).toUpperCase()}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="w-80 h-full bg-gray-900/95 backdrop-blur-sm border-r border-gray-800 flex flex-col">
      {/* 顶部操作栏 */}
      <div className="flex-shrink-0 p-4 border-b border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">我的博客</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={onNewBlog}
              className="cursor-pointer p-2 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 rounded-lg text-white transition-all shadow-lg shadow-cyan-500/20"
              title="新建博客"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
            {onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                className="cursor-pointer p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
                title="收起侧边栏"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* 搜索框 */}
        <div className="relative mb-3">
          <input
            type="text"
            placeholder="搜索博客..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
          />
          <svg
            className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* 状态筛选 */}
        <div className="flex gap-2">
          <button
            onClick={() => setStatusFilter('all')}
            className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFilter === 'all'
                ? 'bg-gray-700 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
          >
            全部 ({stats.total})
          </button>
          <button
            onClick={() => setStatusFilter('published')}
            className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFilter === 'published'
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
          >
            已发布 ({stats.published})
          </button>
          <button
            onClick={() => setStatusFilter('draft')}
            className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFilter === 'draft'
                ? 'bg-amber-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
          >
            草稿 ({stats.draft})
          </button>
        </div>
      </div>

      {/* 用户信息 */}
      <div className="flex-shrink-0 border-b border-gray-800">
        <BlogUserProfile user={user} stats={stats} />
      </div>

      {/* 博客列表 */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-teal-500 rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        ) : blogs.length === 0 ? (
          <div className="text-center py-8 px-4">
            <svg className="w-12 h-12 text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-400 text-sm">
              {searchQuery ? '未找到匹配的博客' : '还没有博客'}
            </p>
            <button
              onClick={onNewBlog}
              className="cursor-pointer mt-3 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              创建第一篇博客
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-800/50">
            {blogs.map((blog) => (
              <button
                key={blog.id}
                onClick={() => onSelectBlog(blog)}
                className={`w-full text-left p-4 transition-all cursor-pointer ${selectedBlogId === blog.id
                    ? 'bg-gradient-to-r from-cyan-600/20 to-teal-600/20 border-l-4 border-cyan-500'
                    : 'hover:bg-gray-800/50'
                  }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-medium text-white text-sm line-clamp-1 flex-1">
                    {blog.title || '无标题'}
                  </h3>
                  {blog.isDraft && (
                    <span className="flex-shrink-0 px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded">
                      草稿
                    </span>
                  )}
                </div>

                {blog.summary && (
                  <p className="text-xs text-gray-400 line-clamp-2 mb-2">
                    {blog.summary}
                  </p>
                )}

                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{formatDate(blog.updatedAt)}</span>
                  <div className="flex items-center gap-3">
                    {blog.wordCount && (
                      <span>{blog.wordCount} 字</span>
                    )}
                    {!blog.isDraft && (
                      <>
                        <span>{blog.viewCount} 阅读</span>
                        <span>{blog.likeCount} 赞</span>
                      </>
                    )}
                  </div>
                </div>

                {blog.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {blog.tags.slice(0, 3).map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 bg-gray-800 text-gray-400 text-xs rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 分页控制 */}
      {pagination.totalPages > 1 && (
        <div className="flex-shrink-0 p-4 border-t border-gray-800">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={!pagination.hasPrevPage}
              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm transition-colors"
            >
              上一页
            </button>
            <span className="text-sm text-gray-400">
              第 {page} / {pagination.totalPages} 页
            </span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={!pagination.hasNextPage}
              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm transition-colors"
            >
              下一页
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

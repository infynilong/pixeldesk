'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useCurrentUser } from '@/lib/hooks/useCurrentUser'
import PostListItem from '@/components/PostListItem'
import LoadingSpinner from '@/components/LoadingSpinner'
import UserAvatar from '@/components/UserAvatar'

interface Post {
  id: string
  title: string | null
  content: string
  type: 'TEXT' | 'IMAGE' | 'MIXED' | 'MARKDOWN'
  createdAt: string
  updatedAt: string
  isPublic: boolean
  likeCount: number
  replyCount: number
  viewCount: number
  isLiked: boolean
  tags?: string[]
  summary?: string | null
  coverImage?: string | null
  readTime?: number
  author: {
    id: string
    name: string
    avatar: string | null
  }
}

interface Pagination {
  page: number
  limit: number
  totalCount: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export default function UserBlogsPage() {
  const params = useParams()
  const router = useRouter()
  const userId = params.userId as string
  const { currentUser, userId: currentUserId } = useCurrentUser()

  const [blogs, setBlogs] = useState<Post[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    if (userId) {
      fetchBlogs(currentPage)
    }
  }, [userId, currentUserId, currentPage])

  const fetchBlogs = async (page: number) => {
    try {
      setIsLoading(true)
      setError(null)

      const url = currentUserId
        ? `/api/profile/${userId}/blogs?currentUserId=${currentUserId}&page=${page}&limit=20`
        : `/api/profile/${userId}/blogs?page=${page}&limit=20`

      const response = await fetch(url)
      const data = await response.json()

      if (data.success) {
        setBlogs(data.data.blogs)
        setPagination(data.data.pagination)
      } else {
        setError(data.error || '加载博客失败')
      }
    } catch (err) {
      console.error('Error fetching blogs:', err)
      setError('加载博客失败')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLikePost = async (postId: string) => {
    if (!currentUserId) return

    try {
      const response = await fetch(`/api/posts/${postId}/like?userId=${currentUserId}`, {
        method: 'POST'
      })
      const data = await response.json()

      if (data.success) {
        setBlogs(blogs.map(blog => {
          if (blog.id === postId) {
            return {
              ...blog,
              isLiked: data.data.liked,
              likeCount: data.data.likeCount
            }
          }
          return blog
        }))
      }
    } catch (err) {
      console.error('Error liking post:', err)
    }
  }

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (isLoading && blogs.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      {/* 头部导航 */}
      <header className="bg-gray-900/80 backdrop-blur-sm border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          {/* Logo */}
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-white font-bold text-lg">PixelDesk</span>
              <span className="text-gray-400 text-xs font-mono">Social Platform</span>
            </div>
          </button>

          <div className="flex items-center gap-3">
            {blogs[0]?.author && (
              <>
                <UserAvatar
                  userId={blogs[0].author.id}
                  userName={blogs[0].author.name}
                  userAvatar={blogs[0].author.avatar}
                  size="sm"
                  showStatus={false}
                />
                <div>
                  <div className="text-white font-medium text-sm">{blogs[0].author.name}</div>
                  <div className="text-gray-400 text-xs font-mono">的博客</div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* 标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <svg className="w-8 h-8 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            所有博客
          </h1>
          {pagination && (
            <p className="text-gray-400 text-sm font-mono">
              共 {pagination.totalCount} 篇博客
            </p>
          )}
        </div>

        {/* 博客列表 */}
        {error ? (
          <div className="bg-gray-900 border border-red-800/50 rounded-xl p-8 text-center">
            <div className="w-16 h-16 bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-white mb-2">加载失败</h3>
            <p className="text-gray-400">{error}</p>
          </div>
        ) : blogs.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-16 text-center">
            <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="text-xl font-medium text-gray-300 mb-2">暂无博客</h3>
            <p className="text-gray-500">还没有发布任何博客</p>
          </div>
        ) : (
          <>
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              {blogs.map(blog => (
                <PostListItem
                  key={blog.id}
                  post={blog}
                  currentUserId={currentUserId || ''}
                  onLike={() => handleLikePost(blog.id)}
                  isAuthenticated={!!currentUserId}
                />
              ))}
            </div>

            {/* 分页控制 */}
            {pagination && pagination.totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={!pagination.hasPrevPage || isLoading}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-900 disabled:text-gray-600 text-white rounded-lg transition-all disabled:cursor-not-allowed border border-gray-700 disabled:border-gray-800"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                <div className="flex items-center gap-2">
                  {[...Array(pagination.totalPages)].map((_, index) => {
                    const pageNum = index + 1
                    // 只显示当前页附近的页码
                    if (
                      pageNum === 1 ||
                      pageNum === pagination.totalPages ||
                      (pageNum >= currentPage - 2 && pageNum <= currentPage + 2)
                    ) {
                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          disabled={isLoading}
                          className={`w-10 h-10 rounded-lg font-medium transition-all ${
                            currentPage === pageNum
                              ? 'bg-gradient-to-r from-cyan-600 to-teal-600 text-white'
                              : 'bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700'
                          }`}
                        >
                          {pageNum}
                        </button>
                      )
                    } else if (
                      pageNum === currentPage - 3 ||
                      pageNum === currentPage + 3
                    ) {
                      return <span key={pageNum} className="text-gray-600">...</span>
                    }
                    return null
                  })}
                </div>

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={!pagination.hasNextPage || isLoading}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-900 disabled:text-gray-600 text-white rounded-lg transition-all disabled:cursor-not-allowed border border-gray-700 disabled:border-gray-800"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

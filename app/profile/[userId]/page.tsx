'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useCurrentUser } from '@/lib/hooks/useCurrentUser'
import UserAvatar from '@/components/UserAvatar'
import PostListItem from '@/components/PostListItem'
import LoadingSpinner from '@/components/LoadingSpinner'
import Link from 'next/link'

interface UserProfile {
  id: string
  name: string
  avatar: string | null
  email: string | null
  createdAt: string
  points: number
  gold: number
  postsCount: number
  likesCount: number
}

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

export default function ProfilePage() {
  const params = useParams()
  const router = useRouter()
  const userId = params.userId as string
  const { currentUser, userId: currentUserId } = useCurrentUser()

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [blogs, setBlogs] = useState<Post[]>([])
  const [totalBlogs, setTotalBlogs] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'posts' | 'blogs'>('posts')

  const isOwnProfile = currentUserId === userId

  useEffect(() => {
    if (userId) {
      fetchProfile()
    }
  }, [userId, currentUserId])

  const fetchProfile = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const url = currentUserId
        ? `/api/profile/${userId}?currentUserId=${currentUserId}`
        : `/api/profile/${userId}`

      const response = await fetch(url)
      const data = await response.json()

      if (data.success) {
        setProfile(data.data.user)
        setPosts(data.data.posts)
        setBlogs(data.data.blogs)
        setTotalBlogs(data.data.totalBlogs)
      } else {
        setError(data.error || '加载用户信息失败')
      }
    } catch (err) {
      console.error('Error fetching profile:', err)
      setError('加载用户信息失败')
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
        // 更新帖子列表中的点赞状态
        const updatePostLike = (post: Post) => {
          if (post.id === postId) {
            return {
              ...post,
              isLiked: data.data.liked,
              likeCount: data.data.likeCount
            }
          }
          return post
        }

        setPosts(posts.map(updatePostLike))
        setBlogs(blogs.map(updatePostLike))
      }
    } catch (err) {
      console.error('Error liking post:', err)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
        <div className="bg-gray-900 border border-red-800/50 rounded-xl p-8 max-w-md w-full">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-red-900/30 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white">加载失败</h2>
            <p className="text-gray-400">{error || '用户不存在'}</p>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-2 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white rounded-lg transition-all"
            >
              返回首页
            </button>
          </div>
        </div>
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

          {isOwnProfile && (
            <Link
              href="/settings"
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white rounded-lg transition-all text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              设置
            </Link>
          )}
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* 用户信息卡片 */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl p-8 mb-8 shadow-xl">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            {/* 头像 */}
            <div className="flex-shrink-0">
              <UserAvatar
                userId={profile.id}
                userName={profile.name}
                userAvatar={profile.avatar}
                size="xl"
                showStatus={false}
                className="ring-4 ring-cyan-500/30"
              />
            </div>

            {/* 用户信息 */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl font-bold text-white mb-2">{profile.name}</h1>
              <p className="text-gray-400 text-sm mb-4">加入于 {formatDate(profile.createdAt)}</p>

              {/* 统计数据 */}
              <div className="flex flex-wrap justify-center md:justify-start gap-6 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent">
                    {profile.postsCount}
                  </div>
                  <div className="text-gray-400 text-xs font-mono">帖子</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent">
                    {totalBlogs}
                  </div>
                  <div className="text-gray-400 text-xs font-mono">博客</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
                    {profile.likesCount}
                  </div>
                  <div className="text-gray-400 text-xs font-mono">获赞</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">
                    {profile.points}
                  </div>
                  <div className="text-gray-400 text-xs font-mono">积分</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 标签页切换 */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden mb-6">
          <div className="flex border-b border-gray-800">
            <button
              onClick={() => setActiveTab('posts')}
              className={`flex-1 px-6 py-4 font-medium transition-all relative ${
                activeTab === 'posts'
                  ? 'text-cyan-400 bg-gray-800/50'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/30'
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                动态
                <span className="text-xs">({posts.length})</span>
              </span>
              {activeTab === 'posts' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-500 to-teal-500"></div>
              )}
            </button>

            <button
              onClick={() => setActiveTab('blogs')}
              className={`flex-1 px-6 py-4 font-medium transition-all relative ${
                activeTab === 'blogs'
                  ? 'text-cyan-400 bg-gray-800/50'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/30'
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                博客
                <span className="text-xs">({totalBlogs})</span>
              </span>
              {activeTab === 'blogs' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-500 to-teal-500"></div>
              )}
            </button>
          </div>

          {/* 内容区域 */}
          <div className="min-h-[400px]">
            {activeTab === 'posts' && (
              <div>
                {posts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4">
                      <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-300 mb-2">暂无动态</h3>
                    <p className="text-gray-500 text-sm">还没有发布任何动态</p>
                  </div>
                ) : (
                  posts.map(post => (
                    <PostListItem
                      key={post.id}
                      post={post}
                      currentUserId={currentUserId || ''}
                      onLike={() => handleLikePost(post.id)}
                      isAuthenticated={!!currentUserId}
                    />
                  ))
                )}
              </div>
            )}

            {activeTab === 'blogs' && (
              <div>
                {blogs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4">
                      <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-300 mb-2">暂无博客</h3>
                    <p className="text-gray-500 text-sm">还没有发布任何博客</p>
                  </div>
                ) : (
                  <>
                    {blogs.map(blog => (
                      <PostListItem
                        key={blog.id}
                        post={blog}
                        currentUserId={currentUserId || ''}
                        onLike={() => handleLikePost(blog.id)}
                        isAuthenticated={!!currentUserId}
                      />
                    ))}

                    {totalBlogs > blogs.length && (
                      <div className="p-6 text-center border-t border-gray-800">
                        <Link
                          href={`/profile/${userId}/blogs`}
                          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white rounded-lg transition-all font-medium"
                        >
                          查看全部博客
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

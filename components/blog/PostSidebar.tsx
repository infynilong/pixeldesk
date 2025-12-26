'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Post } from '@/types/social'

interface PostSidebarProps {
  currentPostId?: string
  currentUserId?: string
}

export default function PostSidebar({ currentPostId, currentUserId }: PostSidebarProps) {
  const [trendingPosts, setTrendingPosts] = useState<Post[]>([])
  const [latestPosts, setLatestPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const loadedRef = useRef(false) // 防止重复加载

  useEffect(() => {
    // 防止重复加载（React Strict Mode 会导致组件挂载两次）
    if (loadedRef.current) return
    loadedRef.current = true

    const loadPosts = async () => {
      try {
        setIsLoading(true)

        // 并行加载热门和最新文章
        const [trendingRes, latestRes] = await Promise.all([
          fetch(`/api/posts?type=MARKDOWN&sortBy=trending&limit=5${currentUserId ? `&userId=${currentUserId}` : ''}`),
          fetch(`/api/posts?type=MARKDOWN&sortBy=latest&limit=5${currentUserId ? `&userId=${currentUserId}` : ''}`)
        ])

        // 处理热门文章响应
        if (trendingRes.ok) {
          const trendingData = await trendingRes.json()
          if (trendingData.success) {
            setTrendingPosts(trendingData.data.posts.filter((p: Post) => p.id !== currentPostId))
          }
        }

        // 处理最新文章响应
        if (latestRes.ok) {
          const latestData = await latestRes.json()
          if (latestData.success) {
            setLatestPosts(latestData.data.posts.filter((p: Post) => p.id !== currentPostId))
          }
        }
      } catch (error) {
        console.error('Failed to load posts:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadPosts()
  }, [currentPostId, currentUserId])

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

  return (
    <div className="space-y-6">
      {/* 热门文章 */}
      <div className="bg-gray-900/80 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-gradient-to-r from-orange-600/20 to-red-600/20 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <h3 className="text-sm font-bold text-gray-200">热门文章</h3>
          </div>
        </div>

        <div className="p-3">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-gray-800/50 rounded animate-pulse" />
              ))}
            </div>
          ) : trendingPosts.length > 0 ? (
            <div className="space-y-2">
              {trendingPosts.slice(0, 5).map((post, index) => (
                <Link
                  key={post.id}
                  href={`/posts/${post.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 bg-gray-800/30 hover:bg-gray-800/50 border border-gray-800/50 hover:border-orange-500/30 rounded-lg transition-all group"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-gradient-to-br from-orange-500 to-red-500 rounded text-white text-xs font-bold flex items-center justify-center">
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-200 group-hover:text-orange-400 transition-colors line-clamp-2 mb-1">
                        {post.title || post.content.slice(0, 50)}
                      </h4>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          {post.viewCount}
                        </span>
                        <span className="flex items-center gap-1">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                          </svg>
                          {post.likeCount}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 text-sm py-4">暂无热门文章</p>
          )}
        </div>
      </div>

      {/* 最新文章 */}
      <div className="bg-gray-900/80 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-gradient-to-r from-cyan-600/20 to-blue-600/20 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-sm font-bold text-gray-200">最新文章</h3>
          </div>
        </div>

        <div className="p-3">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-gray-800/50 rounded animate-pulse" />
              ))}
            </div>
          ) : latestPosts.length > 0 ? (
            <div className="space-y-2">
              {latestPosts.slice(0, 5).map((post) => (
                <Link
                  key={post.id}
                  href={`/posts/${post.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 bg-gray-800/30 hover:bg-gray-800/50 border border-gray-800/50 hover:border-cyan-500/30 rounded-lg transition-all group"
                >
                  <h4 className="text-sm font-medium text-gray-200 group-hover:text-cyan-400 transition-colors line-clamp-2 mb-1">
                    {post.title || post.content.slice(0, 50)}
                  </h4>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>{formatTimeAgo(post.createdAt)}</span>
                    <span className="flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      {post.viewCount}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 text-sm py-4">暂无最新文章</p>
          )}
        </div>
      </div>

      {/* 像素工位地图预览 - 核心功能展示 */}
      <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 border-2 border-purple-500/30 rounded-xl overflow-hidden shadow-lg shadow-purple-500/10">
        <div className="px-4 py-3 bg-gradient-to-r from-purple-600/30 to-pink-600/30 border-b border-purple-500/30">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <h3 className="text-sm font-bold text-gray-200">返回工位地图</h3>
          </div>
        </div>

        <div className="p-4">
          <div className="mb-3">
            <p className="text-xs text-gray-400 mb-3 leading-relaxed">
              PixelDesk的核心功能是像素工位地图！在这里，您可以实时看到同事们的工作状态，进行即时互动。
            </p>

            {/* 地图预览图 */}
            <Link href="/" className="block">
              <div className="relative aspect-video bg-gray-800 rounded-lg overflow-hidden border border-purple-500/20 mb-3 group cursor-pointer">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 to-pink-600/5" />

                {/* 模拟的工位地图预览 */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <svg className="w-12 h-12 text-purple-400 mx-auto mb-2 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                    <p className="text-xs text-gray-400 font-mono">点击进入像素工位</p>
                  </div>
                </div>

                {/* 在线状态指示器 */}
                <div className="absolute top-2 left-2 flex items-center gap-2 px-2 py-1 bg-black/50 backdrop-blur-sm rounded">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                  <span className="text-xs text-emerald-400 font-mono">ONLINE</span>
                </div>

                {/* 装饰性像素点 */}
                <div className="absolute top-4 right-4 grid grid-cols-3 gap-1">
                  {[...Array(9)].map((_, i) => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 bg-purple-400/30 rounded-sm"
                      style={{
                        animationDelay: `${i * 0.1}s`,
                        animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                      }}
                    />
                  ))}
                </div>
              </div>
            </Link>
          </div>

          {/* CTA按钮 */}
          <Link
            href="/"
            className="block w-full text-center py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-lg transition-all shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="text-sm">返回工位地图</span>
            </div>
          </Link>

          {/* 特色功能列表 */}
          <div className="mt-3 pt-3 border-t border-purple-500/20">
            <div className="space-y-2 text-xs text-gray-400">
              <div className="flex items-center gap-2">
                <svg className="w-3 h-3 text-purple-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>实时查看同事工作状态</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-3 h-3 text-purple-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>像素风格的虚拟办公室</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-3 h-3 text-purple-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>绑定专属工位，快速定位</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Post } from '@/types/social'

interface PostSidebarProps {
  currentPostId?: string
  currentUserId?: string
  theme?: 'light' | 'dark'
}

export default function PostSidebar({ currentPostId, currentUserId, theme = 'dark' }: PostSidebarProps) {
  const [trendingPosts, setTrendingPosts] = useState<Post[]>([])
  const [latestPosts, setLatestPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const loadedRef = useRef<string | false>(false) // 防止重复加载

  useEffect(() => {
    // 只有当有文章ID时才加载
    if (!currentPostId) return;

    // 如果已经加载过当前文章的侧边栏，不再重复加载
    if (loadedRef.current === currentPostId) return;

    // 延迟加载侧边栏内容，优先保障主体内容展示
    const timer = setTimeout(() => {
      loadPosts();
      loadedRef.current = currentPostId;
    }, 2000); // 增加到 2 秒延迟，确保主体绝对优先

    const loadPosts = async () => {
      try {
        setIsLoading(true);
        console.log('🚀 [PostSidebar] 延时加载侧边栏数据...');

        // 并行获取数据，减少请求次数
        const baseUrl = `/api/posts?type=MARKDOWN&limit=5${currentUserId ? `&userId=${currentUserId}` : ''}`;
        const [trendingRes, latestRes] = await Promise.all([
          fetch(`${baseUrl}&sortBy=trending`),
          fetch(`${baseUrl}&sortBy=latest`)
        ]);

        // ... 处理响应 (保持原逻辑)
        if (trendingRes.ok) {
          const trendingData = await trendingRes.json();
          if (trendingData.success) {
            setTrendingPosts(trendingData.data.posts.filter((p: Post) => p.id !== currentPostId));
          }
        }

        if (latestRes.ok) {
          const latestData = await latestRes.json();
          if (latestData.success) {
            setLatestPosts(latestData.data.posts.filter((p: Post) => p.id !== currentPostId));
          }
        }
      } catch (error) {
        console.error('Failed to load posts:', error);
      } finally {
        setIsLoading(false);
      }
    };

    return () => clearTimeout(timer);
  }, [currentPostId, currentUserId]);

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
    <div className="space-y-8">
      {/* 热门文章 - 极简主义设计 */}
      <div className={`backdrop-blur-md border rounded-2xl overflow-hidden transition-all ${theme === 'dark' ? 'bg-[#1a1c1e]/40 border-white/5 hover:bg-[#1a1c1e]/60' : 'bg-white border-slate-200 shadow-sm hover:shadow-md'
        }`}>
        <div className={`px-5 py-4 border-b flex items-center justify-between ${theme === 'dark' ? 'border-white/5' : 'border-slate-100'
          }`}>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-orange-500/70" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <h3 className={`text-xs font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-gray-400' : 'text-slate-400'}`}>Trending</h3>
          </div>
        </div>

        <div className="p-3">
          {isLoading ? (
            <div className="space-y-3 p-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-12 bg-white/5 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : trendingPosts.length > 0 ? (
            <div className="space-y-1">
              {trendingPosts.slice(0, 5).map((post, index) => (
                <Link
                  key={post.id}
                  href={`/posts/${post.id}`}
                  className={`flex items-center gap-4 p-3 rounded-xl transition-all group ${theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-slate-50'
                    }`}
                >
                  <span className={`text-lg font-black transition-colors w-4 italic ${theme === 'dark' ? 'text-white/10 group-hover:text-orange-500/20' : 'text-slate-100 group-hover:text-orange-500/10'
                    }`}>
                    0{index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h4 className={`text-sm font-medium transition-colors line-clamp-1 mb-1 ${theme === 'dark' ? 'text-gray-300 group-hover:text-white' : 'text-slate-600 group-hover:text-black'
                      }`}>
                      {post.title || post.content.slice(0, 40)}
                    </h4>
                    <div className="flex items-center gap-3 text-[10px] font-mono text-gray-600">
                      <span className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        {post.viewCount}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-600 text-[10px] font-mono py-8 uppercase tracking-tighter">No trending posts</p>
          )}
        </div>
      </div>

      {/* 最新文章 */}
      <div className={`backdrop-blur-md border rounded-2xl overflow-hidden transition-all duration-500 ${theme === 'dark' ? 'bg-[#1a1c1e]/40 border-white/5' : 'bg-white border-slate-200 shadow-sm'
        }`}>
        <div className={`px-5 py-4 border-b ${theme === 'dark' ? 'border-white/5' : 'border-slate-100'}`}>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-cyan-500/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className={`text-xs font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-gray-400' : 'text-slate-400'}`}>Latest</h3>
          </div>
        </div>

        <div className="p-3">
          {isLoading ? (
            <div className="space-y-3 p-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-12 bg-white/5 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : latestPosts.length > 0 ? (
            <div className="space-y-1">
              {latestPosts.slice(0, 5).map((post) => (
                <Link
                  key={post.id}
                  href={`/posts/${post.id}`}
                  className={`block p-3 rounded-xl transition-all group ${theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-slate-50'
                    }`}
                >
                  <h4 className={`text-sm font-medium transition-colors line-clamp-1 mb-1 ${theme === 'dark' ? 'text-gray-300 group-hover:text-white' : 'text-slate-600 group-hover:text-black'
                    }`}>
                    {post.title || post.content.slice(0, 40)}
                  </h4>
                  <div className="flex items-center gap-3 text-[10px] font-mono text-gray-600 uppercase">
                    <span>{formatTimeAgo(post.createdAt)}</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-600 text-[10px] font-mono py-8 uppercase tracking-tighter">No recent updates</p>
          )}
        </div>
      </div>

      {/* 返回工位地图 (极简形态) */}
      <div className={`backdrop-blur-xl border rounded-3xl p-6 transition-all duration-500 ${theme === 'dark' ? 'bg-[#1a1c1e]/60 border-white/10 hover:border-white/20' : 'bg-white border-slate-200 shadow-md hover:shadow-lg'
        }`}>
        <div className="flex flex-col items-center text-center">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-transform group hover:scale-110 ${theme === 'dark' ? 'bg-white/5' : 'bg-slate-50 border border-slate-100'
            }`}>
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </div>

          <h3 className={`text-sm font-bold mb-2 underline underline-offset-4 ${theme === 'dark' ? 'text-white decoration-gray-500' : 'text-slate-900 decoration-slate-300'
            }`}>Pixel Workspace</h3>
          <p className={`text-[10px] font-mono mb-6 uppercase tracking-wider leading-relaxed ${theme === 'dark' ? 'text-gray-500' : 'text-slate-400'
            }`}>
            Realtime colleague status & interaction.
          </p>

          <Link
            href="/"
            className={`w-full flex items-center justify-center gap-2 py-3 font-black text-xs uppercase rounded-xl transition-all active:scale-95 shadow-lg ${theme === 'dark' ? 'bg-white text-black hover:bg-gray-200 shadow-white/5' : 'bg-slate-900 text-white hover:bg-black shadow-slate-200'
              }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Go Back
          </Link>

          <div className="mt-6 flex items-center gap-2 opacity-30 grayscale">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-[8px] font-mono text-white uppercase tracking-tighter">Live Systems Nominal</span>
          </div>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Post } from '@/types/social'
import { useCurrentUser } from '@/lib/hooks/useCurrentUser'
import { useUser } from '@/contexts/UserContext'
import { usePostReplies } from '@/lib/hooks/usePostReplies'
import { useBrandConfig } from '@/lib/hooks/useBrandConfig'
import UserAvatar from '@/components/UserAvatar'
import CreateReplyForm from '@/components/CreateReplyForm'
import MarkdownRenderer from '@/components/MarkdownRenderer'
import PostSidebar from '@/components/blog/PostSidebar'
import Link from 'next/link'
import { useTranslation } from '@/lib/hooks/useTranslation'
import BillboardConfirmModal from '@/components/billboard/BillboardConfirmModal'
import { renderContentWithUrls } from '@/lib/utils/format'
import { getAssetUrl, isExternalUrl } from '@/lib/utils/assets'
import Image from 'next/image'
import ProBadge from '@/components/social/ProBadge'

interface PostDetailClientProps {
  initialPost: Post
  billboardPromotionCost: number
}

export default function PostDetailClient({ initialPost, billboardPromotionCost }: PostDetailClientProps) {
  const router = useRouter()
  const { userId: currentUserId } = useCurrentUser()
  const { user } = useUser()
  const { config: brandConfig, isLoading: isBrandLoading } = useBrandConfig('zh-CN')

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
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxImageIndex, setLightboxImageIndex] = useState(0)

  // 使用回复hook来管理回复数据
  const {
    replies,
    isLoading: isLoadingReplies,
    isCreatingReply,
    error: repliesError,
    pagination: repliesPagination,
    createReply,
    loadMoreReplies,
    fetchReplies // Added fetchReplies here
  } = usePostReplies({
    postId: post.id,
    userId: currentUserId || '',
    autoFetch: false // 🔧 关键：改为手动控制加载时机
  })

  // 延迟加载回复列表，优化初始渲染性能
  useEffect(() => {
    if (post.id) {
      const timer = setTimeout(() => {
        console.log('💬 [PostDetail] 开始延迟加载评论区...');
        fetchReplies();
      }, 800); // 延迟 800ms，在正文展示后加载
      return () => clearTimeout(timer);
    }
  }, [post.id, fetchReplies]);

  const [isPromoting, setIsPromoting] = useState(false)
  const [showPromoteModal, setShowPromoteModal] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const { t, locale } = useTranslation()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchInput.trim()) {
      router.push(`/posts/search?q=${encodeURIComponent(searchInput.trim())}`)
    }
  }

  // 处理点赞
  const handleLike = async () => {
    // 检查登录状态
    if (!isAuthenticated) {
      setShowLoginPrompt(true)
      return
    }

    if (isLiking) return
    setIsLiking(true)
    try {
      const res = await fetch(`/api/posts/${post.id}/like`, {
        method: 'POST'
      })
      const result = await res.json()
      if (result.success) {
        setPost(prev => ({
          ...prev,
          isLiked: result.isLiked,
          likeCount: result.likeCount
        }))
      }
    } catch (error) {
      console.error('Like failed:', error)
    } finally {
      setIsLiking(false)
    }
  }

  const handlePromote = () => {
    // 检查登录状态
    if (!isAuthenticated) {
      setShowLoginPrompt(true)
      return
    }

    if (isPromoting) return
    setShowPromoteModal(true)
  }

  const handleConfirmPromote = async () => {
    setIsPromoting(true)
    try {
      const res = await fetch(`/api/posts/${post.id}/promote`, {
        method: 'POST'
      })
      const result = await res.json()
      if (result.success) {
        alert(t.billboard.push_success)
        setShowPromoteModal(false)
        setPost(prev => ({ ...prev, promotionCount: (prev.promotionCount || 0) + 1 }))
      } else {
        alert(result.error || t.billboard.push_failed)
      }
    } catch (error) {
      console.error('Promotion failed:', error)
      alert(t.billboard.push_failed)
    } finally {
      setIsPromoting(false)
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

    if (diffInSeconds < 60) return t.social.time_just_now || '刚刚'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}${t.social.time_minutes_ago || '分钟前'}`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}${t.social.time_hours_ago || '小时前'}`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}${t.social.time_days_ago || '天前'}`

    return date.toLocaleDateString(locale === 'en' ? 'en-US' : 'zh-CN')
  }

  // 提取所有图片（包括 post.imageUrl, post.imageUrls 和正文中的图片链接）
  const allPostImages = useMemo(() => {
    const urls: string[] = []

    // 1. 添加主图和多图
    if (post.imageUrls && post.imageUrls.length > 0) {
      urls.push(...post.imageUrls)
    } else if (post.imageUrl) {
      urls.push(post.imageUrl)
    }

    // 2. 提取正文内容中的图片
    if (post.type !== 'MARKDOWN') {
      const { extractImageUrls } = require('@/lib/utils/format')
      const contentImages = extractImageUrls(post.content)
      contentImages.forEach((img: string) => {
        if (!urls.includes(img)) {
          urls.push(img)
        }
      })
    }

    return urls
  }, [post.imageUrl, post.imageUrls, post.content, post.type])

  // 检查是否是作者
  const isAuthor = currentUserId === post.author.id

  // 打开图片lightbox
  const openLightbox = (index: number) => {
    setLightboxImageIndex(index)
    setLightboxOpen(true)
  }

  // 关闭lightbox
  const closeLightbox = () => {
    setLightboxOpen(false)
  }

  // 下一张图片
  const nextImage = () => {
    if (allPostImages.length > 0) {
      setLightboxImageIndex((prev) => (prev + 1) % allPostImages.length)
    }
  }

  // 上一张图片
  const prevImage = () => {
    if (allPostImages.length > 0) {
      setLightboxImageIndex((prev) => (prev - 1 + allPostImages.length) % allPostImages.length)
    }
  }

  // 键盘事件处理
  useEffect(() => {
    if (!lightboxOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeLightbox()
      } else if (e.key === 'ArrowLeft') {
        prevImage()
      } else if (e.key === 'ArrowRight') {
        nextImage()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [lightboxOpen, allPostImages])

  return (
    <div className={`min-h-screen transition-colors duration-500 ${theme === 'dark' ? 'bg-gray-950' : 'bg-slate-50'} relative`}>
      {/* 动态背景装饰 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-20 -left-20 w-96 h-96 ${theme === 'dark' ? 'bg-purple-600/10' : 'bg-purple-600/5'} rounded-full blur-3xl`} />
        <div className={`absolute top-40 right-20 w-80 h-80 ${theme === 'dark' ? 'bg-cyan-600/10' : 'bg-cyan-600/5'} rounded-full blur-3xl`} />
        <div className={`absolute bottom-40 left-1/3 w-96 h-96 ${theme === 'dark' ? 'bg-pink-600/8' : 'bg-pink-600/5'} rounded-full blur-3xl`} />
        <div className={`absolute inset-0 ${theme === 'dark' ? 'bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)]' : 'bg-[linear-gradient(to_right,#e2e8f080_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f080_1px,transparent_1px)]'} bg-[size:32px_32px]`} />
      </div>

      {/* 登录提示模态框 */}
      {showLoginPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-xl p-6 max-w-md mx-4 shadow-2xl">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-gradient-to-br from-cyan-600 to-teal-600 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-cyan-500/20">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">需要登录</h3>
                <p className="text-gray-300 text-sm">请先登录后再进行操作</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowLoginPrompt(false)} className="cursor-pointer flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg border border-gray-600 text-sm transition-all">取消</button>
                <button onClick={() => { setShowLoginPrompt(false); router.push('/'); }} className="cursor-pointer flex-1 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-bold py-2 px-4 rounded-lg text-sm transition-all">前往登录</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 导航栏 */}
      <nav className={`sticky top-0 z-50 backdrop-blur-md border-b transition-colors duration-500 ${theme === 'dark' ? 'bg-gray-900/80 border-gray-800' : 'bg-white/80 border-gray-200'}`}>
        <div className="max-w-7xl mx-auto px-4 py-2">
          <div className="flex items-center justify-between gap-4">
            <button onClick={() => router.push('/')} className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer shrink-0">
              {isBrandLoading ? <div className="w-8 h-8 bg-gray-700 rounded-lg animate-pulse"></div> : <img src={brandConfig.app_logo} alt={brandConfig.app_name} className="w-8 h-8 rounded-lg object-cover" />}
              <span className={`font-bold text-base transition-colors hidden md:block ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{isBrandLoading ? '加载中...' : brandConfig.app_name}</span>
            </button>

            {/* Header Search Bar */}
            <form onSubmit={handleSearch} className="flex-1 max-w-xl relative group">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={t.social.blog_search_placeholder}
                className={`w-full h-9 pl-10 pr-4 rounded-xl border transition-all text-xs outline-none ${theme === 'dark'
                  ? 'bg-gray-800/50 border-gray-700 text-white focus:bg-gray-800 focus:border-cyan-500/50'
                  : 'bg-slate-100 border-slate-200 text-slate-900 focus:bg-white focus:border-cyan-300'
                  }`}
              />
              <svg
                className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 transition-colors ${theme === 'dark' ? 'text-gray-500 group-focus-within:text-cyan-400' : 'text-slate-400 group-focus-within:text-cyan-500'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </form>

            <div className="flex items-center space-x-2 shrink-0">
              <button
                onClick={toggleTheme}
                className={`p-1.5 rounded-lg border transition-all ${theme === 'dark'
                  ? 'bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white border-gray-700'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 border-slate-200'
                  }`}
              >
                {theme === 'dark' ? (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" /></svg>
                ) : (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" /></svg>
                )}
              </button>
              {isAuthor && (
                <button
                  onClick={() => router.push(`/posts/${post.id}/edit`)}
                  className={`cursor-pointer px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${theme === 'dark'
                    ? 'bg-gray-800 hover:bg-gray-700 text-cyan-400 border-gray-700 hover:border-cyan-500/50'
                    : 'bg-white hover:bg-slate-50 text-cyan-600 border-slate-200 hover:border-cyan-300'
                    }`}
                >
                  编辑
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* 主要内容 */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          <div className="flex-1 min-w-0 w-full flex flex-col gap-1">
            {/* 帖子主体 - 气泡首句 */}
            <article className={`backdrop-blur-xl border rounded-t-3xl overflow-hidden shadow-2xl transition-all duration-500 ${theme === 'dark' ? 'bg-[#1a1c1e]/80 border-white/5' : 'bg-white border-slate-200'
              }`}>
              <div className="p-8 pb-4">
                <header className="flex items-center space-x-4 mb-6">
                  <div className="relative">
                    <UserAvatar userId={post.author.id} userName={post.author.name} userAvatar={post.author.avatar} size="xl" showStatus={true} />
                    <div className={`absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-4 rounded-full ${theme === 'dark' ? 'border-[#1a1c1e]' : 'border-white'
                      }`}></div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Link href={`/profile/${post.author.id}`} className={`font-black hover:text-cyan-400 text-xl tracking-tight transition-colors flex items-center ${theme === 'dark' ? 'text-white' : 'text-slate-900'
                        }`}>
                        {post.author.name}
                        {post.author.isAdmin && <ProBadge />}
                      </Link>
                      <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
                      <time className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-500' : 'text-slate-400'}`}>{formatTimeAgo(post.createdAt)}</time>
                    </div>
                    {post.title && <h1 className={`text-2xl font-bold mt-1 ${theme === 'dark' ? 'bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent' : 'text-slate-900'
                      }`}>{post.title}</h1>}
                  </div>
                </header>

                <div className="mb-6">
                  {post.type === 'MARKDOWN' ? (
                    <div className={`${theme === 'dark' ? 'prose-invert' : 'prose-slate'} prose max-w-none`}>
                      <MarkdownRenderer content={post.content} />
                    </div>
                  ) : (
                    <div className={`whitespace-pre-wrap leading-relaxed text-lg font-medium ${theme === 'dark' ? 'text-gray-100' : 'text-slate-800'
                      }`}>
                      {renderContentWithUrls(post.content)}
                    </div>
                  )}
                  {post.type === 'MARKDOWN' && post.coverImage && (
                    <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 shadow-lg">
                      <Image
                        src={getAssetUrl(post.coverImage)}
                        alt="Cover"
                        width={1200}
                        height={600}
                        unoptimized={isExternalUrl(post.coverImage) || post.coverImage.startsWith('/uploads/')}
                        className="w-full h-auto object-cover"
                      />
                    </div>
                  )}
                  {post.type !== 'MARKDOWN' && allPostImages.length > 0 && (
                    <div className="mt-6 grid grid-cols-2 gap-3">
                      {allPostImages.map((url, index) => (
                        <div key={index} onClick={() => openLightbox(index)} className="relative aspect-video overflow-hidden rounded-xl bg-gray-800 cursor-pointer group">
                          <Image
                            src={getAssetUrl(url)}
                            alt=""
                            width={800}
                            height={450}
                            unoptimized={isExternalUrl(url) || url.startsWith('/uploads/')}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors"></div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <footer className={`flex flex-col sm:flex-row sm:items-center justify-between pt-6 border-t mt-8 mb-4 gap-4 ${theme === 'dark' ? 'border-white/5' : 'border-slate-100'
                  }`}>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <div className={`flex items-center rounded-full px-4 py-1.5 gap-4 border text-xs font-mono ${theme === 'dark' ? 'bg-white/5 border-white/5 text-gray-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                      }`}>
                      <div className="flex items-center gap-1.5"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg><span>{post.viewCount}</span></div>
                      <div className={`w-px h-3 ${theme === 'dark' ? 'bg-white/10' : 'bg-slate-200'}`}></div>
                      <div className="flex items-center gap-1.5"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg><span>{post.replyCount}</span></div>
                    </div>
                    <button onClick={handleLike} disabled={isLiking} className={`flex items-center gap-2 px-5 py-2 rounded-full font-bold transition-all border ${post.isLiked
                      ? 'text-pink-500 bg-pink-500/10 border-pink-500/20 shadow-lg'
                      : theme === 'dark'
                        ? 'text-gray-400 bg-white/5 border-white/5 hover:border-pink-500/30'
                        : 'text-slate-500 bg-white border-slate-200 hover:border-pink-300'
                      }`}>
                      <svg className={`w-5 h-5 ${post.isLiked ? 'fill-current' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                      <span>{post.likeCount}</span>
                    </button>

                    {/* 大屏推流按钮 (只有非作者可见) */}
                    {!isAuthor && (
                      <button
                        onClick={handlePromote}
                        disabled={isPromoting}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl shadow-lg shadow-cyan-900/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
                      >
                        <span className="text-lg group-hover:rotate-12 transition-transform">📢</span>
                        <div className="text-left">
                          <div className="text-[10px] font-black uppercase tracking-tighter opacity-70 leading-none">
                            {t.billboard.short_title}
                          </div>
                          <div className="text-xs font-bold leading-tight flex items-center gap-1.5">
                            {t.billboard.push}
                            <span className="bg-white/20 px-1.5 rounded-md text-[10px]">{post.promotionCount || 0}</span>
                          </div>
                        </div>
                      </button>
                    )}
                  </div>
                </footer>
              </div>
            </article>

            {/* 回复列表 - 气泡连流 */}
            <section className={`backdrop-blur-md border-x border-b rounded-b-3xl min-h-[500px] flex flex-col transition-all duration-500 ${theme === 'dark' ? 'bg-[#1a1c1e]/40 border-white/5' : 'bg-slate-50/80 border-slate-200'
              }`}>
              <div className="p-8 pt-4 flex-1">
                <div className="flex items-center gap-4 mb-8">
                  <div className={`h-px flex-1 ${theme === 'dark' ? 'bg-white/5' : 'bg-slate-200'}`}></div>
                  <div className={`font-mono text-[10px] uppercase tracking-[0.3em] ${theme === 'dark' ? 'text-gray-600' : 'text-slate-400'}`}>Replies Stream</div>
                  <div className={`h-px flex-1 ${theme === 'dark' ? 'bg-white/5' : 'bg-slate-200'}`}></div>
                </div>

                <div className="space-y-6">
                  {isLoadingReplies && replies.length === 0 ? (
                    <div className="flex justify-center py-20 text-cyan-500/50 animate-pulse font-mono text-xs">BUFFERING MESSAGES...</div>
                  ) : replies.length > 0 ? (
                    <div className="space-y-6">
                      {replies.map((reply) => (
                        <div key={reply.id} className="flex gap-4 group animate-in fade-in slide-in-from-bottom-2 duration-500">
                          <UserAvatar userId={reply.author.id} userName={reply.author.name} userAvatar={reply.author.avatar} size="md" />
                          <div className="flex-1">
                            <div className="inline-block max-w-full">
                              <div className={`border rounded-2xl rounded-tl-none px-4 py-3 shadow-md ${theme === 'dark' ? 'bg-[#24272a] border-white/5' : 'bg-white border-slate-100'
                                }`}>
                                <div className="flex items-center gap-3 mb-1">
                                  <span className={`font-bold text-sm flex items-center ${theme === 'dark' ? 'text-cyan-400' : 'text-cyan-600'}`}>
                                    {reply.author.name}
                                    {reply.author.isAdmin && <ProBadge />}
                                  </span>
                                  <time className={`text-[10px] font-mono ${theme === 'dark' ? 'text-gray-600' : 'text-slate-400'}`}>{formatTimeAgo(reply.createdAt)}</time>
                                </div>
                                <p className={`text-sm leading-relaxed ${theme === 'dark' ? 'text-gray-200' : 'text-slate-700'}`}>{reply.content}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-20 grayscale opacity-20"><div className="text-4xl mb-4">💬</div><div className="text-[10px] font-mono tracking-widest uppercase">Start the flow</div></div>
                  )}
                </div>

                {repliesPagination.hasNextPage && (
                  <div className="mt-8 flex justify-center">
                    <button onClick={loadMoreReplies} disabled={isLoadingReplies} className="text-[10px] font-mono text-cyan-500/40 hover:text-cyan-400 uppercase tracking-widest transition-colors">
                      {isLoadingReplies ? 'SYNCING...' : '↑ Show earlier messages'}
                    </button>
                  </div>
                )}

                {/* 输入区 - 悬浮聊天框形态 */}
                <div className="mt-12 sticky bottom-4">
                  {currentUserId ? (
                    <CreateReplyForm onSubmit={handleReplySubmit} onCancel={() => { }} isSubmitting={isCreatingReply} variant="chat" theme={theme} />
                  ) : (
                    <div
                      onClick={() => setShowLoginPrompt(true)}
                      className={`backdrop-blur-xl border rounded-2xl p-4 text-center cursor-pointer transition-all ${theme === 'dark' ? 'bg-[#24272a]/80 border-white/5 hover:bg-[#2a2d32]' : 'bg-white/80 border-slate-200 hover:bg-slate-50'
                        }`}
                    >
                      <span className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-slate-400'}`}>Please <span className="text-cyan-500 font-bold underline">Login</span> to join the flow</span>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>

          <aside className="w-full lg:w-80 flex-shrink-0 lg:sticky lg:top-20 mt-4 lg:mt-0">
            <PostSidebar currentPostId={post.id} currentUserId={currentUserId || undefined} theme={theme} />
          </aside>
        </div>
      </main>

      {/* Lightbox */}
      {lightboxOpen && post.imageUrls && post.imageUrls.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center" onClick={closeLightbox}>
          <button onClick={closeLightbox} className="absolute top-4 right-4 p-2 bg-gray-800/80 text-white rounded-lg">✕</button>
          <div className="max-w-7xl max-h-[90vh] p-4" onClick={e => e.stopPropagation()}>
            <Image
              src={getAssetUrl(allPostImages[lightboxImageIndex])}
              alt=""
              width={1600}
              height={1200}
              unoptimized={isExternalUrl(allPostImages[lightboxImageIndex]) || allPostImages[lightboxImageIndex].startsWith('/uploads/')}
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>
          {allPostImages.length > 1 && (
            <>
              <button onClick={e => { e.stopPropagation(); prevImage(); }} className="absolute left-4 p-3 bg-gray-800/80 text-white rounded-lg">←</button>
              <button onClick={e => { e.stopPropagation(); nextImage(); }} className="absolute right-4 p-3 bg-gray-800/80 text-white rounded-lg">→</button>
            </>
          )}
        </div>
      )}

      {/* 📺 Billboard Promotion Modal */}
      <BillboardConfirmModal
        isVisible={showPromoteModal}
        onConfirm={handleConfirmPromote}
        onCancel={() => setShowPromoteModal(false)}
        currentPoints={user?.points || 0}
        cost={billboardPromotionCost}
        postTitle={post.title || ''}
      />
    </div>
  )
}

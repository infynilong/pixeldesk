'use client'

import { useState, useMemo } from 'react'
import { Post, CreateReplyData } from '@/types/social'
import UserAvatar from './UserAvatar'
import CreateReplyForm from './CreateReplyForm'
import { usePostReplies } from '@/lib/hooks/usePostReplies'
import Link from 'next/link'
import { useTranslation } from '@/lib/hooks/useTranslation'
import Image from 'next/image'
import { getAssetUrl } from '@/lib/utils/assets'
import { renderContentWithUrls, extractImageUrls, formatWorkstationId } from '@/lib/utils/format'
import { createPortal } from 'react-dom'
import BillboardConfirmModal from './billboard/BillboardConfirmModal'
import ProBadge from '@/components/social/ProBadge'

interface PostCardProps {
  post: Post
  currentUserId: string
  onLike: () => void
  onReplyCountUpdate?: (postId: string, newCount: number) => void
  isMobile?: boolean
  isAuthenticated?: boolean
  onShowLoginPrompt?: () => void
  onPostClick?: (postId: string) => void
}

export default function PostCard({
  post,
  currentUserId,
  onLike,
  onReplyCountUpdate,
  isMobile = false,
  isAuthenticated = true,
  onShowLoginPrompt,
  onPostClick
}: PostCardProps) {
  const [showReplies, setShowReplies] = useState(false)
  const [isLiking, setIsLiking] = useState(false)
  const [showImageModal, setShowImageModal] = useState(false)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const { t, locale } = useTranslation()

  // 使用回复hook来管理回复数据
  const {
    replies,
    isLoading: isLoadingReplies,
    isCreatingReply,
    error: repliesError,
    pagination: repliesPagination,
    fetchReplies,
    createReply,
    loadMoreReplies,
    refreshReplies
  } = usePostReplies({
    postId: post.id,
    userId: currentUserId,
    autoFetch: showReplies // 只有在显示回复时才自动获取
  })

  const handleLike = async () => {
    if (isLiking) return
    setIsLiking(true)
    await onLike()
    // 触发全局数据刷新事件 (点赞获得 Bits)
    window.dispatchEvent(new CustomEvent('refresh-user-data'))
    setIsLiking(false)
  }

  const handleContentClick = (e: React.MouseEvent) => {
    if (onPostClick) {
      e.preventDefault()
      e.stopPropagation()
      onPostClick(post.id)
    }
  }

  // 处理回复提交
  const handleReplySubmit = async (replyData: CreateReplyData) => {
    // 检查登录状态
    if (!isAuthenticated) {
      if (onShowLoginPrompt) {
        onShowLoginPrompt()
      }
      return false
    }

    const newReply = await createReply(replyData)

    if (newReply) {
      // 更新帖子的回复计数
      if (onReplyCountUpdate) {
        onReplyCountUpdate(post.id, (post.replyCount || 0) + 1)
      }
    }
    return !!newReply
  }

  // 处理显示/隐藏回复
  const handleToggleReplies = () => {
    const newShowReplies = !showReplies
    setShowReplies(newShowReplies)

    // 如果要显示回复且还没有数据，则获取数据
    if (newShowReplies && replies.length === 0) {
      fetchReplies()
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return t.time.just_now
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}${t.time.minutes_ago}`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}${t.time.hours_ago}`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}${t.time.days_ago}`

    return date.toLocaleDateString(locale)
  }

  const isExternalUrl = (url: string) => {
    return url.startsWith('http://') || url.startsWith('https://')
  }

  const handleDelete = () => {
    setShowDeleteModal(true)
  }

  const handleConfirmDelete = async () => {
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/posts/${post.id}?userId=${currentUserId}`, {
        method: 'DELETE'
      })
      const result = await res.json()
      if (result.success) {
        window.location.reload()
      } else {
        alert(result.error || 'Delete failed')
      }
    } catch (error) {
      console.error('Delete failed:', error)
      alert('Delete failed')
    } finally {
      setIsDeleting(false)
    }
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
      const contentImages = extractImageUrls(post.content)
      contentImages.forEach(img => {
        if (!urls.includes(img)) {
          urls.push(img)
        }
      })
    }

    return urls
  }, [post.imageUrl, post.imageUrls, post.content, post.type])

  const cardClasses = isMobile
    ? "group relative bg-gray-900/90 rounded-lg overflow-hidden border border-gray-800"
    : "group relative bg-gray-900/90 rounded-lg overflow-hidden border border-gray-800 hover:border-gray-700"

  return (
    <div className={cardClasses}>
      {/* 帖子头部 */}
      <div className="p-4">
        <div className="flex items-start space-x-3">
          {/* 头像区域 */}
          <div className="flex-shrink-0">
            <UserAvatar
              userId={post.author.id}
              userName={post.author.name}
              userAvatar={post.author.avatar}
              customAvatar={post.author.customAvatar}
              size={isMobile ? 'sm' : 'md'}
              showStatus={true}
              isOnline={post.author.isOnline}
              lastSeen={post.author.lastSeen}
            />
            {post.author.workstationId && (
              <div className="mt-1.5 flex justify-center">
                <span className="inline-flex items-center px-1 py-0.5 bg-amber-500/10 border border-amber-500/30 rounded-sm text-amber-500 font-pixel text-[8px] leading-none shadow-[1px_1px_0px_0px_rgba(0,0,0,0.5)] transform hover:scale-110 transition-transform cursor-help" title={`Workstation Owner: #${post.author.workstationId}`}>
                  <span className="text-[7px] mr-1 opacity-70">№</span>
                  {formatWorkstationId(post.author.workstationId)}
                </span>
              </div>
            )}
          </div>

          {/* 作者信息和时间 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <Link
                href={`/profile/${post.author.id}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="font-medium text-gray-200 hover:text-cyan-400 text-sm truncate transition-colors flex items-center"
              >
                {post.author.name}
                {post.author.isAdmin && <ProBadge />}
              </Link>
              <span className="text-gray-600">•</span>
              <span className="text-xs text-gray-500 font-mono">
                {formatTimeAgo(post.createdAt)}
              </span>
            </div>

            {/* 帖子标题 */}
            {post.title && (
              <h3
                onClick={handleContentClick}
                className="text-base font-medium text-gray-100 mt-1 leading-snug cursor-pointer hover:text-cyan-400 transition-colors"
              >
                {post.title}
              </h3>
            )}
          </div>
        </div>
      </div>

      {/* 帖子内容 */}
      <div className="px-4 pb-4">
        {/* 博客类型标识 */}
        {post.type === 'MARKDOWN' && (
          <div className="flex items-center gap-3 mb-3">
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 rounded text-xs font-pixel">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              博客文章
            </span>
            {post.readTime && (
              <span className="text-xs text-gray-500 font-mono">
                {post.readTime} 分钟阅读
              </span>
            )}
          </div>
        )}

        {/* 封面图片 */}
        {post.type === 'MARKDOWN' && post.coverImage && (
          <div className="relative overflow-hidden rounded-lg border border-gray-800 mb-3">
            <Image
              src={getAssetUrl(post.coverImage)}
              alt="Cover"
              width={800}
              height={400}
              unoptimized={isExternalUrl(post.coverImage)}
              className="w-full h-48 object-cover"
            />
          </div>
        )}

        {/* 内容文本 - 博客显示摘要，普通帖子显示全文 */}
        <div
          onClick={handleContentClick}
          className="text-gray-300 whitespace-pre-wrap leading-relaxed text-sm mb-3 font-sans cursor-pointer hover:text-gray-100 transition-colors"
        >
          {post.type === 'MARKDOWN' && post.summary ? (
            <div className="relative group/blog-content">
              <div className="min-h-[60px]">
                {renderContentWithUrls(post.summary)}
              </div>
              <Link
                href={`/posts/${post.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute inset-0 flex items-center justify-center bg-cyan-900/40 opacity-0 group-hover/blog-content:opacity-100 transition-opacity backdrop-blur-[2px] rounded-lg"
              >
                <span className="px-4 py-2 bg-cyan-500 text-white text-xs font-bold rounded-full shadow-lg shadow-cyan-500/50 flex items-center gap-2 transform translate-y-2 group-hover/blog-content:translate-y-0 transition-transform">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  阅读全文
                </span>
              </Link>
            </div>
          ) : (
            renderContentWithUrls(post.content)
          )}
        </div>

        {/* 博客标签 */}
        {post.type === 'MARKDOWN' && post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {post.tags.map((tag, index) => (
              <span
                key={index}
                className="inline-block px-2 py-0.5 bg-gray-800/50 text-gray-400 border border-gray-700 rounded text-xs"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* 阅读全文按钮 - 只对博客类型显示 */}
        {post.type === 'MARKDOWN' && (
          <a
            href={`/posts/${post.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-retro-blue hover:text-retro-cyan text-sm font-medium transition-colors"
          >
            阅读全文
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </a>
        )}

        {/* 图片内容 - 非博客类型 - 九宫格展示 */}
        {post.type !== 'MARKDOWN' && allPostImages.length > 0 && (
          <div className="mt-2">
            {(() => {
              const urls = allPostImages
              const count = urls.length

              if (count === 1) {
                return (
                  <div
                    onClick={() => {
                      setSelectedImageIndex(0)
                      setShowImageModal(true)
                    }}
                    className="relative w-full max-w-[320px] h-[180px] rounded-lg overflow-hidden border border-gray-800 hover:border-cyan-500/50 transition-colors cursor-pointer group"
                  >
                    <Image
                      src={getAssetUrl(urls[0])}
                      alt="Post image"
                      fill
                      unoptimized={isExternalUrl(urls[0])}
                      className="object-contain group-hover:scale-105 transition-transform duration-300"
                      sizes="320px"
                    />
                  </div>
                )
              }

              const gridCols = count === 2 || count === 4 ? 'grid-cols-2' : 'grid-cols-3'
              const maxWidth = count === 2 ? 'max-w-[240px]' : 'max-w-[400px]'

              return (
                <div className={`grid ${gridCols} gap-2 ${maxWidth} relative group/blog-images`}>
                  {urls.slice(0, 9).map((url, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setSelectedImageIndex(idx)
                        setShowImageModal(true)
                      }}
                      className="relative aspect-square rounded-md overflow-hidden border border-gray-800 hover:border-cyan-500/50 transition-colors cursor-pointer group bg-gray-900"
                    >
                      <Image
                        src={getAssetUrl(url)}
                        alt={`Post image ${idx}`}
                        fill
                        unoptimized={isExternalUrl(url)}
                        className="object-contain group-hover:scale-110 transition-transform duration-300"
                        sizes="130px"
                      />
                    </div>
                  ))}
                </div>
              )
            })()}
          </div>
        )}
      </div>

      {/* 统计和操作区域 */}
      <div className="px-4 py-3 border-t border-gray-800/50 bg-gray-900/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* 浏览数 */}
            <div className="flex items-center space-x-2 text-gray-500">
              <div className="w-4 h-4 bg-gray-800 rounded flex items-center justify-center">
                <svg className="w-2.5 h-2.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <span className="text-xs font-mono">{post.viewCount}</span>
            </div>

            {/* 回复数 - 可点击 */}
            <button
              onClick={handleToggleReplies}
              className="flex items-center space-x-2 px-2 py-1 rounded text-gray-500 hover:text-gray-300 hover:bg-gray-800/50 "
            >
              <div className="w-4 h-4 bg-gray-800 rounded flex items-center justify-center">
                <svg className="w-2.5 h-2.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <span className="text-xs font-mono">{post.replyCount}</span>
            </button>

            {/* 点赞按钮 */}
            <button
              onClick={handleLike}
              disabled={isLiking}
              className={`flex items-center space-x-2 px-2 py-1 rounded  ${post.isLiked
                ? 'text-red-400 bg-red-950/30 border border-red-800/30'
                : 'text-gray-500 hover:text-red-400 hover:bg-gray-800/50'
                } ${isLiking ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className={`w-4 h-4 ${post.isLiked ? 'bg-red-900/40' : 'bg-gray-800'} rounded flex items-center justify-center `}>
                <svg
                  className={`w-2.5 h-2.5 ${post.isLiked ? 'fill-current text-red-400' : 'text-gray-400'} `}
                  fill={post.isLiked ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <span className="text-xs font-mono">{post.likeCount}</span>
            </button>
          </div>

          {/* 删除按钮（仅作者可见） */}
          {post.author.id === currentUserId && (
            <button
              onClick={handleDelete}
              className="p-2 text-gray-500 hover:text-red-400 rounded hover:bg-gray-800/50 "
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* 回复区域 */}
      {showReplies && (
        <div className="border-t border-gray-800/50">
          <div className="p-4 space-y-3 bg-gray-950/30">
            {/* 回复输入表单 */}
            <CreateReplyForm
              onSubmit={handleReplySubmit}
              onCancel={() => setShowReplies(false)}
              isMobile={isMobile}
              isSubmitting={isCreatingReply}
              variant="dark"
            />

            {/* 错误显示 */}
            {repliesError && (
              <div className="p-3 bg-red-950/30 border border-red-800/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-900/40 rounded flex items-center justify-center">
                    <span className="text-xs">⚠️</span>
                  </div>
                  <span className="text-red-300 text-sm font-mono">{repliesError}</span>
                </div>
              </div>
            )}

            {/* 回复列表标题 */}
            <div className="flex items-center gap-2 pt-2">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <h4 className="text-sm font-medium text-gray-300 font-mono">
                REPLIES ({post.replyCount || 0})
              </h4>
            </div>

            {/* 加载状态 */}
            {isLoadingReplies && replies.length === 0 && (
              <div className="flex items-center justify-center py-6">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            )}

            {/* 回复列表 */}
            {replies.length > 0 && (
              <div className="space-y-3">
                {replies.map((reply) => {
                  const replyImages = extractImageUrls(reply.content)
                  return (
                    <div key={reply.id} className="bg-gray-800/40 rounded-lg p-3 border border-gray-800/60">
                      <div className="flex items-start space-x-3">
                        {/* 回复者头像 */}
                        <div className="flex-shrink-0">
                          <UserAvatar
                            userId={reply.author.id}
                            userName={reply.author.name}
                            userAvatar={reply.author.avatar}
                            customAvatar={reply.author.customAvatar}
                            size="sm"
                            showStatus={true}
                            isOnline={reply.author.isOnline}
                            lastSeen={reply.author.lastSeen}
                          />
                        </div>

                        {/* 回复内容 */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="font-medium text-gray-300 text-sm flex items-center gap-1">
                              {reply.author.name}
                              {reply.author.isAdmin && <ProBadge />}
                            </span>
                            {reply.author.workstationId && (
                              <span className="inline-flex items-center px-1 py-0.5 bg-amber-500/10 border border-amber-500/30 rounded-sm text-amber-500 font-pixel text-[8px] leading-none" title={`Workstation Owner: #${reply.author.workstationId}`}>
                                <span className="text-[7px] mr-1 opacity-70">№</span>
                                {formatWorkstationId(reply.author.workstationId)}
                              </span>
                            )}
                            <span className="text-gray-600">•</span>
                            <span className="text-xs text-gray-500 font-mono">
                              {formatTimeAgo(reply.createdAt)}
                            </span>
                          </div>
                          <div className="text-gray-300 text-sm leading-relaxed break-words">
                            {renderContentWithUrls(reply.content)}
                          </div>

                          {/* 回复中的图片展示 */}
                          {replyImages.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {replyImages.map((imgUrl, idx) => (
                                <div
                                  key={idx}
                                  onClick={() => window.open(imgUrl, '_blank')}
                                  className="relative w-24 h-24 rounded-lg overflow-hidden border border-gray-800 hover:border-cyan-500/50 cursor-zoom-in transition-colors group"
                                >
                                  <Image
                                    src={getAssetUrl(imgUrl)}
                                    alt="Reply image"
                                    fill
                                    unoptimized={isExternalUrl(imgUrl)}
                                    className="object-cover group-hover:scale-110 transition-transform duration-300"
                                    sizes="100px"
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* 没有回复时的空状态 */}
            {!isLoadingReplies && replies.length === 0 && (
              <div className="text-center py-6">
                <div className="w-10 h-10 bg-gray-800 border border-gray-700 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <p className="text-sm text-gray-400 font-mono">NO REPLIES</p>
                <p className="text-xs text-gray-500 font-mono mt-1">Be the first to reply</p>
              </div>
            )}

            {/* 加载更多回复按钮 */}
            {repliesPagination.hasNextPage && (
              <div className="flex justify-center pt-2">
                <button
                  onClick={loadMoreReplies}
                  disabled={isLoadingReplies}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 rounded-lg  disabled:opacity-50 text-xs font-mono"
                >
                  {isLoadingReplies ? 'LOADING...' : `LOAD MORE (${repliesPagination.totalPages - repliesPagination.page})`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 删除确认对话框 */}
      {showDeleteModal && (
        <BillboardConfirmModal
          isVisible={showDeleteModal}
          onConfirm={handleConfirmDelete}
          onCancel={() => setShowDeleteModal(false)}
          currentPoints={100}
          cost={0}
          postTitle={post.title || post.content.substring(0, 20)}
          customTitle={t.social.confirm_delete}
          customMessage={t.social.confirm_delete_msg}
        />
      )}

      {/* 图片放大模态框 */}
      {showImageModal && allPostImages.length > 0 && typeof window !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 bg-black/95 flex items-center justify-center p-4"
          style={{ zIndex: 10000, pointerEvents: 'auto' }}
          onClick={() => setShowImageModal(false)}
        >
          <div
            className="relative w-full h-full flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors z-10 p-2 bg-white/10 rounded-full backdrop-blur-md"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div
              className="relative max-w-full max-h-[90vh] px-4 flex flex-col items-center"
              onClick={(e) => e.stopPropagation()}
            >
              {(() => {
                const urls = allPostImages
                const count = urls.length

                return (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <img
                      src={getAssetUrl(urls[selectedImageIndex] || '')}
                      alt="Full screen"
                      className="max-w-full max-h-[80vh] object-contain shadow-2xl rounded-lg"
                    />

                    {count > 1 && (
                      <>
                        <button
                          onClick={() => setSelectedImageIndex((selectedImageIndex - 1 + count) % count)}
                          className="absolute left-0 top-1/2 -translate-y-1/2 p-4 text-white/50 hover:text-white transition-colors"
                        >
                          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setSelectedImageIndex((selectedImageIndex + 1) % count)}
                          className="absolute right-0 top-1/2 -translate-y-1/2 p-4 text-white/50 hover:text-white transition-colors"
                        >
                          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>

                        <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 flex space-x-2">
                          {urls.map((_, i) => (
                            <div
                              key={i}
                              className={`w-2 h-2 rounded-full transition-all ${i === selectedImageIndex ? 'bg-cyan-500 w-4' : 'bg-white/30'}`}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )
              })()}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
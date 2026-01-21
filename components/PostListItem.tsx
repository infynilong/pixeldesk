'use client'

import { Post } from '@/types/social'
import UserAvatar from './UserAvatar'
import Link from 'next/link'
import { useState, useMemo } from 'react'
import { useTranslation } from '@/lib/hooks/useTranslation'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import { getAssetUrl } from '@/lib/utils/assets'
import { renderContentWithUrls, extractImageUrls } from '@/lib/utils/format'
import BillboardConfirmModal from './billboard/BillboardConfirmModal'
import ProBadge from '@/components/social/ProBadge'
import { usePostReplies } from '@/lib/hooks/usePostReplies'
import { formatWorkstationId } from '@/lib/utils/format'
import CreateReplyForm from './CreateReplyForm'
import { PostReply, CreateReplyData } from '@/types/social'
import ImageLightbox from './social/ImageLightbox'

interface PostListItemProps {
  post: Post
  currentUserId: string
  onLike: () => void
  isAuthenticated?: boolean
  onShowLoginPrompt?: () => void
  currentPoints?: number
  billboardPromotionCost?: number
  onPostClick?: (postId: string) => void
}

/**
 * 紧凑的列表视图 - 提高信息密度
 */
export default function PostListItem({
  post,
  currentUserId,
  onLike,
  isAuthenticated = true,
  onShowLoginPrompt,
  currentPoints = 0,
  billboardPromotionCost = 50,
  onPostClick
}: PostListItemProps) {
  const [showReplies, setShowReplies] = useState(false)
  const { t, locale } = useTranslation()
  const isLiked = post.isLiked || false
  const isOwnPost = post.author.id === currentUserId
  const [showImageModal, setShowImageModal] = useState(false)
  const [showPromoteModal, setShowPromoteModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [lightboxImages, setLightboxImages] = useState<string[]>([])
  const [lightboxInitialIndex, setLightboxInitialIndex] = useState(0)

  const handleLike = () => {
    if (!isAuthenticated) {
      onShowLoginPrompt?.()
      return
    }
    onLike()
  }

  // 使用回复hook
  const {
    replies,
    isLoading: isLoadingReplies,
    isCreatingReply,
    error: repliesError,
    pagination: repliesPagination,
    fetchReplies,
    createReply,
    loadMoreReplies
  } = usePostReplies({
    postId: post.id,
    userId: currentUserId,
    autoFetch: showReplies
  })

  const handleToggleReplies = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const newShowReplies = !showReplies
    setShowReplies(newShowReplies)
    if (newShowReplies && replies.length === 0) {
      fetchReplies()
    }
  }

  const handleReplySubmit = async (replyData: CreateReplyData) => {
    if (!isAuthenticated) {
      onShowLoginPrompt?.()
      return false
    }
    const newReply = await createReply(replyData)
    if (newReply) {
      post.replyCount = (post.replyCount || 0) + 1
    }
    return !!newReply
  }

  const handleContentClick = (e: React.MouseEvent) => {
    // If onPostClick is provided, use it to open modal instead of href jump
    if (onPostClick) {
      e.preventDefault()
      e.stopPropagation()
      onPostClick(post.id)
    }
  }

  const [isPromoting, setIsPromoting] = useState(false)

  const handleImageClick = (images: string[], index: number) => {
    setLightboxImages(images)
    setLightboxInitialIndex(index)
    setShowImageModal(true)
  }

  const handlePromote = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!isAuthenticated) {
      onShowLoginPrompt?.()
      return
    }

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
        // 可以触发列表刷新或本地更新计数
        post.promotionCount = (post.promotionCount || 0) + 1
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

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
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

  // 辅助函数：判断是否为外部链接
  const isExternalUrl = (url: string) => {
    return url.startsWith('http://') || url.startsWith('https://')
  }

  // 格式化时间
  const formatTime = (date: Date | string) => {
    const now = new Date()
    const postDate = new Date(date)
    const diffMs = now.getTime() - postDate.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return t.time.just_now
    if (diffMins < 60) return `${diffMins}${t.time.minutes_ago}`
    if (diffHours < 24) return `${diffHours}${t.time.hours_ago}`
    if (diffDays < 7) return `${diffDays}${t.time.days_ago}`
    return postDate.toLocaleDateString(locale, { month: '2-digit', day: '2-digit' })
  }

  // 截取内容预览
  const getPreview = (content: string, maxLength = 150) => {
    if (content.length <= maxLength) return content
    return content.substring(0, maxLength) + '...'
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
    const contentImages = extractImageUrls(post.content)
    contentImages.forEach(img => {
      if (!urls.includes(img)) {
        urls.push(img)
      }
    })

    return urls
  }, [post.imageUrl, post.imageUrls, post.content])

  // 判断是否为博客
  const isBlog = post.type === 'MARKDOWN'

  return (
    <>
      <div className="px-3 py-2 hover:bg-gray-800/40 border-b border-gray-800/50 transition-colors group">
        <div className="flex items-start gap-2">
          {/* 左侧头像 - 更小 */}
          <div className="flex-shrink-0">
            <UserAvatar
              userId={post.author.id}
              userName={post.author.name}
              userAvatar={post.author.avatar}
              customAvatar={post.author.customAvatar}
              size="xs"
              showStatus={false}
            />
            {post.author.workstationId && (
              <div className="mt-1 flex justify-center">
                <span className="inline-flex items-center px-1 py-0.5 bg-amber-500/10 border-t border-l border-amber-500/30 border-b border-r border-amber-900/50 rounded-sm text-amber-500 font-pixel text-[8px] scale-[0.8] origin-top leading-none shadow-[1px_1px_0px_0px_rgba(0,0,0,0.5)] transform hover:scale-[0.9] transition-transform" title={`Workstation #${post.author.workstationId}`}>
                  <span className="text-[7px] mr-0.5 opacity-70">№</span>
                  {formatWorkstationId(post.author.workstationId)}
                </span>
              </div>
            )}
          </div>

          {/* 右侧内容区域 */}
          <div className="flex-1 min-w-0">
            {/* 标题 - 如果有，可点击跳转 */}
            {post.title && (
              <h4
                onClick={handleContentClick}
                className="text-gray-100 text-sm font-pixel font-bold mb-0.5 line-clamp-1 hover:text-emerald-400 transition-colors cursor-pointer"
              >
                {post.title}
              </h4>
            )}

            {/* 元信息行：作者 + 时间 + 类型 + 标签 */}
            <div className="flex items-center gap-1.5 mb-1 text-xs flex-wrap">
              <Link
                href={`/profile/${post.author.id}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-gray-400 hover:text-emerald-400 font-pixel transition-colors flex items-center"
              >
                {post.author.name}
                {post.author.isAdmin && <ProBadge />}
              </Link>
              <span className="text-gray-600 font-pixel">·</span>
              <span className="text-gray-500 font-pixel flex-shrink-0 text-[10px]">
                {formatTime(post.createdAt)}
              </span>
              {isBlog && (
                <>
                  <span className="text-gray-600">·</span>
                  <span className="inline-flex items-center gap-0.5 px-1 py-0.5 bg-emerald-600/20 border border-emerald-500/30 rounded text-emerald-400 font-pixel">
                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <span className="text-[8px]">{t.nav.blog}</span>
                  </span>
                </>
              )}
              {/* 标签 - 内联显示 */}
              {post.tags && post.tags.length > 0 && (
                <>
                  {post.tags.slice(0, 2).map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-1 py-0.5 bg-gray-800/50 border border-gray-700/50 rounded text-gray-500 font-pixel text-[10px]"
                    >
                      #{tag}
                    </span>
                  ))}
                  {post.tags.length > 2 && (
                    <span className="text-gray-600">+{post.tags.length - 2}</span>
                  )}
                </>
              )}
            </div>

            {/* 内容预览 - 只显示一行，可点击跳转 */}
            {!post.title && (
              <div
                onClick={handleContentClick}
                className="text-gray-400 text-xs leading-snug line-clamp-1 mb-1 hover:text-gray-300 transition-colors cursor-pointer"
              >
                {renderContentWithUrls(getPreview(post.content, 80), t.social.view_link)}
              </div>
            )}

            {/* 图片九宫格展示 */}
            {allPostImages.length > 0 && (
              <div className="mb-2 mt-2">
                {(() => {
                  const urls = allPostImages
                  const count = urls.length

                  if (count === 1) {
                    return (
                      <div
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleImageClick(urls, 0)
                        }}
                        className="relative w-full max-w-[280px] h-[160px] rounded border border-gray-700/50 hover:border-emerald-500/50 transition-colors cursor-pointer group shadow-pixel-sm"
                      >
                        <Image
                          src={getAssetUrl(urls[0])}
                          alt="Post image"
                          fill
                          unoptimized={isExternalUrl(urls[0]) || urls[0].startsWith('/uploads/')}
                          className="object-contain group-hover:scale-105 transition-transform duration-200"
                          sizes="280px"
                        />
                      </div>
                    )
                  }

                  // 多图九宫格逻辑
                  const gridCols = count === 2 || count === 4 ? 'grid-cols-2' : 'grid-cols-3'
                  const maxWidth = count === 2 ? 'max-w-[240px]' : 'max-w-[320px]'

                  return (
                    <div className={`grid ${gridCols} gap-1.5 ${maxWidth}`}>
                      {urls.slice(0, 9).map((url, idx) => (
                        <div
                          key={idx}
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            handleImageClick(urls, idx)
                          }}
                          className="relative aspect-square rounded border border-gray-800 hover:border-emerald-500/50 transition-colors cursor-pointer group bg-gray-900 shadow-pixel-sm"
                        >
                          <Image
                            src={getAssetUrl(url)}
                            alt={`Post image ${idx}`}
                            fill
                            unoptimized={isExternalUrl(url) || url.startsWith('/uploads/')}
                            className="object-contain group-hover:scale-110 transition-transform duration-300"
                            sizes="100px"
                          />
                        </div>
                      ))}
                    </div>
                  )
                })()}
              </div>
            )}

            {/* 互动数据行 - 更紧凑 */}
            <div className="flex items-center gap-3 text-xs">
              {/* 点赞 */}
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleLike()
                }}
                disabled={isOwnPost}
                className={`flex items-center gap-1 group/like transition-colors ${isLiked
                  ? 'text-retro-red'
                  : 'text-gray-500 hover:text-retro-red'
                  } ${isOwnPost ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <svg className="w-3.5 h-3.5" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                <span className="font-pixel text-[10px]">{post.likeCount || 0}</span>
              </button>

              {/* 回复 */}
              <button
                onClick={handleToggleReplies}
                className={`flex items-center gap-1 transition-colors cursor-pointer ${showReplies ? 'text-emerald-400' : 'text-gray-500 hover:text-emerald-400'}`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span className="font-pixel text-[10px]">{post.replyCount || 0}</span>
              </button>

              {/* 阅读量 */}
              <div className="flex items-center gap-1 text-gray-500">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span className="font-pixel text-[10px]">{post.viewCount || 0}</span>
              </div>

              {/* 大屏提请上榜 */}
              {!isOwnPost && (
                <button
                  onClick={handlePromote}
                  disabled={isPromoting}
                  className="flex items-center gap-1 group/promote transition-colors text-gray-500 hover:text-emerald-400 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                  title={t.billboard.push_to_billboard}
                >
                  <span className="text-sm group-hover/promote:scale-110 transition-transform">📢</span>
                  <span className="font-pixel text-[10px]">{post.promotionCount || 0}</span>
                </button>
              )}

              {/* 删除按钮 - 仅作者可见 */}
              {isOwnPost && (
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-1 text-gray-600 hover:text-red-500 transition-colors cursor-pointer ml-auto opacity-0 group-hover:opacity-100"
                  title={t.common.delete || 'Delete'}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>

            {/* 回复展开部分 */}
            {showReplies && (
              <div className="mt-3 pt-3 border-t border-gray-800/50 space-y-3" onClick={(e) => e.stopPropagation()}>
                <CreateReplyForm
                  onSubmit={handleReplySubmit}
                  onCancel={() => setShowReplies(false)}
                  isMobile={true}
                  isSubmitting={isCreatingReply}
                  variant="dark"
                />

                {/* 回复列表预览 */}
                {isLoadingReplies && replies.length === 0 ? (
                  <div className="flex justify-center py-2">
                    <div className="w-4 h-4 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin"></div>
                  </div>
                ) : replies.length > 0 && (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                    {replies.map((reply) => {
                      const replyImages = extractImageUrls(reply.content)
                      return (
                        <div key={reply.id} className="text-xs bg-gray-800/30 rounded p-2 border border-gray-700/30">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-gray-300 font-bold flex items-center gap-1">
                              {reply.author.name}
                              {reply.author.isAdmin && <ProBadge />}
                            </span>
                            <span className="text-gray-600 text-[10px]">{formatTime(reply.createdAt)}</span>
                          </div>
                          <div className="text-gray-400 break-words">
                            {renderContentWithUrls(reply.content, t.social.view_link)}
                          </div>

                          {/* 回复中的图片预览 */}
                          {replyImages.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {replyImages.map((imgUrl, idx) => (
                                <div
                                  key={idx}
                                  onClick={() => {
                                    setLightboxImages(replyImages)
                                    setLightboxInitialIndex(idx)
                                    setShowImageModal(true)
                                  }}
                                  className="relative w-20 h-20 rounded border border-gray-700 overflow-hidden cursor-zoom-in group"
                                >
                                  <Image
                                    src={getAssetUrl(imgUrl)}
                                    alt="Reply image"
                                    fill
                                    unoptimized={isExternalUrl(imgUrl) || imgUrl.startsWith('/uploads/')}
                                    className="object-contain group-hover:scale-110 transition-transform"
                                    sizes="80px"
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                <Link
                  href={`/posts/${post.id}`}
                  target="_blank"
                  className="block text-center text-[10px] text-gray-500 hover:text-cyan-400 py-1"
                >
                  {t.social.view_all_replies || 'View all replies'} →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      <BillboardConfirmModal
        isVisible={showPromoteModal}
        onConfirm={handleConfirmPromote}
        onCancel={() => setShowPromoteModal(false)}
        currentPoints={currentPoints}
        cost={billboardPromotionCost}
        postTitle={post.title || ''}
      />

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
      <ImageLightbox
        isOpen={showImageModal}
        onClose={() => setShowImageModal(false)}
        images={lightboxImages}
        initialIndex={lightboxInitialIndex}
      />
    </>
  )
}

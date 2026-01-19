'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from '@/lib/hooks/useTranslation'
import { Post, PostReply } from '@/types/social'
import UserAvatar from './UserAvatar'
import CreateReplyForm from './CreateReplyForm'
import { usePostReplies } from '@/lib/hooks/usePostReplies'
import LoadingSpinner from './LoadingSpinner'
import { getAssetUrl } from '@/lib/utils/assets'
import Image from 'next/image'
import BillboardConfirmModal from './billboard/BillboardConfirmModal'
import { createPortal } from 'react-dom'
import { renderContentWithUrls, extractImageUrls } from '@/lib/utils/format'
import ProBadge from '@/components/social/ProBadge'
import ConversationModal from './social/ConversationModal'
import ImageLightbox from './social/ImageLightbox'

interface PostDetailModalProps {
  isOpen: boolean
  postId: string | null
  currentUserId: string
  onClose: () => void
  onNavigateToPage?: (postId: string) => void // 可选的页面跳转功能
}

export default function PostDetailModal({
  isOpen,
  postId,
  currentUserId,
  onClose,
  onNavigateToPage
}: PostDetailModalProps) {
  const [post, setPost] = useState<Post | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLiking, setIsLiking] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showImageModal, setShowImageModal] = useState(false)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [replyToUser, setReplyToUser] = useState<{ id: string, name: string, replyId: string } | null>(null)
  const [showConversationId, setShowConversationId] = useState<string | null>(null)
  const [lightboxImages, setLightboxImages] = useState<string[]>([])
  const [lightboxInitialIndex, setLightboxInitialIndex] = useState(0)
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
    postId: postId || '',
    userId: currentUserId,
    autoFetch: isOpen && !!postId
  })

  // 获取帖子详情
  const fetchPostDetail = useCallback(async (id: string) => {
    if (!id) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/posts/${id}?userId=${currentUserId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || t.social.err_failed)
      }

      if (data.success) {
        setPost(data.data)
      } else {
        throw new Error(data.error || 'Failed to fetch post')
      }
    } catch (err) {
      console.error('Error fetching post detail:', err)
      setError(err instanceof Error ? err.message : t.social.err_failed)
    } finally {
      setIsLoading(false)
    }
  }, [currentUserId])

  // 处理点赞
  const handleLike = async () => {
    if (!post || isLiking) return

    setIsLiking(true)
    try {
      const response = await fetch(`/api/posts/${post.id}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: currentUserId }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setPost(prev => prev ? {
          ...prev,
          isLiked: data.data.isLiked,
          likeCount: data.data.likeCount
        } : prev)
        // 触发全局数据刷新事件 (点赞获得 Bits)
        window.dispatchEvent(new CustomEvent('refresh-user-data'))
      }
    } catch (error) {
      console.error('Error liking post:', error)
    } finally {
      setIsLiking(false)
    }
  }

  const handleToggleImageModal = (index: number) => {
    const urls = post?.imageUrls && post.imageUrls.length > 0
      ? post.imageUrls
      : [post?.imageUrl || '']

    setLightboxImages(urls)
    setLightboxInitialIndex(index)
    setShowImageModal(true)
  }

  // 处理回复提交
  const handleReplySubmit = async (replyData: { content: string, parentId?: string | null }) => {
    if (!post) return false

    const newReply = await createReply(replyData)

    if (newReply) {
      // 更新帖子的回复计数
      setPost(prev => prev ? { ...prev, replyCount: prev.replyCount + 1 } : prev)
      setReplyToUser(null)
      // 触发全局数据刷新事件
      window.dispatchEvent(new CustomEvent('refresh-user-data'))
    }
    return !!newReply
  }

  const handleReplyTo = (reply: PostReply) => {
    setReplyToUser({
      id: reply.author.id,
      name: reply.author.name,
      replyId: reply.id
    })
    // 滚动到表单
    const formElement = document.getElementById('reply-form-container')
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth' })
    }
  }

  // 处理删除
  const handleDelete = () => {
    setShowDeleteModal(true)
  }

  const handleConfirmDelete = async () => {
    if (!post) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/posts/${post.id}?userId=${currentUserId}`, {
        method: 'DELETE'
      })
      const result = await res.json()
      if (result.success) {
        onClose()
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

  const isExternalUrl = (url: string) => {
    return url.startsWith('http://') || url.startsWith('https://')
  }

  // 处理弹窗打开/关闭
  useEffect(() => {
    if (isOpen && postId) {
      fetchPostDetail(postId)
      // 同时获取回复数据
      if (fetchReplies) {
        fetchReplies()
      }
    } else {
      setPost(null)
      setError(null)
    }
  }, [isOpen, postId, fetchPostDetail, fetchReplies])

  // 处理键盘事件
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'auto'
    }
  }, [isOpen, onClose])

  // 格式化时间
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

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 In"
      style={{
        background: 'linear-gradient(135deg, rgba(0,0,0,0.95) 0%, rgba(10,30,60,0.98) 50%, rgba(0,0,0,0.95) 100%)',
        pointerEvents: 'auto'
      }}
      onClick={onClose}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
    >
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-full blur-3xl "></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-full blur-3xl  delay-1000"></div>
      </div>

      <div
        className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden Up border border-gray-200/20 dark:border-gray-800/50"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
      >
        {/* 现代化头部设计 */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-400"></div>

        <div className="flex items-center justify-between p-4.5">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center shadow-pixel-sm transform rotate-3">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white dark:border-gray-900 "></div>
            </div>
            <div>
              <h2 className="text-xl font-pixel font-bold text-gray-900 dark:text-white leading-none">{t.social.post_detail}</h2>
              <p className="text-[10px] font-pixel text-gray-500 dark:text-gray-400 mt-0.5">{t.social.platform_subtitle}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* 跳转到页面按钮 - 现代化设计 */}
            {onNavigateToPage && postId && (
              <button
                onClick={() => onNavigateToPage(postId)}
                className="group relative overflow-hidden px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white rounded-lg font-pixel text-sm shadow-pixel-sm transform hover:scale-105 transition-all"
                title={t.social.open_new_page}
              >
                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative flex items-center space-x-2">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  <span>{t.social.open_new_page}</span>
                </div>
              </button>
            )}

            {/* 关闭按钮 - 现代化设计 */}
            <button
              onClick={onClose}
              className="group p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-lg  hover:scale-110 transition-all shadow-pixel-sm"
            >
              <svg className="w-4 h-4 transform group-hover:rotate-90 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

      {/* 弹窗内容 - 现代化设计 */}
      <div className="overflow-y-auto max-h-[calc(90vh-80px)] bg-white dark:bg-gray-900">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center space-y-4">
              <LoadingSpinner />
              <p className="text-gray-500 dark:text-gray-400 font-medium">{t.social.loading_content}</p>
            </div>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-red-400 to-red-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">{t.auth.login_failed}</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">{error}</p>
            <button
              onClick={() => postId && fetchPostDetail(postId)}
              className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white rounded-lg font-pixel shadow-pixel-sm transform hover:scale-105 transition-all"
            >
              {t.social.reload}
            </button>
          </div>
        ) : post ? (
          <div className="p-6 space-y-6">
            {/* 帖子内容卡片 - 现代化设计 */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
              <div className="p-8">
                {/* 作者信息 */}
                <div className="flex items-start space-x-6 mb-6">
                  <div className="relative">
                    <UserAvatar
                      userId={post.author.id}
                      userName={post.author.name}
                      userAvatar={post.author.avatar}
                      customAvatar={post.author.customAvatar}
                      size="lg"
                      showStatus={true}
                    />
                    {post.author.workstationId && (
                      <div className="mt-2 flex justify-center">
                        <span className="inline-flex items-center px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/30 rounded-sm text-amber-500 font-pixel text-[9px] leading-none shadow-[1px_1px_0px_0px_rgba(0,0,0,0.5)] transform hover:scale-105 transition-transform cursor-help" title={`Workstation Owner: #${post.author.workstationId}`}>
                          <span className="text-[8px] mr-1 opacity-70">№</span>
                          {post.author.workstationId.length > 8 ? post.author.workstationId.substring(0, 8) + '...' : post.author.workstationId}
                        </span>
                      </div>
                    )}
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full flex items-center justify-center shadow-lg">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="font-bold text-gray-900 dark:text-white text-xl flex items-center">
                        {post.author.name}
                        {post.author.isAdmin && <ProBadge />}
                      </h4>
                      <span className="px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-pixel border border-emerald-500/20 rounded">
                        {t.social.author || '作者'}
                      </span>
                      <span className="text-gray-400 dark:text-gray-500 font-pixel">•</span>
                      <span className="text-gray-500 dark:text-gray-400 font-pixel text-xs">
                        {formatTimeAgo(post.createdAt)}
                      </span>
                    </div>

                    {/* 帖子标题 */}
                    {post.title && (
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 leading-tight">
                        {post.title}
                      </h3>
                    )}
                  </div>

                  {/* 删除按钮 */}
                  {post.author.id === currentUserId && (
                    <button
                      onClick={handleDelete}
                      className="p-3 text-gray-400 hover:text-red-500 bg-gray-100 dark:bg-gray-700/50 rounded-xl transition-all hover:scale-110"
                      title={t.common.delete}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* 帖子内容 */}
                <div className="mb-6">
                  <div className="prose dark:prose-invert max-w-none">
                    <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed text-lg">
                      {renderContentWithUrls(post.content, t.social.view_link)}
                    </div>
                  </div>

                  {/* 图片展示 - 九宫格 */}
                  {(post.imageUrl || (post.imageUrls && post.imageUrls.length > 0)) && (
                    <div className="mt-6">
                      {(() => {
                        const urls = post.imageUrls && post.imageUrls.length > 0
                          ? post.imageUrls
                          : [post.imageUrl || '']

                        const count = urls.length

                        if (count === 1) {
                          return (
                            <div
                              className="relative w-full rounded-2xl overflow-hidden shadow-xl cursor-pointer group"
                              onClick={() => {
                                setSelectedImageIndex(0)
                                setShowImageModal(true)
                              }}
                            >
                              <Image
                                src={getAssetUrl(urls[0])}
                                alt="Post image"
                                width={1200}
                                height={800}
                                unoptimized={isExternalUrl(urls[0])}
                                className="w-full h-auto max-h-[500px] object-contain bg-black/5 hover:scale-[1.02] transition-transform duration-500"
                              />
                            </div>
                          )
                        }

                        const gridCols = count === 2 || count === 4 ? 'grid-cols-2' : 'grid-cols-3'

                        return (
                          <div className={`grid ${gridCols} gap-3`}>
                            {urls.slice(0, 9).map((url, idx) => (
                              <div
                                key={idx}
                                onClick={() => {
                                  setSelectedImageIndex(idx)
                                  setShowImageModal(true)
                                }}
                                className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 hover:border-blue-500 transition-all cursor-pointer group bg-gray-50 dark:bg-gray-900"
                              >
                                <Image
                                  src={getAssetUrl(url)}
                                  alt={`Post img ${idx}`}
                                  fill
                                  unoptimized={isExternalUrl(url)}
                                  className="object-cover group-hover:scale-110 transition-transform duration-500"
                                  sizes="(max-width: 768px) 33vw, 250px"
                                />
                              </div>
                            ))}
                          </div>
                        )
                      })()}
                    </div>
                  )}
                </div>

                {/* 统计和操作 - 现代化设计 */}
                <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center space-x-6">
                    {/* 浏览数 */}
                    <div className="flex items-center space-x-3 text-gray-500 dark:text-gray-400">
                      <div className="w-8 h-8 bg-gradient-to-br from-cyan-100 to-blue-100 dark:from-cyan-900/30 dark:to-blue-900/30 rounded-xl flex items-center justify-center">
                        <svg className="w-4 h-4 text-cyan-600 dark:text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </div>
                      <span className="font-medium">{t.social.views.replace('{count}', post.viewCount.toString())}</span>
                    </div>

                    {/* 回复数 */}
                    <div className="flex items-center space-x-3 text-gray-500 dark:text-gray-400">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30 rounded-xl flex items-center justify-center">
                        <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </div>
                      <span className="font-medium">{t.social.replies.replace('{count}', post.replyCount.toString())}</span>
                    </div>

                    {/* 点赞按钮 - 现代化设计 */}
                    <button
                      onClick={handleLike}
                      disabled={isLiking}
                      className={`group flex items-center space-x-3 px-4 py-2 rounded-lg font-pixel text-sm shadow-pixel-sm ${post.isLiked
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                        } ${isLiking ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95 transition-all'}`}
                    >
                      <div className={`w-8 h-8 ${post.isLiked ? 'bg-white/20' : 'bg-emerald-500/10'} rounded-lg flex items-center justify-center `}>
                        <svg
                          className={`w-4 h-4 ${post.isLiked ? 'text-white fill-current' : 'text-emerald-500'}  ${!post.isLiked && 'group-hover:scale-110 transition-transform'}`}
                          fill={post.isLiked ? 'currentColor' : 'none'}
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                      </div>
                      <span className={post.isLiked ? 'text-white' : ''}>{t.social.likes.replace('{count}', post.likeCount.toString())}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 回复区域 - 现代化设计 */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-slate-200 dark:border-gray-700/50 overflow-hidden">
              <div className="p-6 space-y-6">
                {/* 回复标题 */}
                <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30 rounded-2xl flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-gray-900 dark:text-white">
                        {t.social.replies_title}
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {t.social.replies_count.replace('{count}', (post.replyCount || 0).toString())}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 回复输入表单 */}
                <div id="reply-form-container" className="bg-white dark:bg-gray-900/50 rounded-2xl p-6 border border-slate-200 dark:border-gray-700/50 shadow-sm dark:shadow-none">
                  <CreateReplyForm
                    onSubmit={handleReplySubmit}
                    onCancel={() => { }}
                    isMobile={false}
                    isSubmitting={isCreatingReply}
                    variant="light"
                    replyToUser={replyToUser}
                    onClearReplyTo={() => setReplyToUser(null)}
                  />
                </div>

                {/* 错误显示 */}
                {repliesError && (
                  <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border border-red-200 dark:border-red-800/50 rounded-2xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-orange-500 rounded-xl flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-red-700 dark:text-red-300">{t.social.reply_failed}</p>
                        <p className="text-sm text-red-600 dark:text-red-400">{repliesError}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 加载状态 */}
                {isLoadingReplies && replies.length === 0 && (
                  <div className="flex items-center justify-center py-12">
                    <div className="flex flex-col items-center space-y-4">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full " style={{ animationDelay: '0ms' }}></div>
                        <div className="w-3 h-3 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full " style={{ animationDelay: '150ms' }}></div>
                        <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full " style={{ animationDelay: '300ms' }}></div>
                      </div>
                      <p className="text-gray-500 dark:text-gray-400 font-medium">{t.social.loading_replies}</p>
                    </div>
                  </div>
                )}

                {/* 回复列表 */}
                {replies.length > 0 && (
                  <div className="space-y-4">
                    {replies.map((reply, index) => (
                      <div key={reply.id} className="bg-white dark:bg-gray-900/50 rounded-2xl p-6 border border-slate-200 dark:border-gray-700/50 shadow-sm hover:shadow-md transition-all dark:hover:shadow-lg " style={{ animationDelay: `${index * 100}ms` }}>
                        <div className="flex items-start space-x-4">
                          {/* 回复者头像 */}
                          <div className="flex-shrink-0">
                            <div className="relative">
                              <UserAvatar
                                userId={reply.author.id}
                                userName={reply.author.name}
                                userAvatar={reply.author.avatar}
                                customAvatar={reply.author.customAvatar}
                                size="md"
                                showStatus={true}
                              />
                              {reply.author.workstationId && (
                                <div className="mt-1.5 flex justify-center">
                                  <span className="inline-flex items-center px-1 py-0.5 bg-amber-500/10 border border-amber-500/30 rounded-sm text-amber-500 font-pixel text-[8px] leading-none shadow-[1px_1px_0px_0px_rgba(0,0,0,0.5)] transform hover:scale-110 transition-transform cursor-help" title={`Workstation Owner: #${reply.author.workstationId}`}>
                                    <span className="text-[7px] mr-1 opacity-70">№</span>
                                    {reply.author.workstationId.length > 8 ? reply.author.workstationId.substring(0, 8) + '...' : reply.author.workstationId}
                                  </span>
                                </div>
                              )}
                              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                                <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </div>
                            </div>

                          </div>

                          {/* 回复内容 */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-3 mb-3">
                              <span className="font-pixel font-bold text-slate-900 dark:text-white flex items-center">
                                {reply.author.name}
                                {reply.author.isAdmin && <ProBadge />}
                              </span>
                              <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-pixel border border-emerald-500/20 rounded">
                                {t.social.replier || '回复者'}
                              </span>
                              <span className="text-gray-400 dark:text-gray-500 font-pixel">•</span>
                              <span className="text-gray-500 dark:text-gray-400 font-pixel text-xs">
                                {formatTimeAgo(reply.createdAt)}
                              </span>
                            </div>
                            <div className="prose dark:prose-invert max-w-none">
                              <p className="text-slate-700 dark:text-gray-300 leading-relaxed font-normal">
                                {renderContentWithUrls(reply.content, t.social.view_link)}
                              </p>
                            </div>

                            {/* 回复中的图片预览 */}
                            {(() => {
                              const replyImages = extractImageUrls(reply.content)
                              if (replyImages.length === 0) return null
                              return (
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {replyImages.map((imgUrl, idx) => (
                                    <div
                                      key={idx}
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setLightboxImages(replyImages)
                                        setLightboxInitialIndex(idx)
                                        setShowImageModal(true)
                                      }}
                                      className="relative w-24 h-24 rounded-lg border border-slate-200 dark:border-gray-700 overflow-hidden cursor-zoom-in group shadow-sm hover:shadow-md transition-all"
                                    >
                                      <Image
                                        src={getAssetUrl(imgUrl)}
                                        alt="Reply image"
                                        fill
                                        unoptimized={imgUrl.startsWith('http')}
                                        className="object-cover group-hover:scale-110 transition-transform duration-500"
                                        sizes="96px"
                                      />
                                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                        <svg className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                        </svg>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )
                            })()}

                            <div className="mt-4 flex items-center gap-4">
                              <button
                                onClick={() => handleReplyTo(reply)}
                                className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                </svg>
                                <span>{t.social.reply || '回复'}</span>
                              </button>

                              {reply.parentId && (
                                <button
                                  onClick={() => setShowConversationId(reply.id)}
                                  className="flex items-center gap-1.5 text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 transition-colors"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                  <span>{t.social.view_conversation || '查看会话'}</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 没有回复时的空状态 */}
                {!isLoadingReplies && replies.length === 0 && (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                      <svg className="w-10 h-10 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <h5 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t.social.no_replies}</h5>
                    <p className="text-gray-500 dark:text-gray-400">{t.social.no_replies_hint}</p>
                  </div>
                )}

                {/* 加载更多回复按钮 */}
                {repliesPagination.hasNextPage && (
                  <div className="flex justify-center pt-6 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={loadMoreReplies}
                      disabled={isLoadingReplies}
                      className="group relative overflow-hidden px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transform hover:scale-105  disabled:opacity-50"
                      title={t.social.load_more_replies}
                    >
                      <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <div className="relative flex items-center space-x-2">
                        {isLoadingReplies ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full "></div>
                            <span>{t.common.loading}</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                            </svg>
                            <span>{t.social.load_more_replies.replace('{count}', (repliesPagination.totalPages - repliesPagination.page).toString())}</span>
                          </>
                        )}
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* 删除确认对话框 */}
      {showDeleteModal && (
        <BillboardConfirmModal
          isVisible={showDeleteModal}
          onConfirm={handleConfirmDelete}
          onCancel={() => setShowDeleteModal(false)}
          currentPoints={100}
          cost={0}
          postTitle={post?.title || post?.content.substring(0, 20) || ''}
          customTitle={t.social.confirm_delete}
          customMessage={t.social.confirm_delete_msg}
        />
      )}

      {/* 会话查看弹窗 */}
      {showConversationId && postId && (
        <ConversationModal
          replyId={showConversationId}
          postId={postId}
          onClose={() => setShowConversationId(null)}
        />
      )}

      {/* 图片放大模态框 */}
      <ImageLightbox
        isOpen={showImageModal}
        onClose={() => setShowImageModal(false)}
        images={lightboxImages}
        initialIndex={lightboxInitialIndex}
      />

      </div>
    </div>
  )
}

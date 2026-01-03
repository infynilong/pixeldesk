'use client'

import { Post } from '@/types/social'
import UserAvatar from './UserAvatar'
import Link from 'next/link'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'

interface PostListItemProps {
  post: Post
  currentUserId: string
  onLike: () => void
  isAuthenticated?: boolean
  onShowLoginPrompt?: () => void
}

/**
 * 紧凑的列表视图 - 提高信息密度
 */
export default function PostListItem({
  post,
  currentUserId,
  onLike,
  isAuthenticated = true,
  onShowLoginPrompt
}: PostListItemProps) {
  const isLiked = post.isLiked || false
  const isOwnPost = post.author.id === currentUserId
  const [showImageModal, setShowImageModal] = useState(false)

  const handleLike = () => {
    if (!isAuthenticated) {
      onShowLoginPrompt?.()
      return
    }
    onLike()
  }

  // 格式化时间
  const formatTime = (date: Date | string) => {
    const now = new Date()
    const postDate = new Date(date)
    const diffMs = now.getTime() - postDate.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return '刚刚'
    if (diffMins < 60) return `${diffMins}分钟前`
    if (diffHours < 24) return `${diffHours}小时前`
    if (diffDays < 7) return `${diffDays}天前`
    return postDate.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
  }

  // 截取内容预览
  const getPreview = (content: string, maxLength = 150) => {
    if (content.length <= maxLength) return content
    return content.substring(0, maxLength) + '...'
  }

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
          </div>

          {/* 右侧内容区域 */}
          <div className="flex-1 min-w-0">
            {/* 标题 - 如果有，可点击跳转 */}
            {post.title && (
              <Link
                href={`/posts/${post.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <h4 className="text-gray-100 text-sm font-medium mb-0.5 line-clamp-1 hover:text-cyan-400 transition-colors cursor-pointer">
                  {post.title}
                </h4>
              </Link>
            )}

              {/* 元信息行：作者 + 时间 + 类型 + 标签 */}
              <div className="flex items-center gap-1.5 mb-1 text-xs flex-wrap">
                <Link
                  href={`/profile/${post.author.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-gray-400 hover:text-cyan-400 font-mono transition-colors"
                >
                  {post.author.name}
                </Link>
                <span className="text-gray-600">·</span>
                <span className="text-gray-500 font-mono flex-shrink-0">
                  {formatTime(post.createdAt)}
                </span>
                {isBlog && (
                  <>
                    <span className="text-gray-600">·</span>
                    <span className="inline-flex items-center gap-0.5 px-1 py-0.5 bg-cyan-600/20 border border-cyan-500/30 rounded text-cyan-400 font-pixel">
                      <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      <span className="text-2xs">博客</span>
                    </span>
                  </>
                )}
                {/* 标签 - 内联显示 */}
                {post.tags && post.tags.length > 0 && (
                  <>
                    {post.tags.slice(0, 2).map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-1 py-0.5 bg-gray-800/50 border border-gray-700/50 rounded text-gray-400 font-mono"
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
                <Link
                  href={`/posts/${post.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <p className="text-gray-400 text-xs leading-snug line-clamp-1 mb-1 hover:text-gray-300 transition-colors cursor-pointer">
                    {getPreview(post.content, 80)}
                  </p>
                </Link>
              )}

              {/* 图片缩略图 */}
              {(post.imageUrl || (post.imageUrls && post.imageUrls.length > 0)) && (
                <div className="mb-2 mt-1">
                  <div
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setShowImageModal(true)
                    }}
                    className="relative w-full max-w-[200px] h-[100px] rounded-lg overflow-hidden border border-gray-700/50 hover:border-cyan-500/50 transition-colors cursor-pointer group"
                  >
                    <Image
                      src={post.imageUrl || post.imageUrls?.[0] || ''}
                      alt="Post image"
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-200"
                      sizes="200px"
                    />
                    {/* 多图标识 */}
                    {post.imageUrls && post.imageUrls.length > 1 && (
                      <div className="absolute top-1 right-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                        +{post.imageUrls.length - 1}
                      </div>
                    )}
                    {/* 放大图标提示 */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                      <svg className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                      </svg>
                    </div>
                  </div>
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
                  className={`flex items-center gap-1 group/like transition-colors ${
                    isLiked
                      ? 'text-retro-red'
                      : 'text-gray-500 hover:text-retro-red'
                  } ${isOwnPost ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <svg className="w-3.5 h-3.5" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  <span className="font-mono">{post.likeCount || 0}</span>
                </button>

                {/* 回复 */}
                <Link
                  href={`/posts/${post.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1 text-gray-500 hover:text-cyan-400 transition-colors cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <span className="font-mono">{post.replyCount || 0}</span>
                </Link>

                {/* 阅读量 */}
                <div className="flex items-center gap-1 text-gray-500">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <span className="font-mono">{post.viewCount || 0}</span>
                </div>
              </div>
          </div>
        </div>
      </div>

      {/* 图片放大模态框 - 使用 Portal 渲染到 body */}
      {showImageModal && (post.imageUrl || (post.imageUrls && post.imageUrls.length > 0)) && typeof window !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center p-4"
          style={{ zIndex: 9999, pointerEvents: 'auto' }}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setShowImageModal(false)
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onMouseUp={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
        >
          <div
            className="relative max-w-[90vw] max-h-[90vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
          >
            {/* 关闭按钮 */}
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setShowImageModal(false)
              }}
              className="absolute -top-12 right-0 text-white hover:text-cyan-400 transition-colors z-10"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* 图片列表 - 支持滚动查看多图 */}
            <div
              className="relative max-w-full max-h-[90vh] overflow-y-auto space-y-4 px-4"
              onClick={(e) => e.stopPropagation()}
            >
              {post.imageUrl ? (
                <Image
                  src={post.imageUrl}
                  alt="Post image full size"
                  width={1200}
                  height={800}
                  className="max-w-full max-h-[90vh] w-auto h-auto object-contain rounded-lg"
                  quality={95}
                />
              ) : (
                post.imageUrls?.map((url, index) => (
                  <div key={index} className="mb-4 flex justify-center">
                    <Image
                      src={url}
                      alt={`Post image ${index + 1}`}
                      width={1200}
                      height={800}
                      className="max-w-full max-h-[85vh] w-auto h-auto object-contain rounded-lg shadow-2xl"
                      quality={95}
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

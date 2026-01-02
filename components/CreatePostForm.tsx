'use client'

import { useState } from 'react'
import { CreatePostData } from '@/types/social'

interface CreatePostFormProps {
  onSubmit: (postData: CreatePostData) => Promise<boolean>
  onCancel: () => void
  isMobile?: boolean
}

export default function CreatePostForm({ onSubmit, onCancel, isMobile = false }: CreatePostFormProps) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [imageUrlInput, setImageUrlInput] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  // 简单的键盘输入控制
  const handleInputFocus = () => {
    if (typeof window !== 'undefined' && (window as any).disableGameKeyboard) {
      (window as any).disableGameKeyboard()
    }
  }

  const handleInputBlur = () => {
    if (typeof window !== 'undefined' && (window as any).enableGameKeyboard) {
      (window as any).enableGameKeyboard()
    }
  }

  // 添加图片URL
  const handleAddImageUrl = () => {
    const url = imageUrlInput.trim()
    if (url && !imageUrls.includes(url)) {
      setImageUrls([...imageUrls, url])
      setImageUrlInput('')
    }
  }

  // 删除图片URL
  const handleRemoveImageUrl = (urlToRemove: string) => {
    setImageUrls(imageUrls.filter(url => url !== urlToRemove))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!content.trim()) {
      setError('请输入内容')
      return
    }

    if (content.length > 2000) {
      setError('内容过长（最多2000字符）')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const postData: CreatePostData = {
        title: title.trim() || undefined,
        content: content.trim(),
        type: 'TEXT',
        imageUrls: imageUrls.length > 0 ? imageUrls : undefined
      }

      console.log('📝 [CreatePostForm] 准备提交帖子:', postData)
      const success = await onSubmit(postData)
      console.log('✅ [CreatePostForm] 提交结果:', success)

      if (success) {
        setTitle('')
        setContent('')
        setImageUrls([])
        setImageUrlInput('')
      } else {
        setError('发布失败,请检查您的登录状态')
      }
    } catch (err) {
      console.error('❌ [CreatePostForm] 提交失败:', err)
      setError(err instanceof Error ? err.message : '发布失败')
    } finally {
      setIsSubmitting(false)
    }
  }

  const formClasses = isMobile
    ? "p-4"
    : "p-4"

  return (
    <div className={`${formClasses} relative`}>
      <div className="relative bg-gradient-to-br from-retro-bg-dark/50 to-retro-bg-darker/50 backdrop-blur-sm border border-retro-border/50 rounded-lg p-3 shadow-lg">
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* 内容输入 - 紧凑文本区域 */}
          <div className="relative group">
            <textarea
              placeholder="Share your thoughts..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              className="relative w-full bg-gradient-to-br from-retro-bg-dark/80 to-retro-bg-darker/80 border border-retro-border focus:border-retro-purple rounded-lg px-3 py-2 text-white placeholder-retro-textMuted focus:outline-none backdrop-blur-md  font-retro text-sm resize-none focus:shadow-lg focus:shadow-retro-purple/20"
              rows={isMobile ? 2 : 3}
              maxLength={2000}
              disabled={isSubmitting}
              data-input-container="true"
            />

            {/* 字符计数和错误显示 */}
            <div className="flex justify-between items-center mt-2 px-1">
              <span className="text-xs text-retro-textMuted font-pixel">{content.length}/2000</span>
              {error && (
                <span className="text-retro-red text-xs font-pixel">{error}</span>
              )}
            </div>
          </div>

          {/* 图片URL输入区域 */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="url"
                placeholder="添加图片URL..."
                value={imageUrlInput}
                onChange={(e) => setImageUrlInput(e.target.value)}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddImageUrl()
                  }
                }}
                className="flex-1 bg-gradient-to-br from-retro-bg-dark/80 to-retro-bg-darker/80 border border-retro-border focus:border-retro-cyan rounded-lg px-3 py-1.5 text-white placeholder-retro-textMuted focus:outline-none backdrop-blur-md font-retro text-xs"
                disabled={isSubmitting}
                data-input-container="true"
              />
              <button
                type="button"
                onClick={handleAddImageUrl}
                disabled={!imageUrlInput.trim() || isSubmitting}
                className="bg-gradient-to-r from-retro-cyan/80 to-retro-blue/80 hover:from-retro-cyan hover:to-retro-blue text-white font-medium py-1.5 px-3 rounded-lg border border-white/20 disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm text-xs font-pixel"
              >
                📷 添加
              </button>
            </div>

            {/* 图片URL列表 */}
            {imageUrls.length > 0 && (
              <div className="space-y-1.5">
                {imageUrls.map((url, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 bg-gradient-to-br from-retro-bg-dark/60 to-retro-bg-darker/60 border border-retro-border/50 rounded-lg p-2 backdrop-blur-sm"
                  >
                    {/* 缩略图 */}
                    <img
                      src={url}
                      alt={`图片 ${index + 1}`}
                      className="w-10 h-10 object-cover rounded border border-retro-border/50"
                      onError={(e) => {
                        e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="40" height="40"%3E%3Crect fill="%23374151" width="40" height="40"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239CA3AF" font-size="10"%3E❌%3C/text%3E%3C/svg%3E'
                      }}
                    />
                    {/* URL文本 */}
                    <span className="flex-1 text-xs text-retro-textMuted truncate font-mono">
                      {url}
                    </span>
                    {/* 删除按钮 */}
                    <button
                      type="button"
                      onClick={() => handleRemoveImageUrl(url)}
                      disabled={isSubmitting}
                      className="text-retro-red hover:text-red-400 text-sm px-2 py-1 disabled:opacity-50"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 操作按钮 - 紧凑设计 */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setTitle('')
                setContent('')
                setImageUrls([])
                setImageUrlInput('')
                setError('')
              }}
              disabled={isSubmitting}
              className="relative group overflow-hidden bg-gradient-to-r from-retro-bg-dark/80 to-retro-bg-darker/80 hover:from-retro-border/60 hover:to-retro-border/80 text-white font-medium py-1.5 px-3 rounded-lg border border-retro-border hover:border-retro-yellow/60  shadow-sm hover:shadow-md backdrop-blur-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              <div className="flex items-center gap-1">
                <span className="text-xs">🧹</span>
                <span className="font-pixel text-xs">CLEAR</span>
              </div>
            </button>

            <button
              type="submit"
              disabled={isSubmitting || !content.trim()}
              className="relative group overflow-hidden bg-gradient-to-r from-retro-purple to-retro-blue hover:from-retro-blue hover:to-retro-cyan text-white font-bold py-1.5 px-4 rounded-lg border border-white/20 hover:border-white/40  shadow-sm hover:shadow-lg backdrop-blur-sm disabled:cursor-not-allowed disabled:opacity-50 "
            >
              <div className="flex items-center gap-1">
                {isSubmitting ? (
                  <>
                    <div className="w-3 h-3 border border-white border-t-transparent rounded-full "></div>
                    <span className="font-pixel text-xs">POST...</span>
                  </>
                ) : (
                  <>
                    <span className="text-xs">🚀</span>
                    <span className="font-pixel text-xs">PUBLISH</span>
                  </>
                )}
              </div>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
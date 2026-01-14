'use client'

import { useState } from 'react'
import { CreatePostData } from '@/types/social'
import { useTranslation } from '@/lib/hooks/useTranslation'

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
  const { t } = useTranslation()

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
      setError(t.social.err_empty)
      return
    }

    if (content.length > 2000) {
      setError(t.social.err_too_long)
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
        setError(t.social.err_failed)
      }
    } catch (err) {
      console.error('❌ [CreatePostForm] 提交失败:', err)
      setError(err instanceof Error ? err.message : t.social.err_failed)
    } finally {
      setIsSubmitting(false)
    }
  }

  const formClasses = isMobile
    ? "p-4"
    : "p-4"

  return (
    <div className={`${formClasses} relative group/form`}>
      <div className="relative bg-gradient-to-br from-retro-bg-dark/60 via-retro-bg-dark/40 to-retro-bg-darker/60 backdrop-blur-xl border border-white/5 rounded-2xl p-4 shadow-2xl shadow-black/40 transition-all duration-500 group-hover/form:border-white/10 group-hover/form:shadow-purple-500/5">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 内容输入 - 紧凑文本区域 */}
          <div className="relative group">
            <textarea
              placeholder={t.social.share_placeholder}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              className="relative w-full bg-black/40 border border-white/10 focus:border-retro-purple/50 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none backdrop-blur-md font-retro text-sm resize-none transition-all duration-300 focus:shadow-[0_0_20px_rgba(168,85,247,0.15)] focus:bg-black/60"
              rows={isMobile ? 3 : 4}
              maxLength={2000}
              disabled={isSubmitting}
              data-input-container="true"
            />

            {/* 字符计数和错误显示 */}
            <div className="flex justify-between items-center mt-2 px-1">
              <span className="text-[10px] text-white/40 font-pixel tracking-tighter">{content.length} <span className="opacity-50">/ 2000</span></span>
              {error && (
                <span className="bg-red-500/10 text-retro-red text-[10px] font-pixel border border-red-500/20 px-2 py-0.5 rounded-full animate-shake">{error}</span>
              )}
            </div>
          </div>

          {/* 图片URL输入区域 */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="url"
                placeholder={t.social.img_url_placeholder}
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
                className="flex-1 bg-black/40 border border-white/10 focus:border-retro-cyan/50 rounded-xl px-4 py-2 text-white placeholder-white/30 focus:outline-none backdrop-blur-md font-retro text-xs transition-all duration-300"
                disabled={isSubmitting}
                data-input-container="true"
              />
              <button
                type="button"
                onClick={handleAddImageUrl}
                disabled={!imageUrlInput.trim() || isSubmitting}
                className="bg-gradient-to-r from-retro-cyan/40 to-retro-blue/40 hover:from-retro-cyan/60 hover:to-retro-blue/60 text-white font-medium py-2 px-4 rounded-xl border border-white/10 hover:border-white/20 shadow-lg transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-md text-[10px] font-pixel uppercase tracking-widest whitespace-nowrap"
              >
                📷 {t.social.add}
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
              className="group relative overflow-hidden bg-white/5 hover:bg-white/10 text-white/70 hover:text-white font-medium py-2 px-5 rounded-xl border border-white/10 hover:border-retro-yellow/30 shadow-sm transition-all duration-300 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm transition-transform group-hover:rotate-12">🧹</span>
                <span className="font-pixel text-[10px] uppercase tracking-wider">{t.social.clear}</span>
              </div>
            </button>

            <button
              type="submit"
              disabled={isSubmitting || !content.trim()}
              className="relative group overflow-hidden bg-gradient-to-r from-retro-purple via-retro-pink to-retro-blue text-white font-bold py-2 px-6 rounded-xl border border-white/20 hover:border-white/40 shadow-xl shadow-purple-500/10 hover:shadow-purple-500/20 transition-all duration-300 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative flex items-center gap-2">
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span className="font-pixel text-[10px] uppercase tracking-widest">{t.social.publish}...</span>
                  </>
                ) : (
                  <>
                    <span className="text-sm transition-transform group-hover:-translate-y-1 group-hover:translate-x-1">🚀</span>
                    <span className="font-pixel text-[10px] uppercase tracking-widest">{t.social.publish}</span>
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
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
        type: 'TEXT'
      }

      const success = await onSubmit(postData)
      
      if (success) {
        setTitle('')
        setContent('')
      }
    } catch (err) {
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
              className="relative w-full bg-gradient-to-br from-retro-bg-dark/80 to-retro-bg-darker/80 border border-retro-border focus:border-retro-purple rounded-lg px-3 py-2 text-white placeholder-retro-textMuted focus:outline-none backdrop-blur-md transition-all duration-300 font-retro text-sm resize-none focus:shadow-lg focus:shadow-retro-purple/20"
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

          {/* 操作按钮 - 紧凑设计 */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setTitle('')
                setContent('')
                setError('')
              }}
              disabled={isSubmitting}
              className="relative group overflow-hidden bg-gradient-to-r from-retro-bg-dark/80 to-retro-bg-darker/80 hover:from-retro-border/60 hover:to-retro-border/80 text-white font-medium py-1.5 px-3 rounded-lg border border-retro-border hover:border-retro-yellow/60 transition-all duration-200 shadow-sm hover:shadow-md backdrop-blur-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              <div className="flex items-center gap-1">
                <span className="text-xs">🧹</span>
                <span className="font-pixel text-xs">CLEAR</span>
              </div>
            </button>

            <button
              type="submit"
              disabled={isSubmitting || !content.trim()}
              className="relative group overflow-hidden bg-gradient-to-r from-retro-purple to-retro-blue hover:from-retro-blue hover:to-retro-cyan text-white font-bold py-1.5 px-4 rounded-lg border border-white/20 hover:border-white/40 transition-all duration-200 shadow-sm hover:shadow-lg backdrop-blur-sm disabled:cursor-not-allowed disabled:opacity-50 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="flex items-center gap-1">
                {isSubmitting ? (
                  <>
                    <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
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
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
      {/* 背景装饰 */}
      <div className="absolute inset-0 bg-gradient-to-br from-retro-purple/5 via-retro-pink/8 to-retro-blue/5 rounded-xl opacity-60 pointer-events-none"></div>
      
      <div className="relative bg-gradient-to-br from-retro-bg-dark/50 to-retro-bg-darker/50 backdrop-blur-sm border-2 border-retro-border/50 rounded-xl p-5 shadow-lg">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 表单标题 */}
          <div className="flex items-center gap-3 pb-3 border-b border-retro-border/30">
            <div className="w-6 h-6 bg-gradient-to-br from-retro-purple/30 to-retro-pink/30 rounded-lg flex items-center justify-center shadow-lg">
              <span className="text-sm">✏️</span>
            </div>
            <h3 className="text-white font-bold text-sm font-pixel tracking-wide">CREATE POST</h3>
          </div>

          {/* 标题输入（可选） - 像素化输入框 */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-retro-blue/10 to-retro-cyan/10 rounded-xl opacity-0 group-focus-within:opacity-100 transition-all duration-300 blur-sm"></div>
            <input
              type="text"
              placeholder="Add title (optional)..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              className="relative w-full bg-gradient-to-br from-retro-bg-dark/80 to-retro-bg-darker/80 border-2 border-retro-border focus:border-retro-blue rounded-xl px-4 py-3 text-white placeholder-retro-textMuted focus:outline-none backdrop-blur-md transition-all duration-300 font-retro text-sm focus:shadow-lg focus:shadow-retro-blue/20"
              maxLength={100}
              disabled={isSubmitting}
              data-input-container="true"
            />
          </div>

          {/* 内容输入 - 像素化文本区域 */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-retro-purple/10 to-retro-pink/10 rounded-xl opacity-0 group-focus-within:opacity-100 transition-all duration-300 blur-sm"></div>
            <textarea
              placeholder="Share your thoughts..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              className="relative w-full bg-gradient-to-br from-retro-bg-dark/80 to-retro-bg-darker/80 border-2 border-retro-border focus:border-retro-purple rounded-xl px-4 py-3 text-white placeholder-retro-textMuted focus:outline-none backdrop-blur-md transition-all duration-300 font-retro text-sm resize-none focus:shadow-lg focus:shadow-retro-purple/20"
              rows={isMobile ? 3 : 4}
              maxLength={2000}
              disabled={isSubmitting}
              data-input-container="true"
            />
            
            {/* 字符计数和错误显示 - 像素化信息栏 */}
            <div className="flex justify-between items-center mt-3 px-2">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-retro-cyan/30 rounded flex items-center justify-center">
                  <span className="text-xs">📝</span>
                </div>
                <span className="text-xs text-retro-textMuted font-pixel tracking-wide">{content.length}/2000</span>
              </div>
              {error && (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-retro-red/30 rounded flex items-center justify-center">
                    <span className="text-xs">⚠️</span>
                  </div>
                  <span className="text-retro-red text-xs font-pixel tracking-wide">{error}</span>
                </div>
              )}
            </div>
          </div>

          {/* 操作区域 - 现代像素风格 */}
          <div className="flex items-center justify-between pt-3 border-t border-retro-border/30">
            {/* 工具按钮组 */}
            <div className="flex items-center space-x-2">
              <button
                type="button"
                className="group relative overflow-hidden p-2 bg-gradient-to-br from-retro-bg-dark/80 to-retro-bg-darker/80 hover:from-retro-blue/20 hover:to-retro-cyan/20 rounded-lg border-2 border-retro-border hover:border-retro-blue/50 transition-all duration-200 disabled:opacity-50 shadow-lg"
                title="Add image (coming soon)"
                disabled
              >
                <div className="absolute inset-0 bg-gradient-to-r from-retro-blue/5 to-retro-cyan/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <svg className="relative w-4 h-4 text-retro-textMuted group-hover:text-retro-cyan transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </button>
              
              <button
                type="button"
                className="group relative overflow-hidden p-2 bg-gradient-to-br from-retro-bg-dark/80 to-retro-bg-darker/80 hover:from-retro-yellow/20 hover:to-retro-orange/20 rounded-lg border-2 border-retro-border hover:border-retro-yellow/50 transition-all duration-200 disabled:opacity-50 shadow-lg"
                title="Add emoji (coming soon)"
                disabled
              >
                <div className="absolute inset-0 bg-gradient-to-r from-retro-yellow/5 to-retro-orange/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <svg className="relative w-4 h-4 text-retro-textMuted group-hover:text-retro-yellow transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            </div>

            {/* 主要操作按钮 */}
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={onCancel}
                disabled={isSubmitting}
                className="relative group overflow-hidden bg-gradient-to-r from-retro-bg-dark/80 to-retro-bg-darker/80 hover:from-retro-border/60 hover:to-retro-border/80 disabled:from-retro-textMuted/20 disabled:to-retro-border/20 text-white font-medium py-2 px-4 rounded-xl border-2 border-retro-border hover:border-retro-red/60 disabled:border-retro-textMuted/20 transition-all duration-300 shadow-lg hover:shadow-xl disabled:shadow-none backdrop-blur-sm disabled:cursor-not-allowed"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-retro-red/5 to-retro-orange/5 opacity-0 group-hover:opacity-100 group-disabled:opacity-0 transition-opacity duration-300"></div>
                <div className="relative flex items-center gap-2">
                  <div className="w-4 h-4 bg-retro-red/20 rounded flex items-center justify-center group-hover:bg-retro-red/30 group-disabled:bg-retro-textMuted/20 transition-all duration-200">
                    <span className="text-xs">✕</span>
                  </div>
                  <span className="font-pixel text-sm tracking-wide">CANCEL</span>
                </div>
              </button>
              
              <button
                type="submit"
                disabled={isSubmitting || !content.trim()}
                className="relative group overflow-hidden bg-gradient-to-r from-retro-purple via-retro-pink to-retro-blue hover:from-retro-blue hover:via-retro-cyan hover:to-retro-green disabled:from-retro-textMuted/30 disabled:to-retro-border/30 text-white font-bold py-2 px-6 rounded-xl border-2 border-white/20 hover:border-white/40 disabled:border-retro-textMuted/20 transition-all duration-300 shadow-lg hover:shadow-2xl disabled:shadow-none backdrop-blur-sm disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98] disabled:scale-100"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-white/20 to-white/10 opacity-0 group-hover:opacity-100 group-disabled:opacity-0 transition-opacity duration-300"></div>
                
                <div className="relative flex items-center gap-3">
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 bg-white/20 rounded flex items-center justify-center">
                        <div className="w-2 h-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      </div>
                      <span className="font-pixel text-sm tracking-wide">POSTING...</span>
                    </>
                  ) : (
                    <>
                      <div className="w-4 h-4 bg-white/20 rounded flex items-center justify-center group-disabled:bg-retro-textMuted/20">
                        <span className="text-xs">🚀</span>
                      </div>
                      <span className="font-pixel text-sm tracking-wide drop-shadow-lg">PUBLISH</span>
                    </>
                  )}
                </div>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
'use client'

import { useState } from 'react'
import { CreateReplyData } from '@/types/social'

interface CreateReplyFormProps {
  onSubmit: (replyData: CreateReplyData) => Promise<boolean>
  onCancel: () => void
  isMobile?: boolean
  isSubmitting?: boolean
}

export default function CreateReplyForm({ 
  onSubmit, 
  onCancel, 
  isMobile = false,
  isSubmitting = false
}: CreateReplyFormProps) {
  const [content, setContent] = useState('')
  const [error, setError] = useState('')
  const [isInternalSubmitting, setIsInternalSubmitting] = useState(false)

  const finalIsSubmitting = isSubmitting || isInternalSubmitting

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!content.trim()) {
      setError('请输入回复内容')
      return
    }

    if (content.length > 1000) {
      setError('回复过长（最多1000字符）')
      return
    }

    setIsInternalSubmitting(true)
    setError('')

    try {
      const replyData: CreateReplyData = {
        content: content.trim()
      }

      const success = await onSubmit(replyData)
      
      if (success) {
        setContent('')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '回复失败')
    } finally {
      setIsInternalSubmitting(false)
    }
  }

  return (
    <div className="relative p-4 border-t border-retro-border/30">
      {/* 背景装饰 */}
      <div className="absolute inset-0 bg-gradient-to-br from-retro-blue/3 via-retro-cyan/5 to-retro-purple/3 opacity-60 pointer-events-none"></div>
      
      <div className="relative">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 表单标题 */}
          <div className="flex items-center gap-3 pb-3 border-b border-retro-border/20">
            <div className="w-5 h-5 bg-gradient-to-br from-retro-blue/30 to-retro-cyan/30 rounded-lg flex items-center justify-center shadow-sm">
              <span className="text-xs">💬</span>
            </div>
            <h4 className="text-white font-bold text-sm font-pixel tracking-wide">REPLY TO POST</h4>
          </div>

          {/* 内容输入 - 像素化文本区域 */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-retro-blue/8 to-retro-cyan/8 rounded-xl opacity-0 group-focus-within:opacity-100 transition-all duration-300 blur-sm"></div>
            <textarea
              placeholder="Share your thoughts..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="relative w-full bg-gradient-to-br from-retro-bg-dark/60 to-retro-bg-darker/60 border-2 border-retro-border focus:border-retro-blue rounded-xl px-4 py-3 text-white placeholder-retro-textMuted focus:outline-none backdrop-blur-md transition-all duration-300 font-retro text-sm resize-none focus:shadow-lg focus:shadow-retro-blue/20"
              rows={isMobile ? 2 : 3}
              maxLength={1000}
              disabled={finalIsSubmitting}
            />
            
            {/* 字符计数和错误显示 */}
            <div className="flex justify-between items-center mt-2 px-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-retro-cyan/30 rounded flex items-center justify-center">
                  <span className="text-xs">✍️</span>
                </div>
                <span className="text-xs text-retro-textMuted font-pixel tracking-wide">{content.length}/1000</span>
              </div>
              {error && (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-retro-red/30 rounded flex items-center justify-center">
                    <span className="text-xs">⚠️</span>
                  </div>
                  <span className="text-retro-red text-xs font-pixel tracking-wide">{error}</span>
                </div>
              )}
            </div>
          </div>

          {/* 操作按钮区域 */}
          <div className="flex items-center justify-between pt-2">
            {/* 工具提示 */}
            <div className="flex items-center gap-2 text-retro-textMuted">
              <div className="w-4 h-4 bg-retro-blue/20 rounded flex items-center justify-center">
                <span className="text-xs">💡</span>
              </div>
              <span className="text-xs font-retro">Be respectful and constructive</span>
            </div>

            {/* 主要操作按钮 */}
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={onCancel}
                disabled={finalIsSubmitting}
                className="relative group overflow-hidden bg-gradient-to-r from-retro-bg-dark/80 to-retro-bg-darker/80 hover:from-retro-border/60 hover:to-retro-border/80 disabled:from-retro-textMuted/20 disabled:to-retro-border/20 text-white font-medium py-2 px-4 rounded-xl border-2 border-retro-border hover:border-retro-red/60 disabled:border-retro-textMuted/20 transition-all duration-300 shadow-lg hover:shadow-xl disabled:shadow-none backdrop-blur-sm disabled:cursor-not-allowed"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-retro-red/5 to-retro-orange/5 opacity-0 group-hover:opacity-100 group-disabled:opacity-0 transition-opacity duration-300"></div>
                <div className="relative flex items-center gap-2">
                  <div className="w-3 h-3 bg-retro-red/20 rounded flex items-center justify-center group-hover:bg-retro-red/30 group-disabled:bg-retro-textMuted/20 transition-all duration-200">
                    <span className="text-xs">✕</span>
                  </div>
                  <span className="font-pixel text-xs tracking-wide">CANCEL</span>
                </div>
              </button>
              
              <button
                type="submit"
                disabled={finalIsSubmitting || !content.trim()}
                className="relative group overflow-hidden bg-gradient-to-r from-retro-blue via-retro-cyan to-retro-green hover:from-retro-green hover:via-retro-cyan hover:to-retro-blue disabled:from-retro-textMuted/30 disabled:to-retro-border/30 text-white font-bold py-2 px-5 rounded-xl border-2 border-white/20 hover:border-white/40 disabled:border-retro-textMuted/20 transition-all duration-300 shadow-lg hover:shadow-2xl disabled:shadow-none backdrop-blur-sm disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98] disabled:scale-100"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-white/20 to-white/10 opacity-0 group-hover:opacity-100 group-disabled:opacity-0 transition-opacity duration-300"></div>
                
                <div className="relative flex items-center gap-2">
                  {finalIsSubmitting ? (
                    <>
                      <div className="w-3 h-3 bg-white/20 rounded flex items-center justify-center">
                        <div className="w-2 h-2 border border-white border-t-transparent rounded-full animate-spin"></div>
                      </div>
                      <span className="font-pixel text-xs tracking-wide">REPLYING...</span>
                    </>
                  ) : (
                    <>
                      <div className="w-3 h-3 bg-white/20 rounded flex items-center justify-center group-disabled:bg-retro-textMuted/20">
                        <span className="text-xs">💬</span>
                      </div>
                      <span className="font-pixel text-xs tracking-wide drop-shadow-lg">REPLY</span>
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
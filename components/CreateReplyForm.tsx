'use client'

import { useState } from 'react'
import { CreateReplyData } from '@/types/social'

interface CreateReplyFormProps {
  onSubmit: (replyData: CreateReplyData) => Promise<boolean>
  onCancel: () => void
  isMobile?: boolean
  isSubmitting?: boolean
  variant?: 'dark' | 'light' // 新增：支持不同主题变体
}

export default function CreateReplyForm({
  onSubmit,
  onCancel,
  isMobile = false,
  isSubmitting = false,
  variant = 'dark'
}: CreateReplyFormProps) {
  const [content, setContent] = useState('')
  const [error, setError] = useState('')
  const [isInternalSubmitting, setIsInternalSubmitting] = useState(false)

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

  const finalIsSubmitting = isSubmitting || isInternalSubmitting

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    console.log('🚀 [CreateReplyForm] 开始提交回复，内容:', content.trim())

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

      console.log('📤 [CreateReplyForm] 调用onSubmit，数据:', replyData)
      const success = await onSubmit(replyData)
      console.log('📥 [CreateReplyForm] onSubmit结果:', success)

      if (success) {
        setContent('')
        console.log('✅ [CreateReplyForm] 回复成功，表单已清空')
      } else {
        setError('回复失败，请重试')
        console.error('❌ [CreateReplyForm] 回复失败')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '回复失败'
      setError(errorMessage)
      console.error('❌ [CreateReplyForm] 回复异常:', err)
    } finally {
      setIsInternalSubmitting(false)
    }
  }

  // 根据variant设置样式
  const getVariantStyles = () => {
    if (variant === 'light') {
      return {
        container: "relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm",
        textarea: "w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400 rounded-xl px-4 py-3 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 resize-none",
        counter: "text-xs text-gray-500 dark:text-gray-400",
        error: "text-red-500 dark:text-red-400 text-xs font-medium",
        clearButton: "px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 transition-all duration-200 text-sm font-medium",
        submitButton: "px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-lg border border-transparent transition-all duration-200 shadow-sm hover:shadow-md text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 transform hover:scale-105 active:scale-95"
      }
    } else {
      return {
        container: "relative bg-gradient-to-br from-retro-bg-dark/50 to-retro-bg-darker/50 backdrop-blur-sm border border-retro-border/50 rounded-lg p-3 shadow-lg",
        textarea: "relative w-full bg-gradient-to-br from-retro-bg-dark/80 to-retro-bg-darker/80 border border-retro-border focus:border-retro-blue rounded-lg px-3 py-2 text-white placeholder-retro-textMuted focus:outline-none backdrop-blur-md transition-all duration-300 font-retro text-sm resize-none focus:shadow-lg focus:shadow-retro-blue/20",
        counter: "text-xs text-retro-textMuted font-pixel",
        error: "text-retro-red text-xs font-pixel",
        clearButton: "relative group overflow-hidden bg-gradient-to-r from-retro-bg-dark/80 to-retro-bg-darker/80 hover:from-retro-border/60 hover:to-retro-border/80 text-white font-medium py-1.5 px-3 rounded-lg border border-retro-border hover:border-retro-yellow/60 transition-all duration-200 shadow-sm hover:shadow-md backdrop-blur-sm disabled:cursor-not-allowed disabled:opacity-50",
        submitButton: "relative group overflow-hidden bg-gradient-to-r from-retro-blue to-retro-cyan hover:from-retro-cyan hover:to-retro-green text-white font-bold py-1.5 px-4 rounded-lg border border-white/20 hover:border-white/40 transition-all duration-200 shadow-sm hover:shadow-lg backdrop-blur-sm disabled:cursor-not-allowed disabled:opacity-50 transform hover:scale-[1.02] active:scale-[0.98]"
      }
    }
  }

  const styles = getVariantStyles()

  return (
    <div className={styles.container}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 内容输入 */}
        <div className="relative">
          <textarea
            placeholder={variant === 'light' ? '写下你的回复...' : 'Write a reply...'}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            className={styles.textarea}
            rows={isMobile ? 3 : 4}
            maxLength={1000}
            disabled={finalIsSubmitting}
            data-input-container="true"
          />

          {/* 字符计数和错误显示 */}
          <div className="flex justify-between items-center mt-3">
            <span className={styles.counter}>{content.length}/1000 字符</span>
            {error && (
              <span className={styles.error}>{error}</span>
            )}
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => {
              setContent('')
              setError('')
            }}
            disabled={finalIsSubmitting}
            className={styles.clearButton}
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>清空</span>
            </div>
          </button>

          <button
            type="submit"
            disabled={finalIsSubmitting || !content.trim()}
            className={styles.submitButton}
          >
            <div className="flex items-center gap-2">
              {finalIsSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                  <span>发布中...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  <span>发布回复</span>
                </>
              )}
            </div>
          </button>
        </div>
      </form>
    </div>
  )
}
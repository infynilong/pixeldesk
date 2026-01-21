'use client'

import { useState } from 'react'
import { CreateReplyData } from '@/types/social'

interface CreateReplyFormProps {
  onSubmit: (replyData: CreateReplyData) => Promise<boolean>
  onCancel: () => void
  isMobile?: boolean
  isSubmitting?: boolean
  variant?: 'dark' | 'light' | 'chat'
  theme?: 'light' | 'dark'
  replyToUser?: { id: string, name: string, replyId: string } | null // 新增：正在回复的用户信息
  onClearReplyTo?: () => void // 新增：清除回复目标
}

export default function CreateReplyForm({
  onSubmit,
  onCancel,
  isMobile = false,
  isSubmitting = false,
  variant = 'dark',
  theme = 'dark',
  replyToUser = null,
  onClearReplyTo
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

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()

    if (!content.trim()) return

    if (content.length > 1000) {
      setError('回复过长（最多1000字符）')
      return
    }

    setIsInternalSubmitting(true)
    setError('')

    try {
      const replyData: CreateReplyData = {
        content: content.trim(),
        parentId: replyToUser?.replyId
      }

      const success = await onSubmit(replyData)

      if (success) {
        setContent('')
      } else {
        setError('回复失败')
      }
    } catch (err) {
      setError('回复失败')
    } finally {
      setIsInternalSubmitting(false)
    }
  }

  // 根据variant设置样式
  const getVariantStyles = () => {
    if (variant === 'chat') {
      return {
        container: `relative backdrop-blur-2xl border rounded-2xl p-2 shadow-2xl flex items-end gap-2 transition-all ${theme === 'dark' ? 'bg-[#24272a]/60 border-white/10' : 'bg-white border-slate-200 shadow-slate-200/50'
          }`,
        textarea: `flex-1 bg-transparent border-none focus:ring-0 placeholder-gray-500 text-sm py-2 px-2 max-h-32 overflow-y-auto resize-none min-h-[40px] ${theme === 'dark' ? 'text-white' : 'text-slate-900'
          }`,
        counter: "hidden",
        error: `absolute -top-6 left-2 text-[10px] px-2 py-0.5 rounded ${theme === 'dark' ? 'text-red-500 bg-black/80' : 'text-red-600 bg-white shadow-sm border border-red-100'
          }`,
        clearButton: "hidden",
        submitButton: "bg-cyan-500 hover:bg-cyan-400 text-black p-2 rounded-xl transition-all disabled:opacity-30 disabled:grayscale shrink-0"
      }
    }
    if (variant === 'light') {
      return {
        container: "relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 sm:p-4 shadow-sm",
        textarea: "w-full bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400 rounded-xl px-3 py-2 sm:px-4 sm:py-3 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none",
        counter: "text-xs text-gray-500 dark:text-gray-400",
        error: "text-red-500 dark:text-red-400 text-xs font-medium",
        clearButton: "px-2 py-1.5 sm:px-3 sm:py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-xs sm:text-sm font-medium",
        submitButton: "px-3 py-1.5 sm:px-4 sm:py-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-lg border border-transparent shadow-sm hover:shadow-md text-xs sm:text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 transform hover:scale-105 active:scale-95"
      }
    } else {
      return {
        container: "relative bg-gradient-to-br from-retro-bg-dark/50 to-retro-bg-darker/50 backdrop-blur-sm border border-retro-border/50 rounded-lg p-3 shadow-lg",
        textarea: "relative w-full bg-gradient-to-br from-retro-bg-dark/80 to-retro-bg-darker/80 border border-retro-border focus:border-retro-blue rounded-lg px-3 py-2 text-white placeholder-retro-textMuted focus:outline-none backdrop-blur-md  font-retro text-sm resize-none focus:shadow-lg focus:shadow-retro-blue/20",
        counter: "text-xs text-retro-textMuted font-pixel",
        error: "text-retro-red text-xs font-pixel",
        clearButton: "relative group overflow-hidden bg-gradient-to-r from-retro-bg-dark/80 to-retro-bg-darker/80 hover:from-retro-border/60 hover:to-retro-border/80 text-white font-medium py-1.5 px-3 rounded-lg border border-retro-border hover:border-retro-yellow/60  shadow-sm hover:shadow-md backdrop-blur-sm disabled:cursor-not-allowed disabled:opacity-50",
        submitButton: "relative group overflow-hidden bg-gradient-to-r from-retro-blue to-retro-cyan hover:from-retro-cyan hover:to-retro-green text-white font-bold py-1.5 px-4 rounded-lg border border-white/20 hover:border-white/40  shadow-sm hover:shadow-lg backdrop-blur-sm disabled:cursor-not-allowed disabled:opacity-50 "
      }
    }
  }

  const styles = getVariantStyles()

  // 处理键盘事件，支持回车发送 (仅在聊天模式下)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (variant === 'chat' && e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  if (variant === 'chat') {
    return (
      <div className={styles.container}>
        {error && <span className={styles.error}>{error}</span>}
        <textarea
          placeholder="Type a message..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          className={styles.textarea}
          rows={1}
          disabled={finalIsSubmitting}
          data-input-container="true"
        />
        <button
          type="button"
          onClick={() => handleSubmit()}
          disabled={finalIsSubmitting || !content.trim()}
          className={styles.submitButton}
        >
          {finalIsSubmitting ? (
            <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          )}
        </button>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 回复目标提示 */}
        {replyToUser && (
          <div className="flex items-center justify-between bg-blue-500/10 dark:bg-blue-400/10 border border-blue-500/20 dark:border-blue-400/20 rounded-lg px-3 py-1.5 ">
            <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 font-medium">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              <span>正在回复 @{replyToUser.name}</span>
            </div>
            <button
              type="button"
              onClick={onClearReplyTo}
              className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transform hover:scale-110 transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        {/* 内容输入 */}
        <div className="relative">
          <textarea
            placeholder={replyToUser ? `回复 @${replyToUser.name}...` : (variant === 'light' ? '写下你的回复...' : 'Write a reply...')}
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
            onClick={onCancel}
            disabled={finalIsSubmitting}
            className={styles.clearButton}
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              <span>收起</span>
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
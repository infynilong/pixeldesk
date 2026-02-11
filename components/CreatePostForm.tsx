'use client'

import { useState, useRef, useEffect } from 'react'
import { CreatePostData } from '@/types/social'
import { useTranslation } from '@/lib/hooks/useTranslation'
import { useNodes } from '@/lib/hooks/useNodes'
import { useLevelPermission } from '@/lib/hooks/useLevelPermission'
import { useImageUpload } from '@/lib/hooks/useImageUpload'

interface CreatePostFormProps {
  onSubmit: (postData: CreatePostData) => Promise<boolean>
  onCancel: () => void
  isMobile?: boolean
}

export default function CreatePostForm({ onSubmit, onCancel, isMobile = false }: CreatePostFormProps) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [dismissedUrls, setDismissedUrls] = useState<string[]>([])
  const { nodes } = useNodes()
  const [selectedNodeId, setSelectedNodeId] = useState<string>('')
  const [isNodeDropdownOpen, setIsNodeDropdownOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const nodeDropdownRef = useRef<HTMLDivElement>(null)
  const { t } = useTranslation()
  const { hasPermission, getRequiredLevel, loading: permissionsLoading } = useLevelPermission()

  const canUploadImage = hasPermission('social_image_upload')
  const requiredLevelForImage = getRequiredLevel('social_image_upload')

  // 设置默认节点
  useEffect(() => {
    if (nodes.length > 0 && !selectedNodeId) {
      // 优先选择 slug 为 "default" 的节点，否则选第一个
      const defaultNode = nodes.find(n => n.slug === 'default') || nodes[0]
      setSelectedNodeId(defaultNode.id)
    }
  }, [nodes, selectedNodeId])

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (nodeDropdownRef.current && !nodeDropdownRef.current.contains(event.target as Node)) {
        setIsNodeDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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

  // 自动解析图片 URL
  const detectImageUrls = (text: string) => {
    // 匹配常见的图片扩展名，支持带有查询参数的 URL
    const imageRegex = /https?:\/\/[^\s$.?#].[^\s]*\.(?:jpg|jpeg|gif|png|webp|svg)(?:\?[^\s]*)?/gi
    const matches = text.match(imageRegex)

    if (matches) {
      const newUrls = matches.filter(url => !imageUrls.includes(url) && !dismissedUrls.includes(url))
      if (newUrls.length > 0) {
        console.log('🔍 [CreatePostForm] 检测到新图片 URL:', newUrls)
        setImageUrls(prev => [...prev, ...newUrls])
      }
    }
  }

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value
    setContent(newContent)
    detectImageUrls(newContent)
  }

  const { uploadImage, isUploading: isHookUploading } = useImageUpload()
  // Combine internal submitting state with hook uploading state if needed, or just use hook's state for button disabled

  // 上传图片文件
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    setIsUploading(true) // Keep local state for overall form loading indication if preferred, or rely on hook
    setError('')

    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        return await uploadImage(file, 'posts')
      })

      const uploadedUrls = await Promise.all(uploadPromises)
      // Filter out any undefined/failed attempts if hook throws (hook throws, so Promise.all will reject on first error)
      // If we want all succeeding ones, we should use allSettled, but for now strict fail is fine or we catch individual.
      // The previous logic was "all or nothing" roughly (await Promise.all).

      setImageUrls(prev => [...prev, ...uploadedUrls])
    } catch (err) {
      console.error('图片上传失败:', err)
      setError(err instanceof Error ? err.message : '图片上传失败')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // 删除图片URL
  const handleRemoveImageUrl = (urlToRemove: string) => {
    setImageUrls(imageUrls.filter(url => url !== urlToRemove))
    // 如果是外部链接，记录到已忽略列表，防止再次自动解析
    if (urlToRemove.startsWith('http')) {
      setDismissedUrls(prev => [...prev, urlToRemove])
    }
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
        nodeId: selectedNodeId || undefined,
        imageUrls: imageUrls.length > 0 ? imageUrls : undefined
      }

      console.log('📝 [CreatePostForm] 准备提交帖子:', postData)
      const success = await onSubmit(postData)
      console.log('✅ [CreatePostForm] 提交结果:', success)

      if (success) {
        setTitle('')
        setContent('')
        setImageUrls([])
        setDismissedUrls([])
        // 触发全局数据刷新事件
        window.dispatchEvent(new CustomEvent('refresh-user-data'))
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
              onChange={handleContentChange}
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

          {/* 图片上传区域 */}
          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleFileUpload(e.target.files)}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => canUploadImage ? fileInputRef.current?.click() : null}
              disabled={isSubmitting || isUploading || !canUploadImage}
              className={`w-full bg-gradient-to-r from-retro-cyan/40 to-retro-blue/40 hover:from-retro-cyan/60 hover:to-retro-blue/60 text-white font-medium py-3 px-4 rounded-xl border border-white/10 hover:border-white/20 shadow-lg transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-md text-xs font-pixel uppercase tracking-widest flex items-center justify-center gap-2 ${!canUploadImage ? 'grayscale opacity-60' : ''}`}
            >
              {isUploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>上传中...</span>
                </>
              ) : !canUploadImage ? (
                <>
                  <span className="text-base text-retro-red">🔒</span>
                  <span>{requiredLevelForImage ? `等级 LV.${requiredLevelForImage} 解锁图片上传` : '图片上传暂未开放'}</span>
                </>
              ) : (
                <>
                  <span className="text-base">📷</span>
                  <span>点击上传图片</span>
                  <span className="text-[10px] opacity-60">(支持大图)</span>

                </>
              )}
            </button>

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
          {/* 操作按钮 - 紧凑设计 */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="relative flex-shrink-0" ref={nodeDropdownRef}>
              <button
                type="button"
                onClick={() => setIsNodeDropdownOpen(!isNodeDropdownOpen)}
                className="flex items-center justify-between gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-pixel text-white/70 hover:bg-white/10 hover:text-white transition-all min-w-[100px] uppercase tracking-tighter"
              >
                <span className="truncate">
                  {nodes.find(n => n.id === selectedNodeId)?.name || '选择节点'}
                </span>
                <svg className={`w-3 h-3 transition-transform ${isNodeDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isNodeDropdownOpen && (
                <div className="absolute bottom-full left-0 mb-2 w-40 bg-retro-bg-dark border border-white/10 rounded-xl shadow-2xl z-[60] py-1 backdrop-blur-xl overflow-hidden">
                  <div className="max-h-48 overflow-y-auto custom-scrollbar">
                    {nodes.map((node) => (
                      <button
                        key={node.id}
                        type="button"
                        onClick={() => {
                          setSelectedNodeId(node.id)
                          setIsNodeDropdownOpen(false)
                        }}
                        className={`w-full text-left px-4 py-2 text-[10px] font-pixel uppercase tracking-tighter transition-colors ${selectedNodeId === node.id ? 'bg-retro-purple/20 text-retro-purple' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
                      >
                        # {node.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setTitle('')
                  setContent('')
                  setImageUrls([])
                  setDismissedUrls([])
                  if (nodes.length > 0) {
                    const defaultNode = nodes.find(n => n.slug === 'default') || nodes[0]
                    setSelectedNodeId(defaultNode.id)
                  }
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
          </div>
        </form>
      </div>
    </div>
  )
}
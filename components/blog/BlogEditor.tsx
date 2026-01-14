'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import MarkdownEditor from '@/components/MarkdownEditor'

interface BlogPost {
  id: string
  title: string
  content: string
  tags: string[]
  coverImage?: string
  imageUrls?: string[]
  isDraft: boolean
}

interface BlogEditorProps {
  blog?: BlogPost | null
  userId: string
  onSaved?: () => void
  onPublished?: (blogId: string) => void
}

export default function BlogEditor({ blog, userId, onSaved, onPublished }: BlogEditorProps) {
  const router = useRouter()
  const isEditMode = !!blog

  const [title, setTitle] = useState(blog?.title || '')
  const [content, setContent] = useState(blog?.content || '')
  const [tags, setTags] = useState<string[]>(blog?.tags || [])
  const [tagInput, setTagInput] = useState('')
  const [coverImage, setCoverImage] = useState(blog?.coverImage || '')
  const [imageUrls, setImageUrls] = useState<string[]>(blog?.imageUrls || [])
  const [imageUrlInput, setImageUrlInput] = useState('')
  const [isPublishing, setIsPublishing] = useState(false)
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [error, setError] = useState('')
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // 追踪内容变化
  useEffect(() => {
    if (isEditMode) {
      const changed =
        title !== blog.title ||
        content !== blog.content ||
        JSON.stringify(tags) !== JSON.stringify(blog.tags) ||
        coverImage !== (blog.coverImage || '') ||
        JSON.stringify(imageUrls) !== JSON.stringify(blog.imageUrls || [])
      setHasUnsavedChanges(changed)
    } else {
      setHasUnsavedChanges(title.trim() !== '' || content.trim() !== '')
    }
  }, [title, content, tags, coverImage, imageUrls, blog, isEditMode])

  // 自动保存草稿（仅新建模式）
  useEffect(() => {
    if (isEditMode) return // 编辑模式不自动保存

    const draftKey = `blog_draft_${userId}`
    const autosaveInterval = setInterval(() => {
      if (content.trim() || title.trim()) {
        const draftData = {
          title,
          content,
          tags,
          coverImage,
          lastSaved: Date.now()
        }
        localStorage.setItem(draftKey, JSON.stringify(draftData))
        setLastSaved(new Date())
      }
    }, 30000) // 每30秒自动保存

    return () => clearInterval(autosaveInterval)
  }, [title, content, tags, coverImage, userId, isEditMode])

  // 加载草稿（仅新建模式）
  useEffect(() => {
    if (isEditMode) return

    const draftKey = `blog_draft_${userId}`
    const savedDraft = localStorage.getItem(draftKey)

    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft)
        const confirmation = confirm('检测到未发布的草稿，是否恢复？')
        if (confirmation) {
          setTitle(draft.title)
          setContent(draft.content)
          setTags(draft.tags || [])
          setCoverImage(draft.coverImage || '')
          setLastSaved(new Date(draft.lastSaved))
        }
      } catch (error) {
        console.error('Failed to load draft:', error)
      }
    }
  }, [userId, isEditMode])

  // 添加标签
  const handleAddTag = () => {
    const tag = tagInput.trim()
    if (tag && !tags.includes(tag) && tags.length < 5) {
      setTags([...tags, tag])
      setTagInput('')
    }
  }

  // 删除标签
  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
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

  // 计算阅读时间
  const calculateReadTime = (text: string): number => {
    const wordCount = text.length
    return Math.max(1, Math.ceil(wordCount / 200))
  }

  // 生成摘要
  const generateSummary = (text: string): string => {
    const plainText = text.replace(/[#*`_\[\]()]/g, '').trim()
    return plainText.length > 200 ? plainText.substring(0, 200) + '...' : plainText
  }

  // 保存草稿或更新
  const handleSaveDraft = async () => {
    if (!content.trim()) {
      setError('内容不能为空')
      return
    }

    setIsSavingDraft(true)
    setError('')

    try {
      if (isEditMode) {
        // 更新现有博客
        const response = await fetch(`/api/posts/${blog.id}?userId=${userId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title.trim() || '无标题',
            content: content.trim(),
            summary: generateSummary(content),
            wordCount: content.length,
            readTime: calculateReadTime(content),
            tags,
            coverImage: coverImage || null,
            imageUrls
          })
        })

        const data = await response.json()

        if (response.ok && data.success) {
          setHasUnsavedChanges(false)
          setLastSaved(new Date())
          onSaved?.()
        } else {
          throw new Error(data.error || '保存失败')
        }
      } else {
        // 创建新草稿
        const response = await fetch(`/api/posts?userId=${userId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title.trim() || '无标题',
            content: content.trim(),
            type: 'MARKDOWN',
            summary: generateSummary(content),
            wordCount: content.length,
            readTime: calculateReadTime(content),
            tags,
            coverImage: coverImage || null,
            imageUrls,
            isDraft: true
          })
        })

        const data = await response.json()

        if (response.ok && data.success) {
          localStorage.removeItem(`blog_draft_${userId}`)
          setHasUnsavedChanges(false)
          setLastSaved(new Date())
          onSaved?.()
        } else {
          throw new Error(data.error || '保存失败')
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
    } finally {
      setIsSavingDraft(false)
    }
  }

  // 发布博客
  const handlePublish = async () => {
    if (!content.trim()) {
      setError('内容不能为空')
      return
    }

    if (!title.trim()) {
      setError('请输入标题')
      return
    }

    setIsPublishing(true)
    setError('')

    try {
      if (isEditMode) {
        // 更新并发布
        const response = await fetch(`/api/posts/${blog.id}?userId=${userId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title.trim(),
            content: content.trim(),
            summary: generateSummary(content),
            wordCount: content.length,
            readTime: calculateReadTime(content),
            tags,
            coverImage: coverImage || null,
            imageUrls,
            isDraft: false,
            publishedAt: blog.isDraft ? new Date().toISOString() : undefined
          })
        })

        const data = await response.json()

        if (response.ok && data.success) {
          localStorage.removeItem(`blog_draft_${userId}`)
          setHasUnsavedChanges(false)
          onPublished?.(blog.id)
        } else {
          throw new Error(data.error || '发布失败')
        }
      } else {
        // 创建新博客并发布
        const response = await fetch(`/api/posts?userId=${userId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title.trim(),
            content: content.trim(),
            type: 'MARKDOWN',
            summary: generateSummary(content),
            wordCount: content.length,
            readTime: calculateReadTime(content),
            tags,
            coverImage: coverImage || null,
            imageUrls,
            isDraft: false,
            publishedAt: new Date().toISOString()
          })
        })

        const data = await response.json()

        if (response.ok && data.success) {
          if (data.currentPoints !== undefined) {
            console.log('💰 [BlogEditor] 收到积分更新:', data.currentPoints)
            if (typeof window !== 'undefined') {
              const event = new CustomEvent('user-points-updated', {
                detail: { userId, points: data.currentPoints }
              })
              window.dispatchEvent(event)
            }
          }
          localStorage.removeItem(`blog_draft_${userId}`)
          setHasUnsavedChanges(false)
          onPublished?.(data.data.id)
        } else {
          throw new Error(data.error || '发布失败')
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '发布失败')
    } finally {
      setIsPublishing(false)
    }
  }

  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const renderPortal = (content: React.ReactNode, id: string) => {
    if (!mounted) return null
    const el = document.getElementById(id)
    if (!el) return null
    return createPortal(content, el)
  }

  return (
    <div className="h-full flex flex-col bg-transparent">
      {/* 顶部操作栏 - 现在通过 Portal 渲染到顶栏 */}
      {renderPortal(
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-white whitespace-nowrap">
            {isEditMode ? '编辑文章' : '新建文章'}
          </h2>
          {lastSaved && !hasUnsavedChanges && (
            <span className="text-[10px] text-gray-500 font-mono hidden lg:inline">
              (已保存 {lastSaved.toLocaleTimeString()})
            </span>
          )}
          {hasUnsavedChanges && (
            <span className="text-[10px] text-amber-500 font-mono hidden lg:inline pulse">
              (有未保存内容)
            </span>
          )}
        </div>,
        'editor-title-portal'
      )}

      {renderPortal(
        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveDraft}
            disabled={isSavingDraft || isPublishing || !hasUnsavedChanges}
            className="px-3 py-1.5 bg-gray-800/50 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-md text-[11px] font-bold transition-all border border-white/5"
          >
            {isSavingDraft ? '正在保存...' : '保存草稿'}
          </button>
          <button
            onClick={handlePublish}
            disabled={isPublishing || isSavingDraft}
            className="px-4 py-1.5 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold rounded-md text-[11px] transition-all shadow-lg shadow-cyan-500/10"
          >
            {isPublishing ? '发布中...' : blog?.isDraft === false ? '更新发布' : '立即发布'}
          </button>
        </div>,
        'editor-actions-portal'
      )}

      {/* 错误提示 - 浮动显示或置顶 */}
      {error && (
        <div className="absolute top-4 right-4 z-[60] bg-red-900/40 backdrop-blur-md border border-red-500/30 rounded-lg p-3 flex items-center gap-2 shadow-2xl animate-shake">
          <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-xs text-red-200">{error}</span>
          <button onClick={() => setError('')} className="ml-2 text-red-400 hover:text-white">✕</button>
        </div>
      )}

      {/* 编辑区域 */}
      <div className="flex-1 overflow-y-auto p-8 pt-6 space-y-8 scrollbar-thin scrollbar-thumb-gray-800">
        {/* 标题输入 */}
        <div className="max-w-4xl mx-auto w-full">
          <input
            type="text"
            placeholder="输入博客标题..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-transparent text-4xl font-black text-white placeholder-gray-800 focus:outline-none tracking-tight"
            maxLength={100}
            onFocus={() => {
              if (typeof window !== 'undefined' && (window as any).disableGameKeyboard) {
                (window as any).disableGameKeyboard()
              }
            }}
            onBlur={() => {
              if (typeof window !== 'undefined' && (window as any).enableGameKeyboard) {
                (window as any).enableGameKeyboard()
              }
            }}
          />
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-4 text-[10px] text-gray-600 font-mono tracking-widest uppercase">
              <span>{title.length}/100 字符</span>
              <span>•</span>
              <span>预计阅读: {calculateReadTime(content)} 分钟</span>
            </div>
          </div>
        </div>

        {/* Markdown 编辑器 */}
        <div className="max-w-5xl mx-auto w-full flex-1">
          <MarkdownEditor
            value={content}
            onChange={setContent}
            height={650}
            placeholder="# 开始创作...\n\n支持 Markdown 语法"
          />
        </div>

        <div className="h-px bg-gray-800/30 my-8"></div>

        {/* 标签和封面 - 现在移到了底部 */}
        <div className="bg-gray-800/20 rounded-xl p-6 border border-gray-800/50 space-y-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            文章设置 (可选)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* 左侧：标签 */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  标签 (最多5个)
                </label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    placeholder="输入标签按回车..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddTag()
                      }
                    }}
                    className="flex-1 bg-gray-900 border border-gray-700 focus:ring-2 focus:ring-cyan-500 focus:border-transparent rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none text-sm transition-all"
                    maxLength={20}
                    disabled={tags.length >= 5}
                    onFocus={() => {
                      if (typeof window !== 'undefined' && (window as any).disableGameKeyboard) {
                        (window as any).disableGameKeyboard()
                      }
                    }}
                    onBlur={() => {
                      if (typeof window !== 'undefined' && (window as any).enableGameKeyboard) {
                        (window as any).enableGameKeyboard()
                      }
                    }}
                  />
                  <button
                    onClick={handleAddTag}
                    disabled={!tagInput.trim() || tags.length >= 5}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white rounded-lg text-sm transition-all"
                  >
                    添加
                  </button>
                </div>

                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-600/10 text-cyan-400 border border-cyan-500/20 rounded-full text-xs"
                      >
                        {tag}
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          className="cursor-pointer hover:text-cyan-300 transition-colors"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 右侧：封面图 */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  封面图片 URL
                </label>
                <input
                  type="url"
                  placeholder="https://example.com/cover.jpg"
                  value={coverImage}
                  onChange={(e) => setCoverImage(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 focus:ring-2 focus:ring-cyan-500 focus:border-transparent rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none text-sm transition-all"
                  onFocus={() => {
                    if (typeof window !== 'undefined' && (window as any).disableGameKeyboard) {
                      (window as any).disableGameKeyboard()
                    }
                  }}
                  onBlur={() => {
                    if (typeof window !== 'undefined' && (window as any).enableGameKeyboard) {
                      (window as any).enableGameKeyboard()
                    }
                  }}
                />
              </div>
            </div>
          </div>

          <div className="h-px bg-gray-800/50"></div>

          {/* 内容图片 */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              更多插图 URL (可添加多个)
            </label>
            <div className="flex gap-2 mb-4">
              <input
                type="url"
                placeholder="https://example.com/content-image.jpg"
                value={imageUrlInput}
                onChange={(e) => setImageUrlInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddImageUrl()
                  }
                }}
                className="flex-1 bg-gray-900 border border-gray-700 focus:ring-2 focus:ring-cyan-500 focus:border-transparent rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none text-sm transition-all"
                onFocus={() => {
                  if (typeof window !== 'undefined' && (window as any).disableGameKeyboard) {
                    (window as any).disableGameKeyboard()
                  }
                }}
                onBlur={() => {
                  if (typeof window !== 'undefined' && (window as any).enableGameKeyboard) {
                    (window as any).enableGameKeyboard()
                  }
                }}
              />
              <button
                onClick={handleAddImageUrl}
                disabled={!imageUrlInput.trim()}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white rounded-lg text-sm transition-all"
              >
                添加
              </button>
            </div>

            {imageUrls.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {imageUrls.map((url, index) => (
                  <div
                    key={index}
                    className="relative aspect-square bg-gray-900 border border-gray-800 rounded-lg overflow-hidden group"
                  >
                    <img
                      src={url}
                      alt={`图片 ${index + 1}`}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      onError={(e) => {
                        e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64"%3E%3Crect fill="%23111" width="64" height="64"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23333" font-size="10"%3ENone%3C/text%3E%3C/svg%3E'
                      }}
                    />
                    <button
                      onClick={() => handleRemoveImageUrl(url)}
                      className="absolute top-1 right-1 p-1 bg-red-600/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

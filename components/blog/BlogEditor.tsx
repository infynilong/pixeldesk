'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import MarkdownEditor from '@/components/MarkdownEditor'

interface BlogPost {
  id: string
  title: string
  content: string
  tags: string[]
  coverImage?: string
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
        coverImage !== (blog.coverImage || '')
      setHasUnsavedChanges(changed)
    } else {
      setHasUnsavedChanges(title.trim() !== '' || content.trim() !== '')
    }
  }, [title, content, tags, coverImage, blog, isEditMode])

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
            coverImage: coverImage || null
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
            isDraft: false,
            publishedAt: new Date().toISOString()
          })
        })

        const data = await response.json()

        if (response.ok && data.success) {
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

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* 顶部操作栏 */}
      <div className="flex-shrink-0 p-4 border-b border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-xl font-bold text-white">
              {isEditMode ? '编辑博客' : '新建博客'}
            </h2>
            {lastSaved && !hasUnsavedChanges && (
              <p className="text-xs text-gray-500 mt-1">
                已保存于 {lastSaved.toLocaleTimeString()}
              </p>
            )}
            {hasUnsavedChanges && (
              <p className="text-xs text-amber-400 mt-1">
                有未保存的更改
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveDraft}
              disabled={isSavingDraft || isPublishing || !hasUnsavedChanges}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed text-white rounded-lg text-sm transition-colors"
            >
              {isSavingDraft ? '保存中...' : isEditMode ? '保存' : '保存草稿'}
            </button>
            <button
              onClick={handlePublish}
              disabled={isPublishing || isSavingDraft}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg text-sm transition-all"
            >
              {isPublishing ? '发布中...' : blog?.isDraft === false ? '更新发布' : '发布'}
            </button>
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-center gap-2">
            <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm text-red-400">{error}</span>
          </div>
        )}
      </div>

      {/* 编辑区域 */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* 标题输入 */}
        <div>
          <input
            type="text"
            placeholder="输入博客标题..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-transparent text-3xl font-bold text-white placeholder-gray-600 focus:outline-none"
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
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-500">{title.length}/100</span>
            <span className="text-xs text-gray-500">
              预计阅读: {calculateReadTime(content)} 分钟
            </span>
          </div>
        </div>

        <div className="h-px bg-gray-800"></div>

        {/* 标签和封面 */}
        <div className="space-y-4">
          {/* 标签输入 */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              标签 (最多5个)
            </label>
            <div className="flex gap-2 mb-2">
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
                className="flex-1 bg-gray-800 border border-gray-700 focus:border-blue-500 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none text-sm"
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
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg text-sm transition-colors"
              >
                添加
              </button>
            </div>

            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-2 px-3 py-1 bg-blue-600/20 text-blue-400 border border-blue-600/30 rounded-full text-sm"
                  >
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-blue-300"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 封面图片URL */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              封面图片 URL (可选)
            </label>
            <input
              type="url"
              placeholder="https://example.com/image.jpg"
              value={coverImage}
              onChange={(e) => setCoverImage(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 focus:border-blue-500 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none text-sm"
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

        <div className="h-px bg-gray-800"></div>

        {/* Markdown 编辑器 */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            博客内容 (支持 Markdown)
          </label>
          <MarkdownEditor
            value={content}
            onChange={setContent}
            height={500}
            placeholder="# 开始写作...\n\n支持 Markdown 语法"
          />
        </div>
      </div>
    </div>
  )
}

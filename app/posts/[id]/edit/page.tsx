'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useUser } from '@/contexts/UserContext'
import { useCurrentUser } from '@/lib/hooks/useCurrentUser'
import MarkdownEditor from '@/components/MarkdownEditor'
import LoadingSpinner from '@/components/LoadingSpinner'

interface DraftData {
  title: string
  content: string
  tags: string[]
  coverImage?: string
  lastSaved: number
}

export default function EditBlogPage() {
  const params = useParams()
  const router = useRouter()
  const postId = params.id as string
  const { user } = useUser()
  const { userId: currentUserId } = useCurrentUser()

  // 登录验证
  const isAuthenticated = !!user

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [coverImage, setCoverImage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [error, setError] = useState('')
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [authorId, setAuthorId] = useState('')

  // 加载文章数据
  useEffect(() => {
    const fetchPost = async () => {
      if (!postId || !currentUserId) return

      setIsLoading(true)
      try {
        const response = await fetch(`/api/posts/${postId}?userId=${currentUserId}`)
        const data = await response.json()

        if (!response.ok || !data.success) {
          throw new Error(data.error || '加载文章失败')
        }

        const post = data.data

        // 检查是否是作者
        if (post.author.id !== currentUserId) {
          setError('只有作者可以编辑这篇文章')
          setTimeout(() => router.push(`/posts/${postId}`), 2000)
          return
        }

        // 填充表单
        setTitle(post.title || '')
        setContent(post.content || '')
        setTags(post.tags || [])
        setCoverImage(post.coverImage || '')
        setAuthorId(post.author.id)
      } catch (err) {
        console.error('Error loading post:', err)
        setError(err instanceof Error ? err.message : '加载文章失败')
      } finally {
        setIsLoading(false)
      }
    }

    fetchPost()
  }, [postId, currentUserId, router])

  // 自动保存草稿
  useEffect(() => {
    if (!isAuthenticated || !postId) return

    const draftKey = `blog_edit_${postId}`
    const autosaveInterval = setInterval(() => {
      if (content.trim() || title.trim()) {
        const draftData: DraftData = {
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
  }, [title, content, tags, coverImage, postId, isAuthenticated])

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

  // 计算阅读时间（假设每分钟阅读 200 字）
  const calculateReadTime = (text: string): number => {
    const wordCount = text.length
    return Math.max(1, Math.ceil(wordCount / 200))
  }

  // 生成摘要
  const generateSummary = (text: string): string => {
    const plainText = text.replace(/[#*`_\[\]()]/g, '').trim()
    return plainText.length > 200 ? plainText.substring(0, 200) + '...' : plainText
  }

  // 保存草稿
  const handleSaveDraft = async () => {
    if (!isAuthenticated) {
      alert('请先登录')
      return
    }

    if (!content.trim()) {
      setError('内容不能为空')
      return
    }

    setIsSavingDraft(true)
    setError('')

    try {
      const response = await fetch(`/api/posts/${postId}?userId=${currentUserId}`, {
        method: 'PUT',
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
        // 清除草稿
        localStorage.removeItem(`blog_edit_${postId}`)
        alert('草稿已保存')
        router.push(`/posts/${postId}`)
      } else {
        throw new Error(data.error || data.message || '保存失败')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存草稿失败')
    } finally {
      setIsSavingDraft(false)
    }
  }

  // 更新博客
  const handleUpdate = async () => {
    if (!isAuthenticated) {
      alert('请先登录')
      return
    }

    if (!content.trim()) {
      setError('内容不能为空')
      return
    }

    if (!title.trim()) {
      setError('请输入标题')
      return
    }

    setIsUpdating(true)
    setError('')

    try {
      const response = await fetch(`/api/posts/${postId}?userId=${currentUserId}`, {
        method: 'PUT',
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
        // 清除草稿
        localStorage.removeItem(`blog_edit_${postId}`)
        router.push(`/posts/${postId}`)
      } else {
        throw new Error(data.error || data.message || '更新失败')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新失败')
    } finally {
      setIsUpdating(false)
    }
  }

  // 未登录提示
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-xl p-8 max-w-md text-center shadow-2xl">
          <div className="w-16 h-16 bg-gradient-to-br from-cyan-600 to-teal-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-cyan-500/20">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">需要登录</h2>
          <p className="text-gray-300 mb-6">请先登录后再编辑博客</p>
          <button
            onClick={() => router.push('/')}
            className="w-full bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-bold py-3 px-6 rounded-lg transition-all"
          >
            前往登录
          </button>
        </div>
      </div>
    )
  }

  // 加载中
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      {/* 顶部导航栏 */}
      <nav className="bg-gray-900/80 backdrop-blur-sm border-b border-gray-800 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* 左侧 - Logo */}
            <button
              onClick={() => {
                if (confirm('确定要离开吗？未保存的内容将丢失。')) {
                  router.push('/')
                }
              }}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="text-white font-bold text-lg">象素工坊</span>
                <span className="text-gray-400 text-xs font-mono">
                  {lastSaved ? `自动保存于 ${lastSaved.toLocaleTimeString()}` : 'Blog Editor'}
                </span>
              </div>
            </button>

            {/* 右侧 - 操作按钮 */}
            <div className="flex items-center space-x-3">
              <button
                onClick={handleSaveDraft}
                disabled={isSavingDraft || isUpdating}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg border border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-all"
              >
                {isSavingDraft ? '保存中...' : '保存草稿'}
              </button>
              <button
                onClick={handleUpdate}
                disabled={isUpdating || isSavingDraft}
                className="px-6 py-2 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-bold rounded-lg shadow-lg shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-all"
              >
                {isUpdating ? '更新中...' : '更新'}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* 主要内容区域 */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* 错误提示 */}
          {error && (
            <div className="bg-red-900/20 border border-red-800/50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-red-300 text-sm">{error}</span>
              </div>
            </div>
          )}

          {/* 标题输入 */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
            <input
              type="text"
              placeholder="输入博客标题..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-transparent text-3xl font-bold text-white placeholder-gray-500 focus:outline-none"
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

          {/* 标签和封面 */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 space-y-4">
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
                  className="flex-1 bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-cyan-500 focus:border-transparent rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none text-sm transition-all"
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
                  className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-all"
                >
                  添加
                </button>
              </div>

              {/* 标签列表 */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 rounded-full text-sm"
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
                className="w-full bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-cyan-500 focus:border-transparent rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none text-sm transition-all"
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

          {/* Markdown 编辑器 */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            <div className="p-4 border-b border-gray-800">
              <h3 className="text-sm font-medium text-gray-400">博客内容 (支持 Markdown)</h3>
              <p className="text-xs text-gray-500 mt-1">实时预览，支持代码高亮</p>
            </div>
            <div className="p-4">
              <MarkdownEditor
                value={content}
                onChange={setContent}
                height={600}
                placeholder="# 开始写作你的博客...\n\n支持 Markdown 语法：\n- **粗体** *斜体*\n- [链接](url)\n- `代码`\n- > 引用\n- 列表、表格等"
              />
            </div>
          </div>

          {/* 底部提示 */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
            <div className="flex items-start gap-3 text-sm text-gray-400">
              <svg className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="space-y-1">
                <p className="text-gray-300 font-medium">提示：</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>内容会自动保存草稿，每30秒保存一次</li>
                  <li>支持完整的 Markdown 语法，包括代码高亮</li>
                  <li>可以保存草稿，稍后继续编辑</li>
                  <li>更新后会保留原有的浏览量和点赞数</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

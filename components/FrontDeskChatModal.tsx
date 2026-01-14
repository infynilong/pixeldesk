'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useTranslation } from '@/lib/hooks/useTranslation'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface Article {
  id: string
  title: string
  summary: string
  tags: string[]
  url: string
}

interface FrontDeskInfo {
  id: string
  name: string
  serviceScope: string
  greeting: string
  workingHours?: string
}

// 前端缓存层
const articleCache = new Map<string, Article>()

// 文章推荐卡片组件
function ArticleRecommendation({ url, postId, articlesData }: {
  url: string;
  postId: string;
  articlesData: Article[];
}) {
  const { t } = useTranslation()
  const [article, setArticle] = useState<Article | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        // 首先检查前端缓存
        if (articleCache.has(postId)) {
          setArticle(articleCache.get(postId) || null)
          setLoading(false)
          return
        }

        // 其次检查从后端传来的文章数据
        const articleData = articlesData.find(a => a.id === postId)
        if (articleData) {
          articleCache.set(postId, articleData)
          setArticle(articleData)
          setLoading(false)
          return
        }

        // 最后需要时才从API获取
        const response = await fetch(`/api/posts/${postId}`)
        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            const article = {
              id: postId,
              title: data.post.title || t.common.none,
              summary: data.post.summary || data.post.content?.substring(0, 150) + '...' || '',
              tags: data.post.tags || [],
              url
            }
            articleCache.set(postId, article)
            setArticle(article)
          } else {
            setArticle({ id: postId, title: t.front_desk.read_more, summary: '', tags: [], url })
          }
        } else {
          setArticle({ id: postId, title: t.front_desk.read_more, summary: '', tags: [], url })
        }
      } catch (error) {
        console.error('Failed to fetch article:', error)
        setArticle({ id: postId, title: t.front_desk.read_more, summary: '', tags: [], url })
      } finally {
        setLoading(false)
      }
    }

    fetchArticle()
  }, [postId, url, articlesData])

  if (loading) {
    return (
      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-full mb-1"></div>
          <div className="h-3 bg-gray-200 rounded w-5/6"></div>
        </div>
      </div>
    )
  }

  if (!article) return null

  return (
    <Link
      href={url}
      className="block bg-gradient-to-r from-cyan-50 to-teal-50 rounded-lg p-4 border border-cyan-200 hover:shadow-md hover:border-cyan-300 transition-all group"
      target="_blank"
      rel="noopener noreferrer"
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <svg className="w-5 h-5 text-cyan-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-gray-900 group-hover:text-cyan-700 transition-colors truncate">
            {article.title}
          </h4>
          {article.summary && (
            <p className="text-xs text-gray-600 mt-1 line-clamp-2">
              {article.summary}
            </p>
          )}
          {article.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {article.tags.slice(0, 3).map((tag, idx) => (
                <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-cyan-100 text-cyan-800">
                  {tag}
                </span>
              ))}
            </div>
          )}
          <div className="flex items-center text-xs text-cyan-600 mt-2 group-hover:text-cyan-700">
            <span>{t.front_desk.read_more}</span>
            <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </div>
        </div>
      </div>
    </Link>
  )
}

interface FrontDeskChatModalProps {
  isOpen: boolean
  onClose: () => void
  deskInfo: FrontDeskInfo
}

export default function FrontDeskChatModal({ isOpen, onClose, deskInfo }: FrontDeskChatModalProps) {
  const { t, locale } = useTranslation()
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [usage, setUsage] = useState({ current: 0, limit: 50, remaining: 50 })
  const [articleDetailsMap, setArticleDetailsMap] = useState<Article[][]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // 初始化时添加问候语
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: deskInfo.greeting,
        timestamp: new Date()
      }])
    }
  }, [isOpen, deskInfo.greeting])

  // ESC键关闭弹窗
  useEffect(() => {
    if (!isOpen) return

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        e.preventDefault()
        onClose()
      }
    }

    // 使用 capture 阶段监听，优先级高于 Phaser
    window.addEventListener('keydown', handleEsc, true)
    return () => {
      window.removeEventListener('keydown', handleEsc, true)
    }
  }, [isOpen, onClose])

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 自动对焦输入框
  useEffect(() => {
    if (isOpen) {
      // 延迟一点，等弹窗完全显示后再对焦
      const timer = setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage = inputValue.trim()
    setInputValue('')

    // 添加用户消息
    const newUserMessage: Message = {
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, newUserMessage])
    setIsLoading(true)

    try {
      const response = await fetch('/api/front-desk/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          deskId: deskInfo.id
        })
      })

      const data = await response.json()

      if (data.success) {
        // 添加AI回复
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.reply,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, assistantMessage])

        // 更新使用统计
        if (data.usage) {
          setUsage(data.usage)
        }

        // 存储文章详情映射
        if (data.articleDetailsMap) {
          // 将二维数组转换为Article数组
          const articles: Article[] = (data.articleDetailsMap as [string, Article][]).map(([_, article]) => article)
          setArticleDetailsMap(prev => {
            const newMap = [...prev]
            newMap[newMap.length - 1] = articles
            return newMap
          })
        }
      } else {
        // 显示错误消息
        const errorMessage: Message = {
          role: 'assistant',
          content: data.reply || t.front_desk.err_service_unavailable,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, errorMessage])
      }
    } catch (error: any) {
      console.error('Chat error:', error)
      const errorMessage: Message = {
        role: 'assistant',
        content: `${t.front_desk.err_network}: ${error.message}`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    // 使用 stopPropagation 阻止事件冒泡到 Phaser
    e.stopPropagation()

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // 处理所有键盘输入 - 阻止事件冒泡到 Phaser
  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    // 使用 stopPropagation 阻止事件冒泡到 Phaser，解决 WASD 输入问题
    e.stopPropagation()

    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  // 渲染消息内容，支持 Markdown 格式的链接和纯 URL 链接
  const renderMessageContent = (content: string) => {
    // 匹配 Markdown 链接格式: [标题](/posts/xxx)
    const markdownLinkRegex = /\[([^\]]+)\]\((\/posts\/[a-f0-9\-]+)\)/g
    // 匹配纯 URL 格式: /posts/xxx (但不在 Markdown 链接中)
    const plainUrlRegex = /(?<!\]\()\/posts\/([a-f0-9\-]+)(?!\))/g

    // 首先检查是否有任何链接
    const hasMarkdownLinks = markdownLinkRegex.test(content)
    const hasPlainUrls = plainUrlRegex.test(content)

    if (!hasMarkdownLinks && !hasPlainUrls) {
      // 如果没有链接，检查是否有 Markdown 表格或列表等格式
      // 简单处理 Markdown 粗体和换行
      const formatted = content
        .split('\n')
        .map((line, i) => {
          // 处理粗体 **text**
          const boldFormatted = line.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
          return <div key={i} dangerouslySetInnerHTML={{ __html: boldFormatted }} />
        })
      return <div className="whitespace-pre-wrap break-words">{formatted}</div>
    }

    // 重置正则表达式
    markdownLinkRegex.lastIndex = 0
    plainUrlRegex.lastIndex = 0

    const parts: JSX.Element[] = []
    let lastIndex = 0

    // 收集所有匹配项（Markdown 链接和纯 URL）
    interface Match {
      type: 'markdown' | 'plain'
      index: number
      length: number
      title?: string
      url: string
      postId: string
    }

    const matches: Match[] = []

    // 收集 Markdown 链接
    let match
    while ((match = markdownLinkRegex.exec(content)) !== null) {
      const [fullMatch, title, url] = match
      const postId = url.match(/\/posts\/([a-f0-9\-]+)/)?.[1]
      if (postId) {
        matches.push({
          type: 'markdown',
          index: match.index,
          length: fullMatch.length,
          title,
          url,
          postId
        })
      }
    }

    // 收集纯 URL（排除已经被 Markdown 链接覆盖的）
    plainUrlRegex.lastIndex = 0
    while ((match = plainUrlRegex.exec(content)) !== null) {
      const [fullMatch, postId] = match
      const matchIndex = match.index

      // 检查这个 URL 是否已经在 Markdown 链接中
      const isInMarkdown = matches.some(m =>
        m.type === 'markdown' &&
        matchIndex >= m.index &&
        matchIndex < m.index + m.length
      )

      if (!isInMarkdown) {
        matches.push({
          type: 'plain',
          index: matchIndex,
          length: fullMatch.length,
          url: fullMatch,
          postId
        })
      }
    }

    // 按索引排序
    matches.sort((a, b) => a.index - b.index)

    // 构建结果
    matches.forEach((m, i) => {
      // 添加匹配前的文本
      if (m.index > lastIndex) {
        const textBefore = content.substring(lastIndex, m.index)
        // 处理文本中的粗体
        const formatted = textBefore.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        parts.push(
          <span key={`text-${lastIndex}`} dangerouslySetInnerHTML={{ __html: formatted }} className="whitespace-pre-wrap break-words" />
        )
      }

      // 添加链接卡片
      if (m.type === 'markdown') {
        // Markdown 链接：显示为简洁的内联链接
        parts.push(
          <Link
            key={`link-${i}`}
            href={m.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-cyan-600 hover:text-cyan-700 hover:underline font-medium"
          >
            {m.title}
            <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </Link>
        )
      } else {
        // 纯 URL：显示为文章推荐卡片
        parts.push(
          <div key={`card-${i}`} className="my-2">
            <ArticleRecommendation
              url={m.url}
              postId={m.postId}
              articlesData={articleDetailsMap.flat()}
            />
          </div>
        )
      }

      lastIndex = m.index + m.length
    })

    // 添加剩余的文本
    if (lastIndex < content.length) {
      const textAfter = content.substring(lastIndex)
      const formatted = textAfter.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      parts.push(
        <span key={`text-${lastIndex}`} dangerouslySetInnerHTML={{ __html: formatted }} className="whitespace-pre-wrap break-words" />
      )
    }

    return <div className="inline">{parts}</div>
  }

  if (!isOpen) return null

  const modalContent = (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]"
      onClick={onClose}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
      style={{ pointerEvents: 'auto' }}
    >
      <div
        className="bg-white rounded-lg shadow-2xl w-[600px] h-[700px] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="bg-gradient-to-r from-cyan-600 via-teal-600 to-cyan-700 text-white p-4 rounded-t-lg flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">{deskInfo.name}</h2>
            <p className="text-sm text-cyan-100">{deskInfo.serviceScope}</p>
            {deskInfo.workingHours && (
              <p className="text-xs text-cyan-200 mt-1">{t.front_desk.working_hours}: {deskInfo.workingHours}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-cyan-500/30 rounded-full p-2 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 使用统计 */}
        <div className="px-4 py-2 bg-gray-50 border-b text-xs text-gray-600">
          {t.front_desk.usage_stats
            .replace('{current}', usage.current.toString())
            .replace('{limit}', usage.limit.toString())
            .replace('{remaining}', usage.remaining.toString())}
        </div>

        {/* 消息区域 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-800'
                  }`}
              >
                {renderMessageContent(msg.content)}
                <p className={`text-xs mt-2 ${msg.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                  {new Date(msg.timestamp).toLocaleTimeString(locale, {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg p-3">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* 输入区域 */}
        <div className="border-t p-4">
          <div className="flex space-x-2">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              onKeyDown={handleInputKeyDown}
              placeholder={t.front_desk.placeholder}
              disabled={isLoading}
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:bg-gray-100 bg-white text-gray-800"
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !inputValue.trim()}
              className="bg-cyan-600 text-white px-6 py-2 rounded-lg hover:bg-cyan-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {t.front_desk.send}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {t.front_desk.hint}
          </p>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}

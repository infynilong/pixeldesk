'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'

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
              title: data.post.title || '未命名文章',
              summary: data.post.summary || data.post.content?.substring(0, 150) + '...' || '',
              tags: data.post.tags || [],
              url
            }
            articleCache.set(postId, article)
            setArticle(article)
          } else {
            setArticle({ id: postId, title: '相关文章', summary: '', tags: [], url })
          }
        } else {
          setArticle({ id: postId, title: '相关文章', summary: '', tags: [], url })
        }
      } catch (error) {
        console.error('Failed to fetch article:', error)
        setArticle({ id: postId, title: '相关文章', summary: '', tags: [], url })
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
            <span>阅读全文</span>
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
        onClose()
      }
    }

    window.addEventListener('keydown', handleEsc)
    return () => {
      window.removeEventListener('keydown', handleEsc)
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
          content: data.reply || '抱歉，服务暂时不可用',
          timestamp: new Date()
        }
        setMessages(prev => [...prev, errorMessage])
      }
    } catch (error) {
      console.error('Chat error:', error)
      const errorMessage: Message = {
        role: 'assistant',
        content: `网络连接失败: ${error.message}`,
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

  // 渲染消息内容，自动检测并转换博客链接
  const renderMessageContent = (content: string) => {
    // 使用正则表达式匹配 /posts/ 链接，并提取ID
    const blogUrlRegex = /\/posts\/([a-f0-9\-]+)/g

    if (!blogUrlRegex.test(content)) {
      return <p className="whitespace-pre-wrap break-words">{content}</p>
    }

    // 重置正则表达式的lastIndex
    blogUrlRegex.lastIndex = 0

    const parts: JSX.Element[] = []
    let lastIndex = 0
    let match

    while ((match = blogUrlRegex.exec(content)) !== null) {
      const [fullMatch, postId] = match
      const matchIndex = match.index

      // 添加匹配前的文本
      if (matchIndex > lastIndex) {
        parts.push(
          <span key={lastIndex} className="whitespace-pre-wrap break-words">
            {content.substring(lastIndex, matchIndex)}
          </span>
        )
      }

      // 添加可点击的链接（使用ArticleRecommendation组件）
      parts.push(
        <div key={`link-${matchIndex}`} className="my-2">
          <ArticleRecommendation
            url={fullMatch}
            postId={postId}
          />
        </div>
      )

      lastIndex = matchIndex + fullMatch.length
    }

    // 添加剩余的文本
    if (lastIndex < content.length) {
      parts.push(
        <span key={lastIndex} className="whitespace-pre-wrap break-words">
          {content.substring(lastIndex)}
        </span>
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
              <p className="text-xs text-cyan-200 mt-1">工作时间: {deskInfo.workingHours}</p>
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
          今日咨询次数: {usage.current}/{usage.limit} (剩余 {usage.remaining} 次)
        </div>

        {/* 消息区域 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {renderMessageContent(msg.content)}
                <p className={`text-xs mt-2 ${
                  msg.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  {new Date(msg.timestamp).toLocaleTimeString('zh-CN', {
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
              placeholder="输入您的问题..."
              disabled={isLoading}
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:bg-gray-100 bg-white text-gray-800"
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !inputValue.trim()}
              className="bg-cyan-600 text-white px-6 py-2 rounded-lg hover:bg-cyan-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              发送
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            按 Enter 发送，Shift + Enter 换行
          </p>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}

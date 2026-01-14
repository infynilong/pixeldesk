'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { StatusData } from '@/lib/eventBus'
import UserAvatar from '@/components/UserAvatar'

interface Message {
    role: 'user' | 'assistant'
    content: string
    timestamp: Date
}

interface AiChatTabProps {
    npcId: string
    npcName: string
    npcData?: any
    isActive?: boolean
}

export default function AiChatTab({
    npcId,
    npcName,
    npcData,
    isActive = false
}: AiChatTabProps) {
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [isLoadingHistory, setIsLoadingHistory] = useState(false)
    const [usage, setUsage] = useState<{ current: number; limit: number; remaining: number } | null>(null)
    const [error, setError] = useState<string | null>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const hasLoadedHistory = useRef<Record<string, boolean>>({})

    const greeting = npcData?.currentStatus?.message || '你好！我是你的 AI 助手 Sarah，有什么可以帮你的吗？'

    // 加载聊天历史（当 NPC 切换时）
    useEffect(() => {
        const loadHistory = async () => {
            if (!npcId || hasLoadedHistory.current[npcId]) {
                return
            }

            // 💡 直接使用原始 ID (优先 templateId)，确保与数据库 findUnique 匹配
            const cleanNpcId = npcData?.templateId || npcId

            console.log(`[${npcName}] 开始加载聊天历史, npcId=${cleanNpcId}`)
            setIsLoadingHistory(true)

            try {
                const response = await fetch(`/api/ai/chat/history?npcId=${cleanNpcId}`, {
                    credentials: 'include'
                })

                if (response.ok) {
                    const data = await response.json()
                    console.log(`[${npcName}] 加载历史消息:`, data.messages?.length || 0, '条')

                    if (data.success && data.messages.length > 0) {
                        // 有历史消息，直接显示
                        console.log(`[${npcName}] 显示历史对话，不显示问候语`)
                        setMessages(data.messages.map((m: any) => ({
                            role: m.role,
                            content: m.content,
                            timestamp: new Date(m.timestamp)
                        })))
                    } else {
                        // 没有历史消息，显示问候语
                        console.log(`[${npcName}] 没有历史消息，显示问候语`)
                        setMessages([{
                            role: 'assistant',
                            content: greeting,
                            timestamp: new Date()
                        }])
                    }
                } else {
                    console.error(`[${npcName}] 加载历史失败:`, response.status)
                    // 加载失败，显示问候语
                    setMessages([{
                        role: 'assistant',
                        content: greeting,
                        timestamp: new Date()
                    }])
                }
            } catch (error) {
                console.error(`[${npcName}] 加载历史出错:`, error)
                // 加载失败，显示问候语
                setMessages([{
                    role: 'assistant',
                    content: greeting,
                    timestamp: new Date()
                }])
            } finally {
                setIsLoadingHistory(false)
                hasLoadedHistory.current[npcId] = true
            }
        }

        loadHistory()
        setError(null)
    }, [npcId, npcName, greeting])

    // 组件卸载时确保恢复键盘
    useEffect(() => {
        return () => {
            if (typeof window !== 'undefined' && (window as any).enableGameKeyboard) {
                (window as any).enableGameKeyboard()
            }
        }
    }, [])

    // 自动滚动到底部以及聚焦输入框
    useEffect(() => {
        if (isActive) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
            // 延迟一会确保渲染完成
            setTimeout(() => inputRef.current?.focus(), 200)
        }
    }, [messages, isActive])

    const sendMessage = useCallback(async () => {
        if (!input.trim() || isLoading) return

        // 💡 直接使用原始 ID (优先 templateId)，确保与数据库 findUnique 匹配
        const cleanNpcId = npcData?.templateId || npcId

        const userMessage: Message = {
            role: 'user',
            content: input.trim(),
            timestamp: new Date()
        }

        setMessages(prev => [...prev, userMessage])
        setInput('')
        setIsLoading(true)
        setError(null)

        try {
            const response = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    message: userMessage.content,
                    npcId: cleanNpcId
                })
            })

            const data = await response.json()

            if (data.usage) {
                setUsage(data.usage)
            }

            if (!response.ok) {
                if (response.status === 429) {
                    setError('今日对话次数已用完，明天再来吧！')
                } else {
                    setError(data.error || '发送失败，请重试')
                }
                return
            }

            if (data.reply) {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: data.reply,
                    timestamp: new Date()
                }])
            }

        } catch (err) {
            console.error('AI Chat Error:', err)
            setError('网络错误，请检查连接')
        } finally {
            setIsLoading(false)
        }
    }, [input, isLoading, npcId])

    const handleFocus = () => {
        if (typeof window !== 'undefined' && (window as any).disableGameKeyboard) {
            (window as any).disableGameKeyboard()
        }
    }

    const handleBlur = () => {
        if (typeof window !== 'undefined' && (window as any).enableGameKeyboard) {
            (window as any).enableGameKeyboard()
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            sendMessage()
        } else if (e.key === 'Escape') {
            // 按下 ESC 键时失去焦点，恢复游戏控制
            (e.target as HTMLInputElement).blur()
        }
    }

    return (
        <div className="flex flex-col h-full bg-gray-900/30">
            {/* Header / NPC Info */}
            <div className="flex-shrink-0 p-4 border-b-2 border-retro-border/50 bg-gradient-to-r from-retro-bg-darker/60 to-retro-bg-dark/60 backdrop-blur-sm">
                <div className="flex items-center space-x-4">
                    {/* 头像区域 */}
                    <div className="relative">
                        <UserAvatar
                            userId={npcId}
                            userName={npcName}
                            userAvatar={npcData?.avatar}
                            size="lg"
                            showStatus={true}
                            isOnline={true}
                        />
                        {/* 互动标识 */}
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-br from-retro-green to-retro-cyan rounded-full border-2 border-retro-bg-darker shadow-lg">
                            <div className="w-full h-full bg-retro-green rounded-full opacity-60"></div>
                        </div>
                    </div>

                    {/* 用户信息 */}
                    <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-white font-pixel tracking-wide truncate">
                            {npcName}
                        </h3>
                        <div className="flex items-center gap-1.5 overflow-hidden">
                            <span className="text-xs font-medium text-retro-cyan font-retro whitespace-nowrap">
                                {npcData?.currentStatus?.status || 'AI助手'}
                            </span>
                            <span className="text-gray-600 font-bold px-1">|</span>
                            <p className="text-[10px] text-retro-textMuted font-retro truncate">
                                {usage ? `LIMIT: ${usage.remaining}/${usage.limit}` : 'AI CONVERSATION'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {isLoadingHistory ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-gray-400 text-sm">正在加载聊天历史...</div>
                    </div>
                ) : (
                    <>
                        {messages.map((msg, idx) => (
                            <div
                                key={idx}
                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[90%] rounded-xl px-3 py-2 ${msg.role === 'user'
                                        ? 'bg-cyan-600/20 text-cyan-100 border border-cyan-500/30 rounded-br-none'
                                        : 'bg-gray-800/80 text-gray-200 border border-gray-700/50 rounded-bl-none'
                                        }`}
                                >
                                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                    <div className="flex justify-end mt-1">
                                        <span className="text-[10px] text-gray-500 font-mono opacity-60">
                                            {msg.timestamp.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-gray-800/50 rounded-xl rounded-bl-none px-3 py-2 border border-gray-700/30">
                                    <div className="flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 bg-cyan-500/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                        <span className="w-1.5 h-1.5 bg-cyan-500/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                        <span className="w-1.5 h-1.5 bg-cyan-500/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </>
                )}
            </div>

            {/* Error Message */}
            {error && (
                <div className="px-4 py-1.5 bg-red-900/20 border-y border-red-500/20">
                    <p className="text-[10px] text-red-400 font-mono text-center">{error}</p>
                </div>
            )}

            {/* Input Area */}
            <div className="p-3 bg-gray-900/50 border-t border-gray-800">
                <div className="relative flex items-center">
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                        placeholder="Say something to AI..."
                        disabled={isLoading}
                        className="w-full bg-gray-800/50 border border-gray-700 rounded-lg pl-3 pr-10 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 transition-colors disabled:opacity-50"
                    />
                    <button
                        onClick={sendMessage}
                        disabled={isLoading || !input.trim()}
                        className="absolute right-1.5 p-1.5 text-cyan-500 hover:text-cyan-400 disabled:text-gray-600 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    )
}

'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from '@/lib/hooks/useTranslation'

interface Message {
    role: 'user' | 'assistant'
    content: string
    timestamp: Date
}

interface AiChatModalProps {
    isOpen: boolean
    onClose: () => void
    npcId: string
    npcName: string
    greeting?: string
}

export default function AiChatModal({
    isOpen,
    onClose,
    npcId,
    npcName,
    greeting
}: AiChatModalProps) {
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [isLoadingHistory, setIsLoadingHistory] = useState(false)
    const [usage, setUsage] = useState<{ current: number; limit: number; remaining: number } | null>(null)
    const [error, setError] = useState<string | null>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const hasLoadedHistory = useRef(false)
    const { t, locale } = useTranslation()

    // 加载聊天历史
    useEffect(() => {
        console.log(`[聊天窗口] isOpen=${isOpen}, npcId=${npcId}, npcName=${npcName}, hasLoadedHistory=${hasLoadedHistory.current}`)
        const loadHistory = async () => {
            if (!isOpen) {
                console.log('[聊天窗口] 窗口未打开，跳过加载')
                return
            }
            if (hasLoadedHistory.current) {
                console.log('[聊天窗口] 已加载过历史，跳过')
                return
            }

            setIsLoadingHistory(true)
            try {
                const response = await fetch(`/api/ai/chat/history?npcId=${npcId}`, {
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
                        hasLoadedHistory.current = true
                    } else if (greeting) {
                        // 没有历史消息，显示问候语
                        console.log(`[${npcName}] 没有历史消息，显示问候语`)
                        setMessages([{
                            role: 'assistant',
                            content: greeting,
                            timestamp: new Date()
                        }])
                        hasLoadedHistory.current = true
                    }
                } else if (greeting) {
                    console.error(`[${npcName}] 加载历史失败:`, response.status)
                    // 加载失败，显示问候语
                    setMessages([{
                        role: 'assistant',
                        content: greeting,
                        timestamp: new Date()
                    }])
                    hasLoadedHistory.current = true
                }
            } catch (error) {
                console.error('Failed to load chat history:', error)
                // 加载失败，显示问候语
                if (greeting) {
                    setMessages([{
                        role: 'assistant',
                        content: greeting,
                        timestamp: new Date()
                    }])
                }
                hasLoadedHistory.current = true
            } finally {
                setIsLoadingHistory(false)
            }
        }

        loadHistory()
    }, [isOpen, npcId, greeting])

    // 自动聚焦输入框
    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 100)
        }
    }, [isOpen])

    // 自动滚动到底部
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    // 重置状态（关闭时）
    useEffect(() => {
        if (!isOpen) {
            // 重置加载标志，下次打开时重新加载
            hasLoadedHistory.current = false
            setError(null)
            setInput('')
            // 确保关闭时恢复键盘
            if (typeof window !== 'undefined' && (window as any).enableGameKeyboard) {
                (window as any).enableGameKeyboard()
            }
        }
    }, [isOpen])

    // 组件卸载时确保恢复键盘
    useEffect(() => {
        return () => {
            if (typeof window !== 'undefined' && (window as any).enableGameKeyboard) {
                (window as any).enableGameKeyboard()
            }
        }
    }, [])

    const sendMessage = useCallback(async () => {
        if (!input.trim() || isLoading) return

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
                    npcId
                })
            })

            const data = await response.json()

            if (data.usage) {
                setUsage(data.usage)
            }

            if (!response.ok) {
                if (response.status === 429) {
                    setError(t.ai.err_limit)
                } else {
                    setError(data.error || t.ai.err_send)
                }
                // 还是显示 AI 的回复（如果有）
                if (data.reply) {
                    setMessages(prev => [...prev, {
                        role: 'assistant',
                        content: data.reply,
                        timestamp: new Date()
                    }])
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
            setError(t.auth.network_error)
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
            (e.target as HTMLInputElement).blur()
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-800">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center">
                            <span className="text-lg">🤖</span>
                        </div>
                        <div>
                            <h3 className="text-white font-semibold">{npcName}</h3>
                            <p className="text-gray-400 text-xs font-mono">{t.ai.npc_title}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {usage && (
                            <span className="text-xs text-gray-500 font-mono">
                                {t.ai.remaining.replace('{remaining}', usage.remaining.toString()).replace('{limit}', usage.limit.toString())}
                            </span>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px]">
                    {isLoadingHistory ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-gray-400 text-sm">{t.ai.loading_history}</div>
                        </div>
                    ) : (
                        <>
                            {messages.map((msg, idx) => (
                                <div
                                    key={idx}
                                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`max-w-[80%] rounded-2xl px-4 py-2 ${msg.role === 'user'
                                            ? 'bg-blue-600 text-white rounded-br-md'
                                            : 'bg-gray-800 text-gray-100 rounded-bl-md'
                                            }`}
                                    >
                                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                        <p className={`text-xs mt-1 ${msg.role === 'user' ? 'text-blue-200' : 'text-gray-500'}`}>
                                            {msg.timestamp.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                            ))}

                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-gray-800 text-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
                                        <div className="flex items-center gap-1">
                                            <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                            <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                            <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div ref={messagesEndRef} />
                        </>
                    )}
                </div>

                {/* Error */}
                {error && (
                    <div className="px-4 py-2 bg-red-900/30 border-t border-red-800/50">
                        <p className="text-red-400 text-sm text-center">{error}</p>
                    </div>
                )}

                {/* Input */}
                <div className="p-4 border-t border-gray-800">
                    <div className="flex items-center gap-2">
                        <input
                            ref={inputRef}
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onFocus={handleFocus}
                            onBlur={handleBlur}
                            placeholder={t.ai.placeholder}
                            disabled={isLoading}
                            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 disabled:opacity-50"
                        />
                        <button
                            onClick={sendMessage}
                            disabled={isLoading || !input.trim()}
                            className="p-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg transition-colors"
                        >
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

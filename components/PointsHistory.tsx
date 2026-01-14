
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from '@/lib/hooks/useTranslation'

interface PointsHistoryItem {
    id: string
    amount: number
    reason: string
    type: string
    balance: number
    createdAt: string
}

interface PointsHistoryProps {
    userId: string
    isOpen: boolean
    onClose: () => void
}

export default function PointsHistory({ userId, isOpen, onClose }: PointsHistoryProps) {
    const { t, locale } = useTranslation()
    const [history, setHistory] = useState<PointsHistoryItem[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [page, setPage] = useState(1)
    const [hasMore, setHasMore] = useState(true)
    const [total, setTotal] = useState(0)

    // 防止滚动穿透
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = 'unset'
        }
        return () => {
            document.body.style.overflow = 'unset'
        }
    }, [isOpen])

    const fetchHistory = useCallback(async (pageNum: number) => {
        try {
            setIsLoading(true)
            const res = await fetch(`/api/points/history?userId=${userId}&page=${pageNum}&limit=10`)
            const data = await res.json()

            if (data.success) {
                if (pageNum === 1) {
                    setHistory(data.data.history)
                } else {
                    setHistory(prev => [...prev, ...data.data.history])
                }
                setHasMore(data.data.pagination.hasMore)
                setTotal(data.data.pagination.total)
            }
        } catch (error) {
            console.error('Failed to fetch history:', error)
        } finally {
            setIsLoading(false)
        }
    }, [userId])

    useEffect(() => {
        if (isOpen) {
            setPage(1)
            fetchHistory(1)
        }
    }, [isOpen, fetchHistory])

    const loadMore = () => {
        if (!isLoading && hasMore) {
            const nextPage = page + 1
            setPage(nextPage)
            fetchHistory(nextPage)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn">
            <div
                className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-lg shadow-2xl flex flex-col max-h-[80vh]"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-gray-900/50 rounded-t-lg">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-yellow-900/20 border border-yellow-500/20 rounded-lg flex items-center justify-center">
                            <span className="text-yellow-500 text-lg">💰</span>
                        </div>
                        <div>
                            <h3 className="text-gray-100 font-medium font-mono">{t.points_history.title}</h3>
                            <p className="text-xs text-gray-500 font-mono">{t.points_history.total_transactions.replace('{total}', total.toString())}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {history.length === 0 && !isLoading ? (
                        <div className="text-center py-8 text-gray-500 font-mono text-sm">
                            {t.points_history.no_transactions}
                        </div>
                    ) : (
                        history.map((item) => (
                            <div
                                key={item.id}
                                className="bg-gray-800/40 border border-gray-700/30 p-3 rounded-lg flex items-center justify-between hover:bg-gray-800/60 transition-colors"
                            >
                                <div>
                                    <p className="text-gray-200 text-sm font-medium mb-0.5">{item.reason}</p>
                                    <p className="text-gray-500 text-xs font-mono">
                                        {new Date(item.createdAt).toLocaleString(locale)}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className={`font-mono font-bold ${item.amount > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {item.amount > 0 ? '+' : ''}{item.amount}
                                    </p>
                                    <p className="text-gray-600 text-[10px] font-mono">
                                        {t.points_history.balance.replace('{balance}', item.balance.toString())}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}

                    {isLoading && (
                        <div className="flex justify-center py-4">
                            <div className="w-6 h-6 border-2 border-gray-600 border-t-emerald-500 rounded-full animate-spin"></div>
                        </div>
                    )}

                    {!isLoading && hasMore && (
                        <button
                            onClick={loadMore}
                            className="w-full py-2 text-xs text-gray-400 hover:text-white bg-gray-800/50 hover:bg-gray-800 rounded border border-gray-700/50 transition-colors font-mono"
                        >
                            {t.points_history.load_more}
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

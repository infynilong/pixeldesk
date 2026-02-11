'use client'

import { useEffect, useState } from 'react'

interface StorageStats {
    totalSize: number
    totalFiles: number
    userUsage: Record<string, { size: number, files: number }>
}

function formatBytes(bytes: number, decimals = 2) {
    if (!+bytes) return '0 Bytes'
    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

export default function StorageDashboard() {
    const [stats, setStats] = useState<StorageStats | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchStats() {
            try {
                const res = await fetch('/api/pixel-dashboard/storage')
                if (res.ok) {
                    const data = await res.json()
                    setStats(data)
                }
            } catch (error) {
                console.error('Failed to fetch storage stats:', error)
            } finally {
                setLoading(false)
            }
        }
        fetchStats()
    }, [])

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-950 text-white">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
                    <p className="mt-4 text-gray-400">Loading storage stats...</p>
                </div>
            </div>
        )
    }

    // Sort users by size descending
    const sortedUsers = stats
        ? Object.entries(stats.userUsage)
            .sort(([, a], [, b]) => b.size - a.size)
            .map(([userId, usage]) => ({ userId, ...usage }))
        : []

    return (
        <div className="p-8 bg-gray-950 min-h-screen text-white">
            <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
                <span>💾</span>
                <span>存储空间概览</span>
            </h1>

            {!stats ? (
                <div className="text-red-400">无法加载统计数据</div>
            ) : (
                <>
                    {/* Overview Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div className="bg-gradient-to-br from-blue-900/50 to-blue-800/30 border border-blue-700/50 rounded-2xl p-6 shadow-lg backdrop-blur-sm">
                            <h3 className="text-blue-200 text-sm font-medium uppercase tracking-wider mb-1">总存储占用</h3>
                            <p className="text-4xl font-bold text-white">{formatBytes(stats.totalSize)}</p>
                            <div className="mt-4 h-2 bg-black/40 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 w-full animate-pulse"></div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-purple-900/50 to-purple-800/30 border border-purple-700/50 rounded-2xl p-6 shadow-lg backdrop-blur-sm">
                            <h3 className="text-purple-200 text-sm font-medium uppercase tracking-wider mb-1">总文件数量</h3>
                            <p className="text-4xl font-bold text-white">{stats.totalFiles.toLocaleString()}</p>
                            <div className="mt-4 h-2 bg-black/40 rounded-full overflow-hidden">
                                <div className="h-full bg-purple-500 w-full animate-pulse"></div>
                            </div>
                        </div>
                    </div>

                    {/* User Usage List */}
                    <div className="bg-gray-900/50 border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
                        <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center bg-gray-900">
                            <h2 className="text-xl font-bold text-white">用户使用详情</h2>
                            <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">Top {sortedUsers.length}</span>
                        </div>

                        <div className="divide-y divide-gray-800/50">
                            {sortedUsers.length === 0 ? (
                                <div className="p-8 text-center text-gray-500">
                                    暂无上传记录
                                </div>
                            ) : (
                                sortedUsers.map(({ userId, size, files }, index) => {
                                    const percentage = stats.totalSize > 0 ? (size / stats.totalSize) * 100 : 0

                                    return (
                                        <div key={userId} className="p-4 hover:bg-white/5 transition-colors flex items-center gap-4 group">
                                            <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-gray-400 font-mono text-xs">
                                                {index + 1}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-center mb-1">
                                                    <h3 className="font-medium text-white truncate pr-4" title={userId}>
                                                        {userId === 'System (Legacy)' || userId === 'system' ? '💻 系统 / 旧文件' : `👤 User: ${userId}`}
                                                    </h3>
                                                    <span className="text-sm font-bold text-white tabular-nums">{formatBytes(size)}</span>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full transition-all duration-500 ${userId.includes('System') ? 'bg-gray-500' : 'bg-indigo-500'}`}
                                                            style={{ width: `${percentage}%` }}
                                                        ></div>
                                                    </div>
                                                    <span className="text-xs text-gray-500 w-12 text-right">{percentage.toFixed(1)}%</span>
                                                </div>
                                                <p className="text-xs text-gray-500 mt-1">{files} files</p>
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}

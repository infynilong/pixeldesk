'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

interface PlayerDetails {
    id: string
    userId: string
    playerName: string
    userName: string
    email: string | null
    characterSprite: string
    points: number
    totalPlayTime: number
    totalPlayTimeText: string
    lastActiveAt: string
    createdAt: string
    isActive: boolean
}

export default function PlayerDetailPage({ params }: { params: { id: string } }) {
    const router = useRouter()
    const [player, setPlayer] = useState<PlayerDetails | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [deleting, setDeleting] = useState(false)

    useEffect(() => {
        fetchPlayerDetails()
    }, [params.id])

    const fetchPlayerDetails = async () => {
        try {
            const response = await fetch(`/api/admin/players/${params.id}`)
            if (response.ok) {
                const data = await response.json()
                setPlayer(data.data)
            } else {
                setError('无法加载玩家详情')
            }
        } catch (err) {
            setError('加载出错')
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async () => {
        setDeleting(true)
        try {
            const response = await fetch(`/api/admin/players/${params.id}`, {
                method: 'DELETE',
            })
            if (response.ok) {
                router.push('/admin/players')
            } else {
                alert('删除失败')
            }
        } catch (err) {
            alert('删除时出错')
        } finally {
            setDeleting(false)
            setShowDeleteConfirm(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-black">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
            </div>
        )
    }

    if (error || !player) {
        return (
            <div className="p-8 text-center text-red-400">
                <p>{error || '玩家不存在'}</p>
                <button
                    onClick={() => router.back()}
                    className="mt-4 px-4 py-2 bg-gray-800 rounded text-white"
                >
                    返回
                </button>
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="p-2 hover:bg-gray-800 rounded-full text-gray-400 transition-colors"
                    >
                        ←
                    </button>
                    <h1 className="text-3xl font-bold text-white">玩家详情</h1>
                </div>
                <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all font-medium"
                >
                    删除玩家
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Column: Profile Card */}
                <div className="md:col-span-1 bg-gray-900 border border-gray-800 rounded-2xl p-6 text-center">
                    <div className="w-32 h-32 bg-gray-800 rounded-full mx-auto mb-4 flex items-center justify-center border-4 border-purple-500/20">
                        <Image
                            src={`/assets/characters/${player.characterSprite}.png`}
                            alt={player.characterSprite}
                            width={80}
                            height={80}
                            className="pixelated"
                        />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-1">{player.playerName}</h2>
                    <p className="text-gray-400 text-sm mb-4">@{player.userName}</p>
                    <div className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${player.isActive ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                        }`}>
                        {player.isActive ? '● 账号状态正常' : '● 账号已禁用'}
                    </div>
                </div>

                {/* Right Column: Details */}
                <div className="md:col-span-2 space-y-6">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                            <p className="text-gray-500 text-sm mb-1">当前积分</p>
                            <p className="text-2xl font-bold text-yellow-400">{player.points}</p>
                        </div>
                        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                            <p className="text-gray-500 text-sm mb-1">累计时长</p>
                            <p className="text-2xl font-bold text-blue-400">{player.totalPlayTimeText}</p>
                        </div>
                    </div>

                    {/* Detailed Info */}
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-800 bg-gray-800/50">
                            <h3 className="font-semibold text-white">详细信息</h3>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="flex justify-between py-2 border-b border-gray-800/50">
                                <span className="text-gray-400">电子邮箱</span>
                                <span className="text-white">{player.email || '未绑定'}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-gray-800/50">
                                <span className="text-gray-400">注册时间</span>
                                <span className="text-white">{new Date(player.createdAt).toLocaleString('zh-CN')}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-gray-800/50">
                                <span className="text-gray-400">上次活跃</span>
                                <span className="text-white">{new Date(player.lastActiveAt).toLocaleString('zh-CN')}</span>
                            </div>
                            <div className="flex justify-between py-2">
                                <span className="text-gray-400">角色模型</span>
                                <span className="text-white uppercase">{player.characterSprite}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
                        <h3 className="text-xl font-bold text-white mb-4">确认删除玩家？</h3>
                        <p className="text-gray-400 mb-6">
                            此操作将永久删除玩家 <span className="text-white font-semibold">{player.playerName}</span> 及其所有相关数据（积分、游戏时长、账号信息）。此操作无法撤销。
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                                disabled={deleting}
                            >
                                取消
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={deleting}
                                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all flex items-center gap-2"
                            >
                                {deleting ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                        删除中...
                                    </>
                                ) : '确认删除'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

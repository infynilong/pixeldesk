'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from '@/lib/hooks/useTranslation'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import UserAvatar from '../UserAvatar'
import { getAssetUrl } from '@/lib/utils/assets'
import { renderContentWithUrls } from '@/lib/utils/format'
import ProBadge from '../social/ProBadge'

interface BillboardPost {
    id: string
    title: string
    summary: string
    coverImage: string
    author: {
        id: string
        name: string
        avatar: string
        customAvatar?: string
        isAdmin?: boolean
    }
    promoters: string[]
    expiresAt: string
}

export default function BillboardUI() {
    const { t } = useTranslation()
    const [isNear, setIsNear] = useState(false)
    const [posts, setPosts] = useState<BillboardPost[]>([])
    const [isOpen, setIsOpen] = useState(false)
    // const [currentIndex, setCurrentIndex] = useState(0) // Unused state removed for performance
    const [activeTab, setActiveTab] = useState<'articles' | 'leaderboard'>('articles')
    const [leaderboardData, setLeaderboardData] = useState<any>(null)
    const [loadingLeaderboard, setLoadingLeaderboard] = useState(false)
    const [loadingArticles, setLoadingArticles] = useState(false)

    useEffect(() => {
        const handleProximity = (event: any) => {
            const { isNear: near, content } = event.detail
            setIsNear(near)
            if (content) setPosts(content)
        }

        const handleOpen = (event: any) => {
            const { content } = event.detail
            if (content) setPosts(content)
            setIsOpen(true)
        }

        window.addEventListener('billboard-proximity-change', handleProximity)
        window.addEventListener('open-billboard', handleOpen)

        return () => {
            window.removeEventListener('billboard-proximity-change', handleProximity)
            window.removeEventListener('open-billboard', handleOpen)
        }
    }, [])

    // 获取排行榜数据/文章数据
    useEffect(() => {
        if (isOpen) {
            if (activeTab === 'leaderboard') {
                fetchLeaderboard()
            } else if (activeTab === 'articles') {
                fetchArticles()
            }
        }
    }, [isOpen, activeTab])

    const fetchArticles = async () => {
        setLoadingArticles(true)
        try {
            const res = await fetch('/api/billboard/active')
            const result = await res.json()
            if (result.success) {
                setPosts(result.data)
            }
        } catch (error) {
            console.error('Failed to fetch articles:', error)
        } finally {
            setLoadingArticles(false)
        }
    }

    const fetchLeaderboard = async () => {
        setLoadingLeaderboard(true)
        try {
            const res = await fetch('/api/player/steps/leaderboard')
            const result = await res.json()
            if (result.success) {
                setLeaderboardData(result.data)
            }
        } catch (error) {
            console.error('Failed to fetch leaderboard:', error)
        } finally {
            setLoadingLeaderboard(false)
        }
    }

    const getMedalIcon = (rank: number) => {
        switch (rank) {
            case 1: return <span className="text-xl">🥇</span>
            case 2: return <span className="text-xl">🥈</span>
            case 3: return <span className="text-xl">🥉</span>
            default: return <span className="w-6 text-center font-bold text-gray-500 text-[10px]">{rank}</span>
        }
    }

    // 自动轮播逻辑已移除以优化性能
    // The currentIndex was unused in the rendering logic (all posts are rendered)
    // Removed unused interval to save CPU

    if (!isNear && !isOpen) return null

    return (
        <>
            {/* 1. 靠近时显示的极简提示 */}
            <AnimatePresence>
                {isNear && !isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="fixed bottom-40 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none"
                    >
                        <div className="bg-black/80 border-2 border-cyan-500/50 px-4 py-2 rounded-full backdrop-blur-md shadow-lg flex items-center gap-3">
                            <div className="animate-bounce text-cyan-400">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                                </svg>
                            </div>
                            <span className="text-white font-pixel text-[10px] tracking-widest uppercase">
                                {t.billboard.proximity_prompt}
                            </span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 2. 经典像素公告栏 UI */}
            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 sm:p-8">
                        {/* 遮罩背景 */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="absolute inset-0 bg-black/85 backdrop-blur-lg"
                        />

                        {/* 布告栏主体 */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 50, rotateX: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 50, rotateX: 10 }}
                            className="relative w-[90vw] md:w-[85vw] lg:w-[80vw] xl:w-[75vw] h-[85vh] bg-[#3a3f44] border-[8px] border-[#2c3034] shadow-[20px_20px_0_0_rgba(0,0,0,0.4)] flex flex-col font-pixel overflow-hidden"
                            style={{
                                backgroundImage: `url(${getAssetUrl('/assets/tileset/office.png')})`,
                                backgroundSize: 'cover',
                                backgroundBlendMode: 'multiply'
                            }}
                        >
                            {/* 布告栏顶部标题 */}
                            <div className="flex-shrink-0 bg-[#2c3034] px-6 py-4 flex items-center justify-between border-b-[6px] border-[#1a1c1e]">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-cyan-500 rounded-none shadow-[4px_4px_0_0_rgba(0,0,0,0.5)] flex items-center justify-center">
                                        <span className="text-2xl text-black">📢</span>
                                    </div>
                                    <div>
                                        <h2 className="text-white text-lg md:text-xl font-black uppercase tracking-tighter">
                                            {t.billboard.campus_title}
                                        </h2>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none">
                                                {t.billboard.live_updates}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="w-10 h-10 bg-red-500 hover:bg-red-400 text-black font-black text-xl flex items-center justify-center shadow-[4px_4px_0_0_rgba(0,0,0,0.5)] transition-all active:shadow-none active:translate-x-1 active:translate-y-1 cursor-pointer"
                                >
                                    ×
                                </button>
                            </div>

                            {/* 标签切换栏 */}
                            <div className="flex-shrink-0 bg-[#1a1c1e] px-4 flex gap-1 pt-2">
                                <button
                                    onClick={() => setActiveTab('articles')}
                                    className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'articles'
                                        ? 'bg-[#e0d6c5] text-black border-t-4 border-l-4 border-r-4 border-black'
                                        : 'bg-black/30 text-gray-500 hover:bg-black/50'
                                        }`}
                                >
                                    📄 {t.billboard.articles_tab || '金榜文章'}
                                </button>
                                <button
                                    onClick={() => setActiveTab('leaderboard')}
                                    className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'leaderboard'
                                        ? 'bg-[#e0d6c5] text-black border-t-4 border-l-4 border-r-4 border-black'
                                        : 'bg-black/30 text-gray-500 hover:bg-black/50'
                                        }`}
                                >
                                    🏆 {t.common.leaderboard || '步数排行'}
                                </button>
                            </div>

                            {/* 内容展示区 */}
                            <div className="flex-1 p-4 md:p-6 overflow-y-auto custom-scrollbar bg-[#e0d6c5] relative">
                                {/* 软木塞板纹理效果 */}
                                <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000000' fill-opacity='1' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='3'/%3E%3Ccircle cx='13' cy='13' r='3'/%3E%3C/g%3E%3C/svg%3E\")" }}></div>

                                {activeTab === 'articles' ? (
                                    <>
                                        {loadingArticles ? (
                                            <div className="h-full flex flex-col items-center justify-center py-20 relative z-10">
                                                <div className="w-12 h-12 border-4 border-black border-t-transparent animate-spin mb-4" />
                                                <p className="text-sm font-black text-black/40 uppercase tracking-widest italic animate-pulse">Fetching Latest Records...</p>
                                            </div>
                                        ) : posts.length > 0 ? (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 relative z-10 pb-8">
                                                {posts.map((post, idx) => (
                                                    <motion.div
                                                        key={post.id}
                                                        initial={{ opacity: 0, rotate: idx % 2 === 0 ? -1 : 1, y: 20 }}
                                                        animate={{ opacity: 1, rotate: idx % 2 === 0 ? -0.5 : 0.5, y: 0 }}
                                                        whileHover={{ rotate: 0, scale: 1.02, zIndex: 10 }}
                                                        className={`relative bg-white p-3 md:p-4 shadow-[6px_6px_0_0_rgba(0,0,0,0.1)] border-2 border-gray-900 group transition-all cursor-pointer flex gap-3 md:gap-4 min-h-[140px] md:min-h-[160px]`}
                                                    >
                                                        {/* 图钉 */}
                                                        <div className="absolute -top-2 left-4 w-4 h-4 rounded-full bg-red-600 border-2 border-black shadow-[1px_1px_0_0_rgba(0,0,0,0.3)] z-10" />

                                                        {post.coverImage && (
                                                            <div className="flex-shrink-0 w-20 h-full md:w-28 bg-gray-100 border border-gray-900 overflow-hidden">
                                                                <img src={getAssetUrl(post.coverImage)} className="w-full h-full object-cover" alt="" />
                                                            </div>
                                                        )}

                                                        <div className="flex-1 flex flex-col min-w-0">
                                                            <div className="flex items-start justify-between gap-2 mb-1">
                                                                <h3 className="text-black text-[10px] md:text-xs font-black truncate leading-tight uppercase group-hover:text-blue-600 transition-colors">
                                                                    {post.title || t.billboard.untitled}
                                                                </h3>
                                                                <div className="flex-shrink-0 px-1 py-0.5 bg-yellow-400 text-[7px] font-black text-black border border-black uppercase">HOT</div>
                                                            </div>
                                                            <div className="text-gray-600 text-[9px] md:text-[10px] line-clamp-2 leading-snug font-medium mb-3 italic">
                                                                "{renderContentWithUrls(post.summary || t.billboard.pending_summary, t.social.view_link)}"
                                                            </div>
                                                            <div className="mt-auto pt-2 border-t border-dashed border-gray-300 flex items-center justify-between">
                                                                <div className="flex items-center gap-1">
                                                                    <UserAvatar userId={post.author.id} userName={post.author.name} userAvatar={post.author.avatar} size="xs" showStatus={false} />
                                                                    <div className="flex items-center gap-0.5">
                                                                        <span className="text-[8px] md:text-[9px] text-gray-800 font-bold truncate max-w-[60px]">{post.author.name}</span>
                                                                        {post.author.isAdmin && <ProBadge />}
                                                                    </div>
                                                                </div>
                                                                <Link href={`/posts/${post.id}`} target="_blank" className="px-1.5 py-1 bg-gray-900 text-white text-[7.5px] font-black hover:bg-gray-800">READ ➡</Link>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="h-full flex flex-col items-center justify-center py-20 bg-black/5 border-4 border-dashed border-black/10">
                                                <div className="text-6xl mb-6 opacity-30 grayscale filter">📋</div>
                                                <h3 className="text-xl text-black/30 font-black uppercase tracking-[0.2em]">{t.billboard.empty_title}</h3>
                                                <p className="text-black/20 text-xs font-bold mt-2 uppercase tracking-widest text-center max-w-sm">{t.billboard.empty_desc}</p>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="relative z-10 max-w-2xl mx-auto">
                                        {/* 排行榜模式 */}
                                        <div className="bg-[#f2eadc] border-4 border-black p-4 md:p-6 shadow-[10px_10px_0_0_rgba(0,0,0,0.1)]">
                                            <div className="flex items-center justify-between mb-6 pb-4 border-b-4 border-black/10">
                                                <h3 className="text-lg md:text-xl text-black font-black uppercase italic tracking-tighter">
                                                    👟 {t.common.daily_steps || '每日步数排行'}
                                                </h3>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={fetchLeaderboard}
                                                        disabled={loadingLeaderboard}
                                                        className={`p-1.5 bg-black/5 border-2 border-black hover:bg-black/10 active:translate-y-0.5 transition-all ${loadingLeaderboard ? 'opacity-50' : ''}`}
                                                        title={t.common.refresh}
                                                    >
                                                        <svg className={`w-4 h-4 text-black ${loadingLeaderboard ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                        </svg>
                                                    </button>
                                                    {leaderboardData && (
                                                        <div className="bg-amber-400 px-3 py-1 border-2 border-black text-[10px] font-black text-black">
                                                            #{leaderboardData.myStatus.rank || '--'} RANK
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {loadingLeaderboard ? (
                                                <div className="py-20 flex flex-col items-center justify-center gap-4">
                                                    <div className="w-10 h-10 border-4 border-black border-t-transparent animate-spin" />
                                                    <p className="text-[10px] font-black text-black/50">LOADING DATA...</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    {leaderboardData?.today.map((player: any) => (
                                                        <div key={player.userId} className="flex items-center gap-3 bg-white p-3 border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,0.05)]">
                                                            <div className="w-8 flex justify-center">{getMedalIcon(player.rank)}</div>
                                                            <UserAvatar userId={player.userId} userAvatar={player.avatar} userName={player.name} size="sm" showStatus={false} />
                                                            <div className="flex-1 min-w-0">
                                                                <Link
                                                                    href={`/profile/${player.userId}`}
                                                                    target="_blank"
                                                                    className="text-xs font-black text-black truncate uppercase hover:text-amber-600 transition-colors cursor-pointer block"
                                                                >
                                                                    {player.name}
                                                                </Link>
                                                                <div className="flex items-center gap-2">
                                                                    <div className="h-1 flex-1 bg-gray-100 rounded-full overflow-hidden">
                                                                        <div className="h-full bg-amber-500" style={{ width: `${Math.min(100, (player.steps / 10000) * 100)}%` }} />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-sm font-black text-amber-600 leading-none">{player.steps.toLocaleString()}</p>
                                                                <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest mt-1">Steps</p>
                                                            </div>
                                                        </div>
                                                    ))}

                                                    {leaderboardData?.today.length === 0 && (
                                                        <div className="py-12 flex flex-col items-center gap-4 border-4 border-dashed border-black/10">
                                                            <span className="text-4xl opacity-30">👟</span>
                                                            <p className="text-xs font-bold text-black/30">暂无数据，快去走两步！</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* 个人状态底栏 */}
                                            {!loadingLeaderboard && leaderboardData && (
                                                <div className="mt-8 pt-4 border-t-4 border-black flex items-center justify-between">
                                                    <div className="flex flex-col">
                                                        <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">Your Daily Steps</span>
                                                        <span className="text-lg font-black text-black">{leaderboardData.myStatus.steps.toLocaleString()}</span>
                                                    </div>
                                                    <div className="text-right flex flex-col">
                                                        <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">Current Rank</span>
                                                        <span className="text-lg font-black text-amber-500">#{leaderboardData.myStatus.rank || '--'}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* 底部功能栏 */}
                            <div className="flex-shrink-0 bg-[#2c3034] p-3 text-center border-t-[6px] border-[#1a1c1e]">
                                <span className="text-gray-500 text-[10px] tracking-[0.5em] font-bold opacity-50 uppercase">
                                    {t.billboard.footer_text}
                                </span>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 12px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgba(0, 0, 0, 0.1);
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #2c3034;
                    border: 3px solid transparent;
                    background-clip: content-box;
                    border-radius: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #1a1c1e;
                    background-clip: content-box;
                }
                .font-pixel {
                    font-family: 'Pixel', 'Press Start 2P', monospace;
                }
            `}</style>
        </>
    )
}

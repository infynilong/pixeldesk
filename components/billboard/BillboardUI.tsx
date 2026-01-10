'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from '@/lib/hooks/useTranslation'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import UserAvatar from '../UserAvatar'

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
    }
    promoters: string[]
    expiresAt: string
}

export default function BillboardUI() {
    const { t } = useTranslation()
    const [isNear, setIsNear] = useState(false)
    const [posts, setPosts] = useState<BillboardPost[]>([])
    const [isOpen, setIsOpen] = useState(false)
    const [currentIndex, setCurrentIndex] = useState(0)

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

    // 自动轮播 (仅针对预览窗)
    useEffect(() => {
        if (isNear && posts.length > 1) {
            const timer = setInterval(() => {
                setCurrentIndex(prev => (prev + 1) % posts.length)
            }, 6000)
            return () => clearInterval(timer)
        }
    }, [isNear, posts])

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

            {/* 2. 经典像素公告栏 UI - 恢复软木板风格但优化内容密度 */}
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

                        {/* 布告栏主体 - 恢复重型像素风格 */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 50, rotateX: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 50, rotateX: 10 }}
                            className="relative w-[90vw] md:w-[85vw] lg:w-[80vw] xl:w-[75vw] h-[85vh] bg-[#3a3f44] border-[8px] border-[#2c3034] shadow-[20px_20px_0_0_rgba(0,0,0,0.4)] flex flex-col font-pixel overflow-hidden"
                            style={{
                                backgroundImage: `url('/assets/tileset/office.png')`,
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
                                            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-none">
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

                            {/* 内容展示区 - 采用高密度横向卡片，每行两个 */}
                            <div className="flex-1 p-4 md:p-6 overflow-y-auto custom-scrollbar bg-[#e0d6c5] relative">
                                {/* 软木塞板纹理效果 */}
                                <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000000' fill-opacity='1' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='3'/%3E%3Ccircle cx='13' cy='13' r='3'/%3E%3C/g%3E%3C/svg%3E\")" }}></div>

                                {posts.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 relative z-10 pb-8">
                                        {posts.map((post, idx) => (
                                            <motion.div
                                                key={post.id}
                                                initial={{ opacity: 0, rotate: idx % 2 === 0 ? -1 : 1, y: 20 }}
                                                animate={{ opacity: 1, rotate: idx % 2 === 0 ? -0.5 : 0.5, y: 0 }}
                                                whileHover={{ rotate: 0, scale: 1.02, zIndex: 10 }}
                                                className={`relative bg-white p-3 md:p-4 shadow-[6px_6px_0_0_rgba(0,0,0,0.1)] border-2 border-gray-900 group transition-all cursor-pointer flex gap-3 md:gap-4 min-h-[140px] md:min-h-[160px]`}
                                            >
                                                {/* 图钉按钮装饰 */}
                                                <div className="absolute -top-2 left-4 w-4 h-4 rounded-full bg-red-600 border-2 border-black shadow-[1px_1px_0_0_rgba(0,0,0,0.3)] z-10" />

                                                {/* 文章封面 (左侧) - 缩略图变小以适应双栏 */}
                                                {post.coverImage && (
                                                    <div className="flex-shrink-0 w-20 h-full md:w-28 bg-gray-100 border border-gray-900 overflow-hidden bg-gray-900/5">
                                                        <img
                                                            src={post.coverImage}
                                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                                            alt=""
                                                        />
                                                    </div>
                                                )}

                                                {/* 内容 (右侧) */}
                                                <div className="flex-1 flex flex-col min-w-0">
                                                    <div className="flex items-start justify-between gap-2 mb-1">
                                                        <h3 className="text-black text-[10px] md:text-xs font-black truncate leading-tight uppercase group-hover:text-blue-600 transition-colors">
                                                            {post.title || t.billboard.untitled}
                                                        </h3>
                                                        <div className="flex-shrink-0 px-1 py-0.5 bg-yellow-400 text-[7px] font-black text-black border border-black uppercase tracking-tighter">
                                                            HOT
                                                        </div>
                                                    </div>

                                                    <p className="text-gray-600 text-[9px] md:text-[10px] line-clamp-2 md:line-clamp-3 leading-snug font-medium mb-3 italic">
                                                        "{post.summary || t.billboard.pending_summary}"
                                                    </p>

                                                    {/* 底部信息 */}
                                                    <div className="mt-auto pt-2 border-t border-dashed border-gray-300">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex flex-col gap-1">
                                                                <div className="flex items-center gap-1">
                                                                    <div className="w-4 h-4 md:w-5 md:h-5 border border-black p-[1px]">
                                                                        <UserAvatar
                                                                            userId={post.author.id}
                                                                            userName={post.author.name}
                                                                            userAvatar={post.author.avatar}
                                                                            customAvatar={post.author.customAvatar}
                                                                            size="xs"
                                                                            showStatus={false}
                                                                        />
                                                                    </div>
                                                                    <span className="text-[8px] md:text-[9px] text-gray-800 font-bold truncate max-w-[60px] md:max-w-[80px]">
                                                                        {post.author.name}
                                                                    </span>
                                                                </div>
                                                                {post.promoters.length > 0 && (
                                                                    <div className="flex items-center gap-1">
                                                                        <span className="text-[7px] text-gray-400 font-bold">♥</span>
                                                                        <span className="text-[7.5px] text-blue-600 font-black truncate max-w-[50px] md:max-w-[60px]">
                                                                            {post.promoters[0]}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <Link
                                                                href={`/posts/${post.id}`}
                                                                target="_blank"
                                                                className="px-1.5 py-1 bg-gray-900 border-b-2 border-r-2 border-gray-700 text-white text-[7.5px] font-black hover:bg-gray-800 transition-colors active:border-0 active:translate-x-0.5 active:translate-y-0.5"
                                                            >
                                                                {t.billboard.read_more} ➡
                                                            </Link>
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center py-20 bg-black/5 border-4 border-dashed border-black/10">
                                        <div className="text-6xl mb-6 opacity-30 grayscale filter">📋</div>
                                        <h3 className="text-xl text-black/30 font-black uppercase tracking-[0.2em]">
                                            {t.billboard.empty_title}
                                        </h3>
                                        <p className="text-black/20 text-xs font-bold mt-2 uppercase tracking-widest text-center max-w-sm">
                                            {t.billboard.empty_desc}
                                        </p>
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

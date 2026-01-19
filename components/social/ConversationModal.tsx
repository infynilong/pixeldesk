'use client'

import { useState, useEffect } from 'react'
import { PostReply } from '@/types/social'
import UserAvatar from '../UserAvatar'
import { useTranslation } from '@/lib/hooks/useTranslation'
import LoadingSpinner from '../LoadingSpinner'
import ProBadge from '../social/ProBadge'
import { renderContentWithUrls, extractImageUrls } from '@/lib/utils/format'
import Image from 'next/image'
import { getAssetUrl } from '@/lib/utils/assets'
import ImageLightbox from './ImageLightbox'

interface ConversationModalProps {
    replyId: string
    postId: string
    onClose: () => void
}

export default function ConversationModal({
    replyId,
    postId,
    onClose
}: ConversationModalProps) {
    const [replies, setReplies] = useState<PostReply[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [showLightbox, setShowLightbox] = useState(false)
    const [lightboxImages, setLightboxImages] = useState<string[]>([])
    const [lightboxInitialIndex, setLightboxInitialIndex] = useState(0)
    const { t } = useTranslation()

    useEffect(() => {
        const fetchConversation = async () => {
            setIsLoading(true)
            try {
                // 获取该帖子的所有回复，然后在前端构建会话链
                // 理想情况下应该有一个专门的API，但由于回复通常不多（<100），获取全量并过滤更为简单
                const response = await fetch(`/api/posts/${postId}/replies?limit=100`)
                const data = await response.json()

                if (data.success && data.data) {
                    const allReplies: PostReply[] = data.data.replies
                    const chain: PostReply[] = []
                    let currentId: string | null = replyId

                    // 追溯父级链
                    while (currentId) {
                        const currentReply = allReplies.find(r => r.id === currentId)
                        if (currentReply) {
                            chain.unshift(currentReply)
                            currentId = currentReply.parentId || null
                        } else {
                            break
                        }
                    }
                    setReplies(chain)
                }
            } catch (err) {
                setError('加载会话失败')
            } finally {
                setIsLoading(false)
            }
        }

        fetchConversation()
    }, [replyId, postId])

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div
                className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-xl shadow-2xl border border-slate-200 dark:border-gray-800 overflow-hidden animate-in fade-in zoom-in duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="relative p-4.5 border-b border-slate-100 dark:border-gray-800 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white dark:from-gray-800 dark:to-gray-900">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-400"></div>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center shadow-pixel-sm">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-pixel font-bold text-gray-900 dark:text-white leading-none">查看会话</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-lg  hover:scale-110 transition-all shadow-pixel-sm"
                    >
                        <svg className="w-4 h-4 transform group-hover:rotate-90 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="max-h-[60vh] overflow-y-auto p-6 space-y-6 custom-scrollbar">
                    {isLoading ? (
                        <div className="py-12 flex justify-center">
                            <LoadingSpinner />
                        </div>
                    ) : error ? (
                        <div className="text-center py-12 text-red-500 font-medium">{error}</div>
                    ) : (
                        <div className="relative space-y-8">
                            {/* 会话连接线 */}
                            <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-gradient-to-b from-emerald-500/20 via-teal-500/20 to-emerald-500/20"></div>

                            {replies.map((reply, index) => (
                                <div key={reply.id} className="relative flex items-start gap-4 group">
                                    <div className="flex-shrink-0 z-10">
                                        <UserAvatar
                                            userId={reply.author.id}
                                            userName={reply.author.name}
                                            userAvatar={reply.author.avatar}
                                            customAvatar={reply.author.customAvatar}
                                            size="md"
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="bg-slate-50 dark:bg-gray-800/50 rounded-lg p-4 border border-slate-100 dark:border-gray-800 group-hover:border-emerald-500/30 transition-all shadow-pixel-sm">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="font-pixel font-bold text-gray-900 dark:text-white flex items-center gap-1 text-sm leading-none">
                                                    {reply.author.name}
                                                    {reply.author.isAdmin && <ProBadge />}
                                                </span>
                                            </div>
                                            <div className="prose dark:prose-invert max-w-none mb-2">
                                                <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                                                    {renderContentWithUrls(reply.content, t.social.view_link)}
                                                </p>
                                            </div>

                                            {/* 图片预览 */}
                                            {(() => {
                                                const replyImages = extractImageUrls(reply.content)
                                                if (replyImages.length === 0) return null
                                                return (
                                                    <div className="mt-3 flex flex-wrap gap-2">
                                                        {replyImages.map((imgUrl, idx) => (
                                                            <div
                                                                key={idx}
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    setLightboxImages(replyImages)
                                                                    setLightboxInitialIndex(idx)
                                                                    setShowLightbox(true)
                                                                }}
                                                                className="relative w-20 h-20 rounded-lg border border-slate-200 dark:border-gray-700 overflow-hidden cursor-zoom-in group shadow-pixel-sm hover:shadow-md transition-all"
                                                            >
                                                                <Image
                                                                    src={getAssetUrl(imgUrl)}
                                                                    alt="Reply image"
                                                                    fill
                                                                    unoptimized={imgUrl.startsWith('http')}
                                                                    className="object-cover group-hover:scale-110 transition-transform duration-500"
                                                                    sizes="80px"
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                )
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 dark:border-gray-800 text-center bg-slate-50/50 dark:bg-gray-800/30">
                    <p className="text-[10px] font-pixel text-gray-400">会话追溯完成</p>
                </div>
            </div>

            <ImageLightbox
                isOpen={showLightbox}
                onClose={() => setShowLightbox(false)}
                images={lightboxImages}
                initialIndex={lightboxInitialIndex}
            />
        </div>
    )
}

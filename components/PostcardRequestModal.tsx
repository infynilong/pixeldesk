'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from '@/lib/hooks/useTranslation'
import LoadingSpinner from '@/components/LoadingSpinner'
import PostcardCard, { PostcardData } from './PostcardCard'

interface PostcardRequestModalProps {
    isOpen: boolean
    onClose: () => void
    request: {
        exchangeId: string
        senderId: string
        senderName: string
        senderAvatar?: string // URL
    } | null
    onAccept: (exchangeId: string) => Promise<void>
    onReject: (exchangeId: string) => Promise<void>
}

// Paper Styled Button Component (Consistent with PostcardDesignerModal)
const PaperButton = ({
    children,
    onClick,
    variant = 'primary',
    isLoading = false,
    className = ''
}: {
    children: React.ReactNode
    onClick: () => void
    variant?: 'primary' | 'danger' | 'secondary'
    isLoading?: boolean
    className?: string
}) => {
    // Cyan/Bluebird Theme
    let variantStyles = ''
    switch (variant) {
        case 'primary':
            variantStyles = "bg-cyan-900 text-white shadow-lg shadow-cyan-900/20 hover:bg-cyan-950"
            break
        case 'danger':
            variantStyles = "bg-cyan-50 text-cyan-900/60 hover:bg-red-50 hover:text-red-800 border-2 border-transparent hover:border-red-900/10"
            break
        case 'secondary':
        default:
            variantStyles = "bg-white text-cyan-900 border-2 border-cyan-900/10 hover:bg-cyan-50"
            break
    }

    return (
        <button
            onClick={onClick}
            disabled={isLoading}
            className={`px-8 py-3 rounded-xl font-black text-sm uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 ${variantStyles} ${className} ${isLoading ? 'opacity-70 cursor-wait' : ''}`}
        >
            {isLoading ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
            ) : children}
        </button>
    )
}

export default function PostcardRequestModal({
    isOpen,
    onClose,
    request,
    onAccept,
    onReject
}: PostcardRequestModalProps) {
    const { t } = useTranslation()
    const [design, setDesign] = useState<PostcardData | null>(null)
    const [loading, setLoading] = useState(false)
    const [confirming, setConfirming] = useState<'accept' | 'reject' | null>(null)
    const [isFlipped, setIsFlipped] = useState(false)

    // Fetch sender's postcard design when modal opens
    useEffect(() => {
        if (isOpen && request?.senderId) {
            setLoading(true)
            setIsFlipped(false)
            fetch(`/api/postcards/design?userId=${request.senderId}`)
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        setDesign(data.data)
                    }
                })
                .finally(() => setLoading(false))
        } else {
            setDesign(null)
        }
    }, [isOpen, request?.senderId])

    const handleAction = async (action: 'accept' | 'reject') => {
        if (!request) return

        setConfirming(action)
        try {
            if (action === 'accept') {
                await onAccept(request.exchangeId)
            } else {
                await onReject(request.exchangeId)
            }
            onClose()
        } catch (error) {
            console.error("Action failed", error)
        } finally {
            setConfirming(null)
        }
    }

    if (!isOpen || !request) return null

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="w-full max-w-2xl bg-[#eaf4f4] rounded-2xl shadow-2xl overflow-hidden border-2 border-cyan-900/10 flex flex-col"
                    >
                        {/* Header */}
                        <div className="px-8 py-6 border-b border-cyan-900/10 flex items-center justify-between bg-white/50">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-cyan-900 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-900/20 transform -rotate-3 text-white text-2xl">
                                    🕊️
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-cyan-950 uppercase italic tracking-tighter">
                                        {t.postcard?.exchange_request || 'Postcard Request'}
                                    </h2>
                                    <p className="text-xs font-bold text-cyan-900/40 uppercase tracking-widest">
                                        Incoming Message
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-8 h-8 rounded-full border border-cyan-900/10 flex items-center justify-center text-cyan-900/40 hover:bg-cyan-50 hover:text-cyan-900 transition-colors"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-8 bg-[#d7e9f7] flex flex-col items-center">

                            {/* Sender Profile */}
                            <div className="flex items-center gap-3 mb-6 bg-white/60 px-4 py-2 rounded-full border border-cyan-900/5 shadow-sm">
                                <span className="text-xs font-bold text-cyan-900/60 uppercase tracking-wider">From:</span>
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded bg-cyan-200 overflow-hidden">
                                        {request.senderAvatar ? (
                                            <img src={request.senderAvatar} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-[10px]">👤</div>
                                        )}
                                    </div>
                                    <span className="text-sm font-black text-cyan-900">{request.senderName}</span>
                                </div>
                            </div>

                            {/* Card Preview */}
                            <div className="w-full max-w-md mx-auto mb-8">
                                {loading ? (
                                    <div className="aspect-[3/2] flex items-center justify-center bg-cyan-50 rounded-sm border-2 border-dashed border-cyan-900/10">
                                        <LoadingSpinner />
                                    </div>
                                ) : design ? (
                                    <div className="flex flex-col items-center gap-4">
                                        <PostcardCard
                                            card={{
                                                ...design,
                                                ownerName: request.senderName
                                            }}
                                            isFlipped={isFlipped}
                                            onFlip={() => setIsFlipped(!isFlipped)}
                                            className="shadow-xl"
                                        />
                                        <p className="text-[10px] font-bold text-cyan-900/30 uppercase tracking-[0.2em] animate-pulse">
                                            {isFlipped ? 'Click to see front' : 'Click to read message'}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="aspect-[3/2] flex flex-col items-center justify-center bg-cyan-50 rounded-sm border-2 border-dashed border-cyan-900/10 text-cyan-900/40 gap-2">
                                        <span className="text-2xl">📝</span>
                                        <span className="font-black text-xs uppercase tracking-widest">No Design Found</span>
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-center gap-4 w-full pt-4 border-t border-cyan-900/5">
                                <PaperButton
                                    variant="danger"
                                    onClick={() => handleAction('reject')}
                                    isLoading={confirming === 'reject'}
                                    className="flex-1 max-w-[140px]"
                                >
                                    {t.common?.reject || 'Reject'}
                                </PaperButton>

                                <PaperButton
                                    variant="primary"
                                    onClick={() => handleAction('accept')}
                                    isLoading={confirming === 'accept'}
                                    className="flex-1 max-w-[200px]"
                                >
                                    <span>🔁</span> {t.common?.exchange || 'Exchange'}
                                </PaperButton>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}

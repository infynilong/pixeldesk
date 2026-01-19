'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from '@/lib/hooks/useTranslation'

interface BillboardConfirmModalProps {
    isVisible: boolean
    onConfirm: () => Promise<void>
    onCancel: () => void
    currentPoints?: number
    cost: number
    postTitle: string
    customTitle?: string
    customMessage?: string
}

export default function BillboardConfirmModal({
    isVisible,
    onConfirm,
    onCancel,
    currentPoints = 0,
    cost,
    postTitle,
    customTitle,
    customMessage
}: BillboardConfirmModalProps) {
    const { t } = useTranslation()
    const [isProcessing, setIsProcessing] = useState(false)

    useEffect(() => {
        if (!isVisible) {
            setIsProcessing(false)
        }
    }, [isVisible])

    const handleConfirm = async () => {
        setIsProcessing(true)
        try {
            await onConfirm()
        } catch (error) {
            console.error('Promotion failed:', error)
        } finally {
            setIsProcessing(false)
        }
    }

    if (!isVisible) return null

    return (
        <AnimatePresence>
            {isVisible && (
                <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onCancel}
                        className="absolute inset-0 bg-black/80 backdrop-blur-md"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-lg bg-[#1a1c1e] border-4 border-[#3a3f44] rounded-none shadow-[12px_12px_0_0_rgba(0,0,0,0.5)] overflow-hidden p-8 font-pixel"
                    >
                        {/* 像素背景装饰 */}
                        <div className="absolute top-0 left-0 w-4 h-4 bg-cyan-500/20" />
                        <div className="absolute top-0 right-0 w-4 h-4 bg-cyan-500/20" />
                        <div className="absolute bottom-0 left-0 w-4 h-4 bg-cyan-500/20" />
                        <div className="absolute bottom-0 right-0 w-4 h-4 bg-cyan-500/20" />

                        <div className="text-center mb-8">
                            <div className="inline-block px-4 py-2 bg-cyan-500 text-black font-black mb-6 rotate-[-2deg] shadow-[4px_4px_0_0_rgba(0,0,0,0.3)]">
                                {customTitle || t.billboard.modal_title}
                            </div>
                            <h3 className="text-white text-xl font-bold leading-tight mb-4 uppercase tracking-tighter">
                                {postTitle || t.billboard.untitled}
                            </h3>
                            <p className="text-gray-400 text-sm leading-relaxed">
                                {customMessage || t.billboard.modal_confirm_text}
                            </p>
                        </div>

                        <div className="bg-black/40 border-2 border-gray-800 p-6 mb-8 mb-6">
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-gray-500 text-xs">
                                    {t.billboard.cost_label}
                                </span>
                                <span className="text-cyan-400 font-bold">{cost} PX</span>
                            </div>
                            <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-800">
                                <span className="text-gray-500 text-xs">
                                    {t.billboard.balance_label}
                                </span>
                                <span className="text-white font-bold">{currentPoints} PX</span>
                            </div>
                            <div className="flex justify-between items-center bg-cyan-500/10 p-3">
                                <span className="text-white text-xs">
                                    {t.billboard.remaining_label}
                                </span>
                                <span className={`font-bold ${currentPoints >= cost ? 'text-green-400' : 'text-red-400'}`}>
                                    {currentPoints - cost} PX
                                </span>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <button
                                onClick={handleConfirm}
                                disabled={isProcessing || currentPoints < cost}
                                className="flex-1 bg-green-500 hover:bg-green-400 disabled:bg-gray-700 text-black font-black py-4 shadow-[6px_6px_0_0_rgba(0,0,0,0.3)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0_0_rgba(0,0,0,0.3)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all uppercase"
                            >
                                {isProcessing ? t.billboard.processing : t.billboard.confirm_btn}
                            </button>

                            <button
                                onClick={onCancel}
                                disabled={isProcessing}
                                className="flex-1 bg-red-500 hover:bg-red-400 text-black font-black py-4 shadow-[6px_6px_0_0_rgba(0,0,0,0.3)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0_0_rgba(0,0,0,0.3)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all uppercase"
                            >
                                {t.billboard.cancel_btn}
                            </button>
                        </div>

                        {currentPoints < cost && (
                            <div className="mt-6 text-center">
                                <p className="text-red-500 text-[10px] animate-pulse">
                                    {t.billboard.insufficient_points}
                                </p>
                            </div>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}

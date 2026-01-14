'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from '@/lib/hooks/useTranslation'
import { markAsVisited } from '@/lib/tempPlayerManager'

interface WelcomeModalProps {
    isOpen: boolean
    onClose: () => void
    onLogin: () => void
}

export default function WelcomeModal({ isOpen, onClose, onLogin }: WelcomeModalProps) {
    const { t } = useTranslation()
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        if (isOpen) {
            // 延迟一点点显示，让动画更顺滑
            const timer = setTimeout(() => setIsVisible(true), 100)
            return () => clearTimeout(timer)
        } else {
            setIsVisible(false)
        }
    }, [isOpen])

    if (!isOpen) return null

    const handleStart = () => {
        markAsVisited()
        onClose()
    }

    const handleLogin = () => {
        markAsVisited()
        onLogin()
        onClose()
    }

    return (
        <div
            className={`fixed inset-0 z-[100] flex items-center justify-center transition-all duration-500 ease-out p-4 backdrop-blur-sm ${isVisible ? 'bg-black/60 opacity-100' : 'bg-black/0 opacity-0 pointer-events-none'
                }`}
        >
            <div
                className={`relative w-full max-w-lg bg-retro-bg-darker border-2 border-retro-border rounded-xl shadow-2xl overflow-hidden transition-all duration-500 transform ${isVisible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-10 scale-95 opacity-0'
                    }`}
            >
                {/* 背景装饰 */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />

                <div className="p-8">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <h2 className="text-3xl font-pixel text-white mb-4 animate-bounce">
                            {t.welcome.title}
                        </h2>
                        <p className="text-retro-textMuted text-lg leading-relaxed">
                            {t.welcome.subtitle}
                        </p>
                    </div>

                    {/* Features List */}
                    <div className="space-y-6 mb-10">
                        <div className="flex items-start gap-4 p-4 rounded-lg bg-white/5 border border-white/10 hover:border-blue-500/50 transition-colors group">
                            <div className="text-2xl group-hover:scale-110 transition-transform">
                                {t.welcome.features.workstation.split(' ')[0]}
                            </div>
                            <div>
                                <p className="text-white/90 leading-snug">
                                    {t.welcome.features.workstation.split(' ').slice(1).join(' ')}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4 p-4 rounded-lg bg-white/5 border border-white/10 hover:border-purple-500/50 transition-colors group">
                            <div className="text-2xl group-hover:scale-110 transition-transform">
                                {t.welcome.features.interaction.split(' ')[0]}
                            </div>
                            <div>
                                <p className="text-white/90 leading-snug">
                                    {t.welcome.features.interaction.split(' ').slice(1).join(' ')}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4 p-4 rounded-lg bg-white/5 border border-white/10 hover:border-pink-500/50 transition-colors group">
                            <div className="text-2xl group-hover:scale-110 transition-transform">
                                {t.welcome.features.newspaper.split(' ')[0]}
                            </div>
                            <div>
                                <p className="text-white/90 leading-snug">
                                    {t.welcome.features.newspaper.split(' ').slice(1).join(' ')}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="text-center bg-blue-900/20 py-4 px-6 rounded-lg border border-blue-500/20 mb-8">
                        <p className="text-blue-300 font-pixel text-sm">
                            {t.welcome.cta}
                        </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <button
                            onClick={handleStart}
                            className="px-6 py-4 bg-retro-bg-dark border-2 border-retro-border text-white font-pixel hover:bg-retro-border/20 transition-all active:scale-95"
                        >
                            [ {t.welcome.start_btn} ]
                        </button>
                        <button
                            onClick={handleLogin}
                            className="px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-pixel rounded shadow-lg hover:from-blue-500 hover:to-blue-600 transform transition-all hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-2"
                        >
                            <span>{t.welcome.login_btn}</span>
                            <span className="text-xl">➔</span>
                        </button>
                    </div>
                </div>

                {/* Footer info */}
                <div className="bg-black/40 py-2 text-center">
                    <p className="text-[10px] text-white/30 tracking-widest uppercase">
                        Termbo PX Workshop System v2.0
                    </p>
                </div>
            </div>

            {/* 极光背景效果 */}
            <div className="fixed -z-10 w-[500px] h-[500px] bg-blue-500/10 blur-[120px] rounded-full top-[-10%] left-[-10%] animate-pulse" />
            <div className="fixed -z-10 w-[500px] h-[500px] bg-purple-500/10 blur-[120px] rounded-full bottom-[-10%] right-[-10%] animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
    )
}

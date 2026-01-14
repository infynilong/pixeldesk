'use client'

import { useState, memo, useCallback, useEffect } from 'react'
import { useTranslation } from '@/lib/hooks/useTranslation'
import { motion, AnimatePresence } from 'framer-motion'

interface WorkstationStatusPopupProps {
    isVisible: boolean
    onStatusUpdate: (status: any) => void
    onClose: () => void
    userId?: string
    workstationId?: number
    language?: 'zh-CN' | 'en'
}

const getStatusOptions = (t: any) => [
    { id: 'working', label: t.workstation.status.working, emoji: '💼', color: 'from-cyan-500 to-teal-500', message: t.workstation.status.is_working },
    { id: 'break', label: t.workstation.status.break, emoji: '☕', color: 'from-emerald-500 to-teal-500', message: t.workstation.status.is_break },
    { id: 'meeting', label: t.workstation.status.meeting, emoji: '👥', color: 'from-blue-500 to-cyan-500', message: t.workstation.status.is_meeting },
    { id: 'off_work', label: t.workstation.status.off_work, emoji: '🏠', color: 'from-gray-500 to-gray-600', message: t.workstation.status.is_off_work }
]

const WorkstationStatusPopup = memo(({
    isVisible,
    onStatusUpdate,
    onClose,
    userId,
    workstationId,
    language: _language = 'zh-CN'
}: WorkstationStatusPopupProps) => {
    const { t } = useTranslation()
    const statusOptions = getStatusOptions(t)
    const [selectedId, setSelectedId] = useState('working')
    const [isCustomMode, setIsCustomMode] = useState(false)
    const [customEmoji, setCustomEmoji] = useState('📝')
    const [customLabel, setCustomLabel] = useState('')
    const [customHistory, setCustomHistory] = useState<Array<{ emoji: string, label: string }>>([])

    // 广告管理状态
    const [currentTab, setCurrentTab] = useState<'status' | 'ad'>('status')
    const [adText, setAdText] = useState('')
    const [adImage, setAdImage] = useState('')
    const [adUrl, setAdUrl] = useState('')
    const [isAdSaving, setIsAdSaving] = useState(false)
    const [adError, setAdError] = useState<string | null>(null)
    const [adSuccess, setAdSuccess] = useState(false)

    // Load custom status history from localStorage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('custom-status-history')
            if (saved) {
                try {
                    setCustomHistory(JSON.parse(saved))
                } catch (e) {
                    console.error('Failed to load custom status history:', e)
                }
            }
        }
    }, [])

    // 获取当前广告信息
    useEffect(() => {
        if (isVisible && workstationId && currentTab === 'ad') {
            fetch(`/api/workstations/${workstationId}/advertisement`)
                .then(res => res.json())
                .then(result => {
                    if (result.success && result.data) {
                        setAdText(result.data.adText || '')
                        setAdImage(result.data.adImage || '')
                        setAdUrl(result.data.adUrl || '')
                    }
                })
                .catch(err => console.error('Failed to load advertisement:', err))
        }
    }, [isVisible, workstationId, currentTab])

    // 保存广告
    const handleSaveAd = useCallback(async () => {
        if (!workstationId) {
            setAdError(t.workstation.invalid_id)
            return
        }

        setIsAdSaving(true)
        setAdError(null)
        setAdSuccess(false)

        try {
            const response = await fetch(`/api/workstations/${workstationId}/advertisement`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    adText: adText.trim() || null,
                    adImage: adImage.trim() || null,
                    adUrl: adUrl.trim() || null
                })
            })

            const result = await response.json()

            if (result.success) {
                setAdSuccess(true)
                setTimeout(() => setAdSuccess(false), 3000)
            } else {
                setAdError(result.error || t.workstation.save_failed)
            }
        } catch (error) {
            console.error('Failed to save advertisement:', error)
            setAdError(t.workstation.save_failed)
        } finally {
            setIsAdSaving(false)
        }
    }, [workstationId, adText, adImage, adUrl, t])

    const handleConfirm = useCallback(async () => {
        let fullStatus

        if (isCustomMode && customLabel.trim()) {
            // 自定义状态
            fullStatus = {
                type: 'custom',
                status: customLabel.trim(),
                emoji: customEmoji,
                message: customLabel.trim(),
                timestamp: new Date().toISOString()
            }

            // Save to custom history
            const newHistoryItem = { emoji: customEmoji, label: customLabel.trim() }
            const updatedHistory = [
                newHistoryItem,
                ...customHistory.filter(h => h.label !== customLabel.trim())
            ].slice(0, 10) // Keep only last 10 custom statuses

            setCustomHistory(updatedHistory)
            if (typeof window !== 'undefined') {
                localStorage.setItem('custom-status-history', JSON.stringify(updatedHistory))
            }
        } else {
            // 预设状态
            const status = statusOptions.find(s => s.id === selectedId)
            if (!status) return

            fullStatus = {
                type: status.id,
                status: status.label,
                emoji: status.emoji,
                message: status.message,
                timestamp: new Date().toISOString()
            }
        }

        // 通知 Phaser 游戏更新状态
        if (typeof window !== 'undefined' && (window as any).updateMyStatus) {
            (window as any).updateMyStatus(fullStatus)
        }

        // 保存到本地历史
        if (userId) {
            const { statusHistoryManager } = await import('@/lib/statusHistory')
            statusHistoryManager.addStatusHistory(fullStatus, userId)

            // 时间跟踪 API
            fetch('/api/time-tracking', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    action: 'start',
                    activityType: fullStatus.type,
                    notes: fullStatus.message
                })
            }).catch(err => console.error('Time tracking error:', err))
        }

        onStatusUpdate(fullStatus)
        onClose()

        // 重置自定义状态
        setIsCustomMode(false)
        setCustomLabel('')
        setCustomEmoji('📝')
    }, [selectedId, isCustomMode, customLabel, customEmoji, onStatusUpdate, onClose, t, userId, customHistory, statusOptions])

    // 控制游戏输入锁定
    useEffect(() => {
        if (isVisible) {
            if (typeof window !== 'undefined') {
                if ((window as any).disableGameKeyboard) (window as any).disableGameKeyboard()
                if ((window as any).disableGameMouse) (window as any).disableGameMouse()
            }
        } else {
            if (typeof window !== 'undefined') {
                if ((window as any).enableGameKeyboard) (window as any).enableGameKeyboard()
                if ((window as any).enableGameMouse) (window as any).enableGameMouse()
            }
        }
    }, [isVisible])

    // 按下 Esc 键关闭
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isVisible) {
                // 阻止事件冒泡到 Phaser
                e.stopPropagation()
                e.preventDefault()
                onClose()
            }
        }
        // 使用 capture 阶段监听，优先级高于 Phaser
        window.addEventListener('keydown', handleKeyDown, true)
        return () => window.removeEventListener('keydown', handleKeyDown, true)
    }, [isVisible, onClose])

    // 常用 emoji 列表
    const commonEmojis = ['💼', '☕', '👥', '🏠', '📝', '💻', '📚', '🎮', '🎵', '🍕', '🏃', '😴', '🎨', '📱', '🚀']

    return (
        <AnimatePresence>
            {isVisible && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4"
                    onClick={(e) => {
                        e.stopPropagation()
                        e.preventDefault()
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onMouseUp={(e) => e.stopPropagation()}
                >
                    {/* 背景遮罩 */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={(e) => {
                            e.stopPropagation()
                            onClose()
                        }}
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto"
                    />

                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="relative w-full max-w-md z-10"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* 玻璃拟态容器 */}
                        <div className="relative bg-gray-900/90 backdrop-blur-xl border border-gray-700/50 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden p-6">
                            {/* 顶部的装饰线条 */}
                            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 shadow-[0_0_20px_rgba(6,182,212,0.4)]"></div>

                            {/* 标题 */}
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <div className="w-3 h-3 bg-cyan-500 rounded-full animate-ping absolute inset-0 opacity-75"></div>
                                        <div className="w-3 h-3 bg-cyan-400 rounded-full relative"></div>
                                    </div>
                                    <h3 className="text-white font-bold text-lg tracking-wider uppercase font-pixel bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                                        {t.workstation.update_status}
                                    </h3>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onClose()
                                    }}
                                    className="text-gray-500 hover:text-white transition-all bg-gray-800/50 hover:bg-gray-700/50 p-2 rounded-full"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* 主标签切换 */}
                            <div className="flex gap-2 mb-4">
                                <button
                                    onClick={() => setCurrentTab('status')}
                                    className={`flex-1 py-2 px-4 rounded-xl text-sm font-bold transition-all ${currentTab === 'status'
                                        ? 'bg-gradient-to-r from-cyan-600 to-teal-600 text-white'
                                        : 'bg-gray-800/40 text-gray-400 hover:bg-gray-800/60'
                                        }`}
                                >
                                    {t.workstation.status_tab}
                                </button>
                                {workstationId && (
                                    <button
                                        onClick={() => setCurrentTab('ad')}
                                        className={`flex-1 py-2 px-4 rounded-xl text-sm font-bold transition-all ${currentTab === 'ad'
                                            ? 'bg-gradient-to-r from-yellow-600 to-orange-600 text-white'
                                            : 'bg-gray-800/40 text-gray-400 hover:bg-gray-800/60'
                                            }`}
                                    >
                                        📢 {t.workstation.ad}
                                    </button>
                                )}
                            </div>

                            {currentTab === 'status' && (
                                <>
                                    {/* 状态模式切换 */}
                                    <div className="flex gap-2 mb-4">
                                        <button
                                            onClick={() => setIsCustomMode(false)}
                                            className={`flex-1 py-2 px-4 rounded-xl text-sm font-bold transition-all ${!isCustomMode
                                                ? 'bg-gradient-to-r from-cyan-600 to-teal-600 text-white'
                                                : 'bg-gray-800/40 text-gray-400 hover:bg-gray-800/60'
                                                }`}
                                        >
                                            {t.workstation.quick_status}
                                        </button>
                                        <button
                                            onClick={() => setIsCustomMode(true)}
                                            className={`flex-1 py-2 px-4 rounded-xl text-sm font-bold transition-all ${isCustomMode
                                                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                                                : 'bg-gray-800/40 text-gray-400 hover:bg-gray-800/60'
                                                }`}
                                        >
                                            {t.workstation.custom}
                                        </button>
                                    </div>
                                </>
                            )}

                            {currentTab === 'status' ? (
                                <>
                                    {!isCustomMode ? (
                                        /* 预设状态网格 */
                                        <div className="grid grid-cols-2 gap-3 mb-6">
                                            {statusOptions.map((status) => (
                                                <button
                                                    key={status.id}
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        setSelectedId(status.id)
                                                    }}
                                                    className={`relative group flex flex-col items-center justify-center gap-3 p-4 rounded-2xl border transition-all duration-300 ${selectedId === status.id
                                                        ? `bg-gradient-to-br ${status.color} border-white/30 text-white shadow-[0_10px_20px_rgba(0,0,0,0.2)] scale-[1.02]`
                                                        : 'bg-gray-800/40 border-gray-700/50 text-gray-400 hover:border-gray-500 hover:bg-gray-800/60'
                                                        }`}
                                                >
                                                    <span className="text-3xl filter drop-shadow-md group-hover:scale-110 transition-transform">{status.emoji}</span>
                                                    <span className="text-xs font-black tracking-widest uppercase">{status.label}</span>

                                                    {selectedId === status.id && (
                                                        <motion.div
                                                            layoutId="active-highlight"
                                                            className="absolute inset-0 bg-white/10 rounded-2xl ring-2 ring-white/20"
                                                        />
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        /* 自定义状态输入 */
                                        <div className="space-y-4 mb-6">
                                            {/* History Section */}
                                            {customHistory.length > 0 && (
                                                <div>
                                                    <label className="text-gray-400 text-xs font-bold mb-2 block">
                                                        {t.workstation.history}
                                                    </label>
                                                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                                                        {customHistory.map((item, index) => (
                                                            <button
                                                                key={index}
                                                                onClick={() => {
                                                                    setCustomEmoji(item.emoji)
                                                                    setCustomLabel(item.label)
                                                                }}
                                                                className="flex items-center gap-2 bg-gray-800/60 hover:bg-purple-600/30 border border-gray-700 hover:border-purple-500 rounded-lg px-3 py-2 transition-all group"
                                                            >
                                                                <span className="text-lg">{item.emoji}</span>
                                                                <span className="text-sm text-gray-300 group-hover:text-white">{item.label}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Emoji 选择 */}
                                            <div>
                                                <label className="text-gray-400 text-xs font-bold mb-2 block">
                                                    {t.workstation.select_icon}
                                                </label>
                                                <div className="flex flex-wrap gap-2">
                                                    {commonEmojis.map((emoji) => (
                                                        <button
                                                            key={emoji}
                                                            onClick={() => setCustomEmoji(emoji)}
                                                            className={`w-10 h-10 rounded-lg transition-all ${customEmoji === emoji
                                                                ? 'bg-gradient-to-br from-purple-600 to-pink-600 scale-110'
                                                                : 'bg-gray-800/40 hover:bg-gray-800/60'
                                                                }`}
                                                        >
                                                            <span className="text-xl">{emoji}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* 状态文本输入 */}
                                            <div>
                                                <label className="text-gray-400 text-xs font-bold mb-2 block">
                                                    {t.workstation.status_desc}
                                                </label>
                                                <input
                                                    type="text"
                                                    value={customLabel}
                                                    onChange={(e) => setCustomLabel(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        // 阻止事件冒泡到 Phaser
                                                        e.stopPropagation()
                                                        // 处理 Enter 键提交
                                                        if (e.key === 'Enter' && customLabel.trim()) {
                                                            e.preventDefault()
                                                            handleConfirm()
                                                        }
                                                    }}
                                                    placeholder={t.workstation.status_placeholder}
                                                    maxLength={30}
                                                    className="w-full bg-gray-800/60 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                                                />
                                                <div className="text-right text-xs text-gray-500 mt-1">
                                                    {customLabel.length}/30
                                                </div>
                                            </div>

                                            {/* 预览 */}
                                            {customLabel && (
                                                <div className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-xl p-4">
                                                    <div className="text-gray-400 text-xs mb-2">
                                                        {t.workstation.preview}
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-3xl">{customEmoji}</span>
                                                        <span className="text-white font-bold">{customLabel}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* 确认按钮 - 仅状态页显示 */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleConfirm()
                                        }}
                                        disabled={isCustomMode && !customLabel.trim()}
                                        className={`w-full py-4 rounded-2xl font-black text-sm tracking-[0.2em] transition-all duration-300 active:scale-[0.97] uppercase ${isCustomMode && !customLabel.trim()
                                            ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                                            : 'bg-gradient-to-r from-cyan-600 via-teal-600 to-emerald-600 hover:from-cyan-500 hover:via-teal-500 hover:to-emerald-500 text-white shadow-[0_10px_30px_rgba(6,182,212,0.3)] hover:shadow-[0_15px_40px_rgba(6,182,212,0.4)]'
                                            }`}
                                    >
                                        {t.workstation.confirm_sync}
                                    </button>
                                </>
                            ) : (
                                /* 广告编辑界面 */
                                <div className="space-y-4 mb-6">
                                    {/* 成功提示 */}
                                    {adSuccess && (
                                        <div className="bg-gradient-to-r from-green-600/20 to-teal-600/20 border border-green-500/30 rounded-xl p-3 flex items-center gap-3">
                                            <span className="text-2xl">✅</span>
                                            <span className="text-green-400 text-sm font-bold">
                                                {t.workstation.save_success}
                                            </span>
                                        </div>
                                    )}

                                    {/* 错误提示 */}
                                    {adError && (
                                        <div className="bg-gradient-to-r from-red-600/20 to-orange-600/20 border border-red-500/30 rounded-xl p-3 flex items-center gap-3">
                                            <span className="text-2xl">⚠️</span>
                                            <span className="text-red-400 text-sm">{adError}</span>
                                        </div>
                                    )}

                                    {/* 广告文案输入 */}
                                    <div>
                                        <label className="text-gray-400 text-xs font-bold mb-2 block">
                                            📝 {t.workstation.ad_text} ({adText.length}/200)
                                        </label>
                                        <textarea
                                            value={adText}
                                            onChange={(e) => setAdText(e.target.value)}
                                            onKeyDown={(e) => e.stopPropagation()}
                                            placeholder={t.workstation.ad_text_placeholder}
                                            maxLength={200}
                                            rows={4}
                                            className="w-full bg-gray-800/60 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 transition-all resize-none"
                                        />
                                    </div>

                                    {/* 广告图片 URL 输入 */}
                                    <div>
                                        <label className="text-gray-400 text-xs font-bold mb-2 block">
                                            🖼️ {t.workstation.ad_img_url} ({adImage.length}/500)
                                        </label>
                                        <input
                                            type="url"
                                            value={adImage}
                                            onChange={(e) => setAdImage(e.target.value)}
                                            onKeyDown={(e) => e.stopPropagation()}
                                            placeholder={t.workstation.ad_img_placeholder}
                                            maxLength={500}
                                            className="w-full bg-gray-800/60 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 transition-all"
                                        />
                                    </div>

                                    {/* 广告链接 URL 输入 */}
                                    <div>
                                        <label className="text-gray-400 text-xs font-bold mb-2 block">
                                            🔗 {t.workstation.ad_link_url} ({adUrl.length}/500)
                                        </label>
                                        <input
                                            type="url"
                                            value={adUrl}
                                            onChange={(e) => setAdUrl(e.target.value)}
                                            onKeyDown={(e) => e.stopPropagation()}
                                            placeholder={t.workstation.ad_link_placeholder}
                                            maxLength={500}
                                            className="w-full bg-gray-800/60 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 transition-all"
                                        />
                                    </div>

                                    {/* 图片预览 */}
                                    {adImage && (
                                        <div>
                                            <label className="text-gray-400 text-xs font-bold mb-2 block">
                                                👁️ {t.workstation.img_preview}
                                            </label>
                                            <div className="relative rounded-xl overflow-hidden border-2 border-gray-700 bg-gray-800/40">
                                                <img
                                                    src={adImage}
                                                    alt="Ad preview"
                                                    className="w-full h-auto object-cover max-h-48"
                                                    onError={(e) => {
                                                        const target = e.target as HTMLImageElement
                                                        target.style.display = 'none'
                                                        const parent = target.parentElement
                                                        if (parent) {
                                                            const errorDiv = document.createElement('div')
                                                            errorDiv.className = 'flex items-center justify-center h-32 text-gray-500 text-sm'
                                                            errorDiv.textContent = t.workstation.img_load_failed
                                                            parent.appendChild(errorDiv)
                                                        }
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* 保存按钮 */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleSaveAd()
                                        }}
                                        disabled={isAdSaving}
                                        className={`w-full py-4 rounded-2xl font-black text-sm tracking-[0.2em] transition-all duration-300 active:scale-[0.97] uppercase ${isAdSaving
                                            ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                                            : 'bg-gradient-to-r from-yellow-600 via-orange-600 to-red-600 hover:from-yellow-500 hover:via-orange-500 hover:to-red-500 text-white shadow-[0_10px_30px_rgba(234,179,8,0.3)] hover:shadow-[0_15px_40px_rgba(234,179,8,0.4)]'
                                            }`}
                                    >
                                        {isAdSaving
                                            ? t.workstation.saving
                                            : t.workstation.save_ad
                                        }
                                    </button>

                                    {/* 说明 */}
                                    <div className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-3">
                                        <p className="text-gray-400 text-xs leading-relaxed">
                                            {t.workstation.ad_tip}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* 底部提示 */}
                            <div className="flex flex-col items-center gap-1 mt-5">
                                <div className="w-8 h-1 bg-gray-800 rounded-full"></div>
                                <p className="text-[10px] text-gray-500 font-mono uppercase tracking-[0.1em] opacity-60">
                                    {t.workstation.connected}
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
})

WorkstationStatusPopup.displayName = 'WorkstationStatusPopup'

export default WorkstationStatusPopup

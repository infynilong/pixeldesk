'use client'

import { useState, memo, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface WorkstationStatusPopupProps {
    isVisible: boolean
    onStatusUpdate: (status: any) => void
    onClose: () => void
    userId?: string
    language?: 'zh-CN' | 'en'
}

const statusOptions = [
    { id: 'working', label: { 'zh-CN': '工作中', 'en': 'Working' }, emoji: '💼', color: 'from-cyan-500 to-teal-500' },
    { id: 'break', label: { 'zh-CN': '休息中', 'en': 'Break' }, emoji: '☕', color: 'from-emerald-500 to-teal-500' },
    { id: 'meeting', label: { 'zh-CN': '会议中', 'en': 'Meeting' }, emoji: '👥', color: 'from-blue-500 to-cyan-500' },
    { id: 'off_work', label: { 'zh-CN': '下班了', 'en': 'Off Work' }, emoji: '🏠', color: 'from-gray-500 to-gray-600' }
]

const WorkstationStatusPopup = memo(({
    isVisible,
    onStatusUpdate,
    onClose,
    userId,
    language = 'zh-CN'
}: WorkstationStatusPopupProps) => {
    const [selectedId, setSelectedId] = useState('working')
    const [isCustomMode, setIsCustomMode] = useState(false)
    const [customEmoji, setCustomEmoji] = useState('📝')
    const [customLabel, setCustomLabel] = useState('')
    const [customHistory, setCustomHistory] = useState<Array<{ emoji: string, label: string }>>([])

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
                status: status.label[language],
                emoji: status.emoji,
                message: language === 'zh-CN' ? `正在${status.label[language]}` : `Is ${status.label[language]}`,
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

            // 同步生成社交帖子
            fetch(`/api/posts?userId=${userId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: fullStatus.message,
                    type: 'TEXT'
                })
            }).catch(err => console.error('Post creation error:', err))
        }

        onStatusUpdate(fullStatus)
        onClose()

        // 重置自定义状态
        setIsCustomMode(false)
        setCustomLabel('')
        setCustomEmoji('📝')
    }, [selectedId, isCustomMode, customLabel, customEmoji, onStatusUpdate, onClose, language, userId])

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
                onClose()
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
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
                                        {language === 'zh-CN' ? '更新当前状态' : 'UPDATE STATUS'}
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

                            {/* 模式切换 */}
                            <div className="flex gap-2 mb-4">
                                <button
                                    onClick={() => setIsCustomMode(false)}
                                    className={`flex-1 py-2 px-4 rounded-xl text-sm font-bold transition-all ${!isCustomMode
                                        ? 'bg-gradient-to-r from-cyan-600 to-teal-600 text-white'
                                        : 'bg-gray-800/40 text-gray-400 hover:bg-gray-800/60'
                                        }`}
                                >
                                    {language === 'zh-CN' ? '快捷状态' : 'Quick Status'}
                                </button>
                                <button
                                    onClick={() => setIsCustomMode(true)}
                                    className={`flex-1 py-2 px-4 rounded-xl text-sm font-bold transition-all ${isCustomMode
                                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                                        : 'bg-gray-800/40 text-gray-400 hover:bg-gray-800/60'
                                        }`}
                                >
                                    {language === 'zh-CN' ? '自定义' : 'Custom'}
                                </button>
                            </div>

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
                                            <span className="text-xs font-black tracking-widest uppercase">{status.label[language]}</span>

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
                                                {language === 'zh-CN' ? '历史记录' : 'History'}
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
                                            {language === 'zh-CN' ? '选择图标' : 'Select Icon'}
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
                                            {language === 'zh-CN' ? '状态描述' : 'Status Description'}
                                        </label>
                                        <input
                                            type="text"
                                            value={customLabel}
                                            onChange={(e) => setCustomLabel(e.target.value)}
                                            placeholder={language === 'zh-CN' ? '输入你的状态...' : 'Enter your status...'}
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
                                                {language === 'zh-CN' ? '预览' : 'Preview'}
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-3xl">{customEmoji}</span>
                                                <span className="text-white font-bold">{customLabel}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* 确认按钮 */}
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
                                {language === 'zh-CN' ? '确认并同步' : 'CONFIRM & SYNC'}
                            </button>

                            {/* 底部提示 */}
                            <div className="flex flex-col items-center gap-1 mt-5">
                                <div className="w-8 h-1 bg-gray-800 rounded-full"></div>
                                <p className="text-[10px] text-gray-500 font-mono uppercase tracking-[0.1em] opacity-60">
                                    {language === 'zh-CN' ? '已连接至元宇宙办公室' : 'CONNECTED TO METAVERSE'}
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

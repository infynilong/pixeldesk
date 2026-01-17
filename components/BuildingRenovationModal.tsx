'use client'

import { useState, useEffect } from 'react'

interface BuildingRenovationModalProps {
    isOpen: boolean
    onClose: () => void
    buildingName: string
}

export default function BuildingRenovationModal({ isOpen, onClose, buildingName }: BuildingRenovationModalProps) {
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => setIsVisible(true), 10)
            return () => clearTimeout(timer)
        } else {
            setIsVisible(false)
        }
    }, [isOpen])

    if (!isOpen) return null

    return (
        <div
            className={`fixed inset-0 z-[100] flex items-center justify-center transition-all duration-300 ease-out p-4 backdrop-blur-sm ${isVisible ? 'bg-black/60 opacity-100' : 'bg-black/0 opacity-0 pointer-events-none'
                }`}
            onClick={onClose}
        >
            <div
                className={`relative w-full max-w-md bg-gray-900 border-2 border-blue-500/30 rounded-xl shadow-2xl overflow-hidden transition-all duration-300 transform ${isVisible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-4 scale-95 opacity-0'
                    }`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header Gradient */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500" />

                <div className="p-6">
                    <div className="flex flex-col items-center text-center space-y-4">
                        <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center text-3xl">
                            🏢
                        </div>

                        <div>
                            <h2 className="text-xl font-bold text-white mb-2">
                                {buildingName}
                            </h2>
                            <p className="text-blue-400 font-pixel text-xs tracking-wider mb-4">
                                [ 开发中 / UNDER CONSTRUCTION ]
                            </p>
                        </div>

                        <div className="bg-white/5 rounded-lg p-4 border border-white/10 w-full">
                            <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                                "你可以租下这个房子作为办公室。但是还在装修中，暂时还不能租用哦。敬请期待！"
                            </p>
                        </div>

                        <button
                            onClick={onClose}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-pixel text-sm rounded transition-all active:scale-95 shadow-lg shadow-blue-500/20"
                        >
                            [ 好的 ]
                        </button>
                    </div>
                </div>

                {/* Decoration */}
                <div className="bg-black/40 py-1.5 text-center">
                    <p className="text-[8px] text-white/20 tracking-[0.2em] uppercase font-mono">
                        Building Management System v1.0
                    </p>
                </div>
            </div>
        </div>
    )
}

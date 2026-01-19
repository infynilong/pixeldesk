'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { createPortal } from 'react-dom'
import { getAssetUrl } from '@/lib/utils/assets'

interface ImageLightboxProps {
    isOpen: boolean
    onClose: () => void
    images: string[]
    initialIndex?: number
}

export default function ImageLightbox({
    isOpen,
    onClose,
    images,
    initialIndex = 0
}: ImageLightboxProps) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex)

    useEffect(() => {
        if (isOpen) {
            setCurrentIndex(initialIndex)
            // Prevent scrolling on body when open
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => {
            document.body.style.overflow = ''
        }
    }, [isOpen, initialIndex])

    if (!isOpen || images.length === 0) return null

    const handlePrev = (e: React.MouseEvent) => {
        e.stopPropagation()
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))
    }

    const handleNext = (e: React.MouseEvent) => {
        e.stopPropagation()
        setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))
    }

    const currentUrl = images[currentIndex]
    const isExternal = currentUrl.startsWith('http')

    return createPortal(
        <div
            className="fixed inset-0 z-[10000] bg-black/95 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={onClose}
        >
            <div
                className="relative w-full h-full flex flex-col items-center justify-center"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-white/70 hover:text-emerald-400 transition-all z-[10001] p-2 bg-black/50 hover:bg-black/70 rounded-lg border border-white/10 shadow-pixel-sm backdrop-blur-md"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                {/* Navigation Buttons for multiple images */}
                {images.length > 1 && (
                    <>
                        <button
                            onClick={handlePrev}
                            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 rounded-lg text-white/70 hover:text-emerald-400 transition-all z-[10001] border border-white/10 shadow-pixel-sm backdrop-blur-sm"
                        >
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <button
                            onClick={handleNext}
                            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 rounded-lg text-white/70 hover:text-emerald-400 transition-all z-[10001] border border-white/10 shadow-pixel-sm backdrop-blur-sm"
                        >
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </>
                )}

                {/* Image Container */}
                <div
                    className="w-full h-full pt-16 pb-16 px-4 flex items-center justify-center"
                    onClick={onClose}
                >
                    <div
                        className="relative max-w-full max-h-[85vh] flex justify-center items-center animate-in zoom-in duration-300"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Image
                            src={getAssetUrl(currentUrl)}
                            alt={`Image ${currentIndex + 1}`}
                            width={1600}
                            height={1200}
                            unoptimized={isExternal}
                            className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl select-none"
                            quality={100}
                            priority
                        />
                    </div>
                </div>

                {/* Pagination Indicator */}
                {images.length > 1 && (
                    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-black/60 border border-white/10 backdrop-blur-md px-4 py-1.5 rounded-lg text-white/90 text-[12px] font-pixel tracking-wider tabular-nums shadow-pixel-sm">
                        {currentIndex + 1} / {images.length}
                    </div>
                )}
            </div>
        </div>,
        document.body
    )
}

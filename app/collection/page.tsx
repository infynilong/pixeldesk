'use client'

import BluebirdCollection from '@/components/BluebirdCollection'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/lib/hooks/useTranslation'

export default function CollectionPage() {
    const router = useRouter()
    const { t } = useTranslation()

    return (
        <div className="min-h-screen bg-[#1a1a1a] flex flex-col">
            {/* Navigation Header */}
            <div className="bg-[#2a2a2a] border-b border-gray-800 p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </button>
                    <h1 className="text-xl font-bold text-white font-pixel flex items-center gap-2">
                        <span>🕊️</span>
                        {t.postcard?.title || 'Azure Bluebird Collection'}
                    </h1>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-auto">
                <div className="max-w-7xl mx-auto p-6">
                    <BluebirdCollection />
                </div>
            </div>
        </div>
    )
}

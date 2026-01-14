'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import LoadingSpinner from '@/components/LoadingSpinner'
import CharacterPurchaseConfirmModal from '@/components/CharacterPurchaseConfirmModal'
import { useBrandConfig } from '@/lib/hooks/useBrandConfig'
import { tc } from '@/lib/i18n/currency'
import { useTranslation } from '@/lib/hooks/useTranslation'

interface ShopCharacter {
    id: string
    name: string
    displayName: string
    description: string | null
    imageUrl: string | null
    frameWidth: number
    frameHeight: number
    totalFrames: number
    isCompactFormat: boolean
    price: number
    isDefault: boolean
    isUserGenerated: boolean
    salesCount: number
    creator: {
        id: string
        name: string
    } | null
    isOwned: boolean
    canPurchase: boolean
}

type TabType = 'characters' | 'npcs' | 'postcards'

interface PostcardTemplate {
    id: string
    creatorId: string
    price: number
    salesCount: number
    config: {
        name: string
        logoUrl: string | null
        backgroundUrl: string | null
        bgColor: string
        textColor: string
    }
    creator: {
        id: string
        name: string
        avatar: string | null
    }
}

export default function ShopPage() {
    const router = useRouter()
    const { t } = useTranslation()
    const { config: brandConfig, isLoading: isBrandLoading } = useBrandConfig('zh-CN')

    const [activeTab, setActiveTab] = useState<TabType>('characters')

    // Character Shop States
    const [characters, setCharacters] = useState<ShopCharacter[]>([])
    const [userPoints, setUserPoints] = useState(0)
    const [userId, setUserId] = useState<string | null>(null)
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [isPurchasing, setIsPurchasing] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    // Postcard Template States
    const [templates, setTemplates] = useState<PostcardTemplate[]>([])
    const [selectedTemplate, setSelectedTemplate] = useState<PostcardTemplate | null>(null)
    const [showTemplateConfirm, setShowTemplateConfirm] = useState(false)

    // 筛选和上传相关状态
    const [priceFilter, setPriceFilter] = useState<'all' | 'free' | 'paid'>('all')
    const [sourceFilter, setSourceFilter] = useState<'all' | 'official' | 'user'>('all')
    const [showUploadModal, setShowUploadModal] = useState(false)
    const [uploadForm, setUploadForm] = useState({
        displayName: '',
        description: '',
        price: 0
    })
    const [uploadFile, setUploadFile] = useState<File | null>(null)
    const [uploadPreview, setUploadPreview] = useState<string | null>(null)
    const [isUploading, setIsUploading] = useState(false)

    // 购买确认弹窗状态
    const [showPurchaseConfirm, setShowPurchaseConfirm] = useState(false)
    const [selectedCharacter, setSelectedCharacter] = useState<ShopCharacter | null>(null)

    useEffect(() => {
        if (activeTab === 'characters') {
            fetchShopCharacters()
        } else if (activeTab === 'postcards') {
            fetchShopTemplates()
        }
    }, [priceFilter, sourceFilter, activeTab])

    const fetchShopTemplates = async () => {
        try {
            setIsLoading(true)
            const response = await fetch('/api/postcards/templates')
            const data = await response.json()
            if (data.success) {
                setTemplates(data.data)
                // 同时获取用户积分等状态（共用接口逻辑）
                const authRes = await fetch('/api/characters/shop?limit=1')
                const authData = await authRes.json()
                if (authData.success) {
                    setUserPoints(authData.userPoints || 0)
                    setIsAuthenticated(authData.isAuthenticated || false)
                    setUserId(authData.userId || null)
                }
            } else {
                setError(data.error || '获取模板失败')
            }
        } catch (err) {
            console.error('加载模板失败:', err)
            setError('加载模板失败')
        } finally {
            setIsLoading(false)
        }
    }

    const fetchShopCharacters = async () => {
        try {
            setIsLoading(true)
            const params = new URLSearchParams({
                priceFilter,
                sourceFilter
            })
            const response = await fetch(`/api/characters/shop?${params}`, {
                credentials: 'include'
            })
            const data = await response.json()
            if (data.success) {
                setCharacters(data.data)
                setUserPoints(data.userPoints || 0)
                setUserId(data.userId || null)
                setIsAuthenticated(data.isAuthenticated || false)
            } else {
                setError(data.error || '加载失败')
            }
        } catch (err) {
            console.error('加载商店失败:', err)
            setError('加载商店失败')
        } finally {
            setIsLoading(false)
        }
    }

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setUploadFile(file)
            const reader = new FileReader()
            reader.onloadend = () => {
                setUploadPreview(reader.result as string)
            }
            reader.readAsDataURL(file)
        }
    }

    const handleUpload = async () => {
        if (!uploadFile || !uploadForm.displayName.trim()) {
            setError('请填写角色名称并选择图片')
            return
        }
        try {
            setIsUploading(true)
            setError(null)
            const formData = new FormData()
            formData.append('characterImage', uploadFile)
            formData.append('displayName', uploadForm.displayName.trim())
            formData.append('description', uploadForm.description.trim())
            formData.append('price', uploadForm.price.toString())
            const response = await fetch('/api/characters/upload', {
                method: 'POST',
                credentials: 'include',
                body: formData
            })
            const data = await response.json()
            if (data.success) {
                setSuccess(data.message)
                setShowUploadModal(false)
                setUploadForm({ displayName: '', description: '', price: 0 })
                setUploadFile(null)
                setUploadPreview(null)
                fetchShopCharacters()
                setTimeout(() => setSuccess(null), 5000)
            } else {
                setError(data.error || '上传失败')
            }
        } catch (err) {
            console.error('上传失败:', err)
            setError('上传失败，请重试')
        } finally {
            setIsUploading(false)
        }
    }

    const handlePurchaseClick = (character: ShopCharacter) => {
        if (!isAuthenticated) {
            setError('请先登录后再购买')
            return
        }
        setSelectedCharacter(character)
        setShowPurchaseConfirm(true)
    }

    const handleConfirmPurchase = async () => {
        if (!selectedCharacter) return
        const characterId = selectedCharacter.id
        try {
            setIsPurchasing(characterId)
            setShowPurchaseConfirm(false)
            setError(null)
            setSuccess(null)
            const response = await fetch('/api/characters/purchase', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ characterId })
            })
            const data = await response.json()
            if (data.success) {
                setSuccess(data.message)
                setUserPoints(data.data.remainingPoints)
                setCharacters(prev =>
                    prev.map(char =>
                        char.id === characterId
                            ? { ...char, isOwned: true, canPurchase: false }
                            : char
                    )
                )
                if (typeof window !== 'undefined' && userId) {
                    window.dispatchEvent(
                        new CustomEvent('user-points-updated', {
                            detail: { userId: userId, points: data.data.remainingPoints }
                        })
                    )
                }
                setTimeout(() => setSuccess(null), 3000)
            } else {
                setError(data.error || '购买失败')
            }
        } catch (err) {
            console.error('购买失败:', err)
            setError('购买失败，请重试')
        } finally {
            setIsPurchasing(null)
            setSelectedCharacter(null)
        }
    }

    const handleCancelPurchase = () => {
        setShowPurchaseConfirm(false)
        setSelectedCharacter(null)
    }

    const handleTemplatePurchaseClick = (template: PostcardTemplate) => {
        if (!isAuthenticated) {
            setError('请先登录后再购买')
            return
        }
        setSelectedTemplate(template)
        setShowTemplateConfirm(true)
    }

    const handleConfirmTemplatePurchase = async () => {
        if (!selectedTemplate) return
        const templateId = selectedTemplate.id
        try {
            setIsPurchasing(templateId)
            setShowTemplateConfirm(false)
            setError(null)
            const response = await fetch('/api/postcards/templates/purchase', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ templateId })
            })
            const data = await response.json()
            if (data.success) {
                setSuccess('购买成功，已应用模板到您的设计')
                setUserPoints(prev => prev - selectedTemplate.price)
                setTemplates(prev => prev.map(t => t.id === templateId ? { ...t, salesCount: t.salesCount + 1 } : t))
                setTimeout(() => setSuccess(null), 3000)
            } else {
                setError(data.error || '购买失败')
            }
        } catch (err) {
            console.error('购买失败:', err)
            setError('购买失败，请重试')
        } finally {
            setIsPurchasing(null)
            setSelectedTemplate(null)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
            {/* 头部导航 */}
            <header className="bg-gray-900/80 backdrop-blur-sm border-b border-gray-800 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <button onClick={() => router.push('/')} className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20 overflow-hidden">
                            {isBrandLoading ? (
                                <div className="w-6 h-6 bg-white/20 animate-pulse rounded" />
                            ) : (
                                <img src={brandConfig.app_logo} alt={brandConfig.app_name} className="w-full h-full object-cover" />
                            )}
                        </div>
                        <div className="flex flex-col text-left">
                            <span className="text-white font-bold text-lg">{isBrandLoading ? '...' : brandConfig.app_name}</span>
                            <span className="text-gray-400 text-xs font-mono">{isBrandLoading ? '...' : brandConfig.app_slogan}</span>
                        </div>
                    </button>

                    <div className="flex items-center gap-4">
                        {isAuthenticated && (
                            <div className="bg-gradient-to-r from-yellow-600/20 to-orange-600/20 border border-yellow-500/30 rounded-lg px-4 py-2">
                                <div className="flex items-center gap-2">
                                    <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                                    </svg>
                                    <span className="text-yellow-400 font-bold">{userPoints}</span>
                                    <span className="text-gray-400 text-sm whitespace-nowrap">{tc('currencyName')}</span>
                                </div>
                            </div>
                        )}
                        <button
                            onClick={() => router.push('/settings/character')}
                            className="cursor-pointer px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white rounded-lg transition-all font-medium"
                        >
                            我的角色
                        </button>
                    </div>
                </div>
            </header>

            {/* Tabs */}
            <div className="bg-gray-900/40 border-b border-gray-800">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex gap-8">
                        <button
                            onClick={() => setActiveTab('characters')}
                            className={`py-4 px-2 text-sm font-medium transition-all relative ${activeTab === 'characters' ? 'text-purple-400' : 'text-gray-400 hover:text-gray-200'
                                }`}
                        >
                            {t.shop.tabs.characters}
                            {activeTab === 'characters' && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('npcs')}
                            className={`py-4 px-2 text-sm font-medium transition-all relative ${activeTab === 'npcs' ? 'text-purple-400' : 'text-gray-400 hover:text-gray-200'
                                }`}
                        >
                            {t.shop.tabs.npcs}
                            {activeTab === 'npcs' && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('postcards')}
                            className={`py-4 px-2 text-sm font-medium transition-all relative ${activeTab === 'postcards' ? 'text-purple-400' : 'text-gray-400 hover:text-gray-200'
                                }`}
                        >
                            {t.shop.tabs.postcards}
                            {activeTab === 'postcards' && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
                            )}
                        </button>
                    </div>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 py-8">
                {activeTab === 'characters' ? (
                    <>
                        {/* Character Shop Content */}
                        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                            <div className="flex items-center gap-4">
                                <span className="text-gray-400 text-sm font-medium">{t.shop.filter}:</span>
                                <div className="flex bg-gray-900/60 p-1 rounded-xl border border-gray-800">
                                    <button
                                        onClick={() => setPriceFilter('all')}
                                        className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${priceFilter === 'all' ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30' : 'text-gray-400 hover:text-gray-200'
                                            }`}
                                    >
                                        {t.shop.all}
                                    </button>
                                    <button
                                        onClick={() => setPriceFilter('free')}
                                        className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${priceFilter === 'free' ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30' : 'text-gray-400 hover:text-gray-200'
                                            }`}
                                    >
                                        {t.shop.free}
                                    </button>
                                    <button
                                        onClick={() => setPriceFilter('paid')}
                                        className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${priceFilter === 'paid' ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30' : 'text-gray-400 hover:text-gray-200'
                                            }`}
                                    >
                                        {t.shop.paid}
                                    </button>
                                </div>
                                <div className="w-px h-6 bg-gray-800 mx-2" />
                                <div className="flex bg-gray-900/60 p-1 rounded-xl border border-gray-800">
                                    <button
                                        onClick={() => setSourceFilter('all')}
                                        className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${sourceFilter === 'all' ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30' : 'text-gray-400 hover:text-gray-200'
                                            }`}
                                    >
                                        {t.shop.all}
                                    </button>
                                    <button
                                        onClick={() => setSourceFilter('official')}
                                        className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${sourceFilter === 'official' ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30' : 'text-gray-400 hover:text-gray-200'
                                            }`}
                                    >
                                        {t.shop.official}
                                    </button>
                                    <button
                                        onClick={() => setSourceFilter('user')}
                                        className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${sourceFilter === 'user' ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30' : 'text-gray-400 hover:text-gray-200'
                                            }`}
                                    >
                                        {t.shop.user_created}
                                    </button>
                                </div>
                            </div>

                            {isAuthenticated && (
                                <button
                                    onClick={() => setShowUploadModal(true)}
                                    className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl transition-all font-bold shadow-lg shadow-purple-500/20 flex items-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    {t.shop.upload}
                                </button>
                            )}
                        </div>

                        {error && (
                            <div className="mb-6 bg-red-900/20 border border-red-500/30 rounded-xl p-4 flex items-center gap-3 text-red-400">
                                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="text-sm">{error}</span>
                            </div>
                        )}

                        {success && (
                            <div className="mb-6 bg-emerald-900/20 border border-emerald-500/30 rounded-xl p-4 flex items-center gap-3 text-emerald-400">
                                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="text-sm">{success}</span>
                            </div>
                        )}

                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-4">
                                <LoadingSpinner />
                                <p className="text-gray-500 font-mono text-sm animate-pulse">ACCESSING DATABASE...</p>
                            </div>
                        ) : characters.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {characters.map((character) => (
                                    <div key={character.id} className="group bg-gray-900/40 border border-gray-800 rounded-2xl overflow-hidden hover:border-purple-500/50 transition-all hover:bg-gray-900/60 shadow-lg">
                                        <div className="relative bg-gray-950/80 p-8 flex items-center justify-center aspect-square overflow-hidden">
                                            {character.imageUrl ? (
                                                <div className="relative w-32 h-32 group-hover:scale-110 transition-transform duration-500">
                                                    <Image
                                                        src={character.imageUrl}
                                                        alt={character.displayName}
                                                        fill
                                                        className="pixelated object-contain"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="w-20 h-20 bg-gray-800/50 rounded-full flex items-center justify-center">
                                                    <svg className="w-10 h-10 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                    </svg>
                                                </div>
                                            )}

                                            <div className="absolute top-3 left-3 flex flex-col gap-2">
                                                {character.isOwned && (
                                                    <div className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold rounded border border-emerald-500/20 backdrop-blur-sm">
                                                        {t.shop.owned}
                                                    </div>
                                                )}
                                                {character.isDefault && (
                                                    <div className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-[10px] font-bold rounded border border-blue-500/20 backdrop-blur-sm">
                                                        {t.shop.free}
                                                    </div>
                                                )}
                                                {character.isUserGenerated && (
                                                    <div className="px-2 py-0.5 bg-purple-500/10 text-purple-400 text-[10px] font-bold rounded border border-purple-500/20 backdrop-blur-sm">
                                                        {t.shop.user_created}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="p-5">
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className="text-white font-bold group-hover:text-purple-400 transition-colors">{character.displayName}</h3>
                                                <div className="flex items-center gap-1 text-yellow-400 font-bold">
                                                    <span className="text-xs">✦</span>
                                                    <span>{character.price === 0 ? t.shop.free : character.price}</span>
                                                </div>
                                            </div>
                                            <p className="text-gray-500 text-xs line-clamp-2 mb-4 h-8">{character.description || 'No description provided.'}</p>

                                            {character.creator && (
                                                <div className="flex items-center gap-2 mb-4 text-[10px] text-gray-600 font-mono">
                                                    <div className="w-4 h-4 rounded-full bg-gray-800 flex items-center justify-center">
                                                        <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 20 20"><path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" /></svg>
                                                    </div>
                                                    <span>BY {character.creator.name.toUpperCase()}</span>
                                                </div>
                                            )}

                                            <button
                                                onClick={() => handlePurchaseClick(character)}
                                                disabled={character.isOwned || isPurchasing === character.id || !character.canPurchase}
                                                className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all ${character.isOwned
                                                    ? 'bg-gray-800/50 text-gray-600 cursor-not-allowed'
                                                    : 'bg-white text-gray-950 hover:bg-purple-100 shadow-lg shadow-white/5 active:scale-95'
                                                    }`}
                                            >
                                                {isPurchasing === character.id ? '...' : character.isOwned ? t.shop.owned : t.shop.purchase}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-20">
                                <div className="w-16 h-16 bg-gray-900 border border-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-8 h-8 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                    </svg>
                                </div>
                                <p className="text-gray-500 text-sm font-mono tracking-widest">{t.shop.no_characters.toUpperCase()}</p>
                            </div>
                        )}
                    </>
                ) : activeTab === 'postcards' ? (
                    <div className="space-y-8">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-4">
                                <LoadingSpinner />
                                <p className="text-gray-500 font-mono text-sm animate-pulse">LOADING TEMPLATES...</p>
                            </div>
                        ) : templates.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {templates.map((template) => (
                                    <div key={template.id} className="group bg-gray-900/40 border border-gray-800 rounded-2xl overflow-hidden hover:border-cyan-500/50 transition-all hover:bg-gray-900/60 shadow-lg">
                                        <div className="relative aspect-[3/2] bg-gray-950/80 p-4 flex items-center justify-center overflow-hidden">
                                            {/* Preview Card */}
                                            <div
                                                className="w-full h-full rounded shadow-md flex flex-col items-center justify-center p-2 relative"
                                                style={{ backgroundColor: template.config.bgColor || '#ffffff' }}
                                            >
                                                {template.config.logoUrl && (
                                                    <img src={template.config.logoUrl} alt="logo" className="w-8 h-8 object-contain mb-1" />
                                                )}
                                                <span className="text-[10px] font-bold" style={{ color: template.config.textColor || '#000000' }}>
                                                    {template.config.name}
                                                </span>
                                                <div className="absolute bottom-1 right-2 text-[8px] opacity-30" style={{ color: template.config.textColor }}>
                                                    POSTCARD
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-5">
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className="text-white font-bold group-hover:text-cyan-400 transition-colors">{template.config.name}</h3>
                                                <div className="flex items-center gap-1 text-yellow-400 font-bold">
                                                    <span className="text-xs">✦</span>
                                                    <span>{template.price}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 mb-4 text-[10px] text-gray-600 font-mono">
                                                <div className="w-4 h-4 rounded-full bg-gray-800 flex items-center justify-center overflow-hidden">
                                                    {template.creator.avatar ? (
                                                        <img src={template.creator.avatar} alt="avatar" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 20 20"><path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" /></svg>
                                                    )}
                                                </div>
                                                <span>BY {template.creator.name.toUpperCase()}</span>
                                                <span className="ml-auto opacity-50">{t.postcard.sales.replace('{count}', template.salesCount.toString())}</span>
                                            </div>

                                            <button
                                                onClick={() => handleTemplatePurchaseClick(template)}
                                                disabled={isPurchasing === template.id}
                                                className="w-full py-2.5 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-cyan-500/10 active:scale-95 disabled:opacity-50"
                                            >
                                                {isPurchasing === template.id ? '...' : t.shop.purchase}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-20">
                                <div className="w-16 h-16 bg-gray-900 border border-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <span className="text-2xl opacity-50">🕊️</span>
                                </div>
                                <p className="text-gray-500 text-sm font-mono tracking-widest uppercase">No Templates Found</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-40 gap-6">
                        <div className="relative">
                            <div className="w-24 h-24 bg-purple-500/10 rounded-full animate-ping absolute inset-0" />
                            <div className="w-24 h-24 bg-gray-900 border border-purple-500/30 rounded-3xl flex items-center justify-center relative shadow-[0_0_30px_rgba(168,85,247,0.15)]">
                                <svg className="w-12 h-12 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                            </div>
                        </div>
                        <div className="text-center space-y-2">
                            <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">{t.shop.tabs.npcs}</h2>
                            <p className="text-gray-400 font-medium">{t.shop.npc_shop_coming_soon}</p>
                        </div>
                    </div>
                )}
            </main>

            {/* Upload Modal */}
            {showUploadModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-4">
                    <div className="bg-gray-900 border border-gray-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 p-8 border-b border-gray-800 relative">
                            <button
                                onClick={() => setShowUploadModal(false)}
                                className="absolute top-8 right-8 text-gray-400 hover:text-white transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                            <h2 className="text-2xl font-bold text-white mb-1">{t.shop.upload}</h2>
                            <p className="text-gray-400 text-sm">{t.common.beta.toUpperCase()} CREATIVE STUDIO</p>
                        </div>

                        <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Sprite Sheets</label>
                                <div
                                    className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${uploadPreview ? 'border-purple-500/50 bg-purple-500/5' : 'border-gray-800 hover:border-gray-700 bg-gray-950/50'
                                        }`}
                                    onClick={() => !uploadPreview && document.getElementById('file-upload')?.click()}
                                >
                                    {uploadPreview ? (
                                        <div className="space-y-4">
                                            <img src={uploadPreview} alt="Preview" className="mx-auto h-32 pixelated object-contain" />
                                            <button onClick={(e) => { e.stopPropagation(); setUploadPreview(null); setUploadFile(null); }} className="text-xs text-red-400 hover:underline font-bold">REMOVE IMAGE</button>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="w-12 h-12 bg-gray-900 rounded-xl flex items-center justify-center mx-auto border border-gray-800">
                                                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M16 8l-4-4m0 0L8 8m4-4v12" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></svg>
                                            </div>
                                            <p className="text-gray-400 text-sm">PNG SPRITE SHEET (192x96 OR 192x192)</p>
                                        </div>
                                    )}
                                </div>
                                <input id="file-upload" type="file" className="hidden" accept="image/png" onChange={handleFileSelect} />
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Display Name</label>
                                    <input
                                        type="text"
                                        value={uploadForm.displayName}
                                        onChange={e => setUploadForm({ ...uploadForm, displayName: e.target.value })}
                                        placeholder="Enter character name..."
                                        className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-colors"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Price ({tc('currencyName')})</label>
                                    <input
                                        type="number"
                                        value={uploadForm.price}
                                        onChange={e => setUploadForm({ ...uploadForm, price: Math.max(0, parseInt(e.target.value) || 0) })}
                                        className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-colors"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="p-8 bg-gray-950/50 border-t border-gray-800 flex gap-4">
                            <button onClick={() => setShowUploadModal(false)} className="flex-1 py-3 text-gray-400 font-bold hover:text-white transition-colors">CANCEL</button>
                            <button
                                onClick={handleUpload}
                                disabled={isUploading || !uploadFile || !uploadForm.displayName.trim()}
                                className="flex-[2] py-3 bg-white text-gray-950 rounded-xl font-bold disabled:opacity-50"
                            >
                                {isUploading ? 'UPLOADING...' : 'CONFIRM UPLOAD'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Purchase Dialog */}
            <CharacterPurchaseConfirmModal
                isVisible={showPurchaseConfirm}
                character={selectedCharacter}
                userPoints={userPoints}
                onConfirm={handleConfirmPurchase}
                onCancel={handleCancelPurchase}
            />

            {/* Template Purchase Confirmation */}
            {showTemplateConfirm && selectedTemplate && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
                    <div className="bg-gray-900 border border-gray-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-8 text-center">
                            <div className="w-16 h-16 bg-cyan-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                <span className="text-3xl">🕊️</span>
                            </div>
                            <h2 className="text-xl font-bold text-white mb-2">{t.postcard.purchase_template}</h2>
                            <p className="text-gray-400 text-sm mb-8">
                                是否花费 <span className="text-yellow-400 font-bold">{selectedTemplate.price} {tc('currencyName')}</span> 购买并应用此模板？
                            </p>

                            <div className="flex gap-4">
                                <button
                                    onClick={() => setShowTemplateConfirm(false)}
                                    className="flex-1 py-3 text-gray-400 font-bold hover:text-white transition-colors"
                                >
                                    取消
                                </button>
                                <button
                                    onClick={handleConfirmTemplatePurchase}
                                    className="flex-1 py-3 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white rounded-xl font-bold active:scale-95 transition-all shadow-lg shadow-cyan-500/20"
                                >
                                    确认购买
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import LoadingSpinner from '@/components/LoadingSpinner'

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

export default function CharacterShopPage() {
  const router = useRouter()
  const [characters, setCharacters] = useState<ShopCharacter[]>([])
  const [userPoints, setUserPoints] = useState(0)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isPurchasing, setIsPurchasing] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

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

  useEffect(() => {
    fetchShopCharacters()
  }, [priceFilter, sourceFilter])

  const fetchShopCharacters = async () => {
    try {
      setIsLoading(true)

      // 构建查询参数
      const params = new URLSearchParams({
        priceFilter,
        sourceFilter
      })

      // API会自动从cookie读取认证信息（可选）
      const response = await fetch(`/api/characters/shop?${params}`, {
        credentials: 'include' // 包含cookie
      })
      const data = await response.json()

      if (data.success) {
        setCharacters(data.data)
        setUserPoints(data.userPoints || 0)
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
      // 创建预览
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
        // 重置表单
        setUploadForm({ displayName: '', description: '', price: 0 })
        setUploadFile(null)
        setUploadPreview(null)
        // 刷新列表
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

  const handlePurchase = async (characterId: string, price: number, displayName: string) => {
    if (!isAuthenticated) {
      setError('请先登录后再购买')
      return
    }

    if (userPoints < price) {
      setError(`积分不足！需要 ${price} 积分，您当前有 ${userPoints} 积分`)
      return
    }

    try {
      setIsPurchasing(characterId)
      setError(null)
      setSuccess(null)

      // API会自动从cookie读取认证信息
      const response = await fetch('/api/characters/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include', // 包含cookie
        body: JSON.stringify({ characterId })
      })

      const data = await response.json()

      if (data.success) {
        setSuccess(data.message)
        setUserPoints(data.data.remainingPoints)

        // 更新角色列表，标记为已拥有
        setCharacters(prev =>
          prev.map(char =>
            char.id === characterId
              ? { ...char, isOwned: true, canPurchase: false }
              : char
          )
        )

        // 触发积分更新事件
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('user-points-updated', {
              detail: { points: data.data.remainingPoints }
            })
          )
        }

        // 3秒后清除成功消息
        setTimeout(() => setSuccess(null), 3000)
      } else {
        setError(data.error || '购买失败')
      }
    } catch (err) {
      console.error('购买失败:', err)
      setError('购买失败，请重试')
    } finally {
      setIsPurchasing(null)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      {/* 头部导航 */}
      <header className="bg-gray-900/80 backdrop-blur-sm border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          {/* Logo */}
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-white font-bold text-lg">角色形象商店</span>
              <span className="text-gray-400 text-xs font-mono">Character Shop</span>
            </div>
          </button>

          {/* 用户积分 */}
          <div className="flex items-center gap-4">
            {isAuthenticated && (
              <>
                <div className="bg-gradient-to-r from-yellow-600/20 to-orange-600/20 border border-yellow-500/30 rounded-lg px-4 py-2">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                    </svg>
                    <span className="text-yellow-400 font-bold">{userPoints}</span>
                    <span className="text-gray-400 text-sm">积分</span>
                  </div>
                </div>

                <button
                  onClick={() => setShowUploadModal(true)}
                  className="cursor-pointer px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-lg transition-all font-medium flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  上传角色
                </button>
              </>
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

      {/* 筛选器 */}
      <div className="bg-gray-900/50 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-gray-400 text-sm font-medium">筛选:</span>

            {/* 价格筛选 */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPriceFilter('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  priceFilter === 'all'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                全部
              </button>
              <button
                onClick={() => setPriceFilter('free')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  priceFilter === 'free'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                免费
              </button>
              <button
                onClick={() => setPriceFilter('paid')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  priceFilter === 'paid'
                    ? 'bg-yellow-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                付费
              </button>
            </div>

            <div className="h-6 w-px bg-gray-700"></div>

            {/* 来源筛选 */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSourceFilter('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  sourceFilter === 'all'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                全部来源
              </button>
              <button
                onClick={() => setSourceFilter('official')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  sourceFilter === 'official'
                    ? 'bg-cyan-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                官方
              </button>
              <button
                onClick={() => setSourceFilter('user')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  sourceFilter === 'user'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                玩家创作
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* 消息提示 */}
        {error && (
          <div className="mb-6 bg-red-900/30 border border-red-800/50 rounded-lg p-4 flex items-center gap-3">
            <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-red-300 text-sm">{error}</span>
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-emerald-900/30 border border-emerald-800/50 rounded-lg p-4 flex items-center gap-3">
            <svg className="w-5 h-5 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-emerald-300 text-sm">{success}</span>
          </div>
        )}

        {!isAuthenticated && (
          <div className="mb-6 bg-yellow-900/30 border border-yellow-800/50 rounded-lg p-4">
            <p className="text-yellow-300 text-sm">
              💡 请先登录后才能购买角色形象
            </p>
          </div>
        )}

        {/* 角色列表 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {characters.map((character) => (
            <div
              key={character.id}
              className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl overflow-hidden hover:border-purple-500/50 transition-all hover:shadow-lg hover:shadow-purple-500/20"
            >
              {/* 角色图片 */}
              <div className="relative bg-gray-950 p-6 flex items-center justify-center" style={{ minHeight: '200px' }}>
                {character.imageUrl ? (
                  <Image
                    src={character.imageUrl}
                    alt={character.displayName}
                    width={character.isCompactFormat ? 192 : 384}
                    height={character.isCompactFormat ? 96 : 384}
                    className="pixelated object-contain"
                    style={{ imageRendering: 'pixelated' }}
                  />
                ) : (
                  <div className="w-48 h-48 bg-gray-800 rounded-lg flex items-center justify-center">
                    <svg className="w-16 h-16 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                )}

                {/* 已拥有标识 */}
                {character.isOwned && (
                  <div className="absolute top-2 right-2 bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                    已拥有
                  </div>
                )}

                {/* 免费标识 */}
                {character.isDefault && (
                  <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                    免费
                  </div>
                )}

                {/* 用户生成标识 */}
                {character.isUserGenerated && (
                  <div className="absolute top-2 left-2 bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    玩家创作
                  </div>
                )}
              </div>

              {/* 角色信息 */}
              <div className="p-6">
                <h3 className="text-white text-xl font-bold mb-2">{character.displayName}</h3>

                {character.description && (
                  <p className="text-gray-400 text-sm mb-4 line-clamp-2">{character.description}</p>
                )}

                {/* 创作者信息 */}
                {character.creator && (
                  <div className="mb-4 flex items-center gap-2 text-xs text-gray-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span>创作者: {character.creator.name}</span>
                    {character.salesCount > 0 && (
                      <span className="ml-2 text-green-400">• {character.salesCount} 次购买</span>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                    </svg>
                    <span className="text-yellow-400 font-bold text-lg">
                      {character.price === 0 ? '免费' : character.price}
                    </span>
                  </div>

                  {character.isOwned ? (
                    <button
                      disabled
                      className="px-4 py-2 bg-gray-700 text-gray-400 rounded-lg font-medium cursor-not-allowed"
                    >
                      已拥有
                    </button>
                  ) : (
                    <button
                      onClick={() => handlePurchase(character.id, character.price, character.displayName)}
                      disabled={isPurchasing === character.id || !character.canPurchase}
                      className="cursor-pointer px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {isPurchasing === character.id ? '购买中...' : '购买'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {characters.length === 0 && (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <p className="text-gray-400 text-lg">暂无可购买的角色</p>
          </div>
        )}
      </div>

      {/* 上传模态框 */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-800">
            {/* 头部 */}
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <div>
                <h2 className="text-2xl font-bold text-white">上传角色形象</h2>
                <p className="text-sm text-gray-400 mt-1">创建并出售你的角色形象，赚取积分</p>
              </div>
              <button
                onClick={() => {
                  setShowUploadModal(false)
                  setUploadForm({ displayName: '', description: '', price: 0 })
                  setUploadFile(null)
                  setUploadPreview(null)
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 内容 */}
            <div className="p-6 space-y-6">
              {/* 文件上传 */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  角色精灵图 <span className="text-red-400">*</span>
                </label>
                <p className="text-xs text-gray-500 mb-3">
                  请上传192×96或192×192的PNG精灵图，支持2行4列或其他格式
                </p>

                <div className="border-2 border-dashed border-gray-700 rounded-lg p-6 text-center hover:border-gray-600 transition-colors">
                  {uploadPreview ? (
                    <div>
                      <img src={uploadPreview} alt="预览" className="mx-auto mb-4 pixelated" style={{ imageRendering: 'pixelated', maxWidth: '100%', maxHeight: '200px' }} />
                      <button
                        onClick={() => {
                          setUploadFile(null)
                          setUploadPreview(null)
                        }}
                        className="text-sm text-gray-400 hover:text-white"
                      >
                        重新选择
                      </button>
                    </div>
                  ) : (
                    <div>
                      <svg className="w-12 h-12 text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p className="text-gray-400 mb-2">点击或拖拽上传图片</p>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        onChange={handleFileSelect}
                        className="hidden"
                        id="file-upload"
                      />
                      <label htmlFor="file-upload" className="cursor-pointer px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg inline-block transition-colors">
                        选择文件
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {/* 显示名称 */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  显示名称 <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={uploadForm.displayName}
                  onChange={(e) => setUploadForm({ ...uploadForm, displayName: e.target.value })}
                  placeholder="例如：武士、法师、骑士"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none transition-colors"
                  maxLength={30}
                />
              </div>

              {/* 描述 */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  描述（可选）
                </label>
                <textarea
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                  placeholder="介绍一下你的角色设计"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none transition-colors resize-none"
                  rows={3}
                  maxLength={200}
                />
              </div>

              {/* 价格 */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  售价（积分）<span className="text-red-400">*</span>
                </label>
                <p className="text-xs text-gray-500 mb-3">
                  设置为0表示免费。当其他玩家购买时，你将获得100%的积分收入
                </p>
                <input
                  type="number"
                  value={uploadForm.price}
                  onChange={(e) => setUploadForm({ ...uploadForm, price: Math.max(0, parseInt(e.target.value) || 0) })}
                  min="0"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none transition-colors"
                />
              </div>

              {/* 提示信息 */}
              <div className="bg-blue-900/20 border border-blue-800/50 rounded-lg p-4">
                <p className="text-blue-300 text-sm">
                  💡 上传的角色将在审核通过后展示在商店中。请确保图片内容健康，符合社区规范。
                </p>
              </div>

              {/* 按钮 */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowUploadModal(false)
                    setUploadForm({ displayName: '', description: '', price: 0 })
                    setUploadFile(null)
                    setUploadPreview(null)
                  }}
                  className="flex-1 px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleUpload}
                  disabled={isUploading || !uploadFile || !uploadForm.displayName.trim()}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all"
                >
                  {isUploading ? '上传中...' : '确认上传'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

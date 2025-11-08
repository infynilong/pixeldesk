'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function CreateCharacterPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 表单状态
  const [formData, setFormData] = useState({
    name: '',
    displayName: '',
    description: '',
    price: 0,
    isCompactFormat: false,
    frameWidth: 48,
    frameHeight: 48,
    totalFrames: 8,
    isDefault: false,
    isActive: true,
    sortOrder: 0,
  })

  // 图片预览
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  // UI状态
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 处理图片选择
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      setError('请选择图片文件')
      return
    }

    // 验证文件大小 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('图片大小不能超过 5MB')
      return
    }

    setImageFile(file)
    setError(null)

    // 生成预览
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // 验证必填字段
    if (!formData.name.trim()) {
      setError('角色标识是必填项')
      return
    }

    if (!formData.displayName.trim()) {
      setError('显示名称是必填项')
      return
    }

    if (!imageFile) {
      setError('请选择角色图片')
      return
    }

    setUploading(true)

    try {
      // 创建 FormData
      const submitData = new FormData()
      submitData.append('image', imageFile)
      submitData.append('name', formData.name.trim())
      submitData.append('displayName', formData.displayName.trim())
      submitData.append('description', formData.description.trim())
      submitData.append('price', formData.price.toString())
      submitData.append('isCompactFormat', formData.isCompactFormat.toString())
      submitData.append('frameWidth', formData.frameWidth.toString())
      submitData.append('frameHeight', formData.frameHeight.toString())
      submitData.append('totalFrames', formData.totalFrames.toString())
      submitData.append('isDefault', formData.isDefault.toString())
      submitData.append('isActive', formData.isActive.toString())
      submitData.append('sortOrder', formData.sortOrder.toString())

      // 发送请求
      const response = await fetch('/api/admin/characters', {
        method: 'POST',
        body: submitData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || '创建失败')
      }

      // 成功，跳转回列表页
      router.push('/admin/characters')
    } catch (err: any) {
      setError(err.message || '创建失败，请重试')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="text-gray-400 hover:text-white mb-4 flex items-center gap-2 transition-all"
        >
          ← 返回
        </button>
        <h1 className="text-3xl font-bold text-white mb-2">创建新角色</h1>
        <p className="text-gray-400">上传角色形象素材并配置属性</p>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500 rounded-lg">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* 图片上传区域 */}
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">角色图片</h2>

          <div className="flex flex-col md:flex-row gap-6">
            {/* 上传按钮 */}
            <div className="flex-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-48 border-2 border-dashed border-gray-700 rounded-lg hover:border-purple-500 transition-all flex flex-col items-center justify-center gap-3 bg-gray-800/50"
              >
                <div className="text-4xl">📁</div>
                <div className="text-white font-medium">点击选择图片</div>
                <div className="text-gray-400 text-sm">支持 PNG, JPG, WebP 格式</div>
                <div className="text-gray-500 text-xs">最大 5MB</div>
              </button>
            </div>

            {/* 预览区域 */}
            {imagePreview && (
              <div className="flex-1">
                <div className="bg-gray-800 rounded-lg p-4 h-48 flex items-center justify-center">
                  <Image
                    src={imagePreview}
                    alt="预览"
                    width={192}
                    height={formData.isCompactFormat ? 96 : 192}
                    className="pixelated object-contain"
                  />
                </div>
                <p className="text-gray-400 text-sm mt-2 text-center">
                  {imageFile?.name}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 基本信息 */}
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">基本信息</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-400 text-sm mb-2">
                角色标识 <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="例如: character_001"
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 outline-none"
              />
              <p className="text-gray-500 text-xs mt-1">
                用于游戏内部识别，建议使用英文字母、数字和下划线
              </p>
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-2">
                显示名称 <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                placeholder="例如: 酷炫角色"
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 outline-none"
              />
              <p className="text-gray-500 text-xs mt-1">
                玩家看到的角色名称
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-gray-400 text-sm mb-2">
                描述
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="角色描述..."
                rows={3}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 outline-none resize-none"
              />
            </div>
          </div>
        </div>

        {/* 技术参数 */}
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">技术参数</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isCompactFormat}
                  onChange={(e) => {
                    const isCompact = e.target.checked
                    setFormData({
                      ...formData,
                      isCompactFormat: isCompact,
                      totalFrames: isCompact ? 8 : 16,
                    })
                  }}
                  className="w-5 h-5 bg-gray-800 border-gray-700 rounded focus:ring-purple-500"
                />
                <div>
                  <div className="text-white font-medium">紧凑格式</div>
                  <div className="text-gray-400 text-sm">
                    8帧格式 (2行4列)，如 192×96 像素
                  </div>
                </div>
              </label>
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-2">总帧数</label>
              <input
                type="number"
                value={formData.totalFrames}
                onChange={(e) => setFormData({ ...formData, totalFrames: parseInt(e.target.value) || 8 })}
                min="4"
                max="32"
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 outline-none"
              />
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-2">帧宽度 (px)</label>
              <input
                type="number"
                value={formData.frameWidth}
                onChange={(e) => setFormData({ ...formData, frameWidth: parseInt(e.target.value) || 48 })}
                min="16"
                max="256"
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 outline-none"
              />
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-2">帧高度 (px)</label>
              <input
                type="number"
                value={formData.frameHeight}
                onChange={(e) => setFormData({ ...formData, frameHeight: parseInt(e.target.value) || 48 })}
                min="16"
                max="256"
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 outline-none"
              />
            </div>
          </div>
        </div>

        {/* 游戏配置 */}
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">游戏配置</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-400 text-sm mb-2">价格 (积分)</label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })}
                min="0"
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 outline-none"
              />
              <p className="text-gray-500 text-xs mt-1">
                0 表示免费，大于 0 表示需要购买
              </p>
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-2">排序顺序</label>
              <input
                type="number"
                value={formData.sortOrder}
                onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 outline-none"
              />
              <p className="text-gray-500 text-xs mt-1">
                数字越小越靠前
              </p>
            </div>

            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isDefault}
                  onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                  className="w-5 h-5 bg-gray-800 border-gray-700 rounded focus:ring-purple-500"
                />
                <div>
                  <div className="text-white font-medium">设为推荐</div>
                  <div className="text-gray-400 text-sm">
                    在选择界面显示"推荐"标签
                  </div>
                </div>
              </label>
            </div>

            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-5 h-5 bg-gray-800 border-gray-700 rounded focus:ring-purple-500"
                />
                <div>
                  <div className="text-white font-medium">启用角色</div>
                  <div className="text-gray-400 text-sm">
                    禁用后玩家无法选择此角色
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* 提交按钮 */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            disabled={uploading}
            className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-all disabled:opacity-50"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={uploading || !imageFile}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? '上传中...' : '创建角色'}
          </button>
        </div>
      </form>
    </div>
  )
}

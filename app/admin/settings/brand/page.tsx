'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface BrandConfigItem {
  key: string
  value: string
  type: string
}

interface LocaleConfig {
  locale: string
  name: string
  configs: BrandConfigItem[]
}

const DEFAULT_CONFIGS: BrandConfigItem[] = [
  { key: 'app_name', value: '', type: 'text' },
  { key: 'app_slogan', value: '', type: 'text' },
  { key: 'app_logo', value: '', type: 'image' },
  { key: 'app_description', value: '', type: 'text' }
]

const LOCALES = [
  { code: 'zh-CN', name: '简体中文' },
  { code: 'en-US', name: 'English' },
  { code: 'zh-TW', name: '繁體中文' },
  { code: 'ja-JP', name: '日本語' }
]

const CONFIG_LABELS: Record<string, string> = {
  app_name: '应用名称',
  app_slogan: '应用标语',
  app_logo: '应用Logo',
  app_description: '应用描述'
}

export default function BrandSettingsPage() {
  const router = useRouter()
  const [currentLocale, setCurrentLocale] = useState('zh-CN')
  const [configs, setConfigs] = useState<BrandConfigItem[]>(DEFAULT_CONFIGS)
  const [originalConfigs, setOriginalConfigs] = useState<BrandConfigItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [hasChanges, setHasChanges] = useState(false)

  // 加载配置
  useEffect(() => {
    loadConfigs(currentLocale)
  }, [currentLocale])

  // 检测是否有修改
  useEffect(() => {
    const changed = JSON.stringify(configs) !== JSON.stringify(originalConfigs)
    setHasChanges(changed)
  }, [configs, originalConfigs])

  const loadConfigs = async (locale: string) => {
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/brand-config?locale=${locale}`)
      const result = await response.json()

      if (result.success && result.data) {
        const loadedConfigs = DEFAULT_CONFIGS.map(defaultConfig => ({
          ...defaultConfig,
          value: result.data[defaultConfig.key]?.value || defaultConfig.value
        }))
        setConfigs(loadedConfigs)
        setOriginalConfigs(JSON.parse(JSON.stringify(loadedConfigs)))
      }
    } catch (err) {
      console.error('Error loading configs:', err)
      setError('加载配置失败')
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfigChange = (key: string, value: string) => {
    setConfigs(prev =>
      prev.map(config =>
        config.key === key ? { ...config, value } : config
      )
    )
  }

  const handleSave = async () => {
    setIsSaving(true)
    setError('')
    setSuccessMessage('')

    try {
      const response = await fetch('/api/brand-config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          locale: currentLocale,
          configs: configs.map(c => ({
            key: c.key,
            value: c.value,
            type: c.type
          }))
        })
      })

      const result = await response.json()

      if (result.success) {
        setSuccessMessage('保存成功!')
        setOriginalConfigs(JSON.parse(JSON.stringify(configs)))

        // 3秒后清除成功消息
        setTimeout(() => setSuccessMessage(''), 3000)
      } else {
        setError(result.error || '保存失败')
      }
    } catch (err) {
      console.error('Error saving configs:', err)
      setError('保存配置失败')
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    setConfigs(JSON.parse(JSON.stringify(originalConfigs)))
  }

  const handleFileUpload = async (key: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setError('')

    const formData = new FormData()
    formData.append('file', file)
    formData.append('folder', 'brand')

    try {
      const response = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (result.success) {
        handleConfigChange(key, result.url)
      } else {
        setError(result.error || '上传失败')
      }
    } catch (err) {
      console.error('Upload error:', err)
      setError('上传过程中出错')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      {/* 顶部导航 */}
      <nav className="bg-gray-900/80 backdrop-blur-sm border-b border-gray-800">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push('/admin')}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              返回管理后台
            </button>

            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
              品牌配置管理
            </h1>

            <div className="w-32"></div>
          </div>
        </div>
      </nav>

      {/* 主内容 */}
      <div className="max-w-4xl mx-auto p-6">
        {/* 语言选择器 */}
        <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-6 mb-6">
          <label className="block text-white font-medium mb-3">选择语言</label>
          <div className="flex gap-3 flex-wrap">
            {LOCALES.map(locale => (
              <button
                key={locale.code}
                onClick={() => setCurrentLocale(locale.code)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${currentLocale === locale.code
                    ? 'bg-gradient-to-r from-cyan-600 to-teal-600 text-white shadow-lg'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                  }`}
              >
                {locale.name}
              </button>
            ))}
          </div>
        </div>

        {/* 配置表单 */}
        {isLoading ? (
          <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
            <p className="text-gray-400">加载配置中...</p>
          </div>
        ) : (
          <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-6 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-gray-800">
              <h2 className="text-lg font-bold text-white">
                配置项 ({LOCALES.find(l => l.code === currentLocale)?.name})
              </h2>
              {hasChanges && (
                <span className="px-3 py-1 bg-orange-500/20 text-orange-400 text-sm rounded-full">
                  未保存的更改
                </span>
              )}
            </div>

            {configs.map(config => (
              <div key={config.key} className="space-y-2">
                <label className="block text-white font-medium">
                  {CONFIG_LABELS[config.key] || config.key}
                  <span className="text-gray-500 text-sm ml-2">({config.key})</span>
                </label>

                {config.type === 'image' ? (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={config.value}
                        onChange={(e) => handleConfigChange(config.key, e.target.value)}
                        placeholder="输入图片路径或上传图片"
                        className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/50 outline-none transition-all"
                      />
                      <label className={`px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-medium cursor-pointer transition-all flex items-center justify-center min-w-[100px] ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        {isUploading ? (
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                          '上传图片'
                        )}
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          disabled={isUploading}
                          onChange={(e) => handleFileUpload(config.key, e)}
                        />
                      </label>
                    </div>
                    {config.value && (
                      <div className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg">
                        <img
                          src={config.value}
                          alt="预览"
                          className="w-12 h-12 object-cover rounded-lg"
                          onError={(e) => {
                            e.currentTarget.src = '/placeholder.png'
                          }}
                        />
                        <span className="text-gray-400 text-sm">预览</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <input
                    type="text"
                    value={config.value}
                    onChange={(e) => handleConfigChange(config.key, e.target.value)}
                    placeholder={`输入${CONFIG_LABELS[config.key]}`}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/50 outline-none transition-all"
                  />
                )}

                <p className="text-gray-500 text-sm">
                  {config.key === 'app_name' && '应用的名称，显示在页面标题和导航栏'}
                  {config.key === 'app_slogan' && '应用的标语或副标题'}
                  {config.key === 'app_logo' && 'Logo图片的路径'}
                  {config.key === 'app_description' && '应用的简短描述，用于SEO和介绍'}
                </p>
              </div>
            ))}

            {/* 消息提示 */}
            {error && (
              <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
                <p className="text-red-400 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </p>
              </div>
            )}

            {successMessage && (
              <div className="p-4 bg-green-500/20 border border-green-500/50 rounded-lg">
                <p className="text-green-400 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {successMessage}
                </p>
              </div>
            )}

            {/* 操作按钮 */}
            <div className="flex gap-3 pt-4 border-t border-gray-800">
              <button
                onClick={handleSave}
                disabled={isSaving || !hasChanges}
                className="flex-1 py-3 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
              >
                {isSaving ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    保存中...
                  </span>
                ) : (
                  '保存配置'
                )}
              </button>

              <button
                onClick={handleReset}
                disabled={!hasChanges}
                className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                重置
              </button>
            </div>
          </div>
        )}

        {/* 使用说明 */}
        <div className="mt-6 bg-blue-500/10 border border-blue-500/30 rounded-xl p-6">
          <h3 className="text-blue-400 font-bold mb-3 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            使用说明
          </h3>
          <ul className="text-blue-300 text-sm space-y-2">
            <li>• 修改配置后需要点击"保存配置"按钮才会生效</li>
            <li>• 不同语言可以设置不同的品牌名称和标语</li>
            <li>• Logo路径建议使用相对路径，如: /assets/icon.png</li>
            <li>• 配置更新后，前端页面会在5分钟内自动刷新</li>
            <li>• 如需立即生效，可以刷新页面清除缓存</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

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
    { key: 'about_title', value: '', type: 'text' },
    { key: 'about_content', value: '', type: 'textarea' },
    { key: 'about_image', value: '', type: 'image' }
]

const LOCALES = [
    { code: 'zh-CN', name: '简体中文' },
    { code: 'en-US', name: 'English' },
    { code: 'zh-TW', name: '繁體中文' },
    { code: 'ja-JP', name: '日本語' }
]

const CONFIG_LABELS: Record<string, string> = {
    about_title: '关于页标题',
    about_content: '关于页内容',
    about_image: '图片/收款码'
}

export default function AboutSettingsPage() {
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
                            <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            关于页面配置
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
                                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg'
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
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
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

                                {config.type === 'textarea' ? (
                                    <textarea
                                        value={config.value}
                                        onChange={(e) => handleConfigChange(config.key, e.target.value)}
                                        placeholder={`输入${CONFIG_LABELS[config.key]}`}
                                        rows={6}
                                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 outline-none transition-all resize-y"
                                    />
                                ) : config.type === 'image' ? (
                                    <div className="space-y-3">
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={config.value}
                                                onChange={(e) => handleConfigChange(config.key, e.target.value)}
                                                placeholder="输入图片路径或上传图片"
                                                className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 outline-none transition-all"
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
                                                    className="w-24 h-24 object-contain rounded-lg bg-white/5"
                                                    onError={(e) => {
                                                        e.currentTarget.src = '/placeholder.png'
                                                    }}
                                                />
                                                <span className="text-gray-400 text-sm">预览 (如果显示裂图，说明路径无效)</span>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <input
                                        type="text"
                                        value={config.value}
                                        onChange={(e) => handleConfigChange(config.key, e.target.value)}
                                        placeholder={`输入${CONFIG_LABELS[config.key]}`}
                                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 outline-none transition-all"
                                    />
                                )}

                                <p className="text-gray-500 text-sm">
                                    {config.key === 'about_title' && '显示在关于页面的大标题'}
                                    {config.key === 'about_content' && '关于页面的详细介绍文本，支持换行'}
                                    {config.key === 'about_image' && '支持显示一张图片，如支付宝/微信收款码，支持外部链接'}
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
                                className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
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
                <div className="mt-6 bg-purple-500/10 border border-purple-500/30 rounded-xl p-6">
                    <h3 className="text-purple-400 font-bold mb-3 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        使用说明
                    </h3>
                    <ul className="text-purple-300 text-sm space-y-2">
                        <li>• 修改配置后需要点击"保存配置"按钮才会生效</li>
                        <li>• 请确保图片链接是公开可访问的</li>
                        <li>• 内容支持多语言配置，请切换语言标签进行设置</li>
                    </ul>
                </div>
            </div>
        </div>
    )
}

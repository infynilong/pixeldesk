'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Setting {
    key: string
    value: string
    description: string | null
    category: string
}

export default function AdminSettingsPage() {
    const [settings, setSettings] = useState<Setting[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    useEffect(() => {
        fetchSettings()
    }, [])

    const fetchSettings = async () => {
        try {
            setIsLoading(true)
            const response = await fetch('/api/admin/settings')
            const data = await response.json()
            if (data.success) {
                // 如果数据库没有任何设置，添加默认的 Resend 设置（尝试从环境变量读取）
                let loadedSettings = data.data as Setting[]

                if (loadedSettings.length === 0) {
                    loadedSettings = [
                        { key: 'RESEND_API_KEY', value: '', description: 'Resend API 密钥', category: 'email' },
                        { key: 'RESEND_FROM_EMAIL', value: 'support@infyniclick.com', description: '发件人邮箱地址', category: 'email' }
                    ]
                } else {
                    // 确保 Resend 设置存在
                    if (!loadedSettings.some(s => s.key === 'RESEND_API_KEY')) {
                        loadedSettings.push({ key: 'RESEND_API_KEY', value: '', description: 'Resend API 密钥', category: 'email' })
                    }
                    if (!loadedSettings.some(s => s.key === 'RESEND_FROM_EMAIL')) {
                        loadedSettings.push({ key: 'RESEND_FROM_EMAIL', value: 'support@infyniclick.com', description: '发件人邮箱地址', category: 'email' })
                    }
                }

                setSettings(loadedSettings)
            }
        } catch (error) {
            console.error('Fetch settings error:', error)
            setMessage({ type: 'error', text: '加载设置失败' })
        } finally {
            setIsLoading(false)
        }
    }

    const handleInputChange = (key: string, value: string) => {
        setSettings(prev => prev.map(s => s.key === key ? { ...s, value } : s))
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSaving(true)
        setMessage(null)

        try {
            const response = await fetch('/api/admin/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            })
            const data = await response.json()

            if (data.success) {
                setMessage({ type: 'success', text: '设置已成功保存' })
                setTimeout(() => setMessage(null), 3000)
            } else {
                setMessage({ type: 'error', text: data.error || '保存失败' })
            }
        } catch (error) {
            console.error('Save settings error:', error)
            setMessage({ type: 'error', text: '网络错误，请稍后重试' })
        } finally {
            setIsSaving(false)
        }
    }

    if (isLoading) {
        return (
            <div className="p-8 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
            </div>
        )
    }

    // 按照分类分组
    const categories = Array.from(new Set(settings.map(s => s.category)))

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">系统设置</h1>
                <p className="text-gray-400">管理全局系统配置，包括邮件服务、API 密钥等。</p>
            </div>

            {message && (
                <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${message.type === 'success' ? 'bg-green-600/20 border border-green-600/50 text-green-400' : 'bg-red-600/20 border border-red-600/50 text-red-400'
                    }`}>
                    <span>{message.type === 'success' ? '✅' : '❌'}</span>
                    <span>{message.text}</span>
                </div>
            )}

            <form onSubmit={handleSave} className="space-y-10">
                {categories.map(category => (
                    <div key={category} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-xl">
                        <div className="bg-gray-800/50 px-6 py-4 border-b border-gray-800">
                            <h2 className="text-lg font-semibold text-white uppercase tracking-wider">
                                {category === 'email' ? '📧 邮件服务设置 (Resend)' : category.toUpperCase()}
                            </h2>
                        </div>
                        <div className="p-6 space-y-6">
                            {settings.filter(s => s.category === category).map(setting => (
                                <div key={setting.key} className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <label htmlFor={setting.key} className="text-sm font-medium text-gray-300">
                                            {setting.description || setting.key}
                                        </label>
                                        <code className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded italic">
                                            {setting.key}
                                        </code>
                                    </div>
                                    <input
                                        id={setting.key}
                                        type={setting.key.toLowerCase().includes('key') ? 'password' : 'text'}
                                        value={setting.value}
                                        onChange={(e) => handleInputChange(setting.key, e.target.value)}
                                        className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all font-mono"
                                        placeholder={`输入 ${setting.key}...`}
                                    />
                                    {setting.key === 'RESEND_API_KEY' && (
                                        <p className="text-xs text-gray-500">
                                            从 <a href="https://resend.com/api-keys" target="_blank" className="text-purple-400 hover:underline">Resend Dashboard</a> 获取 API Key
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-10 rounded-xl shadow-lg shadow-purple-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95"
                    >
                        {isSaving ? (
                            <span className="flex items-center gap-2">
                                <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                保存中...
                            </span>
                        ) : '保存更改'}
                    </button>
                </div>
            </form>
        </div>
    )
}

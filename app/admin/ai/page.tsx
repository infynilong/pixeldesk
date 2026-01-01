'use client'

import { useState, useEffect } from 'react'

export default function AiAdminPage() {
    const [config, setConfig] = useState({
        provider: 'gemini',
        apiKey: '',
        modelName: 'gemini-1.5-flash',
        baseUrl: '',
        temperature: 0.7,
        dailyLimit: 20
    })
    const [npcs, setNpcs] = useState<any[]>([])
    const [status, setStatus] = useState('')
    const [isLoading, setIsLoading] = useState(true)
    const [isTesting, setIsTesting] = useState(false)
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
    const [activeConfig, setActiveConfig] = useState<any>(null)
    const [usageStats, setUsageStats] = useState<any>(null)

    useEffect(() => {
        fetchInitialData()
    }, [])

    const fetchInitialData = async () => {
        setIsLoading(true)
        try {
            // Fetch NPCs, Config, and Usage in parallel
            const [npcsRes, configRes, usageRes] = await Promise.all([
                fetch('/api/ai/npcs'),
                fetch('/api/admin/ai/config'),
                fetch('/api/admin/ai/usage')
            ])

            const npcsData = await npcsRes.json()
            if (npcsData.success) setNpcs(npcsData.data)

            if (configRes.ok) {
                const configData = await configRes.json()
                if (configData.success && configData.data) {
                    const d = configData.data
                    setConfig({
                        provider: d.provider || 'gemini',
                        apiKey: d.apiKey || '',
                        modelName: d.modelName || '',
                        baseUrl: d.baseUrl || '',
                        temperature: d.temperature || 0.7,
                        dailyLimit: d.dailyLimit ?? 20
                    })
                    setActiveConfig(d)
                }
            }

            if (usageRes.ok) {
                const usageData = await usageRes.json()
                if (usageData.success) {
                    setUsageStats(usageData)
                }
            }
        } catch (e) {
            console.error('Fetch error:', e)
        } finally {
            setIsLoading(false)
        }
    }

    const saveConfig = async () => {
        setStatus('正在保存全局配置...')
        try {
            const res = await fetch('/api/ai/npcs', { // Repurposed POST for global config
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            })
            if (res.ok) {
                setStatus('✅ 全局配置已更新')
                // 再次获取确保同步
                fetchInitialData()
            }
            else setStatus('❌ 保存失败')
        } catch (e) {
            setStatus('❌ 网络错误')
        }
        setTimeout(() => setStatus(''), 3000)
    }

    const testAi = async () => {
        setIsTesting(true)
        setTestResult(null)
        try {
            const res = await fetch('/api/admin/ai/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            })
            const data = await res.json()
            if (data.success) {
                setTestResult({ success: true, message: `连接成功！AI 回复: ${data.reply}` })
            } else {
                setTestResult({ success: false, message: `连接失败: ${data.error}` })
            }
        } catch (e) {
            setTestResult({ success: false, message: '网络错误，无法连接到测试接口' })
        } finally {
            setIsTesting(false)
        }
    }

    const saveNpc = async (npc: any) => {
        setStatus(`正在保存 ${npc.name}...`)
        try {
            const res = await fetch(`/api/ai/npcs/${npc.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(npc)
            })
            if (res.ok) setStatus(`✅ ${npc.name} 已更新`)
            else setStatus('❌ 保存失败')
        } catch (e) {
            setStatus('❌ 网络错误')
        }
        setTimeout(() => setStatus(''), 3000)
    }

    const handleNpcChange = (id: string, field: string, value: any) => {
        setNpcs(prev => prev.map(n => n.id === id ? { ...n, [field]: value } : n))
    }

    const syncNpcs = async () => {
        setStatus('正在同步灵魂数据...')
        try {
            const res = await fetch('/api/ai/npcs?force=true')
            const data = await res.json()
            if (data.success) {
                setNpcs(data.data)
                setStatus('✅ 全员数据已重置并同步')
            }
        } catch (e) {
            setStatus('❌ 同步失败')
        }
        setTimeout(() => setStatus(''), 3000)
    }

    if (isLoading) return <div className="p-8 font-mono text-cyan-500">SYSTEM INITIALIZING...</div>

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-8">
            <div className="flex justify-between items-end border-b border-gray-800 pb-4">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">AI NPC 集成控制台</h1>
                    <p className="text-gray-400 mt-2">管理全局 AI 模型供应及各 NPC 的灵魂设定</p>
                </div>
                <div className="text-right">
                    <span className="text-[10px] font-mono text-gray-600 block">LAST SYNC: {new Date().toLocaleTimeString()}</span>
                    <span className="text-xs text-green-500 font-mono flex items-center justify-end gap-1">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                        BACKEND_READY
                    </span>
                </div>
            </div>

            {/* Error Hint for Model Not Exist */}
            {testResult && !testResult.success && testResult.message.includes('Model Not Exist') && (
                <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl flex gap-3 text-amber-200 text-sm">
                    <div className="text-xl">💡</div>
                    <div>
                        <p className="font-bold">排障建议：“Model Not Exist” 错误</p>
                        <p className="opacity-80 mt-1">
                            这通常意味着模型名称不匹配。如果你使用的是 <span className="text-amber-400 font-bold">SiliconFlow (硅基流动)</span>，请确保：
                            <br />• 供应商选择 <b>SiliconFlow</b>
                            <br />• 模型名称使用完整路径，如 <b>deepseek-ai/DeepSeek-V3</b>
                        </p>
                    </div>
                </div>
            )}

            {/* Global Config Section */}
            <section className="bg-gray-900/50 rounded-2xl border border-gray-800 p-6 shadow-2xl backdrop-blur-sm">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-600/20 rounded-xl flex items-center justify-center text-purple-400 border border-purple-500/30">
                            ⚡
                        </div>
                        <h2 className="text-xl font-bold text-gray-100">核心 AI 指控中心</h2>
                    </div>

                    {activeConfig && (
                        <div className="flex items-center gap-4 px-4 py-2 bg-gray-950 border border-gray-800 rounded-xl">
                            <div className="flex flex-col">
                                <span className="text-[9px] text-gray-500 font-mono uppercase leading-tight">ACTIVE PROVIDER</span>
                                <span className="text-xs text-purple-400 font-bold font-mono">{(activeConfig.provider || 'unknown').toUpperCase()}</span>
                            </div>
                            <div className="w-px h-6 bg-gray-800"></div>
                            <div className="flex flex-col">
                                <span className="text-[9px] text-gray-500 font-mono uppercase leading-tight">ACTIVE MODEL</span>
                                <span className="text-xs text-cyan-400 font-bold font-mono">{activeConfig.modelName || 'default'}</span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-mono text-gray-500 uppercase">供应商 (Provider)</label>
                        <select
                            className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-sm text-gray-200 focus:border-purple-500 outline-none transition-all"
                            value={config.provider}
                            onChange={e => {
                                const p = e.target.value;
                                let m = config.modelName;
                                let url = config.baseUrl;
                                if (p === 'deepseek') {
                                    m = 'deepseek-chat';
                                    url = 'https://api.deepseek.com';
                                } else if (p === 'siliconflow') {
                                    m = 'deepseek-ai/DeepSeek-V3';
                                    url = 'https://api.siliconflow.cn/v1';
                                } else if (p === 'gemini') {
                                    m = 'gemini-1.5-flash';
                                    url = '';
                                } else if (p === 'openai') {
                                    m = 'gpt-4o-mini';
                                    url = 'https://api.openai.com/v1';
                                }
                                setConfig({ ...config, provider: p, modelName: m, baseUrl: url });
                            }}
                        >
                            <option value="gemini">Google Gemini (Recommended)</option>
                            <option value="openai">OpenAI (Pro)</option>
                            <option value="deepseek">DeepSeek (Official API)</option>
                            <option value="siliconflow">SiliconFlow (DeepSeek V3 / R1)</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-mono text-gray-500 uppercase">模型名称 (Model Identifier)</label>
                        <input
                            type="text"
                            placeholder="如: gemini-1.5-flash"
                            className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-sm text-gray-200 focus:border-purple-500 outline-none"
                            value={config.modelName}
                            onChange={e => setConfig({ ...config, modelName: e.target.value })}
                        />
                    </div>

                    <div className="md:col-span-2 space-y-2">
                        <label className="text-[10px] font-mono text-gray-500 uppercase">API 私钥 (Authorization Key)</label>
                        <input
                            type="password"
                            placeholder="sk-..."
                            className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-sm text-cyan-100 font-mono focus:border-purple-500 outline-none"
                            value={config.apiKey}
                            onChange={e => setConfig({ ...config, apiKey: e.target.value })}
                        />
                    </div>

                    <div className="md:col-span-2 space-y-2">
                        <label className="text-[10px] font-mono text-gray-500 uppercase">基础链接 (Base URL - 可选，用于国产模型或代理)</label>
                        <input
                            type="text"
                            placeholder="https://api.openai.com/v1"
                            className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-sm text-gray-400 font-mono focus:border-purple-500 outline-none"
                            value={config.baseUrl}
                            onChange={e => setConfig({ ...config, baseUrl: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-mono text-gray-500 uppercase">用户每日对话上限 (Daily Chat Limit)</label>
                        <div className="flex items-center gap-3">
                            <input
                                type="number"
                                className="w-32 bg-gray-950 border border-gray-800 rounded-xl p-3 text-sm text-yellow-500 font-bold focus:border-purple-500 outline-none"
                                value={config.dailyLimit}
                                onChange={e => setConfig({ ...config, dailyLimit: parseInt(e.target.value) || 0 })}
                            />
                            <span className="text-xs text-gray-400">次/人/天</span>
                        </div>
                    </div>
                </div>

                <div className="mt-8 flex flex-col sm:flex-row justify-end gap-4">
                    {testResult && (
                        <div className={`flex-1 text-xs p-3 rounded-lg border font-mono ${testResult.success ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                            [DEBUG_OUTPUT] {testResult.message}
                        </div>
                    )}
                    <button
                        onClick={testAi}
                        disabled={isTesting || !config.apiKey}
                        className="bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-bold py-2.5 px-6 rounded-xl transition-all border border-gray-700 disabled:opacity-50"
                    >
                        {isTesting ? '正在嗅探接口...' : '测试 AI 连接'}
                    </button>
                    <button
                        onClick={saveConfig}
                        className="bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold py-2.5 px-8 rounded-xl transition-all shadow-lg active:scale-95 border border-purple-400/20"
                    >
                        部署全域配置
                    </button>
                </div>
            </section>

            {/* Usage Stats Section */}
            {usageStats && usageStats.summary && (
                <section className="bg-gray-900/50 rounded-2xl border border-gray-800 p-6 shadow-2xl backdrop-blur-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-cyan-600/20 rounded-xl flex items-center justify-center text-cyan-400 border border-cyan-500/30">
                            📊
                        </div>
                        <h2 className="text-xl font-bold text-gray-100">Token 消耗量化报告 (Daily Tokens)</h2>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left font-mono text-xs">
                            <thead className="bg-gray-950/50 text-gray-500 uppercase">
                                <tr>
                                    <th className="px-4 py-3 rounded-l-lg">日期 (Date)</th>
                                    <th className="px-4 py-3">对话次数 (Hits)</th>
                                    <th className="px-4 py-3">用户数 (Users)</th>
                                    <th className="px-4 py-3">输入 (Prompt)</th>
                                    <th className="px-4 py-3">输出 (Completion)</th>
                                    <th className="px-4 py-3 rounded-r-lg">总计 (Total Tokens)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {usageStats.summary.map((day: any) => (
                                    <tr key={day.date} className="hover:bg-gray-800/30 transition-colors">
                                        <td className="px-4 py-4 text-gray-300 font-bold">{day.date}</td>
                                        <td className="px-4 py-4 text-cyan-400">{day.totalCount}</td>
                                        <td className="px-4 py-4 text-purple-400">{day.userCount}</td>
                                        <td className="px-4 py-4 text-gray-500">{day.promptTokens.toLocaleString()}</td>
                                        <td className="px-4 py-4 text-gray-500">{day.completionTokens.toLocaleString()}</td>
                                        <td className="px-4 py-4">
                                            <span className="bg-cyan-500/10 text-cyan-300 px-2 py-1 rounded border border-cyan-500/20">
                                                {day.totalTokens.toLocaleString()}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}

            {/* NPCs List Section */}
            <div className="grid grid-cols-1 gap-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold flex items-center gap-3">
                        <div className="w-1.5 h-6 bg-pink-500 rounded-full"></div>
                        活跃 NPC 灵魂工程
                    </h2>
                    <button
                        onClick={syncNpcs}
                        className="text-[10px] text-pink-400 border border-pink-500/30 px-3 py-1.5 rounded-lg hover:bg-pink-500/10 transition-all font-mono uppercase tracking-tighter"
                    >
                        ↻ 强制同步全员 / 重置
                    </button>
                </div>

                {npcs.map(npc => (
                    <div key={npc.id} className="bg-gray-900/40 rounded-2xl border border-gray-800 p-6 space-y-6 hover:border-pink-500/30 transition-colors">
                        <div className="flex justify-between items-start">
                            <div className="flex gap-4">
                                <div className="w-14 h-14 bg-gray-800 rounded-2xl border border-gray-700 flex items-center justify-center text-3xl shadow-inner">
                                    {npc.role === 'IT Support' ? '⌨️' : '💁‍♀️'}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <input
                                            className="bg-transparent text-xl font-bold text-white border-b border-transparent focus:border-pink-500 outline-none"
                                            value={npc.name}
                                            onChange={e => handleNpcChange(npc.id, 'name', e.target.value)}
                                        />
                                        <span className="text-[10px] px-2 py-0.5 bg-pink-500/10 text-pink-400 border border-pink-500/20 rounded-full uppercase font-mono">
                                            NPC_ID: {npc.id.substring(0, 8)}...
                                        </span>
                                    </div>
                                    <input
                                        className="bg-transparent text-sm text-gray-400 w-full border-b border-transparent focus:border-gray-600 outline-none mt-1"
                                        value={npc.role || ''}
                                        placeholder="职位名称，如 IT 支援"
                                        onChange={e => handleNpcChange(npc.id, 'role', e.target.value)}
                                    />
                                </div>
                            </div>
                            <button
                                onClick={() => saveNpc(npc)}
                                className="text-[10px] font-bold py-1.5 px-4 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 transition-all uppercase tracking-widest"
                            >
                                同步
                            </button>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-mono text-gray-500 uppercase">性格设定 (System Prompt)</label>
                                <textarea
                                    className="w-full bg-gray-950 border border-gray-800 rounded-xl p-4 text-sm text-gray-300 h-28 focus:border-pink-500 outline-none transition-all placeholder:italic"
                                    placeholder="描述这个 NPC 的性格、语言风格、偏好..."
                                    value={npc.personality}
                                    onChange={e => handleNpcChange(npc.id, 'personality', e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-mono text-gray-500 uppercase">业务知识库 (Specific Knowledge)</label>
                                <textarea
                                    className="w-full bg-gray-950 border border-gray-800 rounded-xl p-4 text-sm text-cyan-100/70 h-20 focus:border-cyan-500 outline-none transition-all"
                                    placeholder="输入 NPC 专有的知识（已具备实施工位/在线名单的只读权限）"
                                    value={npc.knowledge || ''}
                                    onChange={e => handleNpcChange(npc.id, 'knowledge', e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-mono text-gray-500 uppercase">初始招呼语 (Greeting Message)</label>
                                <input
                                    className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-sm text-gray-400 focus:border-gray-600 outline-none"
                                    value={npc.greeting || ''}
                                    onChange={e => handleNpcChange(npc.id, 'greeting', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {status && (
                <div className="fixed bottom-10 right-10 bg-gray-900 border border-purple-500/50 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-ping"></div>
                    <span className="text-sm font-medium">{status}</span>
                </div>
            )}
        </div>
    )
}

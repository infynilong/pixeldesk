'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface WorkstationConfig {
  id: string
  totalWorkstations: number
  bindingCost: number
  renewalCost: number
  unbindingRefund: number
  teleportCost: number
  defaultDuration: number
  maxBindingsPerUser: number
  updatedAt: string
}

interface Stats {
  totalWorkstations: number
  occupiedWorkstations: number
  occupancyRate: number
}

export default function WorkstationsPage() {
  const router = useRouter()
  const [config, setConfig] = useState<WorkstationConfig | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState<Partial<WorkstationConfig>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [configRes, statsRes] = await Promise.all([
        fetch('/api/admin/workstations/config'),
        fetch('/api/admin/dashboard/stats'),
      ])

      if (configRes.ok) {
        const configData = await configRes.json()
        setConfig(configData.data)
        setEditForm(configData.data)
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats({
          totalWorkstations: statsData.data.totalWorkstations,
          occupiedWorkstations: statsData.data.occupiedWorkstations,
          occupancyRate: statsData.data.occupancyRate,
        })
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!editForm || saving) return

    setSaving(true)
    try {
      const response = await fetch('/api/admin/workstations/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })

      if (response.ok) {
        const data = await response.json()
        setConfig(data.data)
        setEditForm(data.data)
        setEditing(false)
        alert('保存成功！')
      } else {
        const data = await response.json()
        alert(`保存失败：${data.error}`)
      }
    } catch (error) {
      console.error('Failed to save config:', error)
      alert('保存失败，请重试')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setEditForm(config || {})
    setEditing(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">工位管理</h1>
        <p className="text-gray-400">配置工位数量和积分规则</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-200 text-sm">总工位数</p>
                <p className="text-3xl font-bold text-white mt-2">
                  {stats.totalWorkstations.toLocaleString()}
                </p>
              </div>
              <div className="text-4xl">💼</div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-600 to-green-800 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-200 text-sm">已占用</p>
                <p className="text-3xl font-bold text-white mt-2">
                  {stats.occupiedWorkstations.toLocaleString()}
                </p>
              </div>
              <div className="text-4xl">✅</div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-600 to-orange-800 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-200 text-sm">占用率</p>
                <p className="text-3xl font-bold text-white mt-2">
                  {stats.occupancyRate}%
                </p>
                <p className="text-orange-200 text-xs mt-1">
                  可用: {stats.totalWorkstations - stats.occupiedWorkstations}
                </p>
              </div>
              <div className="text-4xl">📊</div>
            </div>
          </div>
        </div>
      )}

      {/* Config Form */}
      <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">工位配置</h2>
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all"
            >
              ✏️ 编辑配置
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleCancel}
                disabled={saving}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-all disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all disabled:opacity-50"
              >
                {saving ? '保存中...' : '💾 保存'}
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 总工位数 */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              总工位数
            </label>
            <input
              type="number"
              value={editForm.totalWorkstations || ''}
              onChange={(e) =>
                setEditForm({ ...editForm, totalWorkstations: parseInt(e.target.value) })
              }
              disabled={!editing}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white disabled:opacity-60 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 outline-none"
            />
          </div>

          {/* 绑定消耗 */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              绑定消耗积分
            </label>
            <input
              type="number"
              value={editForm.bindingCost || ''}
              onChange={(e) =>
                setEditForm({ ...editForm, bindingCost: parseInt(e.target.value) })
              }
              disabled={!editing}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white disabled:opacity-60 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 outline-none"
            />
          </div>

          {/* 续期消耗 */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              续期消耗积分
            </label>
            <input
              type="number"
              value={editForm.renewalCost || ''}
              onChange={(e) =>
                setEditForm({ ...editForm, renewalCost: parseInt(e.target.value) })
              }
              disabled={!editing}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white disabled:opacity-60 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 outline-none"
            />
          </div>

          {/* 解绑退还 */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              解绑退还积分
            </label>
            <input
              type="number"
              value={editForm.unbindingRefund || ''}
              onChange={(e) =>
                setEditForm({ ...editForm, unbindingRefund: parseInt(e.target.value) })
              }
              disabled={!editing}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white disabled:opacity-60 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 outline-none"
            />
          </div>

          {/* 传送消耗 */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              传送消耗积分
            </label>
            <input
              type="number"
              value={editForm.teleportCost || ''}
              onChange={(e) =>
                setEditForm({ ...editForm, teleportCost: parseInt(e.target.value) })
              }
              disabled={!editing}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white disabled:opacity-60 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 outline-none"
            />
          </div>

          {/* 默认时长 */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              默认绑定时长（小时）
            </label>
            <input
              type="number"
              value={editForm.defaultDuration || ''}
              onChange={(e) =>
                setEditForm({ ...editForm, defaultDuration: parseInt(e.target.value) })
              }
              disabled={!editing}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white disabled:opacity-60 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 outline-none"
            />
          </div>

          {/* 最大绑定数 */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              每人最多绑定数
            </label>
            <input
              type="number"
              value={editForm.maxBindingsPerUser || ''}
              onChange={(e) =>
                setEditForm({ ...editForm, maxBindingsPerUser: parseInt(e.target.value) })
              }
              disabled={!editing}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white disabled:opacity-60 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 outline-none"
            />
          </div>
        </div>

        {config && (
          <div className="mt-6 pt-6 border-t border-gray-800">
            <p className="text-sm text-gray-400">
              最后更新时间：{new Date(config.updatedAt).toLocaleString('zh-CN')}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

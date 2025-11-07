'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface AdminInfo {
  id: string
  username: string
  email: string
  role: string
}

interface DashboardStats {
  totalPlayers: number
  activePlayers: number
  totalCharacters: number
  totalWorkstations: number
  occupiedWorkstations: number
  occupancyRate: number
}

export default function AdminDashboard() {
  const router = useRouter()
  const [admin, setAdmin] = useState<AdminInfo | null>(null)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        // 并行获取管理员信息和统计数据
        const [adminResponse, statsResponse] = await Promise.all([
          fetch('/api/admin/auth/me'),
          fetch('/api/admin/dashboard/stats'),
        ])

        if (adminResponse.ok) {
          const adminData = await adminResponse.json()
          setAdmin(adminData.admin)
        } else {
          router.push('/admin/login')
          return
        }

        if (statsResponse.ok) {
          const statsData = await statsResponse.json()
          setStats(statsData.data)
        }
      } catch (error) {
        console.error('Failed to fetch data:', error)
        router.push('/admin/login')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [router])

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
        <h1 className="text-3xl font-bold text-white mb-2">仪表盘</h1>
        <p className="text-gray-400">欢迎回来，{admin?.username}!</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-200 text-sm">总玩家数</p>
              <p className="text-3xl font-bold text-white mt-2">
                {stats ? stats.totalPlayers.toLocaleString() : '-'}
              </p>
              {stats && stats.activePlayers > 0 && (
                <p className="text-purple-200 text-xs mt-1">
                  活跃: {stats.activePlayers}
                </p>
              )}
            </div>
            <div className="text-4xl">👥</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-200 text-sm">角色形象</p>
              <p className="text-3xl font-bold text-white mt-2">
                {stats ? stats.totalCharacters : '-'}
              </p>
              <p className="text-blue-200 text-xs mt-1">已启用</p>
            </div>
            <div className="text-4xl">🎭</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-600 to-green-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-200 text-sm">总工位数</p>
              <p className="text-3xl font-bold text-white mt-2">
                {stats ? stats.totalWorkstations.toLocaleString() : '-'}
              </p>
              {stats && (
                <p className="text-green-200 text-xs mt-1">
                  已占用: {stats.occupiedWorkstations}
                </p>
              )}
            </div>
            <div className="text-4xl">💼</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-600 to-orange-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-200 text-sm">工位占用率</p>
              <p className="text-3xl font-bold text-white mt-2">
                {stats ? `${stats.occupancyRate}%` : '-'}
              </p>
              {stats && (
                <p className="text-orange-200 text-xs mt-1">
                  {stats.occupiedWorkstations} / {stats.totalWorkstations}
                </p>
              )}
            </div>
            <div className="text-4xl">📊</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
        <h2 className="text-xl font-bold text-white mb-4">快捷操作</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => router.push('/admin/characters/create')}
            className="p-4 bg-purple-600 hover:bg-purple-700 rounded-lg transition-all text-left"
          >
            <div className="text-2xl mb-2">➕</div>
            <div className="font-medium">创建角色形象</div>
            <div className="text-sm text-purple-200 mt-1">上传新的角色素材</div>
          </button>

          <button
            onClick={() => router.push('/admin/players')}
            className="p-4 bg-blue-600 hover:bg-blue-700 rounded-lg transition-all text-left"
          >
            <div className="text-2xl mb-2">👥</div>
            <div className="font-medium">查看玩家</div>
            <div className="text-sm text-blue-200 mt-1">管理所有玩家数据</div>
          </button>

          <button
            onClick={() => router.push('/admin/workstations')}
            className="p-4 bg-green-600 hover:bg-green-700 rounded-lg transition-all text-left"
          >
            <div className="text-2xl mb-2">⚙️</div>
            <div className="font-medium">工位配置</div>
            <div className="text-sm text-green-200 mt-1">调整积分和规则</div>
          </button>
        </div>
      </div>

      {/* System Info */}
      <div className="mt-8 bg-gray-900 rounded-lg p-6 border border-gray-800">
        <h2 className="text-xl font-bold text-white mb-4">系统信息</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">当前管理员</span>
            <span className="text-white">{admin?.username}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">权限级别</span>
            <span className="text-purple-400">{admin?.role}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">版本</span>
            <span className="text-white">v1.0.0</span>
          </div>
        </div>
      </div>
    </div>
  )
}

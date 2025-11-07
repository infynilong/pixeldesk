'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

interface Player {
  id: string
  userId: string
  playerName: string
  userName: string
  email: string | null
  characterSprite: string
  points: number
  totalPlayTime: number
  totalPlayTimeText: string
  lastActiveAt: string
  lastActiveText: string
  createdAt: string
  isActive: boolean
}

interface Pagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export default function PlayersPage() {
  const router = useRouter()
  const [players, setPlayers] = useState<Player[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    fetchPlayers()
  }, [sortBy, sortOrder])

  const fetchPlayers = async (page = 1, searchTerm = search) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: '20',
        sortBy,
        sortOrder,
        ...(searchTerm && { search: searchTerm }),
      })

      const response = await fetch(`/api/admin/players?${params}`)
      if (response.ok) {
        const data = await response.json()
        setPlayers(data.data)
        setPagination(data.pagination)
      } else {
        console.error('Failed to fetch players')
      }
    } catch (error) {
      console.error('Error fetching players:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    fetchPlayers(1, search)
  }

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
  }

  if (loading && !players.length) {
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
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">玩家管理</h1>
            <p className="text-gray-400">
              共 {pagination?.total || 0} 名玩家
            </p>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex items-center gap-4 bg-gray-900 p-4 rounded-lg border border-gray-800">
          <div className="flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="搜索玩家名称或用户名..."
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 outline-none"
            />
          </div>
          <button
            onClick={handleSearch}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all"
          >
            🔍 搜索
          </button>
        </div>
      </div>

      {/* Players Table */}
      <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-800 border-b border-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                  角色
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase cursor-pointer hover:text-white"
                  onClick={() => handleSort('playerName')}
                >
                  玩家名称 {sortBy === 'playerName' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                  用户信息
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase cursor-pointer hover:text-white"
                  onClick={() => handleSort('points')}
                >
                  积分 {sortBy === 'points' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                  游戏时长
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase cursor-pointer hover:text-white"
                  onClick={() => handleSort('lastActiveAt')}
                >
                  最后活跃 {sortBy === 'lastActiveAt' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase cursor-pointer hover:text-white"
                  onClick={() => handleSort('createdAt')}
                >
                  注册时间 {sortBy === 'createdAt' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                  状态
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {players.map((player) => (
                <tr
                  key={player.id}
                  className="hover:bg-gray-800 transition-all"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gray-800 rounded flex items-center justify-center">
                        <Image
                          src={`/assets/characters/${player.characterSprite}.png`}
                          alt={player.characterSprite}
                          width={48}
                          height={48}
                          className="pixelated"
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-white font-medium">{player.playerName}</div>
                    <div className="text-gray-400 text-sm">{player.characterSprite}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-white">{player.userName}</div>
                    {player.email && (
                      <div className="text-gray-400 text-sm">{player.email}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-yellow-400 font-semibold">
                      {player.points}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-400">
                    {player.totalPlayTimeText}
                  </td>
                  <td className="px-6 py-4 text-gray-400">
                    {player.lastActiveText}
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-sm">
                    {new Date(player.createdAt).toLocaleDateString('zh-CN')}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        player.isActive
                          ? 'bg-green-600/20 text-green-400'
                          : 'bg-red-600/20 text-red-400'
                      }`}
                    >
                      {player.isActive ? '活跃' : '禁用'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => router.push(`/admin/players/${player.id}`)}
                      className="text-purple-400 hover:text-purple-300 text-sm"
                    >
                      查看详情
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="mt-8 flex items-center justify-between">
          <div className="text-sm text-gray-400">
            显示第 {(pagination.page - 1) * pagination.pageSize + 1} 到{' '}
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} 条，
            共 {pagination.total} 条记录
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={pagination.page === 1}
              onClick={() => fetchPlayers(pagination.page - 1)}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              上一页
            </button>
            <span className="px-4 py-2 text-white">
              {pagination.page} / {pagination.totalPages}
            </span>
            <button
              disabled={pagination.page === pagination.totalPages}
              onClick={() => fetchPlayers(pagination.page + 1)}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              下一页
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

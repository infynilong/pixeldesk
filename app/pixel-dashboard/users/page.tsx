'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

interface User {
    id: string
    name: string
    email: string | null
    points: number
    isAdmin: boolean
    isActive: boolean
    createdAt: string
    lastLogin: string | null
    player?: {
        id: string
        playerName: string
        characterSprite: string
    }
}

interface Pagination {
    page: number
    pageSize: number
    total: number
    totalPages: number
}

export default function UsersPage() {
    const router = useRouter()
    const [users, setUsers] = useState<User[]>([])
    const [pagination, setPagination] = useState<Pagination | null>(null)
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [sortBy, setSortBy] = useState('createdAt')
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    // Admin confirmation state
    const [adminUpdateId, setAdminUpdateId] = useState<string | null>(null)
    const [showAdminConfirm, setShowAdminConfirm] = useState(false)
    const [targetAdminStatus, setTargetAdminStatus] = useState<boolean>(false)
    const [isAdminUpdating, setIsAdminUpdating] = useState(false)

    useEffect(() => {
        fetchUsers()
    }, [sortBy, sortOrder])

    const fetchUsers = async (page = 1, searchTerm = search) => {
        setLoading(true)
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                pageSize: '20',
                sortBy,
                sortOrder,
                ...(searchTerm && { search: searchTerm }),
            })

            const response = await fetch(`/api/pixel-dashboard/users?${params}`)
            if (response.ok) {
                const data = await response.json()
                setUsers(data.data)
                setPagination(data.pagination)
            } else {
                console.error('Failed to fetch users')
            }
        } catch (error) {
            console.error('Error fetching users:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSearch = () => {
        fetchUsers(1, search)
    }

    const handleSort = (field: string) => {
        if (sortBy === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
        } else {
            setSortBy(field)
            setSortOrder('desc')
        }
    }

    const confirmDelete = (id: string) => {
        setDeletingId(id)
        setShowDeleteConfirm(true)
    }

    const handleDelete = async () => {
        if (!deletingId) return
        setIsDeleting(true)
        try {
            const response = await fetch(`/api/pixel-dashboard/users/${deletingId}`, {
                method: 'DELETE',
            })
            if (response.ok) {
                setUsers(users.filter(u => u.id !== deletingId))
                setShowDeleteConfirm(false)
            } else {
                const data = await response.json()
                alert(data.error || '删除失败')
            }
        } catch (error) {
            console.error('Error deleting user:', error)
            alert('删除出错')
        } finally {
            setIsDeleting(false)
            setDeletingId(null)
        }
    }

    const openAdminConfirm = (id: string, currentStatus: boolean) => {
        setAdminUpdateId(id)
        setTargetAdminStatus(!currentStatus)
        setShowAdminConfirm(true)
    }

    const toggleIsAdmin = async () => {
        if (!adminUpdateId) return
        setIsAdminUpdating(true)
        try {
            const response = await fetch(`/api/pixel-dashboard/users/${adminUpdateId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isAdmin: targetAdminStatus }),
            })
            if (response.ok) {
                setUsers(users.map(u => u.id === adminUpdateId ? { ...u, isAdmin: targetAdminStatus } : u))
                setShowAdminConfirm(false)
            } else {
                const data = await response.json()
                alert(data.error || '更新失败')
            }
        } catch (error) {
            console.error('Error toggling admin status:', error)
            alert('操作出错')
        } finally {
            setIsAdminUpdating(false)
            setAdminUpdateId(null)
        }
    }

    const toggleIsActive = async (id: string, currentStatus: boolean) => {
        try {
            const response = await fetch(`/api/pixel-dashboard/users/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: !currentStatus }),
            })
            if (response.ok) {
                setUsers(users.map(u => u.id === id ? { ...u, isActive: !currentStatus } : u))
            } else {
                const data = await response.json()
                alert(data.error || '更新失败')
            }
        } catch (error) {
            console.error('Error toggling active status:', error)
            alert('操作出错')
        }
    }

    if (loading && !users.length) {
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
                        <h1 className="text-3xl font-bold text-white mb-2">用户管理</h1>
                        <p className="text-gray-400">
                            共 {pagination?.total || 0} 名用户
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
                            placeholder="搜索用户名称或邮箱..."
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

            {/* Users Table */}
            <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-800 border-b border-gray-700">
                            <tr>
                                <th
                                    className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase cursor-pointer hover:text-white"
                                    onClick={() => handleSort('name')}
                                >
                                    用户名 {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                                    邮箱
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                                    关联玩家
                                </th>
                                <th
                                    className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase cursor-pointer hover:text-white"
                                    onClick={() => handleSort('points')}
                                >
                                    积分 {sortBy === 'points' && (sortOrder === 'asc' ? '↑' : '↓')}
                                </th>
                                <th
                                    className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase cursor-pointer hover:text-white"
                                    onClick={() => handleSort('lastLogin')}
                                >
                                    最后登录 {sortBy === 'lastLogin' && (sortOrder === 'asc' ? '↑' : '↓')}
                                </th>
                                <th
                                    className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase cursor-pointer hover:text-white"
                                    onClick={() => handleSort('createdAt')}
                                >
                                    注册时间 {sortBy === 'createdAt' && (sortOrder === 'asc' ? '↑' : '↓')}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                                    管理员
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
                            {users.map((user) => (
                                <tr
                                    key={user.id}
                                    className="hover:bg-gray-800 transition-all"
                                >
                                    <td className="px-6 py-4 font-medium text-white">
                                        {user.name}
                                    </td>
                                    <td className="px-6 py-4 text-gray-400">
                                        {user.email || '-'}
                                    </td>
                                    <td className="px-6 py-4">
                                        {user.player ? (
                                            <div className="flex items-center gap-2">
                                                {user.player.characterSprite && (
                                                    <div className="w-6 h-6 relative bg-gray-800 rounded">
                                                        <Image
                                                            src={`/assets/characters/${user.player.characterSprite}.png`}
                                                            alt={user.player.characterSprite}
                                                            fill
                                                            className="pixelated object-contain"
                                                        />
                                                    </div>
                                                )}
                                                <span className="text-purple-400 text-sm">{user.player.playerName}</span>
                                            </div>
                                        ) : (
                                            <span className="text-gray-500 text-xs italic">未创建</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-yellow-500 font-bold">
                                        {user.points}
                                    </td>
                                    <td className="px-6 py-4 text-gray-400 text-sm">
                                        {user.lastLogin ? new Date(user.lastLogin).toLocaleString('zh-CN') : '从未登录'}
                                    </td>
                                    <td className="px-6 py-4 text-gray-400 text-sm">
                                        {new Date(user.createdAt).toLocaleDateString('zh-CN')}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div
                                                onClick={() => openAdminConfirm(user.id, user.isAdmin)}
                                                className={`relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none ring-offset-2 ring-purple-500 focus:ring-2 ${user.isAdmin ? 'bg-purple-600' : 'bg-gray-700'
                                                    }`}
                                            >
                                                <span
                                                    aria-hidden="true"
                                                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${user.isAdmin ? 'translate-x-5.5' : 'translate-x-1'
                                                        }`}
                                                />
                                            </div>
                                            {user.isAdmin && (
                                                <span className="text-xs text-purple-400 font-medium">💎 PRO</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => toggleIsActive(user.id, user.isActive)}
                                            className={`text-xs px-2 py-1 rounded transition-colors ${user.isActive
                                                ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
                                                : 'bg-red-600/20 text-red-400 hover:bg-red-600/30'
                                                }`}
                                        >
                                            {user.isActive ? '活跃' : '禁用'}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-4">
                                            <button
                                                onClick={() => confirmDelete(user.id)}
                                                className="text-red-400 hover:text-red-300 text-sm font-medium transition-colors"
                                            >
                                                删除
                                            </button>
                                        </div>
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
                            onClick={() => fetchUsers(pagination.page - 1)}
                            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            上一页
                        </button>
                        <span className="px-4 py-2 text-white">
                            {pagination.page} / {pagination.totalPages}
                        </span>
                        <button
                            disabled={pagination.page === pagination.totalPages}
                            onClick={() => fetchUsers(pagination.page + 1)}
                            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            下一页
                        </button>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
                        <h3 className="text-xl font-bold text-white mb-4">确认删除用户？</h3>
                        <p className="text-gray-400 mb-6">
                            此操作将永久删除该用户及其关联的玩家数据、帖子、积分等所有相关记录。此操作无法撤销。
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                                disabled={isDeleting}
                            >
                                取消
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all flex items-center gap-2"
                            >
                                {isDeleting ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                        删除中...
                                    </>
                                ) : '确认删除'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Admin Confirmation Modal */}
            {showAdminConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
                        <h3 className="text-xl font-bold text-white mb-4">
                            {targetAdminStatus ? '提升为管理员？' : '取消管理员权限？'}
                        </h3>
                        <p className="text-gray-400 mb-6">
                            {targetAdminStatus
                                ? '提升为管理员后，该用户将拥有系统的最高权限，包括管理其他用户和所有内容。请务必确认该操作的安全性。'
                                : '取消管理员权限后，该用户将变回普通用户，不再拥有管理权限。'}
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setShowAdminConfirm(false)}
                                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                                disabled={isAdminUpdating}
                            >
                                取消
                            </button>
                            <button
                                onClick={toggleIsAdmin}
                                disabled={isAdminUpdating}
                                className={`px-6 py-2 rounded-lg transition-all flex items-center gap-2 text-white ${targetAdminStatus ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-700 hover:bg-gray-600'
                                    }`}
                            >
                                {isAdminUpdating ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                        更新中...
                                    </>
                                ) : '确认执行'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

interface Character {
  id: string
  name: string
  displayName: string
  description: string | null
  imageUrl: string
  price: number
  isDefault: boolean
  isActive: boolean
  isCompactFormat: boolean
  sortOrder: number
  userCount: number
  purchaseCount: number
  createdAt: string
}

interface CharacterLog {
  id: string
  action: string
  changes: any
  createdAt: string
  adminId: string
  ipAddress?: string
}

interface Pagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export default function CharactersPage() {
  const router = useRouter()
  const [characters, setCharacters] = useState<Character[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<any>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [deleting, setDeleting] = useState(false)
  const [deleteResult, setDeleteResult] = useState<any>(null)
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null)
  const [characterLogs, setCharacterLogs] = useState<CharacterLog[]>([])
  const [editForm, setEditForm] = useState({
    displayName: '',
    price: 0,
    isDefault: false
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchCharacters()
  }, [])

  const fetchCharacters = async (page = 1, searchTerm = search) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: '20',
        ...(searchTerm && { search: searchTerm }),
      })

      const response = await fetch(`/api/admin/characters?${params}`)
      if (response.ok) {
        const data = await response.json()
        setCharacters(data.data)
        setPagination(data.pagination)
      } else {
        console.error('Failed to fetch characters')
      }
    } catch (error) {
      console.error('Error fetching characters:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    fetchCharacters(1, search)
  }

  const handleBatchImport = async () => {
    if (!confirm('确定要批量导入 /public/assets/characters 目录中的所有图片吗？\n\n已存在的角色将被跳过。')) {
      return
    }

    setImporting(true)
    setImportResult(null)

    try {
      const response = await fetch('/api/admin/characters/batch-import', {
        method: 'POST'
      })

      const data = await response.json()

      if (data.success) {
        setImportResult(data)
        // 刷新角色列表
        fetchCharacters()
      } else {
        alert(`批量导入失败: ${data.error}`)
      }
    } catch (error) {
      console.error('批量导入失败:', error)
      alert('批量导入失败，请重试')
    } finally {
      setImporting(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`确定要删除角色「${name}」吗？\n\n此操作不可恢复！`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/characters/${id}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        alert(data.message)
        fetchCharacters()
      } else {
        alert(`删除失败: ${data.error}`)
      }
    } catch (error) {
      console.error('删除失败:', error)
      alert('删除失败，请重试')
    }
  }

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) {
      alert('请先选择要删除的角色')
      return
    }

    if (!confirm(`确定要删除选中的 ${selectedIds.length} 个角色吗？\n\n此操作不可恢复！`)) {
      return
    }

    setDeleting(true)
    setDeleteResult(null)

    try {
      const response = await fetch('/api/admin/characters/batch-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ids: selectedIds })
      })

      const data = await response.json()

      if (data.success) {
        setDeleteResult(data)
        setSelectedIds([])
        fetchCharacters()
      } else {
        alert(`批量删除失败: ${data.error}`)
      }
    } catch (error) {
      console.error('批量删除失败:', error)
      alert('批量删除失败，请重试')
    } finally {
      setDeleting(false)
    }
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === characters.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(characters.map(c => c.id))
    }
  }

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(sid => sid !== id))
    } else {
      setSelectedIds([...selectedIds, id])
    }
  }

  const handleOpenEdit = async (character: Character) => {
    setEditingCharacter(character)
    setEditForm({
      displayName: character.displayName,
      price: character.price,
      isDefault: character.isDefault
    })

    // 获取角色详情和历史日志
    try {
      const response = await fetch(`/api/admin/characters/${character.id}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setCharacterLogs(data.data.logs || [])
        }
      }
    } catch (error) {
      console.error('获取角色详情失败:', error)
    }
  }

  const handleCloseEdit = () => {
    setEditingCharacter(null)
    setCharacterLogs([])
    setEditForm({
      displayName: '',
      price: 0,
      isDefault: false
    })
  }

  const handleSaveEdit = async () => {
    if (!editingCharacter) return

    setSaving(true)
    try {
      const response = await fetch(`/api/admin/characters/${editingCharacter.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editForm)
      })

      const data = await response.json()

      if (data.success) {
        alert(data.message)
        handleCloseEdit()
        fetchCharacters()
      } else {
        alert(`保存失败: ${data.error}`)
      }
    } catch (error) {
      console.error('保存失败:', error)
      alert('保存失败，请重试')
    } finally {
      setSaving(false)
    }
  }

  if (loading && !characters.length) {
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
            <h1 className="text-3xl font-bold text-white mb-2">角色形象管理</h1>
            <p className="text-gray-400">
              共 {pagination?.total || 0} 个角色形象
            </p>
          </div>
          <div className="flex gap-3">
            {selectedIds.length > 0 && (
              <button
                onClick={handleBatchDelete}
                disabled={deleting}
                className="px-6 py-3 bg-gradient-to-r from-red-600 to-pink-600 text-white font-semibold rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? '⏳ 删除中...' : `🗑️ 删除选中 (${selectedIds.length})`}
              </button>
            )}
            <button
              onClick={handleBatchImport}
              disabled={importing}
              className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-teal-600 text-white font-semibold rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {importing ? '⏳ 导入中...' : '📥 批量导入'}
            </button>
            <button
              onClick={() => router.push('/admin/characters/create')}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-lg hover:opacity-90 transition-all"
            >
              ➕ 创建新角色
            </button>
          </div>
        </div>

        {/* 批量选择工具栏 */}
        {characters.length > 0 && (
          <div className="mb-4 flex items-center gap-4 bg-gray-900 p-3 rounded-lg border border-gray-800">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedIds.length === characters.length && characters.length > 0}
                onChange={toggleSelectAll}
                className="w-5 h-5 rounded border-gray-600 text-purple-600 focus:ring-purple-500 focus:ring-offset-gray-900"
              />
              <span className="text-gray-300 text-sm">全选</span>
            </label>
            <span className="text-gray-500 text-sm">
              已选择 {selectedIds.length} 个角色
            </span>
            {selectedIds.length > 0 && (
              <button
                onClick={() => setSelectedIds([])}
                className="ml-auto text-gray-400 hover:text-white text-sm"
              >
                清空选择
              </button>
            )}
          </div>
        )}

        {/* 导入结果提示 */}
        {importResult && (
          <div className="mb-4 p-4 bg-gray-900 border border-gray-800 rounded-lg">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">批量导入完成</h3>
                <p className="text-gray-400 text-sm">{importResult.message}</p>
              </div>
              <button
                onClick={() => setImportResult(null)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-3">
              <div className="bg-gray-800 p-3 rounded-lg">
                <div className="text-gray-400 text-sm mb-1">总计</div>
                <div className="text-2xl font-bold text-white">{importResult.data.summary.total}</div>
              </div>
              <div className="bg-emerald-900/30 border border-emerald-800/50 p-3 rounded-lg">
                <div className="text-emerald-400 text-sm mb-1">成功导入</div>
                <div className="text-2xl font-bold text-emerald-400">{importResult.data.summary.imported}</div>
              </div>
              <div className="bg-yellow-900/30 border border-yellow-800/50 p-3 rounded-lg">
                <div className="text-yellow-400 text-sm mb-1">已跳过</div>
                <div className="text-2xl font-bold text-yellow-400">{importResult.data.summary.skipped}</div>
              </div>
              <div className="bg-red-900/30 border border-red-800/50 p-3 rounded-lg">
                <div className="text-red-400 text-sm mb-1">失败</div>
                <div className="text-2xl font-bold text-red-400">{importResult.data.summary.failed}</div>
              </div>
            </div>

            {/* 详细信息 */}
            {importResult.data.imported.length > 0 && (
              <details className="mb-2">
                <summary className="cursor-pointer text-emerald-400 hover:text-emerald-300 text-sm font-medium mb-2">
                  ✓ 成功导入 ({importResult.data.imported.length})
                </summary>
                <div className="bg-gray-800 p-3 rounded max-h-40 overflow-y-auto">
                  <ul className="text-sm text-gray-300 space-y-1">
                    {importResult.data.imported.map((file: string, idx: number) => (
                      <li key={idx}>• {file}</li>
                    ))}
                  </ul>
                </div>
              </details>
            )}

            {importResult.data.skipped.length > 0 && (
              <details className="mb-2">
                <summary className="cursor-pointer text-yellow-400 hover:text-yellow-300 text-sm font-medium mb-2">
                  ⊘ 已跳过 ({importResult.data.skipped.length})
                </summary>
                <div className="bg-gray-800 p-3 rounded max-h-40 overflow-y-auto">
                  <ul className="text-sm text-gray-300 space-y-1">
                    {importResult.data.skipped.map((file: string, idx: number) => (
                      <li key={idx}>• {file} <span className="text-gray-500">(已存在)</span></li>
                    ))}
                  </ul>
                </div>
              </details>
            )}

            {importResult.data.errors.length > 0 && (
              <details>
                <summary className="cursor-pointer text-red-400 hover:text-red-300 text-sm font-medium mb-2">
                  ✗ 失败 ({importResult.data.errors.length})
                </summary>
                <div className="bg-gray-800 p-3 rounded max-h-40 overflow-y-auto">
                  <ul className="text-sm text-gray-300 space-y-2">
                    {importResult.data.errors.map((error: any, idx: number) => (
                      <li key={idx}>
                        <span className="text-red-400">• {error.file}</span>
                        <div className="text-gray-500 ml-4">{error.error}</div>
                      </li>
                    ))}
                  </ul>
                </div>
              </details>
            )}
          </div>
        )}

        {/* 删除结果提示 */}
        {deleteResult && (
          <div className="mb-4 p-4 bg-gray-900 border border-gray-800 rounded-lg">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">批量删除完成</h3>
                <p className="text-gray-400 text-sm">{deleteResult.message}</p>
              </div>
              <button
                onClick={() => setDeleteResult(null)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-3">
              <div className="bg-emerald-900/30 border border-emerald-800/50 p-3 rounded-lg">
                <div className="text-emerald-400 text-sm mb-1">成功删除</div>
                <div className="text-2xl font-bold text-emerald-400">{deleteResult.data.summary.deleted}</div>
              </div>
              <div className="bg-yellow-900/30 border border-yellow-800/50 p-3 rounded-lg">
                <div className="text-yellow-400 text-sm mb-1">已跳过</div>
                <div className="text-2xl font-bold text-yellow-400">{deleteResult.data.summary.skipped}</div>
              </div>
              <div className="bg-red-900/30 border border-red-800/50 p-3 rounded-lg">
                <div className="text-red-400 text-sm mb-1">失败</div>
                <div className="text-2xl font-bold text-red-400">{deleteResult.data.summary.failed}</div>
              </div>
            </div>

            {deleteResult.data.deleted.length > 0 && (
              <details className="mb-2">
                <summary className="cursor-pointer text-emerald-400 hover:text-emerald-300 text-sm font-medium mb-2">
                  ✓ 成功删除 ({deleteResult.data.deleted.length})
                </summary>
                <div className="bg-gray-800 p-3 rounded max-h-40 overflow-y-auto">
                  <ul className="text-sm text-gray-300 space-y-1">
                    {deleteResult.data.deleted.map((name: string, idx: number) => (
                      <li key={idx}>• {name}</li>
                    ))}
                  </ul>
                </div>
              </details>
            )}

            {deleteResult.data.skipped.length > 0 && (
              <details className="mb-2">
                <summary className="cursor-pointer text-yellow-400 hover:text-yellow-300 text-sm font-medium mb-2">
                  ⊘ 已跳过 ({deleteResult.data.skipped.length})
                </summary>
                <div className="bg-gray-800 p-3 rounded max-h-40 overflow-y-auto">
                  <ul className="text-sm text-gray-300 space-y-1">
                    {deleteResult.data.skipped.map((item: any, idx: number) => (
                      <li key={idx}>• {item.name} <span className="text-gray-500">({item.reason})</span></li>
                    ))}
                  </ul>
                </div>
              </details>
            )}
          </div>
        )}

        {/* Search & Filters */}
        <div className="flex items-center gap-4 bg-gray-900 p-4 rounded-lg border border-gray-800">
          <div className="flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="搜索角色名称..."
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 outline-none"
            />
          </div>
          <button
            onClick={handleSearch}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all"
          >
            🔍 搜索
          </button>
          <div className="flex gap-2 border-l border-gray-700 pl-4">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-purple-600' : 'bg-gray-800 hover:bg-gray-700'} transition-all`}
            >
              📱
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-purple-600' : 'bg-gray-800 hover:bg-gray-700'} transition-all`}
            >
              📋
            </button>
          </div>
        </div>
      </div>

      {/* Characters Grid */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {characters.map((character) => (
            <div
              key={character.id}
              className={`bg-gray-900 rounded-lg border ${selectedIds.includes(character.id) ? 'border-purple-500 ring-2 ring-purple-500/50' : 'border-gray-800'} overflow-hidden hover:border-purple-500 transition-all relative`}
            >
              {/* 选择框 */}
              <div className="absolute top-3 left-3 z-10">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(character.id)}
                  onChange={(e) => {
                    e.stopPropagation()
                    toggleSelect(character.id)
                  }}
                  className="w-5 h-5 rounded border-gray-600 text-purple-600 focus:ring-purple-500 focus:ring-offset-gray-900 cursor-pointer"
                />
              </div>

              {/* Image */}
              <div
                className="aspect-square bg-gray-800 flex items-center justify-center p-4 relative cursor-pointer"
                onClick={() => handleOpenEdit(character)}
              >
                <Image
                  src={character.imageUrl}
                  alt={character.displayName}
                  width={192}
                  height={character.isCompactFormat ? 96 : 192}
                  className="object-contain pixelated"
                />
                {character.isDefault && (
                  <div className="absolute top-2 right-2 bg-yellow-500 text-black text-xs px-2 py-1 rounded">
                    默认
                  </div>
                )}
                {!character.isActive && (
                  <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
                    禁用
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-4">
                <h3 className="text-white font-semibold mb-1">
                  {character.displayName}
                </h3>
                <p className="text-gray-400 text-sm mb-2">
                  {character.name}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className="text-xs px-2 py-1 bg-purple-600/20 text-purple-400 rounded">
                    {character.isCompactFormat ? '紧凑格式' : '标准格式'}
                  </span>
                  <span className="text-xs px-2 py-1 bg-blue-600/20 text-blue-400 rounded">
                    {character.price === 0 ? '免费' : `${character.price} 积分`}
                  </span>
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between text-sm text-gray-400 mb-3">
                  <span>👥 {character.userCount} 人使用</span>
                  {character.purchaseCount > 0 && (
                    <span>🛒 {character.purchaseCount} 次购买</span>
                  )}
                </div>

                {/* 删除按钮 */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(character.id, character.displayName)
                  }}
                  className="w-full px-3 py-2 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-600/50 rounded transition-all text-sm font-medium"
                >
                  🗑️ 删除
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-800 border-b border-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                  预览
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                  名称
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                  标识
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                  格式
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                  价格
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                  使用人数
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                  状态
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {characters.map((character) => (
                <tr
                  key={character.id}
                  className="hover:bg-gray-800 cursor-pointer transition-all"
                  onClick={() => handleOpenEdit(character)}
                >
                  <td className="px-6 py-4">
                    <Image
                      src={character.imageUrl}
                      alt={character.displayName}
                      width={48}
                      height={character.isCompactFormat ? 24 : 48}
                      className="pixelated"
                    />
                  </td>
                  <td className="px-6 py-4 text-white">{character.displayName}</td>
                  <td className="px-6 py-4 text-gray-400 font-mono text-sm">
                    {character.name}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs px-2 py-1 bg-purple-600/20 text-purple-400 rounded">
                      {character.isCompactFormat ? '紧凑' : '标准'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-400">
                    {character.price === 0 ? '免费' : `${character.price} 积分`}
                  </td>
                  <td className="px-6 py-4 text-gray-400">
                    {character.userCount}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        character.isActive
                          ? 'bg-green-600/20 text-green-400'
                          : 'bg-red-600/20 text-red-400'
                      }`}
                    >
                      {character.isActive ? '启用' : '禁用'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
              onClick={() => fetchCharacters(pagination.page - 1)}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              上一页
            </button>
            <span className="px-4 py-2 text-white">
              {pagination.page} / {pagination.totalPages}
            </span>
            <button
              disabled={pagination.page === pagination.totalPages}
              onClick={() => fetchCharacters(pagination.page + 1)}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              下一页
            </button>
          </div>
        </div>
      )}

      {/* 编辑弹窗 */}
      {editingCharacter && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl border border-gray-800 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-800 sticky top-0 bg-gray-900 z-10">
              <h2 className="text-2xl font-bold text-white">编辑角色形象</h2>
              <button
                onClick={handleCloseEdit}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="p-6">
              {/* 大图预览 */}
              <div className="mb-6 bg-gray-800 rounded-lg p-8 flex items-center justify-center">
                <Image
                  src={editingCharacter.imageUrl}
                  alt={editingCharacter.displayName}
                  width={384}
                  height={editingCharacter.isCompactFormat ? 192 : 384}
                  className="object-contain pixelated"
                />
              </div>

              {/* 基本信息 */}
              <div className="mb-6 grid grid-cols-2 gap-4 p-4 bg-gray-800 rounded-lg">
                <div>
                  <span className="text-gray-400 text-sm">Key (数据库标识)</span>
                  <p className="text-white font-mono">{editingCharacter.name}</p>
                </div>
                <div>
                  <span className="text-gray-400 text-sm">格式</span>
                  <p className="text-white">
                    {editingCharacter.isCompactFormat ? '紧凑格式 (2行4列)' : '标准格式 (4行2列)'}
                  </p>
                </div>
                <div>
                  <span className="text-gray-400 text-sm">使用人数</span>
                  <p className="text-white">{editingCharacter.userCount} 人</p>
                </div>
                <div>
                  <span className="text-gray-400 text-sm">购买次数</span>
                  <p className="text-white">{editingCharacter.purchaseCount} 次</p>
                </div>
              </div>

              {/* 编辑表单 */}
              <div className="mb-6 space-y-4">
                <div>
                  <label className="block text-gray-300 mb-2">
                    显示名称（别名）<span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={editForm.displayName}
                    onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 outline-none"
                    placeholder="例如：寒黎"
                  />
                  <p className="text-gray-500 text-sm mt-1">
                    这是用户在前端看到的名称，key ({editingCharacter.name}) 仅作为数据库映射使用
                  </p>
                </div>

                <div>
                  <label className="block text-gray-300 mb-2">
                    价格（积分）<span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.price}
                    onChange={(e) => setEditForm({ ...editForm, price: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 outline-none"
                  />
                  <p className="text-gray-500 text-sm mt-1">
                    设置为 0 表示免费角色
                  </p>
                </div>

                <div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.isDefault}
                      onChange={(e) => setEditForm({ ...editForm, isDefault: e.target.checked })}
                      className="w-5 h-5 rounded border-gray-600 text-purple-600 focus:ring-purple-500 focus:ring-offset-gray-900"
                    />
                    <div>
                      <span className="text-gray-300">设为免费默认角色</span>
                      <p className="text-gray-500 text-sm">
                        免费角色无需购买，所有用户都可以使用
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* 历史修改记录 */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-3">📋 历史修改记录</h3>
                {characterLogs.length === 0 ? (
                  <div className="bg-gray-800 rounded-lg p-4 text-center text-gray-500">
                    暂无修改记录
                  </div>
                ) : (
                  <div className="bg-gray-800 rounded-lg overflow-hidden">
                    <div className="max-h-80 overflow-y-auto">
                      {characterLogs.map((log) => (
                        <div
                          key={log.id}
                          className="p-4 border-b border-gray-700 last:border-b-0"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-purple-400 text-sm font-medium">
                              {log.action === 'UPDATE' ? '✏️ 更新' : log.action}
                            </span>
                            <span className="text-gray-500 text-xs">
                              {new Date(log.createdAt).toLocaleString('zh-CN')}
                            </span>
                          </div>
                          <div className="space-y-2">
                            {Object.entries(log.changes).map(([field, change]: [string, any]) => (
                              <div key={field} className="text-sm">
                                <span className="text-gray-400">
                                  {field === 'displayName' ? '显示名称' :
                                   field === 'price' ? '价格' :
                                   field === 'isDefault' ? '免费默认' : field}:
                                </span>
                                <span className="text-red-400 ml-2 line-through">
                                  {String(change.from)}
                                </span>
                                <span className="text-gray-500 mx-2">→</span>
                                <span className="text-green-400">
                                  {String(change.to)}
                                </span>
                              </div>
                            ))}
                          </div>
                          {log.ipAddress && (
                            <div className="text-gray-600 text-xs mt-2">
                              IP: {log.ipAddress}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 操作按钮 */}
              <div className="flex gap-3">
                <button
                  onClick={handleSaveEdit}
                  disabled={saving}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? '⏳ 保存中...' : '💾 保存修改'}
                </button>
                <button
                  onClick={handleCloseEdit}
                  disabled={saving}
                  className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

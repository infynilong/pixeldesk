'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Post {
  id: string
  title: string | null
  content: string
  type: string
  authorId: string
  createdAt: string
  updatedAt: string
  moderationStatus: string
  isActive: boolean
  aiReviewResult: string | null
  aiReviewedAt: string | null
  reviewNotes: string | null
  users: {
    id: string
    name: string
    email: string
  }
}

export default function PostsManagementPage() {
  const router = useRouter()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [filters, setFilters] = useState({
    status: '',
    isActive: '',
    type: '',
    search: ''
  })
  const [reviewingId, setReviewingId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)

  useEffect(() => {
    fetchPosts()
  }, [page, filters])

  const fetchPosts = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(filters.status && { status: filters.status }),
        ...(filters.isActive && { isActive: filters.isActive }),
        ...(filters.type && { type: filters.type }),
        ...(filters.search && { search: filters.search })
      })

      const response = await fetch(`/api/admin/posts?${params}`)
      const result = await response.json()

      if (result.success) {
        setPosts(result.data.posts)
        setTotal(result.data.pagination.total)
        setTotalPages(result.data.pagination.totalPages)
      }
    } catch (error) {
      console.error('Error fetching posts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAIReview = async (postId: string) => {
    try {
      setReviewingId(postId)
      const response = await fetch(`/api/admin/posts/${postId}/ai-review`, {
        method: 'POST'
      })
      const result = await response.json()

      if (result.success) {
        alert('AI 审查完成！')
        fetchPosts()
      } else {
        alert('AI 审查失败：' + result.error)
      }
    } catch (error) {
      console.error('Error in AI review:', error)
      alert('AI 审查失败')
    } finally {
      setReviewingId(null)
    }
  }

  const handleToggleActive = async (postId: string, currentStatus: boolean) => {
    const action = currentStatus ? '禁用' : '启用'
    if (!confirm(`确定要${action}这篇文章吗？`)) return

    try {
      setTogglingId(postId)
      const response = await fetch(`/api/admin/posts/${postId}/toggle-active`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isActive: !currentStatus,
          reviewNotes: `管理员${action}`,
          reviewedBy: 'admin' // TODO: 从会话中获取真实管理员ID
        })
      })
      const result = await response.json()

      if (result.success) {
        alert(`${action}成功！`)
        fetchPosts()
      } else {
        alert(`${action}失败：` + result.error)
      }
    } catch (error) {
      console.error('Error toggling post:', error)
      alert(`${action}失败`)
    } finally {
      setTogglingId(null)
    }
  }

  const handleApprove = async (postId: string) => {
    if (!confirm('确定要审核通过这篇文章吗？')) return

    try {
      setApprovingId(postId)
      const response = await fetch(`/api/admin/posts/${postId}/update-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moderationStatus: 'approved',
          reviewNotes: '管理员审核通过',
          reviewedBy: 'admin' // TODO: 从会话中获取真实管理员ID
        })
      })
      const result = await response.json()

      if (result.success) {
        alert('审核通过成功！')
        fetchPosts()
      } else {
        alert('审核失败：' + result.error)
      }
    } catch (error) {
      console.error('Error approving post:', error)
      alert('审核失败')
    } finally {
      setApprovingId(null)
    }
  }

  const handleReject = async (postId: string) => {
    const reason = prompt('请输入拒绝原因（可选）：')
    if (reason === null) return // 用户取消

    try {
      setRejectingId(postId)
      const response = await fetch(`/api/admin/posts/${postId}/update-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moderationStatus: 'rejected',
          reviewNotes: reason || '管理员审核拒绝',
          reviewedBy: 'admin' // TODO: 从会话中获取真实管理员ID
        })
      })
      const result = await response.json()

      if (result.success) {
        alert('审核拒绝成功！')
        fetchPosts()
      } else {
        alert('操作失败：' + result.error)
      }
    } catch (error) {
      console.error('Error rejecting post:', error)
      alert('操作失败')
    } finally {
      setRejectingId(null)
    }
  }

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      pending: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: '待审核' },
      approved: { bg: 'bg-green-500/20', text: 'text-green-400', label: '已通过' },
      rejected: { bg: 'bg-red-500/20', text: 'text-red-400', label: '已拒绝' },
      flagged: { bg: 'bg-orange-500/20', text: 'text-orange-400', label: '已标记' }
    }
    const badge = badges[status] || badges.pending
    return (
      <span className={`px-2 py-1 rounded text-xs ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    )
  }

  const parseAIResult = (result: string | null) => {
    if (!result) return null
    try {
      return JSON.parse(result)
    } catch {
      return null
    }
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">内容管理</h1>
          <p className="text-gray-400">管理所有用户发布的 Posts 和 Blogs</p>
        </div>
      </div>

      {/* 筛选器 */}
      <div className="bg-gray-900 rounded-lg p-4 mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-2">审核状态</label>
          <select
            value={filters.status}
            onChange={(e) => {
              setFilters({ ...filters, status: e.target.value })
              setPage(1)
            }}
            className="w-full bg-gray-800 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">全部</option>
            <option value="pending">待审核</option>
            <option value="approved">已通过</option>
            <option value="rejected">已拒绝</option>
            <option value="flagged">已标记</option>
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-2">启用状态</label>
          <select
            value={filters.isActive}
            onChange={(e) => {
              setFilters({ ...filters, isActive: e.target.value })
              setPage(1)
            }}
            className="w-full bg-gray-800 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">全部</option>
            <option value="true">已启用</option>
            <option value="false">已禁用</option>
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-2">类型</label>
          <select
            value={filters.type}
            onChange={(e) => {
              setFilters({ ...filters, type: e.target.value })
              setPage(1)
            }}
            className="w-full bg-gray-800 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">全部</option>
            <option value="TEXT">普通帖子</option>
            <option value="MARKDOWN">Markdown博客</option>
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-2">搜索</label>
          <input
            type="text"
            placeholder="搜索标题或内容..."
            value={filters.search}
            onChange={(e) => {
              setFilters({ ...filters, search: e.target.value })
              setPage(1)
            }}
            className="w-full bg-gray-800 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* Posts 列表 */}
      <div className="bg-gray-900 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">加载中...</div>
        ) : posts.length === 0 ? (
          <div className="p-8 text-center text-gray-400">暂无数据</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800 border-b border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">标题</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">作者</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">类型</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">审核状态</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">启用状态</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">AI审查</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">创建时间</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-300">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {posts.map((post) => {
                  const aiResult = parseAIResult(post.aiReviewResult)
                  return (
                    <tr key={post.id} className="hover:bg-gray-800/50">
                      <td className="px-4 py-3">
                        <div className="max-w-xs">
                          <div className="text-white font-medium truncate">
                            {post.title || '无标题'}
                          </div>
                          <div className="text-sm text-gray-400 truncate mt-1">
                            {post.content.substring(0, 50)}...
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-300">{post.users.name}</div>
                        <div className="text-xs text-gray-500">{post.users.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-300">
                          {post.type === 'TEXT' ? '帖子' : '博客'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(post.moderationStatus)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs ${post.isActive
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-gray-500/20 text-gray-400'
                          }`}>
                          {post.isActive ? '已启用' : '已禁用'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {aiResult ? (
                          <div className="text-xs">
                            <div className={`font-medium ${aiResult.status === 'safe' ? 'text-green-400' :
                              aiResult.status === 'violation' ? 'text-red-400' : 'text-yellow-400'
                              }`}>
                              {aiResult.status === 'safe' ? '✓ 安全' :
                                aiResult.status === 'violation' ? '✗ 违规' : '⚠ 警告'}
                            </div>
                            {aiResult.issues?.length > 0 && (
                              <div className="text-gray-500 mt-1">
                                {aiResult.issues.join(', ')}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500">未审查</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-400">
                          {new Date(post.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleAIReview(post.id)}
                            disabled={reviewingId === post.id}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white rounded text-sm transition-colors"
                          >
                            {reviewingId === post.id ? '审查中...' : 'AI审查'}
                          </button>

                          {/* 手动审核按钮 - 仅对待审核的帖子显示 */}
                          {post.moderationStatus === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApprove(post.id)}
                                disabled={approvingId === post.id}
                                className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded text-sm transition-colors"
                              >
                                {approvingId === post.id ? '处理中...' : '审核通过'}
                              </button>
                              <button
                                onClick={() => handleReject(post.id)}
                                disabled={rejectingId === post.id}
                                className="px-3 py-1 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded text-sm transition-colors"
                              >
                                {rejectingId === post.id ? '处理中...' : '审核拒绝'}
                              </button>
                            </>
                          )}

                          <button
                            onClick={() => handleToggleActive(post.id, post.isActive)}
                            disabled={togglingId === post.id}
                            className={`px-3 py-1 ${post.isActive
                              ? 'bg-red-600 hover:bg-red-700'
                              : 'bg-green-600 hover:bg-green-700'
                              } disabled:opacity-50 disabled:cursor-not-allowed text-white rounded text-sm transition-colors`}
                          >
                            {togglingId === post.id ? '处理中...' : (post.isActive ? '禁用' : '启用')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="px-4 py-4 border-t border-gray-800 flex items-center justify-between">
            <div className="text-sm text-gray-400">
              共 {total} 条记录，第 {page}/{totalPages} 页
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded transition-colors"
              >
                上一页
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded transition-colors"
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

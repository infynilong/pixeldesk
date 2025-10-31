'use client'

import { SocialUser } from '@/types/social'
import UserAvatar from '@/components/UserAvatar'

interface BlogUserProfileProps {
  user: SocialUser
  stats: {
    total: number
    published: number
    draft: number
  }
}

export default function BlogUserProfile({ user, stats }: BlogUserProfileProps) {
  return (
    <div className="p-6 space-y-4">
      {/* 用户信息 */}
      <div className="flex items-center gap-4">
        <UserAvatar
          userId={user.id}
          userName={user.name}
          userAvatar={user.avatar}
          size="lg"
          showStatus={false}
        />
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-white truncate">{user.name}</h2>
          <p className="text-sm text-gray-400 font-mono">@{user.id.slice(0, 8)}</p>
        </div>
      </div>

      {/* 统计信息 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-800/50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-white">{stats.total}</div>
          <div className="text-xs text-gray-400 mt-1">总计</div>
        </div>
        <div className="bg-emerald-500/10 rounded-lg p-3 text-center border border-emerald-500/20">
          <div className="text-2xl font-bold text-emerald-400">{stats.published}</div>
          <div className="text-xs text-gray-400 mt-1">已发布</div>
        </div>
        <div className="bg-amber-500/10 rounded-lg p-3 text-center border border-amber-500/20">
          <div className="text-2xl font-bold text-amber-400">{stats.draft}</div>
          <div className="text-xs text-gray-400 mt-1">草稿</div>
        </div>
      </div>

      {/* 积分信息 */}
      {user.points !== undefined && (
        <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-lg border border-purple-500/20">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="text-sm text-gray-300">积分</span>
          </div>
          <span className="text-lg font-bold text-purple-400">{user.points}</span>
        </div>
      )}
    </div>
  )
}

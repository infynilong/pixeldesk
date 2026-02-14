'use client'

import { useUser } from '@/contexts/UserContext'

interface CurrentUser {
  id: string
  name: string
  username?: string
  email?: string
  avatar?: string
  points?: number
  workstationId?: string | null
}

export function useCurrentUser() {
  const { user, isLoading, refreshUser } = useUser()

  const currentUser: CurrentUser | null = user
    ? {
        id: user.id,
        name: user.name,
        username: user.name,
        email: user.email,
        avatar: user.avatar,
        points: user.points,
        workstationId: user.workstationId,
      }
    : null

  return {
    currentUser,
    userId: user?.id || null,
    isLoading,
    error: null as string | null,
    isAuthenticated: !!user,
    updateUser: (_userData: Partial<CurrentUser>) => {
      // 刷新 UserContext 从服务器获取最新数据
      refreshUser(true)
    },
  }
}

// 简化的 hook，只返回用户ID
export function useCurrentUserId(): string | null {
  const { user } = useUser()
  return user?.id || null
}

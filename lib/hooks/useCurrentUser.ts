'use client'

import { useState, useEffect } from 'react'

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
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadCurrentUser = () => {
      try {
        setIsLoading(true)
        setError(null)
        
        // 从 localStorage 获取用户数据
        const userData = localStorage.getItem('pixelDeskUser')
        if (userData) {
          const user = JSON.parse(userData)
          console.log('✅ [useCurrentUser] 成功加载用户数据:', { 
            id: user.id, 
            name: user.name,
            username: user.username 
          })
          setCurrentUser(user)
        } else {
          console.warn('⚠️ [useCurrentUser] localStorage 中未找到用户数据')
          setError('未找到用户数据，请重新登录')
        }
      } catch (error) {
        console.error('❌ [useCurrentUser] 加载用户数据失败:', error)
        setError('加载用户数据失败')
        setCurrentUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    // 初始加载
    loadCurrentUser()

    // 监听 storage 变化（多标签页同步）
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'pixelDeskUser') {
        loadCurrentUser()
      }
    }

    window.addEventListener('storage', handleStorageChange)
    
    // 监听自定义用户更新事件
    const handleUserUpdate = (event: CustomEvent) => {
      const updatedUser = event.detail
      console.log('🔄 [useCurrentUser] 用户数据已更新:', updatedUser)
      setCurrentUser(updatedUser)
    }

    window.addEventListener('user-data-updated', handleUserUpdate as EventListener)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('user-data-updated', handleUserUpdate as EventListener)
    }
  }, [])

  return {
    currentUser,
    userId: currentUser?.id || null,
    isLoading,
    error,
    // 辅助方法
    isAuthenticated: !!currentUser?.id,
    updateUser: (userData: Partial<CurrentUser>) => {
      if (currentUser) {
        const updatedUser = { ...currentUser, ...userData }
        setCurrentUser(updatedUser)
        
        // 更新 localStorage
        try {
          localStorage.setItem('pixelDeskUser', JSON.stringify(updatedUser))
          // 触发更新事件
          window.dispatchEvent(new CustomEvent('user-data-updated', { detail: updatedUser }))
        } catch (error) {
          console.error('Failed to update user data:', error)
        }
      }
    }
  }
}

// 简化的 hook，只返回用户ID
export function useCurrentUserId(): string | null {
  const { userId } = useCurrentUser()
  return userId
}
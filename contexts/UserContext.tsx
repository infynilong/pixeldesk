'use client'

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react'
import { initializePlayerSync, clearPlayerFromLocalStorage } from '@/lib/playerSync'
import { migrateTempPlayerToUser, clearTempPlayer } from '@/lib/tempPlayerManager'

export interface User {
  id: string
  name: string
  email: string
  avatar?: string
  points?: number
  emailVerified?: boolean
  workstationId?: string
  inviteCode?: string
}

interface UserContextType {
  user: User | null
  isLoading: boolean
  playerExists: boolean | null
  login: (email: string, password: string) => Promise<boolean>
  register: (name: string, email: string, password: string, inviteCode?: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  refreshUser: (silent?: boolean) => Promise<void>
  setPlayerExists: (exists: boolean) => void
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [playerExists, setPlayerExists] = useState<boolean | null>(null)
  const authCheckedRef = useRef(false)
  const isCheckingRef = useRef(false)

  const checkAuth = async (silent = false) => {
    if (isCheckingRef.current) return
    isCheckingRef.current = true

    if (!silent) setIsLoading(true)
    try {
      if (!silent) console.log('🌐 [UserContext] 正在验证身份...')
      const response = await fetch('/api/auth/settings', {
        method: 'GET',
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          if (!silent) console.log('✅ [UserContext] 身份验证成功:', data.data.name)

          // 批量更新状态以减少重新渲染
          setUser(data.data)
          if (!silent) setIsLoading(false)

          // 登录成功后初始化玩家同步
          const playerSyncResult = await initializePlayerSync()
          setPlayerExists(playerSyncResult.hasPlayer)
        } else {
          setUser(null)
          if (!silent) setIsLoading(false)
        }
      } else {
        setUser(null)
        if (!silent) setIsLoading(false)
      }
    } catch (error) {
      console.error('❌ [UserContext] 身份验证请求失败:', error)
      setUser(null)
      if (!silent) setIsLoading(false)
    } finally {
      isCheckingRef.current = false
    }
  }

  useEffect(() => {
    if (authCheckedRef.current) return
    authCheckedRef.current = true
    checkAuth()
  }, [])

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()
      if (response.ok && data.success) {
        setUser(data.data)
        const playerSyncResult = await initializePlayerSync()
        setPlayerExists(playerSyncResult.hasPlayer)

        // 触发 Phaser 刷新
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('user-login-success', {
            detail: {
              userId: data.data.id,
              characterSprite: playerSyncResult.playerData?.character,
              needsRefresh: true
            }
          }))
        }
        return true
      }
      return false
    } catch (error) {
      console.error('Login error:', error)
      return false
    }
  }

  const register = async (name: string, email: string, password: string, inviteCode?: string) => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, inviteCode }),
      })

      const data = await response.json()
      if (response.ok && data.success) {
        setUser(data.data)
        await initializePlayerSync()
        setPlayerExists(false) // 新注册用户通常没有玩家
        return { success: true }
      }
      return { success: false, error: data.error || 'Registration failed' }
    } catch (error) {
      return { success: false, error: 'Network error' }
    }
  }

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } finally {
      setUser(null)
      setPlayerExists(null)
      await clearPlayerFromLocalStorage()
      clearTempPlayer()
      window.location.reload() // 退出时刷新页面最保险
    }
  }

  return (
    <UserContext.Provider value={{
      user,
      isLoading,
      playerExists,
      login,
      register,
      logout,
      refreshUser: checkAuth,
      setPlayerExists
    }}>
      {children}
    </UserContext.Provider>
  )
}

export const useUser = () => {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}
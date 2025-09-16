'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { initializePlayerSync, clearPlayerFromLocalStorage } from '@/lib/playerSync'
import { migrateTempPlayerToUser, clearTempPlayer } from '@/lib/tempPlayerManager'

interface User {
  id: string
  name: string
  email: string
  avatar?: string
  points?: number
  gold?: number
  emailVerified?: boolean
}

interface UserContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<boolean>
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Get user info from cookie-based session
        const response = await fetch('/api/auth/settings', {
          method: 'GET',
          credentials: 'include', // Include cookies
        })
        
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.data) {
            setUser(data.data)
            // Initialize player sync for authenticated user
            await initializePlayerSync()
          }
        } else {
          // Don't log error for expected auth failures
          if (response.status !== 401 && response.status !== 404) {
            console.warn('Auth verification failed:', response.status)
          }
        }
      } catch (error) {
        // Silently handle auth errors to avoid noise
        console.warn('Auth check failed:', error)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [])

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies
        body: JSON.stringify({ email, password }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          setUser(data.data)
          // Initialize player sync after successful login
          await initializePlayerSync()
          return true
        }
      }
      return false
    } catch (error) {
      console.error('Login failed:', error)
      return false
    }
  }

  const register = async (name: string, email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies
        body: JSON.stringify({ name, email, password }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        // Registration successful, user is automatically logged in
        setUser(data.data)
        
        // 处理临时玩家迁移
        const migrationResult = migrateTempPlayerToUser(data.data.id)
        if (migrationResult.migrationSuccess) {
          console.log('✅ 临时玩家数据已成功迁移到正式用户')
        }
        
        // Clear any existing player data from localStorage for new user
        clearPlayerFromLocalStorage()
        clearTempPlayer() // 清理临时玩家数据
        
        return { success: true }
      } else {
        return { success: false, error: data.error || 'Registration failed' }
      }
    } catch (error) {
      console.error('Registration failed:', error)
      return { success: false, error: 'Network error occurred' }
    }
  }

  const logout = async () => {
    try {
      // Call logout API to invalidate session
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include', // Include cookies
      })
    } catch (error) {
      console.error('Logout API call failed:', error)
    } finally {
      // Always clear user state and player data regardless of API success
      setUser(null)
      await clearPlayerFromLocalStorage()
    }
  }

  const refreshUser = async () => {
    try {
      const response = await fetch('/api/auth/settings', {
        method: 'GET',
        credentials: 'include', // Include cookies
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          setUser(data.data)
        }
      }
    } catch (error) {
      console.error('Failed to refresh user:', error)
    }
  }

  return (
    <UserContext.Provider value={{
      user,
      isLoading,
      login,
      register,
      logout,
      refreshUser
    }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}
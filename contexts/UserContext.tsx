'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface User {
  id: string
  name: string
  email: string
  avatar?: string
}

interface UserContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
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
        const token = localStorage.getItem('authToken')
        if (token) {
          // Verify token and get user info
          const response = await fetch('/api/auth/me', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })
          
          if (response.ok) {
            const userData = await response.json()
            setUser(userData)
          } else {
            localStorage.removeItem('authToken')
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error)
        localStorage.removeItem('authToken')
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
        body: JSON.stringify({ email, password }),
      })

      if (response.ok) {
        const data = await response.json()
        localStorage.setItem('authToken', data.token)
        setUser(data.user)
        return true
      }
      return false
    } catch (error) {
      console.error('Login failed:', error)
      return false
    }
  }

  const logout = () => {
    localStorage.removeItem('authToken')
    setUser(null)
  }

  const refreshUser = async () => {
    try {
      const token = localStorage.getItem('authToken')
      if (token) {
        const response = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        if (response.ok) {
          const userData = await response.json()
          setUser(userData)
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
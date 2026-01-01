'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'

const menuItems = [
  {
    title: '概览',
    icon: '📊',
    href: '/admin',
  },
  {
    title: '玩家管理',
    icon: '👥',
    href: '/admin/players',
  },
  {
    title: '用户管理',
    icon: '👤',
    href: '/admin/users',
  },
  {
    title: '角色形象',
    icon: '🎭',
    href: '/admin/characters',
  },
  {
    title: '工位管理',
    icon: '💼',
    href: '/admin/workstations',
  },
  {
    title: '系统设置',
    icon: '⚙️',
    href: '/admin/settings',
  },
  {
    title: 'AI NPC',
    icon: '🤖',
    href: '/admin/ai',
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    if (isLoggingOut) return
    setIsLoggingOut(true)

    try {
      await fetch('/api/admin/auth/logout', { method: 'POST' })
      router.push('/admin/login')
    } catch (error) {
      console.error('Logout error:', error)
      setIsLoggingOut(false)
    }
  }

  return (
    <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col h-screen">
      {/* Logo */}
      <div className="p-6 border-b border-gray-800">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <span>🎮</span>
          <span>PixelDesk</span>
        </h1>
        <p className="text-sm text-gray-400 mt-1">管理后台</p>
      </div>

      {/* Menu */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${isActive
                ? 'bg-purple-600 text-white'
                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="font-medium">{item.title}</span>
            </Link>
          )
        })}
      </nav>

      {/* User Info & Logout */}
      <div className="p-4 border-t border-gray-800">
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-red-600/20 hover:text-red-400 transition-all disabled:opacity-50"
        >
          <span className="text-xl">🚪</span>
          <span className="font-medium">
            {isLoggingOut ? '退出中...' : '退出登录'}
          </span>
        </button>
      </div>
    </div>
  )
}

'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'

interface SubMenuItem {
  title: string
  icon: string
  href: string
}

interface MenuItem {
  title: string
  icon: string
  href: string
  subItems?: SubMenuItem[]
}

const menuItems: MenuItem[] = [
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
    title: '内容管理',
    icon: '📝',
    href: '/admin/posts',
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
    subItems: [
      {
        title: '品牌配置',
        icon: '🎨',
        href: '/admin/settings/brand',
      },
      {
        title: '关于页面',
        icon: 'ℹ️',
        href: '/admin/settings/about',
      },
    ],
  },
  {
    title: 'AI NPC',
    icon: '🤖',
    href: '/admin/ai',
  },
  {
    title: '图书馆管理',
    icon: '📚',
    href: '/admin/library',
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [expandedItems, setExpandedItems] = useState<string[]>(['/admin/settings'])

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
          const isExpanded = expandedItems.includes(item.href)
          const hasSubItems = item.subItems && item.subItems.length > 0

          return (
            <div key={item.href}>
              <div
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all cursor-pointer ${isActive
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                onClick={() => {
                  if (hasSubItems) {
                    setExpandedItems(prev =>
                      prev.includes(item.href)
                        ? prev.filter(i => i !== item.href)
                        : [...prev, item.href]
                    )
                  } else {
                    router.push(item.href)
                  }
                }}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="font-medium flex-1">{item.title}</span>
                {hasSubItems && (
                  <span className="text-sm">
                    {isExpanded ? '▼' : '▶'}
                  </span>
                )}
              </div>

              {/* Sub Items */}
              {hasSubItems && isExpanded && (
                <div className="ml-6 mt-1 space-y-1">
                  {item.subItems?.map((subItem) => {
                    const isSubActive = pathname === subItem.href

                    return (
                      <Link
                        key={subItem.href}
                        href={subItem.href}
                        className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all text-sm ${isSubActive
                          ? 'bg-purple-500 text-white'
                          : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                          }`}
                      >
                        <span>{subItem.icon}</span>
                        <span>{subItem.title}</span>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
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

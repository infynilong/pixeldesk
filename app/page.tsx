'use client'

import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'

// 动态导入 Phaser 游戏组件，避免 SSR 问题
const PhaserGame = dynamic(() => import('@/components/PhaserGame'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full bg-gray-900">加载游戏中...</div>
})

// 动态信息组件
const SocialFeed = dynamic(() => import('@/components/SocialFeed'), {
  ssr: false
})

// 发布动态组件
const PostStatus = dynamic(() => import('@/components/PostStatus'), {
  ssr: false
})

export default function Home() {
  const [isMobile, setIsMobile] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [myStatus, setMyStatus] = useState('')
  
  // 检测移动设备
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // 处理玩家碰撞事件
  const handlePlayerCollision = (playerData) => {
    setSelectedPlayer(playerData)
  }

  // 处理状态更新
  const handleStatusUpdate = (newStatus) => {
    setMyStatus(newStatus)
    // 这里可以发送到服务器或广播给其他玩家
  }

  // 移动端布局
  if (isMobile) {
    return (
      <div className="flex flex-col h-screen bg-gray-900">
        {/* 游戏区域 */}
        <div className="flex-1 relative">
          <PhaserGame onPlayerCollision={handlePlayerCollision} />
        </div>
        
        {/* 底部信息栏 */}
        <div className="h-64 bg-white border-t border-gray-200 overflow-hidden">
          {selectedPlayer ? (
            <SocialFeed player={selectedPlayer} />
          ) : (
            <PostStatus onStatusUpdate={handleStatusUpdate} currentStatus={myStatus} />
          )}
        </div>
      </div>
    )
  }

  // 桌面端左右布局
  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* 左侧 Next.js 页面区域 - 现代化设计 */}
      <div className="w-96 bg-black/20 backdrop-blur-lg border-r border-white/10 flex flex-col">
        {/* 顶部标题栏 */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">P</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">PixelDesk</h1>
              <p className="text-xs text-gray-400">社交办公空间</p>
            </div>
          </div>
        </div>
        
        {/* 个人状态区域 */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">我的状态</h2>
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          </div>
          <PostStatus onStatusUpdate={handleStatusUpdate} currentStatus={myStatus} />
        </div>
        
        {/* 社交动态区域 */}
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <h2 className="text-lg font-semibold text-white">社交动态</h2>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
              <span className="text-xs text-gray-400">实时</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {selectedPlayer ? (
              <SocialFeed player={selectedPlayer} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-white font-medium mb-2">探索社交空间</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  在游戏中靠近其他玩家<br />
                  查看他们的动态信息并进行互动
                </p>
              </div>
            )}
          </div>
        </div>
        
        {/* 底部状态栏 */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-xs text-gray-400">在线</span>
            </div>
            <div className="text-xs text-gray-500">
              PixelDesk v1.0
            </div>
          </div>
        </div>
      </div>
      
      {/* 右侧 Phaser 游戏区域 */}
      <div className="flex-1 relative bg-black/30 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-900/10 to-transparent pointer-events-none"></div>
        <PhaserGame onPlayerCollision={handlePlayerCollision} />
      </div>
    </div>
  )
}
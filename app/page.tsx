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

  // 桌面端布局
  return (
    <div className="flex h-screen bg-gray-100">
      {/* 左侧 Next.js 页面区域 */}
      <div className="w-96 bg-white border-r border-gray-200 flex flex-col">
        {/* 个人状态区域 */}
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold mb-2">我的状态</h2>
          <PostStatus onStatusUpdate={handleStatusUpdate} currentStatus={myStatus} />
        </div>
        
        {/* 社交动态区域 */}
        <div className="flex-1 overflow-hidden">
          <h2 className="text-lg font-semibold p-4 border-b border-gray-200">
            社交动态
          </h2>
          <div className="h-full overflow-y-auto">
            {selectedPlayer ? (
              <SocialFeed player={selectedPlayer} />
            ) : (
              <div className="p-4 text-gray-500 text-center">
                靠近其他玩家查看他们的动态信息
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* 右侧 Phaser 游戏区域 */}
      <div className="flex-1 relative bg-gray-900">
        <PhaserGame onPlayerCollision={handlePlayerCollision} />
      </div>
    </div>
  )
}
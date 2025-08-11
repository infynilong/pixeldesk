'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'

// 确保工位绑定管理器在应用启动时就被加载
import '@/lib/workstationBindingManager'

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

// 工位绑定弹窗组件
const WorkstationBindingModal = dynamic(() => import('@/components/WorkstationBindingModal'), {
  ssr: false
})

// 玩家点击弹窗组件
const PlayerClickModal = dynamic(() => import('@/components/PlayerClickModal'), {
  ssr: false
})

export default function Home() {
  const [isMobile, setIsMobile] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [myStatus, setMyStatus] = useState<any>('')
  const [currentUser, setCurrentUser] = useState<any>(null)
  
  // 工位绑定弹窗状态
  const [bindingModal, setBindingModal] = useState({
    isVisible: false,
    workstation: null,
    user: null
  })
  
  // 玩家点击弹窗状态
  const [playerClickModal, setPlayerClickModal] = useState({
    isVisible: false,
    player: null
  })
  
  // 检测移动设备和加载用户数据
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    // 加载当前用户数据
    const loadCurrentUser = () => {
      try {
        const userData = localStorage.getItem('pixelDeskUser')
        if (userData) {
          const user = JSON.parse(userData)
          setCurrentUser(user)
        }
      } catch (error) {
        console.warn('Failed to load user data:', error)
      }
    }
    
    // 设置全局函数供Phaser调用
    if (typeof window !== 'undefined') {
      window.setWorkstationBindingModal = (modalState: any) => {
        setBindingModal(modalState)
      }
    }
    
    checkMobile()
    loadCurrentUser()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // 监听积分更新事件
  useEffect(() => {
    const handleUserPointsUpdated = (event: CustomEvent) => {
      const { userId, points } = event.detail
      
      // 如果是当前用户的积分更新，更新本地状态
      // 这里可以根据需要更新UI显示
      console.log('用户积分更新:', userId, points)
    }

    window.addEventListener('user-points-updated', handleUserPointsUpdated as EventListener)
    
    return () => {
      window.removeEventListener('user-points-updated', handleUserPointsUpdated as EventListener)
    }
  }, [])

  // 处理玩家碰撞事件 - 优化避免不必要重新渲染
  const handlePlayerCollision = useCallback((playerData: any) => {
    setSelectedPlayer(playerData)
  }, [])

  // 处理状态更新 - 优化避免不必要重新渲染
  const handleStatusUpdate = useCallback((newStatus: any) => {
    // 只有当状态真正改变时才更新
    if (!myStatus || myStatus.type !== newStatus.type || myStatus.message !== newStatus.message) {
      setMyStatus(newStatus)
    }
    // 这里可以发送到服务器或广播给其他玩家
  }, [myStatus])

  // 处理工位绑定请求 - 现在由workstationBindingManager直接处理
  const handleWorkstationBinding = useCallback((workstation: any, user: any) => {
    console.log('React handleWorkstationBinding 被调用（已弃用）:', { workstation, user })
    // 这个函数现在仅作为备用，主要逻辑在workstationBindingManager中处理
  }, [])

  // 处理玩家点击请求
  const handlePlayerClick = useCallback((playerData: any) => {
    setPlayerClickModal({
      isVisible: true,
      player: playerData
    })
  }, [])

  // 处理工位绑定确认
  const handleBindingConfirm = useCallback(async () => {
    console.log('=== React handleBindingConfirm 被调用 ===')
    try {
      // 直接使用全局实例
      if (typeof window !== 'undefined' && window.workstationBindingManager) {
        const workstationBindingManager = window.workstationBindingManager
        console.log('使用全局 workstationBindingManager:', workstationBindingManager)
        console.log('workstationBindingManager 状态:', {
          currentWorkstation: workstationBindingManager.getCurrentWorkstation(),
          currentUser: workstationBindingManager.getCurrentUser(),
          isProcessing: workstationBindingManager.isBindingProcessing()
        })
        
        const result = await workstationBindingManager.handleBindingConfirm()
        console.log('绑定结果:', result)
        return result
      } else {
        console.error('全局 workstationBindingManager 不存在')
        return { success: false, error: '绑定管理器不可用' }
      }
    } catch (error) {
      console.error('工位绑定失败:', error)
      return { success: false, error: '绑定失败，请重试' }
    }
  }, [])

  // 处理工位绑定取消
  const handleBindingCancel = useCallback(() => {
    try {
      // 直接使用全局实例
      if (typeof window !== 'undefined' && window.workstationBindingManager) {
        window.workstationBindingManager.handleBindingCancel()
      } else {
        console.error('全局 workstationBindingManager 不存在')
      }
    } catch (error) {
      console.error('取消工位绑定失败:', error)
    }
  }, [])

  // 关闭工位绑定弹窗
  const handleBindingModalClose = useCallback(() => {
    setBindingModal({
      isVisible: false,
      workstation: null,
      user: null
    })
  }, [])

  // 关闭玩家点击弹窗
  const handlePlayerClickModalClose = useCallback(() => {
    setPlayerClickModal({
      isVisible: false,
      player: null
    })
  }, [])

  // 优化：使用 memo 避免 selectedPlayer 变化导致整个组件重新渲染
  const memoizedPhaserGame = useMemo(() => (
    <PhaserGame 
      onPlayerCollision={handlePlayerCollision} 
      onWorkstationBinding={handleWorkstationBinding}
      onPlayerClick={handlePlayerClick}
    />
  ), [handlePlayerCollision, handleWorkstationBinding, handlePlayerClick])

  // 优化：使用 memo 避免 myStatus 变化导致 PostStatus 不必要重新渲染
  const memoizedPostStatus = useMemo(() => (
    <PostStatus 
      onStatusUpdate={handleStatusUpdate} 
      currentStatus={myStatus} 
      userId={currentUser?.id} 
    />
  ), [handleStatusUpdate, myStatus, currentUser?.id])

  // 优化：使用 memo 避免 selectedPlayer 变化导致 SocialFeed 不必要重新渲染
  const memoizedSocialFeed = useMemo(() => (
    <SocialFeed player={selectedPlayer} />
  ), [selectedPlayer])

  // 移动端布局
  if (isMobile) {
    return (
      <div className="flex flex-col h-screen bg-gray-900">
        {/* 游戏区域 */}
        <div className="flex-1 relative">
          {memoizedPhaserGame}
        </div>
        
        {/* 底部信息栏 */}
        <div className="h-64 bg-white border-t border-gray-200 overflow-hidden">
          {selectedPlayer ? (
            memoizedSocialFeed
          ) : (
            memoizedPostStatus
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
          {memoizedPostStatus}
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
              memoizedSocialFeed
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
        {memoizedPhaserGame}
      </div>
      
      {/* 工位绑定弹窗 */}
      <WorkstationBindingModal
        isVisible={bindingModal.isVisible}
        workstation={bindingModal.workstation}
        user={bindingModal.user}
        onConfirm={handleBindingConfirm}
        onCancel={handleBindingCancel}
        onClose={handleBindingModalClose}
      />
      
      {/* 玩家点击弹窗 */}
      <PlayerClickModal
        isVisible={playerClickModal.isVisible}
        player={playerClickModal.player}
        onClose={handlePlayerClickModalClose}
      />
    </div>
  )
}
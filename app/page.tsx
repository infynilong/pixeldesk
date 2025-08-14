'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'

// 声明全局函数的类型
declare global {
  interface Window {
    setWorkstationBindingModal: (modalState: any) => void
    showWorkstationInfo: (workstationId: number, userId: string) => void
    showPlayerInfo: (userId: string, userInfo: any) => void
    showCharacterInfo: (userId: string, userInfo: any, position: { x: number; y: number }) => void
    saveGameScene: (scene: any) => void
    getGameWorkstationCount: () => number
    getGameWorkstationStats: () => {
      totalWorkstations: number
      boundWorkstations: number
      availableWorkstations: number
      occupancyRate: string
    }
  }
}

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

// 工位信息弹窗组件
const WorkstationInfoModal = dynamic(() => import('@/components/WorkstationInfoModal'), {
  ssr: false
})

// 角色显示弹窗组件
const CharacterDisplayModal = dynamic(() => import('@/components/CharacterDisplayModal'), {
  ssr: false
})

export default function Home() {
  const [isMobile, setIsMobile] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [myStatus, setMyStatus] = useState<any>('')
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [workstationStats, setWorkstationStats] = useState<any>(null)
  
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
  
  // 工位信息弹窗状态
  const [workstationInfoModal, setWorkstationInfoModal] = useState({
    isVisible: false,
    workstationId: null as number | null,
    userId: null as string | null
  })
  
  // 角色显示弹窗状态
  const [characterDisplayModal, setCharacterDisplayModal] = useState({
    isVisible: false,
    userId: null as string | null,
    userInfo: null as any,
    position: null as { x: number; y: number } | null
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
    
        
    // 加载当前用户的工位绑定信息
    const loadUserWorkstationBinding = async () => {
      try {
        const userData = localStorage.getItem('pixelDeskUser')
        if (userData) {
          const user = JSON.parse(userData)
          const response = await fetch(`/api/workstations/user-bindings?userId=${user.id}`)
          if (response.ok) {
            const data = await response.json()
            if (data.success && data.data.length > 0) {
              // 获取最新的绑定记录
              const latestBinding = data.data[0]
              setCurrentUser((prev: any) => ({
                ...prev,
                workstationId: latestBinding.workstationId
              }))
            }
          }
        }
      } catch (error) {
        console.warn('Failed to load user workstation binding:', error)
      }
    }
    
    // 设置全局函数供Phaser调用
    if (typeof window !== 'undefined') {
      window.setWorkstationBindingModal = (modalState: any) => {
        setBindingModal(modalState)
      }
      
      // 设置工位信息弹窗的全局函数
      window.showWorkstationInfo = (workstationId: number, userId: string) => {
        setWorkstationInfoModal({
          isVisible: true,
          workstationId,
          userId
        })
      }
      
      // 设置角色显示弹窗的全局函数
      window.showPlayerInfo = (userId: string, userInfo: any) => {
        setCharacterDisplayModal({
          isVisible: true,
          userId,
          userInfo,
          position: null
        })
      }
      
      // 设置角色点击事件的全局函数
      window.showCharacterInfo = (userId: string, userInfo: any, position: { x: number; y: number }) => {
        setCharacterDisplayModal({
          isVisible: true,
          userId,
          userInfo,
          position
        })
      }
      
      // 监听Phaser游戏初始化完成事件
      window.addEventListener('phaser-game-ready', () => {
        console.log('Phaser game is ready, loading workstation stats')
        loadWorkstationStats()
      })
      
      // 监听工位统计数据更新事件
      window.addEventListener('workstation-stats-updated', (event: any) => {
        console.log('Workstation stats updated:', event.detail)
        setWorkstationStats(event.detail)
      })
    }
    
    checkMobile()
    loadCurrentUser()
    loadWorkstationStats()
    loadUserWorkstationBinding()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // 监听积分更新事件
  useEffect(() => {
    const handleUserPointsUpdated = (event: CustomEvent) => {
      const { userId, points } = event.detail
      
      // 如果是当前用户的积分更新，更新本地状态
      if (currentUser && currentUser.id === userId) {
        setCurrentUser((prev: any) => ({
          ...prev,
          points: points
        }))
      }
      console.log('用户积分更新:', userId, points)
    }

    window.addEventListener('user-points-updated', handleUserPointsUpdated as EventListener)
    
    return () => {
      window.removeEventListener('user-points-updated', handleUserPointsUpdated as EventListener)
    }
  }, [currentUser])

  // 加载工位统计信息 - 包装在useCallback中
  const loadWorkstationStats = useCallback(async () => {
    try {
      // 首先尝试从Phaser游戏获取工位统计
      if (typeof window !== 'undefined' && window.getGameWorkstationStats) {
        const stats = window.getGameWorkstationStats()
        setWorkstationStats(stats)
        console.log('Got workstation stats from game:', stats)
        return
      }
      
      // 如果Phaser游戏还没有初始化，等待一段时间后重试
      if (typeof window !== 'undefined') {
        console.log('Waiting for Phaser game to initialize...')
        setTimeout(() => {
          if (window.getGameWorkstationStats) {
            const stats = window.getGameWorkstationStats()
            setWorkstationStats(stats)
            console.log('Got workstation stats from game after delay:', stats)
          } else {
            // 备用方案：从API获取
            fetch('/api/workstations/stats')
              .then(response => response.json())
              .then(data => {
                if (data.success) {
                  setWorkstationStats(data.data)
                  console.log('Got workstation stats from API:', data.data)
                }
              })
              .catch(error => {
                console.warn('Failed to load workstation stats from API:', error)
              })
          }
        }, 3000) // 等待3秒让Phaser游戏初始化
      }
    } catch (error) {
      console.warn('Failed to load workstation stats:', error)
    }
  }, [])

  // 监听工位绑定状态更新事件
  useEffect(() => {
    const handleWorkstationBindingUpdated = (event: CustomEvent) => {
      const { userId, workstationId } = event.detail
      
      // 如果是当前用户的工位绑定状态更新，更新本地状态
      if (currentUser && currentUser.id === userId) {
        setCurrentUser((prev: any) => ({
          ...prev,
          workstationId: workstationId
        }))
        // 重新加载工位统计信息
        loadWorkstationStats()
      }
      console.log('工位绑定状态更新:', userId, workstationId)
    }

    window.addEventListener('workstation-binding-updated', handleWorkstationBindingUpdated as EventListener)
    
    return () => {
      window.removeEventListener('workstation-binding-updated', handleWorkstationBindingUpdated as EventListener)
    }
  }, [currentUser, loadWorkstationStats])

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

  // 关闭工位信息弹窗
  const handleWorkstationInfoModalClose = useCallback(() => {
    setWorkstationInfoModal({
      isVisible: false,
      workstationId: null,
      userId: null
    })
  }, [])

  // 关闭角色显示弹窗
  const handleCharacterDisplayModalClose = useCallback(() => {
    setCharacterDisplayModal({
      isVisible: false,
      userId: null,
      userInfo: null,
      position: null
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
      userData={{
        username: currentUser?.username,
        points: currentUser?.points,
        workstationId: currentUser?.workstationId
      }}
      workstationStats={workstationStats}
    />
  ), [handleStatusUpdate, myStatus, currentUser?.id, currentUser?.username, currentUser?.points, currentUser?.workstationId, workstationStats])

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
        
        {/* 工位统计区域 */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">工位统计</h2>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
              <span className="text-xs text-gray-400">实时</span>
            </div>
          </div>
          {workstationStats ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-300 text-sm">工位总数</span>
                <span className="text-white font-medium">{workstationStats.totalWorkstations}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300 text-sm">已绑定</span>
                <span className="text-green-400 font-medium">{workstationStats.boundWorkstations}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300 text-sm">可用</span>
                <span className="text-blue-400 font-medium">{workstationStats.availableWorkstations}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300 text-sm">占用率</span>
                <span className="text-purple-400 font-medium">{workstationStats.occupancyRate}</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-4">
              <div className="w-4 h-4 bg-purple-400 rounded-full animate-pulse mr-2"></div>
              <span className="text-gray-400 text-sm">加载中...</span>
            </div>
          )}
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
      
      {/* 工位信息弹窗 */}
      <WorkstationInfoModal
        isVisible={workstationInfoModal.isVisible}
        workstationId={workstationInfoModal.workstationId}
        userId={workstationInfoModal.userId}
        onClose={handleWorkstationInfoModalClose}
      />
      
      {/* 角色显示弹窗 */}
      {characterDisplayModal.isVisible && (
        <CharacterDisplayModal
          userId={characterDisplayModal.userId!}
          userInfo={characterDisplayModal.userInfo}
          position={characterDisplayModal.position || undefined}
          onClose={handleCharacterDisplayModalClose}
        />
      )}
    </div>
  )
}
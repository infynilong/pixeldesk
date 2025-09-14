'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { EventBus, CollisionEvent } from '@/lib/eventBus'

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
    teleportToWorkstation: () => Promise<{
      success: boolean
      error?: string
      workstation?: any
      position?: { x: number; y: number; direction: string }
      pointsDeducted?: number
      remainingPoints?: number
    }>
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

// 快速回到工位确认弹窗组件
const TeleportConfirmModal = dynamic(() => import('@/components/TeleportConfirmModal'), {
  ssr: false
})

// 布局管理器组件
const LayoutManager = dynamic(() => import('@/components/LayoutManager'), {
  ssr: false
})

// 信息面板组件
const InfoPanel = dynamic(() => import('@/components/InfoPanel'), {
  ssr: false
})

export default function Home() {
  const [isMobile, setIsMobile] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [collisionPlayer, setCollisionPlayer] = useState<any>(null)
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

  // 快速回到工位确认弹窗状态
  const [teleportConfirmModal, setTeleportConfirmModal] = useState({
    isVisible: false,
    currentPoints: currentUser?.points || 0
  })
  
  // 错误消息状态
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  
  // Enhanced device detection
  const [deviceType, setDeviceType] = useState<'mobile' | 'tablet' | 'desktop'>('desktop')
  const [isTablet, setIsTablet] = useState(false)

  // 加载当前用户的工位绑定信息
  const loadUserWorkstationBinding = useCallback(async () => {
    try {
      const userData = localStorage.getItem('pixelDeskUser')
      if (userData) {
        const user = JSON.parse(userData)
        const response = await fetch(`/api/workstations/user-bindings?userId=${user.id}`)
        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            if (data.data.length > 0) {
              // 获取最新的绑定记录
              const latestBinding = data.data[0]
              setCurrentUser((prev: any) => ({
                ...prev,
                workstationId: latestBinding.workstationId
              }))
              console.log('✅ [loadUserWorkstationBinding] 工位绑定已加载:', latestBinding.workstationId)
            } else {
              // 没有绑定记录，确保清除工位ID
              setCurrentUser((prev: any) => ({
                ...prev,
                workstationId: null
              }))
              console.log('⚠️ [loadUserWorkstationBinding] 用户未绑定工位')
            }
          }
        }
      }
    } catch (error) {
      console.warn('Failed to load user workstation binding:', error)
    }
  }, [])

  // 检测移动设备和加载用户数据
  useEffect(() => {
    const checkDeviceType = () => {
      const width = window.innerWidth
      if (width < 640) {
        setDeviceType('mobile')
        setIsMobile(true)
        setIsTablet(false)
      } else if (width < 1024) {
        setDeviceType('tablet')
        setIsMobile(false)
        setIsTablet(true)
      } else {
        setDeviceType('desktop')
        setIsMobile(false)
        setIsTablet(false)
      }
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
    
    checkDeviceType()
    loadCurrentUser()
    loadWorkstationStats()
    loadUserWorkstationBinding()
    window.addEventListener('resize', checkDeviceType)
    return () => window.removeEventListener('resize', checkDeviceType)
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
        // 同时更新teleport确认弹窗的积分显示
        setTeleportConfirmModal(prev => ({
          ...prev,
          currentPoints: points
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
      
      // 如果是当前用户的工位绑定状态更新，重新加载用户工位绑定信息
      if (currentUser && currentUser.id === userId) {
        console.log('🔄 [handleWorkstationBindingUpdated] 检测到工位绑定状态更新，重新加载用户数据')
        // 重新加载用户工位绑定信息，确保数据同步
        loadUserWorkstationBinding()
        // 重新加载工位统计信息
        loadWorkstationStats()
      }
      console.log('工位绑定状态更新:', userId, workstationId)
    }

    window.addEventListener('workstation-binding-updated', handleWorkstationBindingUpdated as EventListener)
    
    return () => {
      window.removeEventListener('workstation-binding-updated', handleWorkstationBindingUpdated as EventListener)
    }
  }, [currentUser, loadWorkstationStats, loadUserWorkstationBinding])

  // 处理玩家碰撞事件 - 优化避免不必要重新渲染
  const handlePlayerCollision = useCallback((playerData: any) => {
    setSelectedPlayer(playerData)
  }, [])

  // Set up event bus listeners for collision and click events
  useEffect(() => {
    const handleCollisionStart = (event: CollisionEvent) => {
      console.log('[HomePage] Collision start:', event)
      // Only update if it's a different player to avoid unnecessary re-renders
      setCollisionPlayer((prevPlayer: any) => {
        if (prevPlayer?.id === event.targetPlayer?.id) {
          console.log('[HomePage] Same player collision, skipping update')
          return prevPlayer
        }
        return event.targetPlayer
      })
    }

    const handleCollisionEnd = (event: CollisionEvent) => {
      console.log('[HomePage] Collision end:', event)
      // Only clear if it's the same player that's ending collision
      setCollisionPlayer((prevPlayer: any) => {
        if (prevPlayer?.id === event.targetPlayer?.id) {
          console.log('[HomePage] Clearing collision player:', event.targetPlayer?.id)
          return null
        }
        // If it's a different player ending collision, keep the current one
        console.log('[HomePage] Different player ending collision, keeping current player')
        return prevPlayer
      })
    }

    const handlePlayerClickEvent = (event: any) => {
      console.log('[HomePage] Player click event:', event)
      // For click events, we set the collision player to trigger the same UI behavior
      // Only update if it's a different player
      setCollisionPlayer((prevPlayer: any) => {
        if (prevPlayer?.id === event.targetPlayer?.id) {
          console.log('[HomePage] Same player click, skipping update')
          return prevPlayer
        }
        return event.targetPlayer
      })
    }

    const handleChatConversationOpened = (event: any) => {
      console.log('[HomePage] Chat conversation opened:', event)
      // Handle chat conversation opening - this could trigger UI updates
      // For now, we'll let the ChatManager handle the conversation display
    }

    // Subscribe to collision, click, and chat events
    EventBus.on('player:collision:start', handleCollisionStart)
    EventBus.on('player:collision:end', handleCollisionEnd)
    EventBus.on('player:click', handlePlayerClickEvent)
    EventBus.on('chat:conversation:opened', handleChatConversationOpened)

    // Cleanup on unmount
    return () => {
      EventBus.off('player:collision:start', handleCollisionStart)
      EventBus.off('player:collision:end', handleCollisionEnd)
      EventBus.off('player:click', handlePlayerClickEvent)
      EventBus.off('chat:conversation:opened', handleChatConversationOpened)
    }
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

  
  // 处理玩家点击请求 - 保持向后兼容性，同时支持新的标签页系统
  const handlePlayerClick = useCallback((playerData: any) => {
    console.log('[HomePage] Legacy player click handler:', playerData)
    
    // 新系统：通过EventBus触发点击事件，让TabManager处理
    // 这样可以确保点击和碰撞产生一致的用户体验
    const clickEvent = {
      type: 'player_click',
      targetPlayer: playerData,
      timestamp: Date.now(),
      position: { x: 0, y: 0 }, // 位置信息在这里不重要
      trigger: 'click'
    }
    EventBus.emit('player:click', clickEvent)
    
    // 旧系统：保持向后兼容性，仍然显示模态框作为备选
    // 但在新的标签页系统中，这个模态框不会显示，因为标签页会处理交互
    setPlayerClickModal({
      isVisible: false, // 设置为false，让新的标签页系统处理
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

  // 优化：使用 memo 避免 PostStatus 不必要重新渲染，特别是避免userId频繁变化
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
    />
  ), [handleStatusUpdate, myStatus, currentUser?.id]) // 移除频繁变化的points/workstationId/username依赖

  // 优化：使用 memo 避免 selectedPlayer 变化导致 SocialFeed 不必要重新渲染
  const memoizedSocialFeed = useMemo(() => (
    <SocialFeed player={selectedPlayer} />
  ), [selectedPlayer])

  // Create memoized info panel content for mobile
  const memoizedMobileInfoPanel = useMemo(() => (
    selectedPlayer ? memoizedSocialFeed : memoizedPostStatus
  ), [selectedPlayer, memoizedSocialFeed, memoizedPostStatus])

  // Create memoized info panel content for desktop
  const memoizedDesktopInfoPanel = useMemo(() => (
    <InfoPanel
      selectedPlayer={selectedPlayer}
      collisionPlayer={collisionPlayer}
      currentUser={currentUser}
      workstationStats={workstationStats}
      onTeleportClick={() => {
        setTeleportConfirmModal({
          isVisible: true,
          currentPoints: currentUser?.points || 0
        })
      }}
      isMobile={isMobile}
      isTablet={isTablet}
    >
      {memoizedPostStatus}
    </InfoPanel>
  ), [selectedPlayer, collisionPlayer, currentUser, workstationStats, memoizedPostStatus, isMobile, isTablet])

  // Use layout manager for both mobile and desktop
  return (
    <div>
      <LayoutManager
        gameComponent={memoizedPhaserGame}
        infoPanel={isMobile ? memoizedMobileInfoPanel : memoizedDesktopInfoPanel}
      />
      
      {/* All modals remain the same */}
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

      {/* 快速回到工位确认弹窗 */}
      <TeleportConfirmModal
        isVisible={teleportConfirmModal.isVisible}
        currentPoints={teleportConfirmModal.currentPoints}
        onConfirm={async () => {
          if (typeof window !== 'undefined' && window.teleportToWorkstation) {
            const result = await window.teleportToWorkstation();
            setTeleportConfirmModal({ isVisible: false, currentPoints: currentUser?.points || 0 });
            
            if (result && !result.success) {
              // 显示错误消息
              setErrorMessage(result.error || '传送失败');
            }
          }
        }}
        onCancel={() => setTeleportConfirmModal({ isVisible: false, currentPoints: currentUser?.points || 0 })}
      />

      {/* 错误消息弹窗 */}
      {errorMessage && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-retro-bg-darker border border-retro-border rounded-lg p-6 w-full max-w-md">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-red-600 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">⚠️</span>
              </div>
              <h3 className="text-white text-xl font-bold mb-2">操作失败</h3>
              <p className="text-retro-textMuted">
                {errorMessage}
              </p>
            </div>
            
            <div className="flex justify-center">
              <button
                onClick={() => setErrorMessage(null)}
                className="bg-retro-blue hover:bg-retro-blue/80 text-white font-medium py-3 px-6 rounded-md transition-all duration-200"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { EventBus, CollisionEvent } from '@/lib/eventBus'
import { useUser } from '@/contexts/UserContext'
import CharacterCreationModal from '@/components/CharacterCreationModal'
import { statusHistoryManager } from '@/lib/statusHistory'
import {
  isFirstTimeVisitor,
  createTempPlayer,
  getTempPlayer,
  getTempPlayerGameData,
  migrateTempPlayerToUser,
  hasTempPlayer
} from '@/lib/tempPlayerManager'

// 声明全局函数的类型
declare global {
  interface Window {
    setWorkstationBindingModal: (modalState: any) => void
    showWorkstationInfo: (workstationId: number, userId: string) => void
    showPlayerInfo: (userId: string, userInfo: any) => void
    showCharacterInfo: (userId: string, userInfo: any, position: { x: number; y: number }) => void
    showTempPlayerAuthPrompt: (message: string) => void
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

// 动态导入PhaserGame组件以避免SSR问题
const PhaserGame = dynamic(() => import('@/components/PhaserGame'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full bg-gray-900">加载游戏中...</div>
})

// 静态导入信息组件
// const SocialFeed = dynamic(() => import('@/components/SocialFeed'), {
//   ssr: false
// })
import SocialFeed from '@/components/SocialFeed'

// 静态导入发布动态组件
// const PostStatus = dynamic(() => import('@/components/PostStatus'), {
//   ssr: false
// })
import PostStatus from '@/components/PostStatus'

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


// 静态导入布局管理器组件
import LayoutManager from '@/components/LayoutManager'
// 新的面板组件
import LeftPanel from '@/components/LeftPanel'
import RightPanel from '@/components/RightPanel'

// 认证模态框组件
const AuthModal = dynamic(() => import('@/components/AuthModal'), {
  ssr: false
})

const PostDetailModal = dynamic(() => import('@/components/PostDetailModal'), {
  ssr: false
})

export default function Home() {
  // 认证相关状态
  const { user, isLoading, playerExists, setPlayerExists } = useUser()
  const [showCharacterCreation, setShowCharacterCreation] = useState(false)
  
  // 临时玩家状态
  const [isTemporaryPlayer, setIsTemporaryPlayer] = useState(false)
  const [showAuthPrompt, setShowAuthPrompt] = useState(false)
  const [authPromptMessage, setAuthPromptMessage] = useState('')
  const [showAuthModal, setShowAuthModal] = useState(false)

  // 帖子详情弹窗状态
  const [postDetailModal, setPostDetailModal] = useState({
    isVisible: false,
    postId: null as string | null
  })

  const [isMobile, setIsMobile] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [myStatus, setMyStatus] = useState<any>(null)
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

  
  // 错误消息状态
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  
  // Enhanced device detection
  const [deviceType, setDeviceType] = useState<'mobile' | 'tablet' | 'desktop'>('desktop')
  const [isTablet, setIsTablet] = useState(false)

  // 同步认证用户数据到currentUser状态，支持临时玩家
  const syncAuthenticatedUser = useCallback(() => {
    if (user) {
      // 用户已登录 - 确保设置为非临时用户状态
      // (临时玩家数据迁移已在UserContext中处理)
      setIsTemporaryPlayer(false)

      // 从localStorage获取游戏相关数据（如角色、积分等）
      try {
        const gameUserData = localStorage.getItem('pixelDeskUser')
        if (gameUserData) {
          const gameUser = JSON.parse(gameUserData)
          // 合并认证用户数据和游戏数据
          setCurrentUser({
            id: user.id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            points: user.points || gameUser.points || 50,
            gold: user.gold || gameUser.gold || 50,
            // 保留游戏相关数据
            username: gameUser.username || user.name,
            character: gameUser.character,
            workstationId: gameUser.workstationId,
            workstations: gameUser.workstations || []
          })
        } else {
          // 如果没有游戏数据，使用认证数据
          setCurrentUser((prev: any) => ({
            id: user.id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            points: user.points || 50,
            gold: user.gold || 50,
            username: user.name,
            workstationId: prev?.workstationId, // 保留现有的工位绑定
            workstations: []
          }))
        }
      } catch (error) {
        // 加载游戏用户数据失败
        // 出错时使用认证数据作为后备
        setCurrentUser((prev: any) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          points: user.points || 50,
          gold: user.gold || 50,
          username: user.name,
          workstationId: prev?.workstationId, // 保留现有的工位绑定
          workstations: []
        }))
      }
    } else {
      // 用户未登录 - 检查临时玩家或创建新的临时玩家
      const tempPlayerData = getTempPlayerGameData()
      
      if (tempPlayerData) {
        // 使用现有临时玩家
        // 使用现有临时玩家
        setCurrentUser(tempPlayerData)
        setIsTemporaryPlayer(true)
      } else if (isFirstTimeVisitor()) {
        // 首次访问，创建临时玩家
        // 首次访问用户，创建临时玩家
        createTempPlayer()
        const tempGameData = getTempPlayerGameData()

        if (tempGameData) {
          setCurrentUser(tempGameData)
          setIsTemporaryPlayer(true)
        }
      } else {
        // 既不是首次访问，也没有临时玩家数据 - 创建新的临时玩家（比如用户退出登录后）
        // 用户退出登录，创建新临时玩家
        createTempPlayer()
        const tempGameData = getTempPlayerGameData()

        if (tempGameData) {
          setCurrentUser(tempGameData)
          setIsTemporaryPlayer(true)
        } else {
          // 如果临时玩家创建失败，设置为 null
          setCurrentUser(null)
          setIsTemporaryPlayer(false)
        }
      }
    }
  }, [user])

  // 检测移动设备和加载用户数据 - 优化resize处理
  useEffect(() => {
    let resizeTimeout: NodeJS.Timeout
    
    const checkDeviceType = () => {
      const width = window.innerWidth
      if (width < 768) {
        setDeviceType('mobile')
        setIsMobile(true)
        setIsTablet(false)
      } else if (width < 1200) {
        setDeviceType('tablet')
        setIsMobile(false)
        setIsTablet(true)
      } else {
        setDeviceType('desktop')
        setIsMobile(false)
        setIsTablet(false)
      }
    }
    
    // 防抖版本的resize处理器，避免高频触发
    const debouncedCheckDeviceType = () => {
      clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(checkDeviceType, 250) // 250ms防抖
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
      
      // 设置临时玩家认证提示的全局函数
      window.showTempPlayerAuthPrompt = (message: string) => {
        setAuthPromptMessage(message)
        setShowAuthPrompt(true)
      }
      
      // 监听Phaser游戏初始化完成事件
      window.addEventListener('phaser-game-ready', () => {
        // Phaser游戏已准备好
        loadWorkstationStats()
      })

      // 监听工位统计数据更新事件
      window.addEventListener('workstation-stats-updated', (event: any) => {
        // console.log('Workstation stats updated:', event.detail)
        setWorkstationStats(event.detail)
      })
    }
    
    checkDeviceType()
    loadWorkstationStats()
    window.addEventListener('resize', debouncedCheckDeviceType)
    return () => {
      window.removeEventListener('resize', debouncedCheckDeviceType)
      clearTimeout(resizeTimeout)
    }
  }, [])

  // 监听认证用户变化，同步currentUser状态
  useEffect(() => {
    syncAuthenticatedUser()

    // 如果用户已认证，立即加载工位绑定信息
    if (user?.id) {
      // 直接调用改进的工位绑定加载函数
      const loadBinding = async () => {
        // console.log('🔍 [inline-loadBinding] 开始加载用户工位绑定:', user.id)

        // 首先尝试从localStorage获取缓存的绑定信息
        const cachedBinding = localStorage.getItem(`workstation_binding_${user.id}`)
        if (cachedBinding) {
          try {
            const binding = JSON.parse(cachedBinding)
            // console.log('💾 [inline-loadBinding] 使用缓存的绑定信息:', binding)
            setCurrentUser((prev: any) => ({
              ...prev,
              workstationId: String(binding.workstationId)
            }))
          } catch (error) {
            // 缓存解析失败
          }
        }

        try {
          const response = await fetch(`/api/workstations/user-bindings?userId=${user.id}&cleanup=true`)

          if (response.ok) {
            const data = await response.json()
            // console.log('📡 [inline-loadBinding] API响应:', data)

            if (data.success && data.data.length > 0) {
              const binding = data.data[0]
              const workstationId = String(binding.workstationId)

              setCurrentUser((prev: any) => ({
                ...prev,
                workstationId: workstationId
              }))

              // 缓存绑定信息
              localStorage.setItem(`workstation_binding_${user.id}`, JSON.stringify({
                workstationId: binding.workstationId,
                boundAt: binding.boundAt,
                expiresAt: binding.expiresAt,
                timestamp: Date.now()
              }))

              // console.log('✅ [inline-loadBinding] 工位绑定已加载:', workstationId)

            } else if (data.success && data.data.length === 0) {
              setCurrentUser((prev: any) => ({
                ...prev,
                workstationId: null
              }))
              localStorage.removeItem(`workstation_binding_${user.id}`)
              // console.log('⚠️ [inline-loadBinding] 用户未绑定工位')

            } else if (!data.success && data.code?.startsWith('DB_')) {
              console.warn('⚠️ [inline-loadBinding] 数据库连接问题，使用缓存数据:', data.error)
              if (!cachedBinding) {
                setCurrentUser((prev: any) => ({
                  ...prev,
                  workstationId: null
                }))
              }
            }
          }
        } catch (error) {
          console.warn('❌ [inline-loadBinding] 工位绑定加载失败:', error)

          // 网络错误时尝试使用缓存
          if (!cachedBinding) {
            setCurrentUser((prev: any) => ({
              ...prev,
              workstationId: null
            }))
          }
        }
      }
      loadBinding()
    }
  }, [user])

  // 监听积分更新事件 - 优化：使用useRef避免频繁重建监听器
  const currentUserRef = useRef(currentUser)
  currentUserRef.current = currentUser

  useEffect(() => {
    const handleUserPointsUpdated = (event: CustomEvent) => {
      const { userId, points } = event.detail

      // 使用ref访问最新的currentUser，避免闭包陈旧值问题
      if (currentUserRef.current && currentUserRef.current.id === userId) {
        setCurrentUser((prev: any) => ({
          ...prev,
          points: points
        }))
      }
      // console.log('用户积分更新:', userId, points)
    }

    window.addEventListener('user-points-updated', handleUserPointsUpdated as EventListener)

    return () => {
      window.removeEventListener('user-points-updated', handleUserPointsUpdated as EventListener)
    }
  }, []) // 移除currentUser依赖，避免频繁重建监听器

  // 重新启用工位统计功能
  const loadWorkstationStats = useCallback(async () => {
    try {
      const response = await fetch('/api/workstations/stats')
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setWorkstationStats(data.data)
        }
      }
    } catch (error) {
      console.warn('Failed to load workstation stats:', error)
    }
  }, [])

  // 监听工位绑定状态更新事件
  useEffect(() => {
    const handleWorkstationBindingUpdated = (event: CustomEvent) => {
      const { userId, workstationId } = event.detail

      // 修复：无条件重新加载工位绑定信息，确保状态同步
      // 这解决了临时用户转正式用户时ID不匹配的问题
      if (user?.id || currentUser?.id) {
        // 直接更新currentUser的workstationId，立即反映绑定状态
        setCurrentUser((prev: any) => ({
          ...prev,
          workstationId: String(workstationId)
        }))
        // 重新加载工位统计信息
        loadWorkstationStats()
      }
    }

    window.addEventListener('workstation-binding-updated', handleWorkstationBindingUpdated as EventListener)

    return () => {
      window.removeEventListener('workstation-binding-updated', handleWorkstationBindingUpdated as EventListener)
    }
  }, [user?.id, loadWorkstationStats]) // 移除currentUser依赖，避免无限循环

  // 处理玩家碰撞事件 - 优化避免不必要重新渲染
  const handlePlayerCollision = useCallback((playerData: any) => {
    setSelectedPlayer(playerData)
  }, [])

  // 注意：collision事件处理已移至TabManager，避免重复处理
  // TabManager会完全负责collision检测、标签页切换和玩家信息管理

  // 处理状态更新 - 优化避免不必要重新渲染
  const handleStatusUpdate = useCallback((newStatus: any) => {
    // 只有当状态真正改变时才更新
    if (!myStatus || myStatus.type !== newStatus.type || myStatus.message !== newStatus.message) {
      setMyStatus(newStatus)
    }
    // 这里可以发送到服务器或广播给其他玩家
  }, [myStatus])

  // 在用户加载完成后，从状态历史中加载最新状态
  useEffect(() => {
    if (currentUser?.id && !myStatus) {
      // 从localStorage中获取状态历史
      const history = statusHistoryManager.getStatusHistory(currentUser.id)
      if (history && history.length > 0) {
        // 获取最新的状态记录
        const latestStatus = history[0]
        setMyStatus({
          type: latestStatus.type,
          status: latestStatus.status,
          emoji: latestStatus.emoji,
          message: latestStatus.message,
          timestamp: latestStatus.timestamp
        })
        console.log('✅ [App] 已从历史记录加载用户状态:', latestStatus)
      }
    }
  }, [currentUser?.id, myStatus])

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

  // 处理帖子点击 - 显示帖子详情弹窗
  const handlePostClick = useCallback((postId: string) => {
    console.log('打开帖子详情弹窗:', postId)
    setPostDetailModal({
      isVisible: true,
      postId
    })
  }, [])

  // 关闭帖子详情弹窗
  const handlePostDetailModalClose = useCallback(() => {
    setPostDetailModal({
      isVisible: false,
      postId: null
    })
  }, [])

  // 处理跳转到帖子页面
  const handleNavigateToPostPage = useCallback((postId: string) => {
    console.log('跳转到帖子页面:', postId)
    handlePostDetailModalClose()
    // 在新标签页中打开帖子详情页面
    window.open(`/posts/${postId}`, '_blank')
  }, [handlePostDetailModalClose])

  // 检查Player状态 - 仅对正式用户检查
  useEffect(() => {
    if (user && playerExists === false && !isTemporaryPlayer) {
      // PlayerExists状态由UserContext管理，这里直接显示角色创建弹窗
      console.log('显示角色创建弹窗:', { user: !!user, playerExists, isTemporaryPlayer })
      setShowCharacterCreation(true)
    } else if (isTemporaryPlayer) {
      // 临时玩家直接设置为已有玩家，不需要创建角色
      setPlayerExists(true)
      setShowCharacterCreation(false)
    } else if (user && playerExists === true) {
      // 用户已有角色，确保关闭弹窗
      setShowCharacterCreation(false)
    }
  }, [user, playerExists, isTemporaryPlayer, setPlayerExists])

  // 额外的用户登录后状态检查 - 确保弹窗在登录后立即显示
  useEffect(() => {
    if (user && !isTemporaryPlayer) {
      // 用户登录且不是临时用户，检查是否需要显示角色创建弹窗
      // 添加小延迟确保playerExists状态已更新
      const timer = setTimeout(() => {
        if (playerExists === false) {
          console.log('用户登录后检查角色状态，需要创建角色')
          setShowCharacterCreation(true)
        }
      }, 100)

      return () => clearTimeout(timer)
    }
  }, [user, isTemporaryPlayer, playerExists])

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

  // 优化：使用 memo 避免 PostStatus 不必要重新渲染，但需要包含workstationId依赖
  const memoizedPostStatus = useMemo(() => {
    return (
      <PostStatus
        onStatusUpdate={handleStatusUpdate}
        currentStatus={myStatus}
        userId={currentUser?.id}
        userData={{
          username: currentUser?.name,
          points: currentUser?.points,
          workstationId: currentUser?.workstationId
        }}
      />
    )
  }, [handleStatusUpdate, myStatus, currentUser?.id, currentUser?.name, currentUser?.points, currentUser?.workstationId]) // 包含所有相关字段依赖

  // SocialFeed已禁用 - 性能测试
  // const memoizedSocialFeed = useMemo(() => (
  //   <SocialFeed player={selectedPlayer} />
  // ), [selectedPlayer])

  // Create memoized left panel content
  const memoizedLeftPanel = useMemo(() => (
    <LeftPanel
      currentUser={currentUser}
      workstationStats={workstationStats}
      isMobile={isMobile}
      isTablet={isTablet}
    >
      {/* 状态更新组件 */}
      {memoizedPostStatus}
    </LeftPanel>
  ), [currentUser?.id, currentUser?.name, currentUser?.points, workstationStats, isMobile, isTablet, memoizedPostStatus])

  // Create memoized right panel content
  const memoizedRightPanel = useMemo(() => (
    <RightPanel
      currentUser={currentUser}
      selectedPlayer={selectedPlayer}
      onPostClick={handlePostClick}
      isMobile={isMobile}
      isTablet={isTablet}
    />
  ), [currentUser?.id, selectedPlayer, handlePostClick, isMobile, isTablet])

  // 如果正在加载认证状态，显示加载界面
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 border-4 border-retro-purple border-t-transparent rounded-full "></div>
          <p className="text-white text-lg">Loading PixelDesk...</p>
        </div>
      </div>
    )
  }

  // 如果没有当前用户（既没有登录用户也没有临时玩家），直接显示游戏界面
  // syncAuthenticatedUser会自动创建临时玩家
  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 border-4 border-retro-purple border-t-transparent rounded-full "></div>
          <p className="text-white text-lg">Preparing your gaming experience...</p>
        </div>
      </div>
    )
  }

  // 如果用户已登录但没有Player，且不是临时玩家，显示角色创建界面
  if (user && playerExists === false && !isTemporaryPlayer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
        <CharacterCreationModal
          isOpen={showCharacterCreation}
          userName={user.name}
          onComplete={async (playerData) => {
            console.log('角色创建成功:', playerData)
            // 角色创建成功后，初始化Player同步系统
            const { initializePlayerSync } = await import('@/lib/playerSync')
            await initializePlayerSync()
            setPlayerExists(true)
            setShowCharacterCreation(false)
          }}
          onSkip={() => {
            console.log('跳过角色创建')
            setShowCharacterCreation(false)
            setPlayerExists(true) // 跳过后也允许进入游戏
          }}
        />
      </div>
    )
  }

  // 用户已登录，显示游戏界面
  return (
    <div>
      <LayoutManager
        gameComponent={memoizedPhaserGame}
        leftPanel={memoizedLeftPanel}
        rightPanel={memoizedRightPanel}
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

      {/* 帖子详情弹窗 */}
      <PostDetailModal
        isOpen={postDetailModal.isVisible}
        postId={postDetailModal.postId}
        currentUserId={currentUser?.id || ''}
        onClose={handlePostDetailModalClose}
        onNavigateToPage={handleNavigateToPostPage}
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
                className="bg-retro-blue hover:bg-retro-blue/80 text-white font-medium py-3 px-6 rounded-md "
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 认证提示弹窗 */}
      {showAuthPrompt && (
        <div className="fixed inset-0 bg-black flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-retro-bg-darker via-gray-900 to-retro-bg-darker border-2 border-retro-purple/30 rounded-xl p-6 w-full max-w-lg">
            {/* 顶部装饰线 */}
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-20 h-1 bg-gradient-to-r from-retro-purple to-retro-pink"></div>
            
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-gradient-to-r from-retro-purple to-retro-pink rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🚀</span>
              </div>
              <h3 className="text-white text-xl font-bold mb-2">解锁完整游戏体验</h3>
              <p className="text-retro-textMuted text-sm mb-2">
                您当前是临时玩家，正在体验基础功能
              </p>
              <p className="text-white text-sm">
                {authPromptMessage}
              </p>
            </div>

            {/* 功能对比 */}
            <div className="mb-6 space-y-3">
              <div className="bg-retro-bg-dark/30 rounded-lg p-3">
                <h4 className="text-retro-purple text-sm font-semibold mb-2">注册后您将获得：</h4>
                <div className="space-y-1 text-xs text-retro-textMuted">
                  <div className="flex items-center space-x-2">
                    <span className="text-green-400">✓</span>
                    <span>绑定专属工位</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-green-400">✓</span>
                    <span>保存游戏进度</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-green-400">✓</span>
                    <span>参与社交互动</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-green-400">✓</span>
                    <span>解锁更多功能</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between space-x-4">
              <button
                onClick={() => setShowAuthPrompt(false)}
                className="text-retro-textMuted hover:text-white text-sm "
              >
                稍后再说
              </button>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowAuthPrompt(false)
                    setShowAuthModal(true)
                  }}
                  className="bg-gradient-to-r from-retro-purple to-retro-pink hover:from-retro-purple/90 hover:to-retro-pink/90 text-white font-bold py-2 px-6 rounded-lg  shadow-lg hover:shadow-purple-500/25 transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  立即注册
                </button>
              </div>
            </div>

            {/* 底部提示 */}
            <div className="mt-4 pt-4 border-t border-retro-border/30">
              <p className="text-retro-textMuted text-xs text-center">
                💡 注册完全免费，只需30秒即可完成
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 临时玩家状态指示器 */}
      {isTemporaryPlayer && (
        <div className="fixed bottom-4 left-4 z-40">
          <div className="bg-gradient-to-r from-yellow-600/90 to-orange-600/90 backdrop-blur-sm rounded-lg px-4 py-2 border border-yellow-500/30">
            <div className="flex items-center space-x-2">
              <span className="text-white text-sm">🎮</span>
              <span className="text-white text-sm font-medium">体验模式</span>
              <button
                onClick={() => {
                  setAuthPromptMessage('注册账号即可享受完整游戏体验，包括工位绑定、进度保存等功能！')
                  setShowAuthPrompt(true)
                }}
                className="text-yellow-200 hover:text-white text-xs underline "
              >
                升级账号
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 临时玩家的认证模态框 */}
      {showAuthModal && (
        <AuthModal 
          isOpen={showAuthModal} 
          onClose={() => setShowAuthModal(false)}
        />
      )}
    </div>
  )
}
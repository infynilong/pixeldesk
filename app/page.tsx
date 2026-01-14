'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { EventBus, CollisionEvent } from '@/lib/eventBus'
import { useUser } from '@/contexts/UserContext'
import CharacterCreationModal from '@/components/CharacterCreationModal'
import { statusHistoryManager } from '@/lib/statusHistory'
import { useTranslation } from '@/lib/hooks/useTranslation'
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
    isUserAuthenticated: boolean // 用户是否已真正登录（非临时用户）
    setWorkstationBindingModal: (modalState: any) => void
    showUnbindingDialog: (workstationId: number) => void
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
    disableGameInput: () => void
    enableGameInput: () => void
  }
}

// 确保工位绑定管理器在应用启动时就被加载
import '@/lib/workstationBindingManager'

// 动态导入PhaserGame组件以避免SSR问题
const PhaserGame = dynamic(() => import('@/components/PhaserGame'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full bg-gray-900 font-pixel text-white">Loading Game...</div>
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

const PostcardDesignerModal = dynamic(() => import('@/components/PostcardDesignerModal'), {
  ssr: false
})

const PostcardRequestModal = dynamic(() => import('@/components/PostcardRequestModal'), {
  ssr: false
})

// AI 聊天弹窗
const AiChatModal = dynamic(() => import('@/components/AiChatModal'), {
  ssr: false
})

// 前台客服聊天弹窗
const FrontDeskChatModal = dynamic(() => import('@/components/FrontDeskChatModal'), {
  ssr: false
})

// 图书馆弹窗
const LibraryModal = dynamic(() => import('@/components/LibraryModal'), {
  ssr: false
})

// 工位状态更新弹窗 (碰到自己工位时弹出)
const WorkstationStatusPopup = dynamic(() => import('@/components/WorkstationStatusPopup'), {
  ssr: false
})

// 大屏推流 UI
const BillboardUI = dynamic(() => import('@/components/billboard/BillboardUI'), {
  ssr: false
})

const WelcomeModal = dynamic(() => import('@/components/WelcomeModal'), {
  ssr: false
})

export default function Home() {
  // 认证相关状态
  const { user, isLoading, playerExists, setPlayerExists } = useUser()
  const [showCharacterCreation, setShowCharacterCreation] = useState(false)
  const [showPostcardDesigner, setShowPostcardDesigner] = useState(false)
  const [postcardRequest, setPostcardRequest] = useState<{
    exchangeId: string
    senderId: string
    senderName: string
    senderAvatar?: string
  } | null>(null)
  const [showPostcardRequestModal, setShowPostcardRequestModal] = useState(false)

  // 临时玩家状态
  const [isTemporaryPlayer, setIsTemporaryPlayer] = useState(false)
  const [showAuthPrompt, setShowAuthPrompt] = useState(false)
  const [authPromptMessage, setAuthPromptMessage] = useState('')
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login')
  const [showWelcomeModal, setShowWelcomeModal] = useState(false)
  const { t, locale } = useTranslation()

  // 设置全局登录状态标志
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.isUserAuthenticated = !!user
      console.log('🔐 用户认证状态已更新:', window.isUserAuthenticated)
    }
  }, [user])

  // 预加载积分配置（使用 ConfigStore，避免重复调用）
  useEffect(() => {
    const loadPointsConfig = async () => {
      try {
        const { configStore } = await import('@/lib/stores/ConfigStore')
        const config = await configStore.getPointsConfig()
        // console.log('✅ 积分配置已预加载:', config)
        // 将配置暴露到全局（用于 Phaser 游戏访问）
        if (typeof window !== 'undefined') {
          (window as any).pointsConfig = config
        }
      } catch (error) {
        console.error('⚠️ 预加载积分配置失败:', error)
      }
    }

    loadPointsConfig()
  }, [])

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
  const [workstationModal, setWorkstationModal] = useState<{
    isVisible: boolean,
    workstation: any,
    mode: 'bind' | 'unbind'
  }>({
    isVisible: false,
    workstation: null,
    mode: 'bind'
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

  // 记录上次成功加载工位绑定的用户ID，防止重复请求
  const lastLoadedBindingUserId = useRef<string | null>(null)
  const isBindingLoading = useRef(false)

  // Enhanced device detection
  const [deviceType, setDeviceType] = useState<'mobile' | 'tablet' | 'desktop'>('desktop')
  const [isTablet, setIsTablet] = useState(false)

  // 面板收起状态
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false)
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false)

  // AI 聊天弹窗状态
  const [aiChatModal, setAiChatModal] = useState({
    isOpen: false,
    npcId: '',
    npcName: '',
    greeting: ''
  })

  // 前台客服聊天弹窗状态
  const [frontDeskModal, setFrontDeskModal] = useState({
    isOpen: false,
    id: '',
    name: '',
    serviceScope: '',
    greeting: ''
  })

  // 工位状态更新弹窗状态
  const [showStatusPopup, setShowStatusPopup] = useState(false)

  // 排行榜弹窗状态

  // 同步认证用户数据到currentUser状态，支持临时玩家
  const syncAuthenticatedUser = useCallback(async () => {
    if (user) {
      // 用户已登录 - 确保设置为非临时用户状态
      setIsTemporaryPlayer(false)

      try {
        const gameUserData = localStorage.getItem('pixelDeskUser')
        if (gameUserData) {
          const gameUser = JSON.parse(gameUserData)
          setCurrentUser({
            id: user.id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            points: user.points || gameUser.points || 50,
            username: gameUser.username || user.name,
            character: gameUser.character,
            workstationId: gameUser.workstationId,
            workstations: gameUser.workstations || []
          })
        } else {
          setCurrentUser((prev: any) => ({
            id: user.id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            points: user.points || 50,
            username: user.name,
            workstationId: prev?.workstationId,
            workstations: []
          }))
        }
      } catch (error) {
        console.error('Failed to parse game user data:', error)
        setCurrentUser((prev: any) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          workstationId: prev?.workstationId
        }))
      }
    } else {
      // 用户未登录 - 检查临时玩家或创建新的临时玩家
      let tempPlayerData = getTempPlayerGameData()

      if (!tempPlayerData) {
        // 如果没有临时玩家数据，则创建一个（无论是首次访问还是旧数据过期的访问）
        await createTempPlayer()
        tempPlayerData = getTempPlayerGameData()
      }

      if (tempPlayerData) {
        setCurrentUser(tempPlayerData)
        setIsTemporaryPlayer(true)
      } else {
        setCurrentUser(null)
        setIsTemporaryPlayer(false)
      }
    }
  }, [user])

  // 将 myStatus 同步到 Phaser 游戏实例
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).updateMyStatus && myStatus) {
      console.log('📤 [React Sync] 发送状态到 Phaser:', myStatus);
      (window as any).updateMyStatus(myStatus);
    }
  }, [myStatus])

  // 将 currentUser 同步到 Phaser 游戏实例
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).updatePhaserUserData && currentUser) {
      console.log('📤 [React Sync] 发送数据到 Phaser:', {
        id: currentUser.id,
        workstationId: currentUser.workstationId
      });
      (window as any).updatePhaserUserData(currentUser);
    }
  }, [currentUser])
  // 检查首次访问
  useEffect(() => {
    if (isFirstTimeVisitor()) {
      setShowWelcomeModal(true)
    }
  }, [])

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
      window.setWorkstationBindingModal = ({ isVisible, workstation, mode = 'bind' }) => {
        setWorkstationModal({ isVisible, workstation, mode })
      }

      window.showUnbindingDialog = (workstationId) => {
        if (typeof window !== 'undefined' && window.workstationBindingManager) {
          // 在解约场景下，我们只需要 ID，位置可以设为 0
          const workstation = { id: workstationId, position: { x: 0, y: 0 } }
          window.workstationBindingManager.showUnbindingDialog(workstation, user)
        }
      }

      // 设置工位信息弹窗的全局函数
      window.showWorkstationInfo = (workstationId: number, userId: string) => {
        setWorkstationInfoModal({
          isVisible: true,
          workstationId,
          userId
        })
      }

      // 设置角色点击的全局函数 - 使用独立的 player:click 事件
      window.showPlayerInfo = (userId: string, userInfo: any) => {
        console.log('🔵 [Global] showPlayerInfo called:', { userId, userInfo })

        // 构造完整的 playerData 格式
        const targetPlayer = {
          id: userId,
          name: userInfo?.name || userInfo?.username || `玩家${userId.slice(-4)}`,
          avatar: userInfo?.avatar,
          points: userInfo?.points,
          currentStatus: userInfo?.currentStatus || {
            type: 'working',
            status: '工作中',
            emoji: '💼',
            message: '正在工作中...',
            timestamp: new Date().toISOString()
          },
          isOnline: true,
          lastSeen: new Date().toISOString()
        }

        const mainPlayer = currentUser ? {
          id: currentUser.id,
          name: currentUser.name || currentUser.username,
          avatar: currentUser.avatar,
          currentStatus: {
            type: 'working',
            status: '工作中',
            emoji: '💼',
            message: '',
            timestamp: new Date().toISOString()
          },
          isOnline: true
        } : {
          id: 'temp',
          name: '我',
          currentStatus: {
            type: 'working',
            status: '工作中',
            emoji: '💼',
            message: '',
            timestamp: new Date().toISOString()
          },
          isOnline: true
        }

        // 发送独立的 player:click 事件
        const clickEvent = {
          type: 'player_click',
          targetPlayer,
          mainPlayer,
          timestamp: Date.now(),
          position: { x: 0, y: 0 },
          trigger: 'click'
        }
        console.log('🔵 [Global] Emitting player:click event:', clickEvent)
        EventBus.emit('player:click', clickEvent)
      }

      // 设置角色点击事件的全局函数 - 使用独立的 player:click 事件
      window.showCharacterInfo = (userId: string, userInfo: any, position: { x: number; y: number }) => {
        console.log('🔵 [Global] showCharacterInfo called:', { userId, userInfo, position })

        // 构造完整的 playerData 格式
        const targetPlayer = {
          id: userId,
          name: userInfo?.name || userInfo?.username || `玩家${userId.slice(-4)}`,
          avatar: userInfo?.avatar,
          points: userInfo?.points,
          currentStatus: userInfo?.currentStatus || {
            type: 'working',
            status: '工作中',
            emoji: '💼',
            message: '正在工作中...',
            timestamp: new Date().toISOString()
          },
          isOnline: true,
          lastSeen: new Date().toISOString()
        }

        const mainPlayer = currentUser ? {
          id: currentUser.id,
          name: currentUser.name || currentUser.username,
          avatar: currentUser.avatar,
          currentStatus: {
            type: 'working',
            status: '工作中',
            emoji: '💼',
            message: '',
            timestamp: new Date().toISOString()
          },
          isOnline: true
        } : {
          id: 'temp',
          name: '我',
          currentStatus: {
            type: 'working',
            status: '工作中',
            emoji: '💼',
            message: '',
            timestamp: new Date().toISOString()
          },
          isOnline: true
        }

        // 发送独立的 player:click 事件
        const clickEvent = {
          type: 'player_click',
          targetPlayer,
          mainPlayer,
          timestamp: Date.now(),
          position: position,
          trigger: 'click'
        }
        console.log('🔵 [Global] Emitting player:click event:', clickEvent)
        EventBus.emit('player:click', clickEvent)
      }

      // 设置临时玩家认证提示的全局函数
      window.showTempPlayerAuthPrompt = (message: string) => {
        setAuthPromptMessage(message)
        setShowAuthPrompt(true)
      }

      // 禁用/启用游戏输入的全局函数
      window.disableGameInput = () => {
        const scene = (window as any).gameScene
        if (scene && scene.input) {
          scene.input.enabled = false
          console.log('🎮 游戏输入已禁用')
        }
      }

      window.enableGameInput = () => {
        const scene = (window as any).gameScene
        if (scene && scene.input) {
          scene.input.enabled = true
          console.log('🎮 游戏输入已启用')
        }
      }

      // 监听Phaser游戏初始化完成事件
      window.addEventListener('phaser-game-ready', () => {
        // Phaser游戏已准备好
        loadWorkstationStats()
      })

      // 监听工位解约事件
      window.addEventListener('workstation-unbound', (event: any) => {
        const { userId, workstationId } = event.detail
        console.log(`🗑️ 工位解约成功: 玩家 ${userId}, 工位 ${workstationId}`)

        // 1. 更新本地状态
        setCurrentUser((prev: any) => {
          if (prev && prev.id === userId) {
            return { ...prev, workstationId: null }
          }
          return prev
        })

        // 2. 清理缓存
        localStorage.removeItem(`workstation_binding_${userId}`)
      })
    }

    checkDeviceType()
    loadWorkstationStats()
    window.addEventListener('resize', debouncedCheckDeviceType)
    return () => {
      window.removeEventListener('resize', debouncedCheckDeviceType)
      clearTimeout(resizeTimeout)
    }
  }, [user])

  // 监听认证用户变化，同步currentUser状态
  useEffect(() => {
    syncAuthenticatedUser()

    // 如果用户已认证，立即加载工位绑定信息
    if (user?.id && !isLoading) {
      // 如果已经加载过该用户的绑定，或者正在进行加载，则跳过
      if (lastLoadedBindingUserId.current === user.id || isBindingLoading.current) {
        // console.log('⏭️ [Home] 跳过重复的工位绑定加载:', user.id)
        return
      }

      // 直接调用改进的工位绑定加载函数
      const loadBinding = async () => {
        // console.log('🔍 [inline-loadBinding] 开始加载用户工位绑定:', user.id)
        isBindingLoading.current = true

        // 首先尝试从localStorage获取缓存的绑定信息
        const cachedBinding = localStorage.getItem(`workstation_binding_${user.id}`)
        if (cachedBinding) {
          try {
            const binding = JSON.parse(cachedBinding)
            // console.log('💾 [inline-loadBinding] 使用缓存的绑定信息:', binding)
            setCurrentUser((prev: any) => {
              // 只有在还没有workstationId或者不同的时候才更新，减少渲染次数
              if (prev && prev.workstationId === String(binding.workstationId)) return prev
              return {
                ...prev,
                workstationId: String(binding.workstationId)
              }
            })
          } catch (error) {
            // 缓存解析失败
          }
        }

        try {
          // 优化：移除 cleanup=true，由服务端自动处理。减少 redundant 请求。
          const response = await fetch(`/api/workstations/user-bindings?userId=${user.id}`)

          if (response.ok) {
            const data = await response.json()
            // console.log('📡 [inline-loadBinding] API响应:', data)

            if (data.success && data.data.length > 0) {
              const binding = data.data[0]
              const workstationId = String(binding.workstationId)

              setCurrentUser((prev: any) => ({
                ...prev,
                workstationId: workstationId,
                workstationExpiresAt: binding.expiresAt
              }))

              // 缓存绑定信息
              localStorage.setItem(`workstation_binding_${user.id}`, JSON.stringify({
                workstationId: binding.workstationId,
                boundAt: binding.boundAt,
                expiresAt: binding.expiresAt,
                timestamp: Date.now()
              }))

              lastLoadedBindingUserId.current = user.id
              // console.log('✅ [inline-loadBinding] 工位绑定已加载:', workstationId)

            } else if (data.success && data.data.length === 0) {
              setCurrentUser((prev: any) => {
                if (prev && prev.workstationId === null) return prev
                return { ...prev, workstationId: null }
              })
              localStorage.removeItem(`workstation_binding_${user.id}`)
              lastLoadedBindingUserId.current = user.id
              // console.log('⚠️ [inline-loadBinding] 用户未绑定工位')

            } else if (!data.success && data.code?.startsWith('DB_')) {
              console.warn('⚠️ [inline-loadBinding] 数据库连接问题，使用缓存数据:', data.error)
              if (!cachedBinding) {
                setCurrentUser((prev: any) => {
                  if (prev && prev.workstationId === null) return prev
                  return { ...prev, workstationId: null }
                })
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
        } finally {
          isBindingLoading.current = false
        }
      }
      loadBinding()
    } else if (!user && !isLoading) {
      // 退出登录时，清理状态
      lastLoadedBindingUserId.current = null
    }
  }, [user, isLoading, syncAuthenticatedUser])

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

  // 监听 AI NPC 聊天事件
  useEffect(() => {
    const handleOpenAiChat = (event: CustomEvent) => {
      const { npcId, npcName, greeting } = event.detail
      console.log('🤖 打开 AI 聊天:', npcName)
      setAiChatModal({
        isOpen: true,
        npcId,
        npcName,
        greeting: greeting || ''
      })
    }

    // 监听前台客服聊天事件（由 F 键触发）
    const handleOpenFrontDeskChat = (event: CustomEvent) => {
      const { id, name, serviceScope, greeting } = event.detail
      console.log('🏢 打开前台客服聊天:', name)
      setFrontDeskModal({
        isOpen: true,
        id,
        name,
        serviceScope,
        greeting: greeting || ''
      })
    }

    // 监听前台碰撞事件（显示 toast 提示）
    const handleFrontDeskCollision = (event: CustomEvent) => {
      const { id, name, serviceScope, greeting } = event.detail
      console.log('🏢 显示前台交互提示:', name)

      // 在 Phaser 中显示提示（如果 gameScene 存在）
      if (typeof window !== 'undefined' && (window as any).gameScene) {
        (window as any).gameScene.showCollisionNotification(t.common.press_f_to_talk.replace('{name}', name), 'info')
      }
    }

    window.addEventListener('open-ai-chat', handleOpenAiChat as EventListener)
    window.addEventListener('open-front-desk-chat', handleOpenFrontDeskChat as EventListener)
    window.addEventListener('front-desk-collision-start', handleFrontDeskCollision as EventListener)

    // 监听碰到自己工位的事件
    const handleMyWorkstationCollision = (e: any) => {
      console.log('🎯 [Home] 收到碰撞事件 start:', e.detail)
      setShowStatusPopup(true)
    }
    const handleMyWorkstationCollisionEnd = (e: any) => {
      console.log('👋 [Home] 收到碰撞事件 end:', e.detail)
      setShowStatusPopup(false)
    }

    window.addEventListener('my-workstation-collision-start', handleMyWorkstationCollision)
    window.addEventListener('my-workstation-collision-end', handleMyWorkstationCollisionEnd)

    return () => {
      window.removeEventListener('open-ai-chat', handleOpenAiChat as EventListener)
      window.removeEventListener('open-front-desk-chat', handleOpenFrontDeskChat as EventListener)
      window.removeEventListener('front-desk-collision-start', handleFrontDeskCollision as EventListener)
      window.removeEventListener('my-workstation-collision-start', handleMyWorkstationCollision)
      window.removeEventListener('my-workstation-collision-end', handleMyWorkstationCollisionEnd)
    }
  }, [])

  // 重新启用工位统计功能 - 优化：使用 ConfigStore 避免重复 API 调用
  const loadWorkstationStats = useCallback(async () => {
    try {
      const { configStore } = await import('@/lib/stores/ConfigStore')
      const stats = await configStore.getStats()
      setWorkstationStats(stats)
      console.log('✅ [page.tsx] 工位统计已从 ConfigStore 加载')
    } catch (error) {
      console.warn('❌ [page.tsx] 加载工位统计失败:', error)
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


  // 处理玩家点击请求 - 点击事件已在 Phaser 层面通过 EventBus 处理
  const handlePlayerClick = useCallback((playerData: any) => {
    // 保留此函数以保持向后兼容，但实际处理已在 Phaser 层完成
    console.log('[HomePage] Player click handler (legacy, actual handling in Phaser):', playerData)
  }, [])

  /**
   * 处理工位绑定或解约确认
   */
  const handleWorkstationBindingConfirm = useCallback(async () => {
    if (!window.workstationBindingManager) return { success: false, error: 'Manager not loaded' }

    if (workstationModal.mode === 'unbind') {
      return await window.workstationBindingManager.handleUnbindingConfirm()
    } else {
      return await window.workstationBindingManager.handleBindingConfirm()
    }
  }, [workstationModal.mode])

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
    setWorkstationModal({
      isVisible: false,
      workstation: null,
      mode: 'bind'
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

  const handleOpenPostcardRequest = useCallback((request: any) => {
    setPostcardRequest(request)
    setShowPostcardRequestModal(true)
  }, [])

  const handleAcceptExchange = async (exchangeId: string) => {
    try {
      const res = await fetch('/api/postcards/exchange', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exchangeId, action: 'ACCEPT' })
      })
      const data = await res.json()
      if (data.success) {
        console.log(t.postcard?.swap_confirm_success || 'Exchange accepted!')
        alert('Exchange successful! Card added to collection.')
        setShowPostcardRequestModal(false)
        setPostcardRequest(null)
      } else {
        console.error(data.error || 'Failed to accept')
        alert(data.error || 'Failed to accept exchange. Make sure you have created your own postcard first!')
      }
    } catch (error) {
      console.error('Accept exchange failed', error)
    }
  }

  const handleRejectExchange = async (exchangeId: string) => {
    try {
      const res = await fetch('/api/postcards/exchange', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exchangeId, action: 'REJECT' })
      })
      const data = await res.json()
      if (data.success) {
        console.log(t.postcard?.swap_reject_success || 'Exchange rejected')
        setShowPostcardRequestModal(false)
        setPostcardRequest(null)
      } else {
        console.error(data.error || 'Failed to reject')
      }
    } catch (error) {
      console.error('Reject exchange failed', error)
    }
  }

  useEffect(() => {
    // 只有在非登录状态下，才考虑临时玩家逻辑
    if (user) {
      setIsTemporaryPlayer(false)
      if (playerExists === false) {
        setShowCharacterCreation(true)
      } else if (playerExists === true) {
        setShowCharacterCreation(false)
      }
    } else {
      // 未登录时的逻辑
      const tempPlayerData = getTempPlayerGameData()
      if (tempPlayerData) {
        setIsTemporaryPlayer(true)
        setPlayerExists(true) // 临时玩家不需要创建角色
        setShowCharacterCreation(false)
      }
    }
  }, [user, playerExists, setPlayerExists])

  // 移除多余的延时检查，逻辑已在上方的 useEffect 中处理

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
        userData={currentUser}
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
      isCollapsed={leftPanelCollapsed}
      onCollapsedChange={setLeftPanelCollapsed}
      onOpenPostcardDesigner={() => setShowPostcardDesigner(true)}
      isTemporaryPlayer={isTemporaryPlayer}
      onAuthClick={() => {
        setAuthPromptMessage('登录或注册账号即可享受完整体验，包括工位绑定、名信片收集等功能！')
        setShowAuthPrompt(true)
      }}
    >
      {/* 状态更新组件 */}
      {memoizedPostStatus}
    </LeftPanel>
  ), [currentUser?.id, currentUser?.name, currentUser?.points, workstationStats, isMobile, isTablet, memoizedPostStatus, leftPanelCollapsed, isTemporaryPlayer])

  // Create memoized right panel content
  const memoizedRightPanel = useMemo(() => (
    <RightPanel
      currentUser={currentUser}
      selectedPlayer={selectedPlayer}
      onPostClick={handlePostClick}
      onOpenPostcardRequest={handleOpenPostcardRequest}
      isMobile={isMobile}
      isTablet={isTablet}
      isCollapsed={rightPanelCollapsed}
      onCollapsedChange={setRightPanelCollapsed}
    />
  ), [currentUser?.id, selectedPlayer, handlePostClick, isMobile, isTablet, rightPanelCollapsed])

  // 如果正在加载认证状态，显示加载界面
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 border-4 border-retro-purple border-t-transparent rounded-full "></div>
          <p className="text-white text-lg">Loading Tembo PX Workshop...</p>
        </div>
      </div>
    )
  }

  // 如果没有当前用户（既没有登录用户也没有临时玩家），显示准备中
  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 border-4 border-retro-purple border-t-transparent rounded-full animate-spin"></div>
          <p className="text-white text-lg">Preparing your gaming experience...</p>
          <p className="text-gray-500 text-sm">正在初始化玩家数据... (isLoading: {String(isLoading)})</p>
          <button
            onClick={() => {
              // 强制设置一个紧急的回退状态
              setCurrentUser({
                id: 'emergency-guest-' + Date.now(),
                name: '访客',
                character: 'hangli',
                points: 100,
                isTemporary: true
              })
              setIsTemporaryPlayer(true)
            }}
            className="mt-8 px-4 py-2 text-xs text-gray-400 hover:text-white border border-gray-800 rounded transition-colors"
          >
            如果长时间没响应，点击此处强制进入
          </button>
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
        leftPanelCollapsed={leftPanelCollapsed}
        rightPanelCollapsed={rightPanelCollapsed}
      />

      {/* All modals */}
      {/* 工位绑定弹窗 */}
      <WorkstationBindingModal
        isVisible={workstationModal.isVisible}
        workstation={workstationModal.workstation}
        user={user}
        mode={workstationModal.mode}
        onConfirm={handleWorkstationBindingConfirm}
        onCancel={() => setWorkstationModal(prev => ({ ...prev, isVisible: false }))}
        onClose={() => setWorkstationModal(prev => ({ ...prev, isVisible: false }))}
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

      {/* AI NPC 聊天弹窗 */}
      <AiChatModal
        isOpen={aiChatModal.isOpen}
        onClose={() => setAiChatModal(prev => ({ ...prev, isOpen: false }))}
        npcId={aiChatModal.npcId}
        npcName={aiChatModal.npcName}
        greeting={aiChatModal.greeting}
      />

      {/* 前台客服聊天弹窗 */}
      <FrontDeskChatModal
        isOpen={frontDeskModal.isOpen}
        onClose={() => setFrontDeskModal(prev => ({ ...prev, isOpen: false }))}
        deskInfo={{
          id: frontDeskModal.id,
          name: frontDeskModal.name,
          serviceScope: frontDeskModal.serviceScope,
          greeting: frontDeskModal.greeting
        }}
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
            {/* 隐藏的背景遮罩（用于点击面板外部关闭） */}
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
                    setAuthModalMode('login')
                    setShowAuthModal(true)
                  }}
                  className="bg-retro-bg-dark border border-retro-border hover:bg-retro-border/30 text-white font-medium py-2 px-4 rounded-lg transition-all"
                >
                  已有账号登录
                </button>
                <button
                  onClick={() => {
                    setShowAuthPrompt(false)
                    setAuthModalMode('register')
                    setShowAuthModal(true)
                  }}
                  className="bg-gradient-to-r from-retro-purple to-retro-pink hover:from-retro-purple/90 hover:to-retro-pink/90 text-white font-bold py-2 px-6 rounded-lg shadow-lg hover:shadow-purple-500/25 transform hover:scale-[1.02] active:scale-[0.98]"
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

      {/* 临时玩家的认证模态框 */}
      {showAuthModal && (
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          initialMode={authModalMode}
        />
      )}

      {/* 图书馆弹窗 - 始终监听，组件内部通过事件控制显示 */}
      <LibraryModal onClose={() => console.log('Library closed')} />
      <BillboardUI />

      {/* 工位状态更新弹窗 */}
      <WorkstationStatusPopup
        isVisible={showStatusPopup}
        onStatusUpdate={handleStatusUpdate}
        onClose={() => setShowStatusPopup(false)}
        userId={currentUser?.id}
        workstationId={currentUser?.workstationId ? parseInt(currentUser.workstationId) : undefined}
        language={(typeof window !== 'undefined' ? (localStorage.getItem('pixeldesk-language') || 'zh-CN') : 'zh-CN') as any}
      />
      <PostcardDesignerModal
        isOpen={showPostcardDesigner}
        onClose={() => setShowPostcardDesigner(false)}
      />

      <PostcardRequestModal
        isOpen={showPostcardRequestModal}
        onClose={() => setShowPostcardRequestModal(false)}
        request={postcardRequest}
        onAccept={handleAcceptExchange}
        onReject={handleRejectExchange}
      />

      {/* 欢迎弹窗 */}
      <WelcomeModal
        isOpen={showWelcomeModal}
        onClose={() => setShowWelcomeModal(false)}
        onLogin={() => {
          setAuthModalMode('login')
          setShowAuthModal(true)
        }}
      />
    </div>
  )
}
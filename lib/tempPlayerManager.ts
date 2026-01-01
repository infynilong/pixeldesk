'use client'

// 临时玩家管理器 - 处理未注册用户的游戏体验
import { getRandomCharacter } from './services/characterService'

interface TempPlayer {
  id: string
  username: string
  character: string
  points: number
  isTemporary: true
  createdAt: string
  lastActiveAt: string
}

interface TempPlayerData {
  user: TempPlayer
  gameState: {
    currentX: number
    currentY: number
    currentScene: string
  }
}

const TEMP_PLAYER_KEY = 'pixelDesk_tempPlayer'
const FIRST_VISIT_KEY = 'pixelDesk_hasVisited'
const TEMP_PLAYER_EXPIRY = 7 * 24 * 60 * 60 * 1000 // 7天过期

/**
 * 检查是否为首次访问
 */
export function isFirstTimeVisitor(): boolean {
  if (typeof window === 'undefined') return false

  try {
    // 检查localStorage和sessionStorage
    const hasVisited = localStorage.getItem(FIRST_VISIT_KEY)
    const hasTempPlayer = localStorage.getItem(TEMP_PLAYER_KEY)

    return !hasVisited && !hasTempPlayer
  } catch (error) {
    console.warn('Failed to check first visit status:', error)
    return false
  }
}

/**
 * 标记已访问
 */
export function markAsVisited(): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(FIRST_VISIT_KEY, 'true')
  } catch (error) {
    console.warn('Failed to mark as visited:', error)
  }
}

/**
 * 生成随机的临时用户名
 */
function generateTempUsername(): string {
  const adjectives = ['勇敢的', '聪明的', '快乐的', '神秘的', '优雅的', '活跃的', '冷静的', '热情的']
  const nouns = ['访客', '玩家', '探索者', '新手', '旅行者', '冒险家', '学者', '工匠']

  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)]
  const noun = nouns[Math.floor(Math.random() * nouns.length)]
  const number = Math.floor(Math.random() * 999) + 1

  return `${adjective}${noun}${number}`
}

/**
 * 生成随机角色（从API获取）
 */
async function generateRandomCharacter(): Promise<string> {
  try {
    const character = await getRandomCharacter()
    return character.name
  } catch (error) {
    console.error('Failed to get random character from API:', error)
    // 如果API失败，返回默认角色
    return 'hangli'
  }
}

/**
 * 创建临时玩家数据
 */
export async function createTempPlayer(): Promise<TempPlayerData> {
  const now = new Date().toISOString()
  const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  const tempPlayerData: TempPlayerData = {
    user: {
      id: tempId,
      username: generateTempUsername(),
      character: await generateRandomCharacter(),
      points: 100,
      isTemporary: true,
      createdAt: now,
      lastActiveAt: now
    },
    gameState: {
      currentX: 400,
      currentY: 300,
      currentScene: 'Start'
    }
  }

  // 保存到localStorage
  saveTempPlayer(tempPlayerData)
  markAsVisited()

  console.log('🎮 临时玩家已创建:', tempPlayerData.user.username)

  return tempPlayerData
}

/**
 * 保存临时玩家数据到localStorage
 */
export function saveTempPlayer(data: TempPlayerData): void {
  if (typeof window === 'undefined') return

  try {
    data.user.lastActiveAt = new Date().toISOString()
    localStorage.setItem(TEMP_PLAYER_KEY, JSON.stringify(data))
  } catch (error) {
    console.warn('Failed to save temp player data:', error)
  }
}

/**
 * 获取临时玩家数据
 */
export function getTempPlayer(): TempPlayerData | null {
  if (typeof window === 'undefined') return null

  try {
    const data = localStorage.getItem(TEMP_PLAYER_KEY)
    if (!data) return null

    const tempPlayer: TempPlayerData = JSON.parse(data)

    // 检查是否过期
    const createdAt = new Date(tempPlayer.user.createdAt).getTime()
    const now = Date.now()

    if (now - createdAt > TEMP_PLAYER_EXPIRY) {
      console.log('🕒 临时玩家已过期，清理中...')
      clearTempPlayer()
      return null
    }

    return tempPlayer
  } catch (error) {
    console.warn('Failed to get temp player data:', error)
    return null
  }
}

/**
 * 更新临时玩家数据
 */
export function updateTempPlayer(updates: Partial<TempPlayer>): boolean {
  if (typeof window === 'undefined') return false

  try {
    const currentData = getTempPlayer()
    if (!currentData) return false

    const updatedData: TempPlayerData = {
      ...currentData,
      user: {
        ...currentData.user,
        ...updates,
        lastActiveAt: new Date().toISOString()
      }
    }

    saveTempPlayer(updatedData)
    return true
  } catch (error) {
    console.warn('Failed to update temp player:', error)
    return false
  }
}

/**
 * 清理临时玩家数据
 */
export function clearTempPlayer(): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.removeItem(TEMP_PLAYER_KEY)
    console.log('🧹 临时玩家数据已清理')
  } catch (error) {
    console.warn('Failed to clear temp player data:', error)
  }
}

/**
 * 检查当前是否有有效的临时玩家
 */
export function hasTempPlayer(): boolean {
  return getTempPlayer() !== null
}

/**
 * 获取临时玩家的游戏数据（兼容现有的playerSync系统）
 */
export function getTempPlayerGameData() {
  const tempPlayer = getTempPlayer()
  if (!tempPlayer) return null

  return {
    id: tempPlayer.user.id,
    username: tempPlayer.user.username,
    character: tempPlayer.user.character,
    points: tempPlayer.user.points,
    workstations: [], // 临时玩家没有工位绑定
    isTemporary: true,
    // 兼容Phaser游戏期望的格式
    name: tempPlayer.user.username,
    avatar: tempPlayer.user.character
  }
}

/**
 * 迁移临时玩家到正式用户（注册后调用）
 */
export function migrateTempPlayerToUser(userId: string): {
  tempPlayerData: TempPlayerData | null
  migrationSuccess: boolean
} {
  const tempPlayerData = getTempPlayer()

  if (!tempPlayerData) {
    return { tempPlayerData: null, migrationSuccess: false }
  }

  try {
    // 保存临时玩家的一些游戏状态，以便可能的数据迁移
    const migrationData = {
      tempPlayTime: Date.now() - new Date(tempPlayerData.user.createdAt).getTime(),
      tempPoints: tempPlayerData.user.points,
      tempCharacter: tempPlayerData.user.character,
      tempGameState: tempPlayerData.gameState
    }

    // 可以将这些数据传递给新用户的初始化
    console.log('📊 临时玩家迁移数据:', migrationData)

    // 清理临时玩家数据
    clearTempPlayer()

    console.log('✅ 临时玩家已成功迁移到正式用户:', userId)

    return { tempPlayerData, migrationSuccess: true }
  } catch (error) {
    console.error('❌ 临时玩家迁移失败:', error)
    return { tempPlayerData, migrationSuccess: false }
  }
}

/**
 * 检查操作是否需要认证
 */
export function requiresAuthentication(action: string): boolean {
  const restrictedActions = [
    'bind_workstation',
    'unbind_workstation',
    'save_progress',
    'leaderboard',
    'social_features',
    'premium_features'
  ]

  return restrictedActions.includes(action)
}

/**
 * 获取认证提示消息
 */
export function getAuthPromptMessage(action: string): string {
  const messages: Record<string, string> = {
    bind_workstation: '绑定工位需要注册账号，这样您的工位就能永久保存了！',
    unbind_workstation: '管理工位需要注册账号才能进行操作',
    save_progress: '保存游戏进度需要注册账号，避免数据丢失',
    social_features: '社交功能需要注册账号才能使用',
    premium_features: '高级功能需要注册账号才能解锁',
    default: '这个功能需要注册账号才能使用，注册后即可享受完整游戏体验！'
  }

  return messages[action] || messages.default
}
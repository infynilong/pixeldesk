/**
 * Player Synchronization Utility
 * 
 * This utility bridges the authentication system with the Phaser game's localStorage data.
 * It ensures that authenticated users see their own player data in the game.
 */

export interface GamePlayerData {
  id: string
  username: string
  character: string
  points: number
  registeredAt: string
  workstations: any[]
  // Additional game state
  x?: number
  y?: number
  scene?: string
  playerState?: any
}

export interface PlayerSyncResult {
  success: boolean
  hasPlayer: boolean  
  playerData?: GamePlayerData
  error?: string
}

/**
 * Fetches the current user's player data from the API
 */
export async function fetchPlayerData(): Promise<PlayerSyncResult> {
  try {
    const response = await fetch('/api/player', {
      method: 'GET',
      credentials: 'include',
    })

    const data = await response.json()

    if (response.ok && data.success) {
      // Convert API player data to game format
      const gamePlayerData: GamePlayerData = {
        id: data.data.user.id,
        username: data.data.player.playerName,
        character: data.data.player.characterSprite,
        points: data.data.player.gamePoints,
        registeredAt: data.data.player.createdAt,
        workstations: [],
        x: data.data.player.currentX,
        y: data.data.player.currentY,
        scene: data.data.player.currentScene,
        playerState: data.data.player.playerState
      }

      return {
        success: true,
        hasPlayer: true,
        playerData: gamePlayerData
      }
    } else if (response.status === 404) {
      // User doesn't have a player yet
      return {
        success: true,
        hasPlayer: false
      }
    } else {
      return {
        success: false,
        hasPlayer: false,
        error: data.error || 'Failed to fetch player data'
      }
    }
  } catch (error) {
    console.error('Error fetching player data:', error)
    return {
      success: false,
      hasPlayer: false,
      error: 'Network error'
    }
  }
}

/**
 * Updates player data on the server
 */
export async function updatePlayerData(updates: Partial<{
  gamePoints: number
  currentX: number
  currentY: number
  currentScene: string
  playerState: any
}>): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/player', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(updates),
    })

    const data = await response.json()

    return {
      success: response.ok && data.success,
      error: data.error
    }
  } catch (error) {
    console.error('Error updating player data:', error)
    return {
      success: false,
      error: 'Network error'
    }
  }
}

/**
 * Syncs authenticated user's player data to localStorage for Phaser game
 */
export async function syncPlayerToLocalStorage(): Promise<PlayerSyncResult> {
  const result = await fetchPlayerData()

  if (result.success && result.hasPlayer && result.playerData) {
    // Update localStorage with authenticated user's player data
    localStorage.setItem('pixelDeskUser', JSON.stringify(result.playerData))
    
    // Also sync player state if available
    if (result.playerData.playerState) {
      localStorage.setItem('playerState', JSON.stringify(result.playerData.playerState))
    }

    console.log('Player data synced to localStorage:', result.playerData)
  } else if (result.success && !result.hasPlayer) {
    // User has no player - clear localStorage to prevent old data
    localStorage.removeItem('pixelDeskUser')
    localStorage.removeItem('playerState')
    console.log('No player found - cleared localStorage')
  }

  return result
}

/**
 * Clears player data from localStorage (called on logout)
 */
export async function clearPlayerFromLocalStorage(): Promise<void> {
  localStorage.removeItem('pixelDeskUser')
  localStorage.removeItem('playerState')
  console.log('Player data cleared from localStorage')
}

/**
 * Syncs localStorage player state back to the server
 */
export async function syncLocalStorageToServer(): Promise<{ success: boolean; error?: string }> {
  try {
    const playerDataStr = localStorage.getItem('pixelDeskUser')
    const playerStateStr = localStorage.getItem('playerState')

    if (!playerDataStr) {
      return { success: true } // No data to sync
    }

    const playerData = JSON.parse(playerDataStr)
    const playerState = playerStateStr ? JSON.parse(playerStateStr) : null

    const updates: any = {}

    // Sync points if changed
    if (typeof playerData.points === 'number') {
      updates.gamePoints = playerData.points
    }

    // Sync position if available
    if (typeof playerData.x === 'number') {
      updates.currentX = playerData.x
    }
    if (typeof playerData.y === 'number') {
      updates.currentY = playerData.y
    }

    // Sync scene if available
    if (typeof playerData.scene === 'string') {
      updates.currentScene = playerData.scene
    }

    // Sync player state
    if (playerState) {
      updates.playerState = playerState
    }

    if (Object.keys(updates).length > 0) {
      return await updatePlayerData(updates)
    }

    return { success: true }
  } catch (error) {
    console.error('Error syncing localStorage to server:', error)
    return {
      success: false,
      error: 'Failed to sync player data'
    }
  }
}

// 全局定时器引用，防止重复创建多个定时器
let syncTimer: NodeJS.Timeout | null = null
// 上次同步的数据快照，用于变化检测
let lastSyncData: string | null = null

/**
 * 检查数据是否发生了变化，只有变化时才同步
 */
function hasDataChanged(): boolean {
  try {
    const playerDataStr = localStorage.getItem('pixelDeskUser')
    const playerStateStr = localStorage.getItem('playerState')

    const currentData = JSON.stringify({
      playerData: playerDataStr,
      playerState: playerStateStr
    })

    if (currentData !== lastSyncData) {
      lastSyncData = currentData
      return true
    }

    return false
  } catch (error) {
    console.error('Error checking data changes:', error)
    return false
  }
}

/**
 * Initialize player sync system
 * Call this when the app starts or when user logs in
 */
export async function initializePlayerSync(): Promise<PlayerSyncResult> {
  console.log('Initializing optimized player sync...')

  // 清理已存在的定时器，防止重复创建导致CPU占用过高
  if (syncTimer) {
    clearInterval(syncTimer)
    syncTimer = null
    console.log('🔧 Cleared existing player sync timer to prevent duplicates')
  }

  // First sync from server to localStorage
  const result = await syncPlayerToLocalStorage()

  // Set up periodic sync from localStorage to server - 大幅减少同步频率
  if (result.success && result.hasPlayer) {
    // 将同步间隔从30秒增加到5分钟，并添加变化检测
    syncTimer = setInterval(async () => {
      // 只有数据发生变化时才进行同步，大幅减少不必要的数据库操作
      if (hasDataChanged()) {
        console.log('🔄 Player data changed, syncing to server...')
        await syncLocalStorageToServer()
      }
    }, 300000) // 5分钟 = 300000ms，比原来的30秒减少了10倍
    console.log('⏰ Created optimized player sync timer (5min interval with change detection)')
  }

  return result
}
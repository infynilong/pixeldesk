/**
 * 积分管理工具
 * 用于获取积分配置和执行积分奖励/扣除操作
 */
import { prisma } from './db'
import { randomUUID } from 'crypto'

// 积分配置缓存，避免频繁查询数据库
let configCache: Record<string, number> | null = null
let cacheTimestamp = 0
const CACHE_TTL = 5 * 60 * 1000 // 5分钟缓存

/**
 * 获取积分配置
 * @param key 配置键
 * @param useCache 是否使用缓存，默认 true
 */
export async function getPointsConfig(key: string, useCache = true): Promise<number> {
  try {
    // 检查缓存
    if (useCache && configCache && Date.now() - cacheTimestamp < CACHE_TTL) {
      if (configCache[key] !== undefined) {
        return configCache[key]
      }
    }

    // 从数据库获取
    const config = await prisma.points_config.findUnique({
      where: { key, isActive: true }
    })

    if (!config) {
      console.warn(`积分配置 ${key} 不存在，使用默认值 0`)
      return 0
    }

    return config.value
  } catch (error) {
    console.error(`获取积分配置失败: ${key}`, error)
    return 0
  }
}

/**
 * 刷新积分配置缓存
 */
export async function refreshPointsConfigCache(): Promise<void> {
  try {
    const configs = await prisma.points_config.findMany({
      where: { isActive: true }
    })

    configCache = configs.reduce((acc, config) => {
      acc[config.key] = config.value
      return acc
    }, {} as Record<string, number>)

    cacheTimestamp = Date.now()
    console.log('✅ 积分配置缓存已刷新')
  } catch (error) {
    console.error('刷新积分配置缓存失败:', error)
  }
}

/**
 * 获取所有积分配置（键值对形式）
 */
export async function getAllPointsConfig(): Promise<Record<string, number>> {
  // 如果缓存有效，直接返回
  if (configCache && Date.now() - cacheTimestamp < CACHE_TTL) {
    return configCache
  }

  // 刷新缓存
  await refreshPointsConfigCache()
  return configCache || {}
}

/**
 * 奖励用户积分
 * @param userId 用户ID
 * @param configKey 配置键
 * @param reason 奖励原因（可选，用于日志）
 */
export async function rewardPoints(
  userId: string,
  configKey: string,
  reason?: string
): Promise<{ success: boolean; points: number; newTotal: number }> {
  try {
    // 获取积分配置
    const points = await getPointsConfig(configKey)

    if (points <= 0) {
      console.warn(`积分配置 ${configKey} 的值无效: ${points}`)
      return { success: false, points: 0, newTotal: 0 }
    }

    // 使用事务同时更新积分和记录历史
    const updatedUser = await prisma.$transaction(async (tx) => {
      // 更新用户积分 - 注意使用 tx.users 而不是 tx.user
      const user = await tx.users.update({
        where: { id: userId },
        data: {
          points: { increment: points }
        }
      })

      // 记录历史 - 注意使用 tx.points_history 而不是 tx.points_history
      await tx.points_history.create({
        data: {
          id: randomUUID(),
          userId,
          amount: points,
          reason: reason || configKey,
          type: 'EARN',
          balance: user.points
        }
      })

      return user
    })

    console.log(`✨ 用户 ${userId} 获得 ${points} 积分 (${configKey})${reason ? `: ${reason}` : ''}`)

    return {
      success: true,
      points,
      newTotal: updatedUser.points
    }
  } catch (error) {
    console.error(`奖励积分失败:`, error)
    return { success: false, points: 0, newTotal: 0 }
  }
}

/**
 * 扣除用户积分
 * @param userId 用户ID
 * @param configKey 配置键
 * @param reason 扣除原因（可选，用于日志）
 */
export async function deductPoints(
  userId: string,
  configKey: string,
  reason?: string
): Promise<{ success: boolean; points: number; newTotal: number; error?: string }> {
  try {
    // 获取积分配置
    const points = await getPointsConfig(configKey)

    if (points <= 0) {
      return {
        success: false,
        points: 0,
        newTotal: 0,
        error: '积分配置无效'
      }
    }

    // 检查用户当前积分
    const currentUser = await prisma.users.findUnique({
      where: { id: userId },
      select: { points: true }
    })

    if (!currentUser) {
      return {
        success: false,
        points: 0,
        newTotal: 0,
        error: '用户不存在'
      }
    }

    if (currentUser.points < points) {
      return {
        success: false,
        points: 0,
        newTotal: currentUser.points,
        error: '积分不足'
      }
    }

    // 使用事务更新积分和记录历史
    const updatedUser = await prisma.$transaction(async (tx) => {
      // 扣除积分
      const user = await tx.user.update({
        where: { id: userId },
        data: {
          points: { decrement: points }
        }
      })

      // 记录历史
      await tx.pointsHistory.create({
        data: {
          userId,
          amount: -points, // 扣除显示负数
          reason: reason || configKey,
          type: 'SPEND',
          balance: user.points
        }
      })

      return user
    })

    console.log(`💰 用户 ${userId} 扣除 ${points} 积分 (${configKey})${reason ? `: ${reason}` : ''}`)

    return {
      success: true,
      points,
      newTotal: updatedUser.points
    }
  } catch (error) {
    console.error(`扣除积分失败:`, error)
    return {
      success: false,
      points: 0,
      newTotal: 0,
      error: '扣除失败'
    }
  }
}

/**
 * 检查用户是否有足够积分
 */
export async function hasEnoughPoints(userId: string, configKey: string): Promise<boolean> {
  try {
    const requiredPoints = await getPointsConfig(configKey)
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { points: true }
    })

    return user ? user.points >= requiredPoints : false
  } catch (error) {
    console.error('检查积分失败:', error)
    return false
  }
}

// 初始化时刷新缓存
refreshPointsConfigCache().catch(console.error)

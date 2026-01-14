/**
 * Character Key Utilities
 *
 * 核心原则：
 * - 数据库只存储角色key（如 'hangli', 'Premade_Character_48x48_01'）
 * - API层负责将key转换为完整的imageUrl
 * - 前端使用转换后的URL进行展示
 */

import prisma from '@/lib/db'

/**
 * 角色信息接口（包含URL）
 */
export interface CharacterWithUrl {
  id: string
  name: string
  displayName: string
  imageUrl: string
  frameWidth: number
  frameHeight: number
  totalFrames: number
  isCompactFormat: boolean
  price: number
  isDefault: boolean
  isActive: boolean
}

/**
 * 将角色key转换为图片URL
 *
 * @param characterKey - 角色标识key（如 'hangli'）
 * @returns 完整的图片URL路径
 *
 * @example
 * getCharacterImageUrl('hangli') // returns '/assets/characters/hangli.png'
 * getCharacterImageUrl('/avatars/xxx.jpeg') // returns '/avatars/xxx.jpeg' (保持不变)
 */
export function getCharacterImageUrl(characterKey: string | null | undefined): string | null {
  if (!characterKey) return null

  // 如果已经是完整路径（以/开头或http开头），直接返回
  if (characterKey.startsWith('/') || characterKey.startsWith('http')) {
    return characterKey
  }

  // 基础路径
  const basePath = '/assets/characters'

  // 默认使用.png扩展名
  // 如果key已经包含扩展名，直接使用；否则添加.png
  const hasExtension = /\.(png|jpg|jpeg|webp|gif)$/i.test(characterKey)
  const filename = hasExtension ? characterKey : `${characterKey}.png`

  return `${basePath}/${filename}`
}

/**
 * 从数据库获取角色信息（缓存）
 */
const characterCache = new Map<string, CharacterWithUrl | null>()
const CACHE_TTL = 5 * 60 * 1000 // 5分钟缓存
const cacheTimestamps = new Map<string, number>()

/**
 * 根据角色key从数据库获取完整的角色信息
 *
 * @param characterKey - 角色标识key
 * @returns 角色完整信息，包含imageUrl
 */
export async function getCharacterByKey(
  characterKey: string | null | undefined
): Promise<CharacterWithUrl | null> {
  if (!characterKey) return null

  // 检查缓存
  const now = Date.now()
  const cachedTime = cacheTimestamps.get(characterKey)

  if (cachedTime && (now - cachedTime) < CACHE_TTL && characterCache.has(characterKey)) {
    return characterCache.get(characterKey) || null
  }

  try {
    // 从数据库查询
    const character = await prisma.characters.findFirst({
      where: {
        name: characterKey,
        isActive: true
      },
      select: {
        id: true,
        name: true,
        displayName: true,
        imageUrl: true,
        frameWidth: true,
        frameHeight: true,
        totalFrames: true,
        isCompactFormat: true,
        price: true,
        isDefault: true,
        isActive: true,
      }
    })

    // 更新缓存
    characterCache.set(characterKey, character)
    cacheTimestamps.set(characterKey, now)

    return character
  } catch (error) {
    console.error(`Error fetching character by key: ${characterKey}`, error)
    return null
  }
}

/**
 * 批量获取多个角色信息
 *
 * @param characterKeys - 角色key数组
 * @returns 角色信息数组
 */
export async function getCharactersByKeys(
  characterKeys: (string | null | undefined)[]
): Promise<Map<string, CharacterWithUrl | null>> {
  const validKeys = characterKeys.filter((key): key is string => !!key)
  const uniqueKeys = Array.from(new Set(validKeys))

  const results = new Map<string, CharacterWithUrl | null>()

  await Promise.all(
    uniqueKeys.map(async (key) => {
      const character = await getCharacterByKey(key)
      results.set(key, character)
    })
  )

  return results
}

/**
 * 验证角色key是否有效
 *
 * @param characterKey - 要验证的角色key
 * @returns 是否有效
 */
export async function isValidCharacterKey(characterKey: string): Promise<boolean> {
  const character = await getCharacterByKey(characterKey)
  return character !== null
}

/**
 * 清除角色缓存
 */
export function clearCharacterCache(characterKey?: string) {
  if (characterKey) {
    characterCache.delete(characterKey)
    cacheTimestamps.delete(characterKey)
  } else {
    characterCache.clear()
    cacheTimestamps.clear()
  }
}

/**
 * 为用户/玩家数据添加角色图片URL
 * 这是一个通用的转换函数，用于API返回时
 *
 * @param data - 包含characterKey的对象
 * @returns 添加了imageUrl的对象
 */
export function enrichWithCharacterUrl<T extends { characterKey?: string | null }>(
  data: T
): T & { characterImageUrl: string | null } {
  return {
    ...data,
    characterImageUrl: getCharacterImageUrl(data.characterKey)
  }
}

/**
 * 批量为数据添加角色图片URL
 */
export function enrichManyWithCharacterUrl<T extends { characterKey?: string | null }>(
  dataArray: T[]
): (T & { characterImageUrl: string | null })[] {
  return dataArray.map(enrichWithCharacterUrl)
}

/**
 * 从URL提取角色key（用于数据迁移）
 *
 * @param imageUrl - 完整的图片URL或路径
 * @returns 提取的角色key
 *
 * @example
 * extractCharacterKeyFromUrl('/assets/characters/hangli.png') // returns 'hangli'
 */
export function extractCharacterKeyFromUrl(imageUrl: string | null | undefined): string | null {
  if (!imageUrl) return null

  // 匹配 /assets/characters/xxx.png 格式
  const match = imageUrl.match(/\/characters\/([^/]+)\.(png|jpg|jpeg|webp|gif)$/i)
  if (match) {
    return match[1]
  }

  // 匹配纯文件名 xxx.png
  const filenameMatch = imageUrl.match(/^([^/]+)\.(png|jpg|jpeg|webp|gif)$/i)
  if (filenameMatch) {
    return filenameMatch[1]
  }

  // 如果没有扩展名，直接返回（可能已经是key）
  if (!imageUrl.includes('/') && !imageUrl.includes('.')) {
    return imageUrl
  }

  return null
}

/**
 * 获取默认角色key
 */
export function getDefaultCharacterKey(): string {
  return 'hangli'
}

/**
 * 为Player数据添加角色信息（从characterSprite字段）
 */
export function enrichPlayerWithCharacterUrl<T extends { characterSprite?: string | null }>(
  player: T
): T & { characterImageUrl: string | null } {
  return {
    ...player,
    characterImageUrl: getCharacterImageUrl(player.characterSprite)
  }
}

/**
 * 批量为Player数据添加角色信息
 */
export function enrichPlayersWithCharacterUrl<T extends { characterSprite?: string | null }>(
  players: T[]
): (T & { characterImageUrl: string | null })[] {
  return players.map(enrichPlayerWithCharacterUrl)
}

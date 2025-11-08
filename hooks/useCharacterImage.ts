/**
 * React Hook for Character Image URL
 *
 * 前端统一使用这个hook来获取角色图片URL
 */

import { useMemo } from 'react'

/**
 * 将角色key转换为图片URL的Hook
 *
 * @param characterKey - 角色标识key
 * @returns 完整的图片URL
 *
 * @example
 * const avatarUrl = useCharacterImage(user.characterKey)
 * <img src={avatarUrl} alt="avatar" />
 */
export function useCharacterImage(characterKey: string | null | undefined): string | null {
  return useMemo(() => {
    if (!characterKey) return null

    const basePath = '/assets/characters'
    const hasExtension = /\.(png|jpg|jpeg|webp|gif)$/i.test(characterKey)
    const filename = hasExtension ? characterKey : `${characterKey}.png`

    return `${basePath}/${filename}`
  }, [characterKey])
}

/**
 * 批量获取角色图片URL
 *
 * @param characterKeys - 角色key数组
 * @returns URL映射Map
 */
export function useCharacterImages(
  characterKeys: (string | null | undefined)[]
): Map<string, string | null> {
  return useMemo(() => {
    const map = new Map<string, string | null>()

    characterKeys.forEach((key) => {
      if (key) {
        const basePath = '/assets/characters'
        const hasExtension = /\.(png|jpg|jpeg|webp|gif)$/i.test(key)
        const filename = hasExtension ? key : `${key}.png`
        map.set(key, `${basePath}/${filename}`)
      } else {
        map.set(key || '', null)
      }
    })

    return map
  }, [characterKeys])
}

/**
 * 获取默认角色图片URL
 */
export function useDefaultCharacterImage(): string {
  return useMemo(() => {
    return '/assets/characters/hangli.png'
  }, [])
}

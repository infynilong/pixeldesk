import { useState, useEffect } from 'react'

interface BrandConfig {
  app_name: string
  app_slogan: string
  app_logo: string
  app_description: string
  about_title?: string
  about_content?: string
  about_image?: string
}

interface BrandConfigResponse {
  [key: string]: {
    value: string
    type: string
  }
}

const defaultConfig: BrandConfig = {
  app_name: '象素工坊',
  app_slogan: '社交办公游戏',
  app_logo: '/assets/icon.png',
  app_description: '象素工坊（PixelDesk）是一个将复古像素艺术与现代协作工具结合的创新社交办公平台。',
  about_title: '关于象素工坊',
  about_content: '象素工坊（PixelDesk）是一个将复古像素艺术与现代协作工具结合的创新社交办公平台。在这里，你不仅可以拥有属于自己的像素工位，还能在沉浸式的虚拟世界中与同事、朋友进行实时互动、协同工作。我们致力于打破远程工作的枯燥感，通过游戏化的方式提升团队凝聚力，让办公变得不再单调。无论是在这里专注工作，还是在休息室里聊闲天，每一个像素都承载着连接与创造的可能。',
  about_image: ''
}

// 全局缓存
let cachedConfig: BrandConfig | null = null
let cacheTime: number | null = null
let loadingPromise: Promise<BrandConfig> | null = null // 防止并发请求
const CACHE_DURATION = 5 * 60 * 1000 // 5分钟缓存

/**
 * 从服务器获取品牌配置
 */
async function fetchBrandConfig(locale: string = 'zh-CN'): Promise<BrandConfig> {
  try {
    // 检查缓存是否有效
    if (cachedConfig && cacheTime && Date.now() - cacheTime < CACHE_DURATION) {
      console.log('📦 [useBrandConfig] 使用缓存的品牌配置')
      return cachedConfig
    }

    // 如果正在加载，返回现有的Promise（防止并发重复请求）
    if (loadingPromise) {
      console.log('⏳ [useBrandConfig] 等待现有的品牌配置请求')
      return loadingPromise
    }

    // 创建新的加载Promise
    console.log('🌐 [useBrandConfig] 发起新的品牌配置请求')
    loadingPromise = (async () => {
      const response = await fetch(`/api/brand-config?locale=${locale}`)
      const result = await response.json()

      if (result.success && result.data) {
        const data = result.data as BrandConfigResponse
        const config: BrandConfig = {
          app_name: data.app_name?.value || defaultConfig.app_name,
          app_slogan: data.app_slogan?.value || defaultConfig.app_slogan,
          app_logo: data.app_logo?.value || defaultConfig.app_logo,
          app_description: data.app_description?.value || defaultConfig.app_description,
          about_title: data.about_title?.value || defaultConfig.about_title,
          about_content: data.about_content?.value || defaultConfig.about_content,
          about_image: data.about_image?.value || defaultConfig.about_image
        }

        // 更新缓存
        cachedConfig = config
        cacheTime = Date.now()

        return config
      }

      return defaultConfig
    })()

    try {
      const config = await loadingPromise
      return config
    } finally {
      loadingPromise = null
    }
  } catch (error) {
    console.error('❌ [useBrandConfig] 加载品牌配置失败:', error)
    loadingPromise = null
    return defaultConfig
  }
}

/**
 * React Hook: 获取品牌配置
 * @param locale 语言代码,默认 'zh-CN'
 */
export function useBrandConfig(locale: string = 'zh-CN') {
  const [config, setConfig] = useState<BrandConfig>(cachedConfig || defaultConfig)
  const [isLoading, setIsLoading] = useState(!cachedConfig)

  useEffect(() => {
    let mounted = true

    const loadConfig = async () => {
      setIsLoading(true)
      const newConfig = await fetchBrandConfig(locale)
      if (mounted) {
        setConfig(newConfig)
        setIsLoading(false)
      }
    }

    loadConfig()

    return () => {
      mounted = false
    }
  }, [locale])

  return { config, isLoading }
}

/**
 * 服务端或同步获取配置（使用缓存）
 */
export function getBrandConfig(): BrandConfig {
  return cachedConfig || defaultConfig
}

/**
 * 预加载配置（用于应用启动时）
 */
export async function preloadBrandConfig(locale: string = 'zh-CN'): Promise<void> {
  await fetchBrandConfig(locale)
}

/**
 * 清除缓存（用于配置更新后）
 */
export function clearBrandConfigCache(): void {
  cachedConfig = null
  cacheTime = null
}

export type { BrandConfig }

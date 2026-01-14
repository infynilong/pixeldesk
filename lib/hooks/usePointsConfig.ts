/**
 * 积分配置 Hook
 * 用于在应用中获取和管理积分配置
 *
 * ✨ 优化版本：使用全局 ConfigStore，避免重复 API 调用
 */
import { useState, useEffect } from 'react'
import { configStore, type PointsConfigMap } from '../stores/ConfigStore'

interface UsePointsConfigReturn {
  config: PointsConfigMap
  isLoading: boolean
  error: string | null
  getConfig: (key: string) => number
  refresh: () => Promise<void>
}

/**
 * 使用积分配置 Hook
 *
 * @example
 * const { config, getConfig } = usePointsConfig()
 * const bindCost = getConfig('bind_workstation_cost') // 10
 */
export function usePointsConfig(): UsePointsConfigReturn {
  const [config, setConfig] = useState<PointsConfigMap>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    // 从全局存储加载配置（只会调用一次 API）
    const loadConfig = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const configData = await configStore.getPointsConfig()

        if (isMounted) {
          setConfig(configData)
          setIsLoading(false)
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        console.error('❌ 加载积分配置失败:', errorMessage)

        if (isMounted) {
          setError(errorMessage)
          setIsLoading(false)
        }
      }
    }

    loadConfig()

    // 订阅配置更新
    const unsubscribe = configStore.subscribePointsConfig((newConfig) => {
      if (isMounted) {
        setConfig(newConfig)
      }
    })

    return () => {
      isMounted = false
      unsubscribe()
    }
  }, [])

  const getConfig = (key: string): number => {
    return config[key] || 0
  }

  const refresh = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const configData = await configStore.refreshPointsConfig()
      setConfig(configData)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return {
    config,
    isLoading,
    error,
    getConfig,
    refresh
  }
}

/**
 * 获取单个积分配置值
 *
 * @param key 配置键
 * @returns 配置值
 */
export async function fetchPointsConfig(key: string): Promise<number> {
  try {
    // 使用全局存储，避免重复 API 调用
    const config = await configStore.getPointsConfig()
    return config[key] || 0
  } catch (error) {
    console.error(`获取积分配置失败 (${key}):`, error)

    // 返回默认值
    const defaults: PointsConfigMap = {
      reply_post_reward: 1,
      create_blog_reward: 5,
      create_post_reward: 2,
      bind_workstation_cost: 10,
      teleport_workstation_cost: 3
    }

    return defaults[key] || 0
  }
}

// 导出类型
export type { PointsConfigMap }

/**
 * 积分配置 Hook
 * 用于在应用中获取和管理积分配置
 */
import { useState, useEffect } from 'react'

interface PointsConfigMap {
  [key: string]: number
}

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

  const loadConfig = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/points-config')

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (data.success && data.data) {
        setConfig(data.data)
        console.log('✅ 积分配置已加载:', data.data)
      } else {
        throw new Error(data.error || 'Failed to load points config')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      console.error('❌ 加载积分配置失败:', errorMessage)
      setError(errorMessage)

      // 使用默认配置
      setConfig({
        reply_post_reward: 1,
        create_blog_reward: 5,
        create_post_reward: 2,
        bind_workstation_cost: 10,
        teleport_workstation_cost: 3
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadConfig()
  }, [])

  const getConfig = (key: string): number => {
    return config[key] || 0
  }

  const refresh = async () => {
    await loadConfig()
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
    const response = await fetch(`/api/points-config?key=${key}`)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()

    if (data.success && data.data) {
      return data.data.value
    }

    throw new Error(data.error || 'Failed to load config')
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

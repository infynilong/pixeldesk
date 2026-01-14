/**
 * 统计数据 Hook
 * 用于在应用中获取工位统计数据
 *
 * ✨ 优化版本：使用全局 ConfigStore，避免重复 API 调用
 */
import { useState, useEffect } from 'react'
import { configStore, type Stats } from '../stores/ConfigStore'

interface UseStatsReturn {
  stats: Stats | null
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
}

/**
 * 使用统计数据 Hook
 *
 * @example
 * const { stats, isLoading } = useStats()
 * console.log(stats?.totalWorkstations) // 3900
 */
export function useStats(): UseStatsReturn {
  const [stats, setStats] = useState<Stats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    // 从全局存储加载统计数据（只会调用一次 API）
    const loadStats = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const statsData = await configStore.getStats()

        if (isMounted) {
          setStats(statsData)
          setIsLoading(false)
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        console.error('❌ 加载统计数据失败:', errorMessage)

        if (isMounted) {
          setError(errorMessage)
          setIsLoading(false)
        }
      }
    }

    loadStats()

    // 订阅统计数据更新
    const unsubscribe = configStore.subscribeStats((newStats) => {
      if (isMounted) {
        setStats(newStats)
      }
    })

    return () => {
      isMounted = false
      unsubscribe()
    }
  }, [])

  const refresh = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const statsData = await configStore.refreshStats()
      setStats(statsData)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return {
    stats,
    isLoading,
    error,
    refresh
  }
}

// 导出类型
export type { Stats }

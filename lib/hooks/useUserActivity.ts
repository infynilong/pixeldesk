/**
 * 用户活动数据 Hook
 * 用于在应用中获取用户活动统计数据
 *
 * ✨ 优化版本：多个组件共享同一个API调用，避免重复请求
 */
import { useState, useEffect, useRef } from 'react'

interface DailyActivity {
  date: string
  totalMinutes: number
  statusCount: { [key: string]: number }
  activities: number
  level: number
}

interface StatusBreakdown {
  [key: string]: number
}

interface TotalStats {
  totalMinutes: number
  totalDays: number
  statusBreakdown: StatusBreakdown
  averageMinutesPerDay: number
}

interface ActivityData {
  dailyActivity: DailyActivity[]
  totalStats: TotalStats
}

interface UseUserActivityReturn {
  data: ActivityData | null
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
}

// 全局缓存：避免多个组件同时调用同一个API
const activityCache = new Map<string, {
  data: ActivityData | null
  promise: Promise<ActivityData> | null
  timestamp: number
}>()

// 缓存有效期：30秒
const CACHE_DURATION = 30 * 1000

/**
 * 使用用户活动数据 Hook
 *
 * @param userId 用户ID
 * @param days 查询天数，默认90天
 *
 * @example
 * const { data, isLoading } = useUserActivity(userId, 90)
 * console.log(data?.dailyActivity) // 每日活动数据
 * console.log(data?.totalStats) // 总计统计数据
 */
export function useUserActivity(userId: string, days: number = 90): UseUserActivityReturn {
  const [data, setData] = useState<ActivityData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  useEffect(() => {
    if (!userId) {
      setIsLoading(false)
      return
    }

    const cacheKey = `${userId}-${days}`

    const fetchActivity = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // 检查缓存
        const cached = activityCache.get(cacheKey)
        const now = Date.now()

        // 如果缓存有效，直接返回
        if (cached && cached.data && (now - cached.timestamp < CACHE_DURATION)) {
          console.log(`📦 [useUserActivity] 使用缓存数据: ${cacheKey}`)
          if (isMounted.current) {
            setData(cached.data)
            setIsLoading(false)
          }
          return
        }

        // 如果正在加载，等待现有的Promise
        if (cached && cached.promise) {
          console.log(`⏳ [useUserActivity] 等待现有请求: ${cacheKey}`)
          const result = await cached.promise
          if (isMounted.current) {
            setData(result)
            setIsLoading(false)
          }
          return
        }

        // 创建新的API请求
        console.log(`🌐 [useUserActivity] 发起新请求: ${cacheKey}`)
        const promise = (async () => {
          const response = await fetch(`/api/user/${userId}/activity?days=${days}`)
          const result = await response.json()

          if (!result.success) {
            throw new Error(result.error || 'Failed to fetch activity data')
          }

          const activityData: ActivityData = result.data

          // 更新缓存
          activityCache.set(cacheKey, {
            data: activityData,
            promise: null,
            timestamp: Date.now()
          })

          return activityData
        })()

        // 保存Promise到缓存
        activityCache.set(cacheKey, {
          data: null,
          promise,
          timestamp: now
        })

        const result = await promise

        if (isMounted.current) {
          setData(result)
          setIsLoading(false)
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        console.error('❌ [useUserActivity] 加载失败:', errorMessage)

        if (isMounted.current) {
          setError(errorMessage)
          setIsLoading(false)
        }
      }
    }

    fetchActivity()
  }, [userId, days])

  const refresh = async () => {
    if (!userId) return

    const cacheKey = `${userId}-${days}`

    try {
      setIsLoading(true)
      setError(null)

      // 清除缓存
      activityCache.delete(cacheKey)

      const response = await fetch(`/api/user/${userId}/activity?days=${days}`)
      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch activity data')
      }

      const activityData: ActivityData = result.data

      // 更新缓存
      activityCache.set(cacheKey, {
        data: activityData,
        promise: null,
        timestamp: Date.now()
      })

      if (isMounted.current) {
        setData(activityData)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      if (isMounted.current) {
        setError(errorMessage)
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false)
      }
    }
  }

  return {
    data,
    isLoading,
    error,
    refresh
  }
}

// 导出类型
export type { DailyActivity, StatusBreakdown, TotalStats, ActivityData }

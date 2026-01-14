/**
 * 全局配置存储
 * 使用单例模式，防止重复API调用
 */

interface PointsConfigMap {
  [key: string]: number
}

interface Stats {
  totalWorkstations: number
  availableWorkstations: number
  boundWorkstations: number
  occupancyRate: string
  uniqueUsers: number
  totalCost: number
}

interface BillboardConfig {
  cost: number
}

class ConfigStore {
  private static instance: ConfigStore

  // 配置数据
  private pointsConfig: PointsConfigMap | null = null
  private stats: Stats | null = null
  private billboardConfig: BillboardConfig | null = null

  // 加载状态
  private pointsConfigLoading = false
  private statsLoading = false
  private billboardLoading = false

  // Promise 缓存（用于防止并发重复请求）
  private pointsConfigPromise: Promise<PointsConfigMap> | null = null
  private statsPromise: Promise<Stats> | null = null
  private billboardPromise: Promise<BillboardConfig> | null = null

  // 监听器
  private pointsConfigListeners = new Set<(config: PointsConfigMap) => void>()
  private statsListeners = new Set<(stats: Stats) => void>()

  private constructor() {
    // 私有构造函数，防止外部实例化
  }

  public static getInstance(): ConfigStore {
    if (!ConfigStore.instance) {
      ConfigStore.instance = new ConfigStore()
    }
    return ConfigStore.instance
  }

  /**
   * 获取积分配置
   */
  public async getPointsConfig(): Promise<PointsConfigMap> {
    // 如果已有数据，直接返回
    if (this.pointsConfig) {
      return this.pointsConfig
    }

    // 如果正在加载，返回已有的 Promise
    if (this.pointsConfigPromise) {
      return this.pointsConfigPromise
    }

    // 创建新的加载 Promise
    this.pointsConfigPromise = this.loadPointsConfig()

    try {
      const config = await this.pointsConfigPromise
      return config
    } finally {
      this.pointsConfigPromise = null
    }
  }

  private async loadPointsConfig(): Promise<PointsConfigMap> {
    console.log('🔄 [ConfigStore] 开始加载积分配置...')

    try {
      const response = await fetch('/api/points-config')

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (data.success && data.data) {
        this.pointsConfig = data.data
        console.log('✅ [ConfigStore] 积分配置已加载:', this.pointsConfig)

        // 通知所有监听器
        this.notifyPointsConfigListeners()

        return this.pointsConfig!
      } else {
        throw new Error(data.error || 'Failed to load points config')
      }
    } catch (error) {
      console.error('❌ [ConfigStore] 加载积分配置失败:', error)

      // 使用默认配置
      const defaultConfig: PointsConfigMap = {
        reply_post_reward: 1,
        create_blog_reward: 5,
        create_post_reward: 2,
        bind_workstation_cost: 10,
        teleport_workstation_cost: 3
      }

      this.pointsConfig = defaultConfig
      this.notifyPointsConfigListeners()

      return defaultConfig
    }
  }

  /**
   * 获取统计数据
   */
  public async getStats(): Promise<Stats> {
    // 如果已有数据，直接返回
    if (this.stats) {
      return this.stats
    }

    // 如果正在加载，返回已有的 Promise
    if (this.statsPromise) {
      return this.statsPromise
    }

    // 创建新的加载 Promise
    this.statsPromise = this.loadStats()

    try {
      const stats = await this.statsPromise
      return stats
    } finally {
      this.statsPromise = null
    }
  }

  private async loadStats(): Promise<Stats> {
    console.log('🔄 [ConfigStore] 开始加载统计数据...')

    try {
      const response = await fetch('/api/workstations/stats')

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (data.success && data.data) {
        this.stats = data.data
        console.log('✅ [ConfigStore] 统计数据已加载:', this.stats)

        // 通知所有监听器
        this.notifyStatsListeners()

        return this.stats!
      } else {
        throw new Error(data.error || 'Failed to load stats')
      }
    } catch (error) {
      console.error('❌ [ConfigStore] 加载统计数据失败:', error)

      // 返回默认数据
      const defaultStats: Stats = {
        totalWorkstations: 0,
        availableWorkstations: 0,
        boundWorkstations: 0,
        occupancyRate: '0%',
        uniqueUsers: 0,
        totalCost: 0
      }

      this.stats = defaultStats
      this.notifyStatsListeners()

      return defaultStats
    }
  }

  /**
   * 获取公告栏推广成本
   */
  public async getBillboardCost(): Promise<number> {
    if (this.billboardConfig) {
      return this.billboardConfig.cost
    }

    if (this.billboardPromise) {
      const res = await this.billboardPromise
      return res.cost
    }

    this.billboardPromise = this.loadBillboardCost()

    try {
      const config = await this.billboardPromise
      return config.cost
    } finally {
      this.billboardPromise = null
    }
  }

  private async loadBillboardCost(): Promise<BillboardConfig> {
    console.log('🔄 [ConfigStore] 开始加载公告栏成本...')

    try {
      const response = await fetch('/api/billboard/cost')

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (data.success) {
        this.billboardConfig = { cost: data.cost }
        console.log('✅ [ConfigStore] 公告栏成本已加载:', data.cost)
        return this.billboardConfig
      } else {
        throw new Error(data.error || 'Failed to load billboard cost')
      }
    } catch (error) {
      console.error('❌ [ConfigStore] 加载公告栏成本失败:', error)
      const defaultConfig = { cost: 50 }
      this.billboardConfig = defaultConfig
      return defaultConfig
    }
  }

  /**
   * 订阅积分配置更新
   */
  public subscribePointsConfig(listener: (config: PointsConfigMap) => void): () => void {
    this.pointsConfigListeners.add(listener)

    // 如果已有数据，立即通知
    if (this.pointsConfig) {
      listener(this.pointsConfig)
    }

    // 返回取消订阅函数
    return () => {
      this.pointsConfigListeners.delete(listener)
    }
  }

  /**
   * 订阅统计数据更新
   */
  public subscribeStats(listener: (stats: Stats) => void): () => void {
    this.statsListeners.add(listener)

    // 如果已有数据，立即通知
    if (this.stats) {
      listener(this.stats)
    }

    // 返回取消订阅函数
    return () => {
      this.statsListeners.delete(listener)
    }
  }

  private notifyPointsConfigListeners(): void {
    if (this.pointsConfig) {
      this.pointsConfigListeners.forEach(listener => {
        try {
          listener(this.pointsConfig!)
        } catch (error) {
          console.error('[ConfigStore] 通知监听器失败:', error)
        }
      })
    }
  }

  private notifyStatsListeners(): void {
    if (this.stats) {
      this.statsListeners.forEach(listener => {
        try {
          listener(this.stats!)
        } catch (error) {
          console.error('[ConfigStore] 通知监听器失败:', error)
        }
      })
    }
  }

  /**
   * 刷新积分配置（强制重新加载）
   */
  public async refreshPointsConfig(): Promise<PointsConfigMap> {
    this.pointsConfig = null
    return this.getPointsConfig()
  }

  /**
   * 刷新统计数据（强制重新加载）
   */
  public async refreshStats(): Promise<Stats> {
    this.stats = null
    return this.getStats()
  }

  /**
   * 清空所有缓存
   */
  public clearCache(): void {
    this.pointsConfig = null
    this.stats = null
    console.log('🗑️ [ConfigStore] 缓存已清空')
  }
}

// 导出单例实例
export const configStore = ConfigStore.getInstance()

// 导出类型
export type { PointsConfigMap, Stats }

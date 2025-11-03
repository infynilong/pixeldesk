/**
 * ChunkManager - 区块管理器
 *
 * 职责：
 * 1. 将地图分成固定大小的区块（Chunks）
 * 2. 根据相机位置动态加载/卸载区块
 * 3. 管理区块内的工位对象
 * 4. 优化性能：只激活视口内及附近的区块
 */

// ===== 性能优化配置 =====
const PERFORMANCE_CONFIG = {
  ENABLE_DEBUG_LOGGING: false,  // 🔧 关闭调试日志，console.log也消耗CPU
  ENABLE_ERROR_LOGGING: true
}

const debugLog = PERFORMANCE_CONFIG.ENABLE_DEBUG_LOGGING ? console.log.bind(console) : () => {}
const debugWarn = PERFORMANCE_CONFIG.ENABLE_ERROR_LOGGING ? console.warn.bind(console) : () => {}

export class ChunkManager {
  constructor(scene, config = {}) {
    this.scene = scene

    // 区块配置
    this.config = {
      chunkSize: config.chunkSize || 1000,           // 区块大小（像素）
      loadRadius: config.loadRadius || 1,            // 加载半径（区块数）
      unloadDelay: config.unloadDelay || 2000,       // 卸载延迟（毫秒）
      updateInterval: config.updateInterval || 500,  // 更新间隔（毫秒）
    }

    // 数据结构
    this.chunks = new Map()                   // 所有区块：key = "x,y", value = Chunk对象
    this.activeChunks = new Set()             // 当前激活的区块keys
    this.workstationChunkMap = new Map()      // 工位到区块的映射：workstationId -> chunkKey
    this.pendingUnload = new Map()            // 待卸载区块：chunkKey -> timestamp

    // 相机追踪
    this.lastCameraChunk = null
    this.lastCameraZoom = null  // 追踪zoom变化
    this.updateTimer = null
    this.lastUpdateTime = 0     // 🔧 防抖：记录上次更新时间
    this.minUpdateInterval = 500 // 🔧 防抖：从200ms增加到500ms，进一步降低更新频率

    // 统计数据
    this.stats = {
      totalWorkstations: 0,
      activeWorkstations: 0,
      totalChunks: 0,
      activeChunks: 0,
      lastUpdate: Date.now()
    }

    debugLog('✅ ChunkManager 已初始化', this.config)
  }

  /**
   * 初始化区块系统
   * 将所有工位对象分配到对应的区块中
   */
  initializeChunks(workstationObjects) {
    debugLog(`📦 开始初始化区块系统，工位总数: ${workstationObjects.length}`)

    // 遍历所有工位对象，分配到对应区块
    workstationObjects.forEach(obj => {
      const chunkKey = this.getChunkKey(obj.x, obj.y)

      // 获取或创建区块
      if (!this.chunks.has(chunkKey)) {
        const [cx, cy] = chunkKey.split(',').map(Number)
        this.chunks.set(chunkKey, new Chunk(cx, cy, this.config.chunkSize))
      }

      // 将工位对象添加到区块
      const chunk = this.chunks.get(chunkKey)
      chunk.addWorkstation(obj)

      // 记录工位到区块的映射
      this.workstationChunkMap.set(obj.id, chunkKey)
    })

    this.stats.totalWorkstations = workstationObjects.length
    this.stats.totalChunks = this.chunks.size

    debugLog(`✅ 区块系统初始化完成`)
    debugLog(`   - 总工位数: ${this.stats.totalWorkstations}`)
    debugLog(`   - 总区块数: ${this.stats.totalChunks}`)
    debugLog(`   - 平均每区块: ${Math.round(this.stats.totalWorkstations / this.stats.totalChunks)}个工位`)

    // 启动定时更新
    this.startUpdating()

    // 🔧 关键修复：立即触发一次更新，加载初始区块
    debugLog('🎯 立即触发初始区块加载')
    this.updateActiveChunks()
  }

  /**
   * 根据世界坐标计算区块坐标
   */
  getChunkKey(worldX, worldY) {
    const chunkX = Math.floor(worldX / this.config.chunkSize)
    const chunkY = Math.floor(worldY / this.config.chunkSize)
    return `${chunkX},${chunkY}`
  }

  /**
   * 启动定时更新
   */
  startUpdating() {
    if (this.updateTimer) return

    this.updateTimer = this.scene.time.addEvent({
      delay: this.config.updateInterval,
      callback: this.updateActiveChunks,
      callbackScope: this,
      loop: true
    })

    debugLog('🔄 区块更新定时器已启动')
  }

  /**
   * 停止定时更新
   */
  stopUpdating() {
    if (this.updateTimer) {
      this.updateTimer.remove()
      this.updateTimer = null
      debugLog('⏹️ 区块更新定时器已停止')
    }
  }

  /**
   * 更新活跃区块（根据相机位置和缩放级别）
   */
  updateActiveChunks() {
    if (!this.scene.cameras || !this.scene.cameras.main) return

    // 🔧 防抖：避免频繁更新导致CPU占用过高
    const now = Date.now()
    if (now - this.lastUpdateTime < this.minUpdateInterval) {
      // debugLog(`⏸️ 更新过于频繁，跳过 (距离上次 ${now - this.lastUpdateTime}ms)`)
      return
    }

    const camera = this.scene.cameras.main
    const centerX = camera.scrollX + camera.width / 2
    const centerY = camera.scrollY + camera.height / 2
    const currentZoom = camera.zoom

    const currentChunkKey = this.getChunkKey(centerX, centerY)

    // 🔧 修复：检查相机区块或zoom是否变化
    const zoomChanged = this.lastCameraZoom !== null &&
                        Math.abs(currentZoom - this.lastCameraZoom) > 0.05  // 提高阈值到0.05

    // 如果相机仍在同一区块内且zoom没明显变化，跳过更新
    if (currentChunkKey === this.lastCameraChunk && !zoomChanged) {
      return
    }

    if (zoomChanged) {
      debugLog(`🔍 Zoom变化检测: ${this.lastCameraZoom?.toFixed(2)} -> ${currentZoom.toFixed(2)}`)
    }

    this.lastCameraChunk = currentChunkKey
    this.lastCameraZoom = currentZoom
    this.lastUpdateTime = now  // 🔧 更新时间戳

    // 🔧 根据zoom动态调整加载半径
    // zoom越小（地图缩小），视野越大，需要加载更多区块
    const dynamicLoadRadius = this.calculateLoadRadius(currentZoom)
    debugLog(`📏 当前zoom: ${currentZoom.toFixed(2)}, 加载半径: ${dynamicLoadRadius}圈`)

    // 计算需要激活的区块
    const newActiveChunks = this.getChunksInRadius(centerX, centerY, dynamicLoadRadius)

    // 🔧 安全限制：避免一次加载太多区块
    const MAX_CHUNKS = 100  // 最多同时加载100个区块
    if (newActiveChunks.length > MAX_CHUNKS) {
      debugWarn(`⚠️ 计算出的区块数量过多 (${newActiveChunks.length})，限制为${MAX_CHUNKS}`)
      // 只加载距离最近的区块
      newActiveChunks.splice(MAX_CHUNKS)
    }

    // 找出需要加载和卸载的区块
    const toLoad = newActiveChunks.filter(key => !this.activeChunks.has(key))
    const toUnload = Array.from(this.activeChunks).filter(key => !newActiveChunks.includes(key))

    debugLog(`🔄 区块更新: 加载${toLoad.length}个, 卸载${toUnload.length}个`)

    // 🔧 批量加载：大幅降低每次加载数量，避免CPU飙升
    const MAX_LOAD_PER_UPDATE = 3  // 从20降到3，避免瞬时创建太多对象
    const chunksToLoadNow = toLoad.slice(0, MAX_LOAD_PER_UPDATE)

    // 加载新区块
    chunksToLoadNow.forEach(chunkKey => {
      this.loadChunk(chunkKey)
    })

    // 如果还有更多区块需要加载，分批延迟加载
    if (toLoad.length > MAX_LOAD_PER_UPDATE) {
      const remainingChunks = toLoad.slice(MAX_LOAD_PER_UPDATE)
      debugLog(`📦 剩余${remainingChunks.length}个区块将分批延迟加载`)

      // 分成多批，每批3个，每批间隔300ms
      let batchIndex = 0
      const batchSize = 3
      const loadNextBatch = () => {
        const start = batchIndex * batchSize
        const batch = remainingChunks.slice(start, start + batchSize)

        if (batch.length > 0) {
          batch.forEach(chunkKey => {
            this.loadChunk(chunkKey)
          })
          batchIndex++

          // 继续加载下一批
          if (start + batchSize < remainingChunks.length) {
            this.scene.time.delayedCall(300, loadNextBatch)
          }
        }
      }

      this.scene.time.delayedCall(300, loadNextBatch)
    }

    // 延迟卸载区块（避免频繁加载/卸载）
    toUnload.forEach(chunkKey => {
      this.scheduleUnload(chunkKey)
    })

    // 处理待卸载区块
    this.processUnloadQueue()

    // 更新统计
    this.updateStats()
  }

  /**
   * 🔧 新增：根据zoom级别计算合适的加载半径
   */
  calculateLoadRadius(zoom) {
    // 🔧 更保守的加载策略，避免CPU占用过高
    // 区块大小已增加到2000，所以即使1-2圈也能覆盖足够大的范围

    if (zoom >= 1.2) {
      return 1  // 放大时只加载1圈 (9个区块)
    } else if (zoom >= 0.8) {
      return 1  // 标准缩放也只加载1圈 (9个区块)
    } else if (zoom >= 0.5) {
      return 2  // 缩小时加载2圈 (25个区块)
    } else {
      return 2  // 极度缩小也只加载2圈（避免加载太多）
    }
  }

  /**
   * 获取指定半径内的所有区块keys
   */
  getChunksInRadius(centerX, centerY, radius) {
    const centerChunkKey = this.getChunkKey(centerX, centerY)
    const [cx, cy] = centerChunkKey.split(',').map(Number)

    const chunks = []
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        const chunkKey = `${cx + dx},${cy + dy}`
        if (this.chunks.has(chunkKey)) {
          chunks.push(chunkKey)
        }
      }
    }

    return chunks
  }

  /**
   * 加载区块
   */
  loadChunk(chunkKey) {
    const chunk = this.chunks.get(chunkKey)
    if (!chunk || chunk.isLoaded) return

    // 如果在待卸载队列中，取消卸载
    if (this.pendingUnload.has(chunkKey)) {
      this.pendingUnload.delete(chunkKey)
      return // 区块已经是加载状态，无需重复加载
    }

    debugLog(`📥 加载区块 ${chunkKey}, 工位数: ${chunk.workstations.length}`)

    // 触发区块加载事件
    this.scene.events.emit('chunk-load', {
      chunkKey,
      workstations: chunk.workstations
    })

    chunk.isLoaded = true
    this.activeChunks.add(chunkKey)
  }

  /**
   * 安排区块卸载
   */
  scheduleUnload(chunkKey) {
    if (!this.pendingUnload.has(chunkKey)) {
      this.pendingUnload.set(chunkKey, Date.now())
    }
  }

  /**
   * 处理卸载队列
   */
  processUnloadQueue() {
    const now = Date.now()

    this.pendingUnload.forEach((timestamp, chunkKey) => {
      if (now - timestamp >= this.config.unloadDelay) {
        this.unloadChunk(chunkKey)
        this.pendingUnload.delete(chunkKey)
      }
    })
  }

  /**
   * 卸载区块
   */
  unloadChunk(chunkKey) {
    const chunk = this.chunks.get(chunkKey)
    if (!chunk || !chunk.isLoaded) return

    debugLog(`📤 卸载区块 ${chunkKey}, 工位数: ${chunk.workstations.length}`)

    // 触发区块卸载事件
    this.scene.events.emit('chunk-unload', {
      chunkKey,
      workstations: chunk.workstations
    })

    chunk.isLoaded = false
    this.activeChunks.delete(chunkKey)
  }

  /**
   * 获取指定工位所在的区块
   */
  getWorkstationChunk(workstationId) {
    const chunkKey = this.workstationChunkMap.get(workstationId)
    return chunkKey ? this.chunks.get(chunkKey) : null
  }

  /**
   * 强制加载指定工位所在的区块
   */
  loadWorkstationChunk(workstationId) {
    const chunkKey = this.workstationChunkMap.get(workstationId)
    if (chunkKey) {
      this.loadChunk(chunkKey)
      return true
    }
    return false
  }

  /**
   * 更新统计数据
   */
  updateStats() {
    let activeWorkstations = 0
    this.activeChunks.forEach(chunkKey => {
      const chunk = this.chunks.get(chunkKey)
      if (chunk) {
        activeWorkstations += chunk.workstations.length
      }
    })

    this.stats.activeWorkstations = activeWorkstations
    this.stats.activeChunks = this.activeChunks.size
    this.stats.lastUpdate = Date.now()
  }

  /**
   * 获取统计数据
   */
  getStats() {
    return {
      ...this.stats,
      loadPercentage: (this.stats.activeWorkstations / this.stats.totalWorkstations * 100).toFixed(1) + '%',
      chunksLoadPercentage: (this.stats.activeChunks / this.stats.totalChunks * 100).toFixed(1) + '%'
    }
  }

  /**
   * 销毁管理器
   */
  destroy() {
    this.stopUpdating()
    this.chunks.clear()
    this.activeChunks.clear()
    this.workstationChunkMap.clear()
    this.pendingUnload.clear()
    debugLog('🗑️ ChunkManager 已销毁')
  }
}

/**
 * Chunk - 区块类
 */
class Chunk {
  constructor(chunkX, chunkY, size) {
    this.chunkX = chunkX
    this.chunkY = chunkY
    this.size = size
    this.workstations = []  // 区块内的工位对象
    this.isLoaded = false   // 是否已加载

    // 计算世界坐标边界
    this.bounds = {
      left: chunkX * size,
      top: chunkY * size,
      right: (chunkX + 1) * size,
      bottom: (chunkY + 1) * size
    }
  }

  /**
   * 添加工位到区块
   */
  addWorkstation(workstation) {
    this.workstations.push(workstation)
  }

  /**
   * 检查点是否在区块内
   */
  containsPoint(x, y) {
    return x >= this.bounds.left &&
           x < this.bounds.right &&
           y >= this.bounds.top &&
           y < this.bounds.bottom
  }
}

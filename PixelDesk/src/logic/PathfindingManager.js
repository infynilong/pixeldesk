/**
 * PathfindingManager - 寻路管理器
 *
 * 职责：
 * 1. 从碰撞图层构建可行走网格
 * 2. A* 寻路算法（8方向含对角线）
 * 3. 路径平滑（视线检测跳过冗余拐点）
 * 4. 路径跟随状态机（每帧更新速度/方向）
 * 5. 点击目的地标记动画
 */

// ===== 性能优化配置 =====
const PERFORMANCE_CONFIG = {
  ENABLE_DEBUG_LOGGING: false,
  ENABLE_ERROR_LOGGING: true
}

const debugLog = PERFORMANCE_CONFIG.ENABLE_DEBUG_LOGGING ? console.log.bind(console) : () => {}
const debugWarn = PERFORMANCE_CONFIG.ENABLE_ERROR_LOGGING ? console.warn.bind(console) : () => {}

export class PathfindingManager {
  constructor(scene, config = {}) {
    this.scene = scene

    // 网格配置
    this.tileSize = config.tileSize || 48
    this.gridWidth = 0
    this.gridHeight = 0
    this.gridOffsetX = 0
    this.gridOffsetY = 0

    // 可行走网格: Uint8Array, 0=可走, 1=障碍
    this.grid = null

    // 路径跟随状态
    this.path = null
    this.currentWaypointIndex = 0
    this.isFollowingPath = false
    this.arrivalThreshold = config.arrivalThreshold || 6
    this.playerSpeed = config.playerSpeed || 200

    // 目的地标记
    this.destinationMarker = null
    this.markerTween = null

    debugLog('✅ PathfindingManager 已初始化')
  }

  // ===== 网格构建 =====

  /**
   * 初始化可行走网格
   * @param {Object} mapLayers - { office_1, tree, ... }
   * @param {Phaser.Physics.Arcade.StaticGroup} deskColliders - 家具碰撞组
   */
  init(mapLayers, deskColliders) {
    const worldBounds = this.scene.physics.world.bounds
    this.gridOffsetX = isNaN(worldBounds.x) ? 0 : worldBounds.x
    this.gridOffsetY = isNaN(worldBounds.y) ? 0 : worldBounds.y
    const boundsW = isNaN(worldBounds.width) ? (this.scene.sys.game.config.width || 1280) : worldBounds.width
    const boundsH = isNaN(worldBounds.height) ? (this.scene.sys.game.config.height || 720) : worldBounds.height
    this.gridWidth = Math.ceil(boundsW / this.tileSize)
    this.gridHeight = Math.ceil(boundsH / this.tileSize)

    console.log(`🗺️ [Pathfinding] 网格初始化: ${this.gridWidth}x${this.gridHeight}, 偏移 (${this.gridOffsetX}, ${this.gridOffsetY}), 总格子: ${this.gridWidth * this.gridHeight}`)

    this.grid = new Uint8Array(this.gridWidth * this.gridHeight)

    // 标记碰撞图层
    if (mapLayers?.office_1) this._markCollisionTiles(mapLayers.office_1)
    if (mapLayers?.tree) this._markCollisionTiles(mapLayers.tree)

    // 标记家具碰撞体
    this._markDeskColliders(deskColliders)

    // 统计障碍物数量
    let blockedCount = 0
    for (let i = 0; i < this.grid.length; i++) {
      if (this.grid[i] === 1) blockedCount++
    }
    console.log(`🗺️ [Pathfinding] 网格构建完成: ${blockedCount} 个障碍格子 / ${this.grid.length} 总格子`)
  }

  /**
   * 区块加载/卸载后刷新网格
   */
  refreshDeskColliders(deskColliders) {
    if (!this.grid) return

    // 重置网格
    this.grid.fill(0)

    // 重新标记碰撞图层
    if (this.scene.mapLayers?.office_1) this._markCollisionTiles(this.scene.mapLayers.office_1)
    if (this.scene.mapLayers?.tree) this._markCollisionTiles(this.scene.mapLayers.tree)

    // 重新标记家具
    this._markDeskColliders(deskColliders)

    debugLog('PathfindingManager: 网格已刷新')
  }

  _markCollisionTiles(layer) {
    if (!layer) return
    layer.forEachTile((tile) => {
      if (tile.collides || (tile.properties && tile.properties.solid)) {
        const gx = Math.floor((tile.pixelX - this.gridOffsetX) / this.tileSize)
        const gy = Math.floor((tile.pixelY - this.gridOffsetY) / this.tileSize)
        if (gx >= 0 && gx < this.gridWidth && gy >= 0 && gy < this.gridHeight) {
          this.grid[gy * this.gridWidth + gx] = 1
        }
      }
    })
  }

  _markDeskColliders(deskColliders) {
    if (!deskColliders) return
    const children = deskColliders.getChildren()
    children.forEach(sprite => {
      if (!sprite.body) return
      const bx = sprite.body.x
      const by = sprite.body.y
      const bw = sprite.body.width
      const bh = sprite.body.height

      const startGX = Math.floor((bx - this.gridOffsetX) / this.tileSize)
      const startGY = Math.floor((by - this.gridOffsetY) / this.tileSize)
      const endGX = Math.floor((bx + bw - this.gridOffsetX) / this.tileSize)
      const endGY = Math.floor((by + bh - this.gridOffsetY) / this.tileSize)

      for (let gy = startGY; gy <= endGY; gy++) {
        for (let gx = startGX; gx <= endGX; gx++) {
          if (gx >= 0 && gx < this.gridWidth && gy >= 0 && gy < this.gridHeight) {
            this.grid[gy * this.gridWidth + gx] = 1
          }
        }
      }
    })
  }

  // ===== A* 寻路 =====

  /**
   * 寻路：返回世界像素坐标的路点数组，或 null
   */
  findPath(startX, startY, targetX, targetY) {
    if (!this.grid) return null

    const clamp = (v, min, max) => Math.max(min, Math.min(max, v))

    let sx = clamp(Math.floor((startX - this.gridOffsetX) / this.tileSize), 0, this.gridWidth - 1)
    let sy = clamp(Math.floor((startY - this.gridOffsetY) / this.tileSize), 0, this.gridHeight - 1)
    let ex = clamp(Math.floor((targetX - this.gridOffsetX) / this.tileSize), 0, this.gridWidth - 1)
    let ey = clamp(Math.floor((targetY - this.gridOffsetY) / this.tileSize), 0, this.gridHeight - 1)

    const startBlocked = this.grid[sy * this.gridWidth + sx] === 1
    const endBlocked = this.grid[ey * this.gridWidth + ex] === 1
    console.log(`🔍 [Pathfinding] findPath: 起点格子(${sx},${sy})${startBlocked ? ' [障碍]' : ' [可走]'}, 终点格子(${ex},${ey})${endBlocked ? ' [障碍]' : ' [可走]'}, 网格${this.gridWidth}x${this.gridHeight}`)

    // 目标是障碍物 → 找最近可行走格子
    if (endBlocked) {
      const nearest = this._findNearestWalkable(ex, ey)
      if (!nearest) { console.warn('🔍 [Pathfinding] 终点附近无可走格子'); return null }
      console.log(`🔍 [Pathfinding] 终点障碍，改为最近可走格子(${nearest.x},${nearest.y})`)
      ex = nearest.x
      ey = nearest.y
    }

    // 起点是障碍物（理论上不应发生）
    if (startBlocked) {
      const nearest = this._findNearestWalkable(sx, sy)
      if (!nearest) { console.warn('🔍 [Pathfinding] 起点附近无可走格子'); return null }
      console.log(`🔍 [Pathfinding] 起点障碍，改为最近可走格子(${nearest.x},${nearest.y})`)
      sx = nearest.x
      sy = nearest.y
    }

    // 起点=终点
    if (sx === ex && sy === ey) { console.log('🔍 [Pathfinding] 起点=终点，跳过'); return null }

    const rawPath = this._astar(sx, sy, ex, ey)
    if (!rawPath) { console.warn('🔍 [Pathfinding] A*未找到路径'); return null }

    // 转换为世界像素坐标（格子中心）
    const halfTile = this.tileSize / 2
    const pixelPath = rawPath.map(node => ({
      x: node.x * this.tileSize + this.gridOffsetX + halfTile,
      y: node.y * this.tileSize + this.gridOffsetY + halfTile
    }))

    // 路径平滑
    return this._smoothPath(pixelPath)
  }

  _astar(sx, sy, ex, ey) {
    const w = this.gridWidth
    const h = this.gridHeight
    const size = w * h

    // 八角距离启发函数
    const heuristic = (x, y) => {
      const dx = Math.abs(x - ex)
      const dy = Math.abs(y - ey)
      return dx + dy + (1.414 - 2) * Math.min(dx, dy)
    }

    // 8方向: 4正交 + 4对角
    const dirs = [
      { dx: 0, dy: -1, cost: 1 },
      { dx: 0, dy: 1, cost: 1 },
      { dx: -1, dy: 0, cost: 1 },
      { dx: 1, dy: 0, cost: 1 },
      { dx: -1, dy: -1, cost: 1.414 },
      { dx: 1, dy: -1, cost: 1.414 },
      { dx: -1, dy: 1, cost: 1.414 },
      { dx: 1, dy: 1, cost: 1.414 },
    ]

    const gScore = new Float32Array(size).fill(Infinity)
    const fScore = new Float32Array(size).fill(Infinity)
    const cameFrom = new Int32Array(size).fill(-1)
    const closed = new Uint8Array(size)

    const startIdx = sy * w + sx
    gScore[startIdx] = 0
    fScore[startIdx] = heuristic(sx, sy)

    // 开放列表
    const open = [startIdx]
    const inOpen = new Uint8Array(size)
    inOpen[startIdx] = 1

    while (open.length > 0) {
      // 找 fScore 最小的节点
      let bestPos = 0
      for (let i = 1; i < open.length; i++) {
        if (fScore[open[i]] < fScore[open[bestPos]]) bestPos = i
      }
      const currentIdx = open[bestPos]
      open[bestPos] = open[open.length - 1]
      open.pop()
      inOpen[currentIdx] = 0

      const cx = currentIdx % w
      const cy = (currentIdx - cx) / w

      // 到达终点
      if (cx === ex && cy === ey) {
        return this._reconstructPath(cameFrom, currentIdx, w)
      }

      closed[currentIdx] = 1

      // 展开邻居
      for (const dir of dirs) {
        const nx = cx + dir.dx
        const ny = cy + dir.dy
        if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue

        const nIdx = ny * w + nx
        if (closed[nIdx] || this.grid[nIdx] === 1) continue

        // 对角线移动：防止穿墙角
        if (dir.dx !== 0 && dir.dy !== 0) {
          if (this.grid[cy * w + nx] === 1 || this.grid[ny * w + cx] === 1) continue
        }

        const tentativeG = gScore[currentIdx] + dir.cost
        if (tentativeG < gScore[nIdx]) {
          cameFrom[nIdx] = currentIdx
          gScore[nIdx] = tentativeG
          fScore[nIdx] = tentativeG + heuristic(nx, ny)
          if (!inOpen[nIdx]) {
            open.push(nIdx)
            inOpen[nIdx] = 1
          }
        }
      }
    }

    return null // 无路径
  }

  _reconstructPath(cameFrom, endIdx, w) {
    const path = []
    let idx = endIdx
    while (idx !== -1) {
      const x = idx % w
      const y = (idx - x) / w
      path.unshift({ x, y })
      idx = cameFrom[idx]
    }
    return path
  }

  /**
   * BFS 找最近可行走格子
   */
  _findNearestWalkable(gx, gy) {
    const w = this.gridWidth
    const h = this.gridHeight
    const visited = new Uint8Array(w * h)
    const queue = [{ x: gx, y: gy }]
    visited[gy * w + gx] = 1

    const dirs = [
      { dx: 0, dy: -1 }, { dx: 0, dy: 1 },
      { dx: -1, dy: 0 }, { dx: 1, dy: 0 },
      { dx: -1, dy: -1 }, { dx: 1, dy: -1 },
      { dx: -1, dy: 1 }, { dx: 1, dy: 1 }
    ]

    while (queue.length > 0) {
      const curr = queue.shift()
      if (this.grid[curr.y * w + curr.x] === 0) return curr
      for (const d of dirs) {
        const nx = curr.x + d.dx
        const ny = curr.y + d.dy
        if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue
        const nIdx = ny * w + nx
        if (visited[nIdx]) continue
        visited[nIdx] = 1
        queue.push({ x: nx, y: ny })
      }
    }
    return null
  }

  // ===== 路径平滑 =====

  _smoothPath(path) {
    if (!path || path.length <= 2) return path

    const smoothed = [path[0]]
    let current = 0

    while (current < path.length - 1) {
      let farthest = current + 1
      for (let i = path.length - 1; i > current + 1; i--) {
        if (this._hasLineOfSight(path[current], path[i])) {
          farthest = i
          break
        }
      }
      smoothed.push(path[farthest])
      current = farthest
    }

    return smoothed
  }

  _hasLineOfSight(a, b) {
    const ax = Math.floor((a.x - this.gridOffsetX) / this.tileSize)
    const ay = Math.floor((a.y - this.gridOffsetY) / this.tileSize)
    const bx = Math.floor((b.x - this.gridOffsetX) / this.tileSize)
    const by = Math.floor((b.y - this.gridOffsetY) / this.tileSize)

    // Bresenham 线段检测
    let x0 = ax, y0 = ay, x1 = bx, y1 = by
    const dx = Math.abs(x1 - x0)
    const dy = Math.abs(y1 - y0)
    const sx = x0 < x1 ? 1 : -1
    const sy = y0 < y1 ? 1 : -1
    let err = dx - dy

    while (true) {
      if (x0 >= 0 && x0 < this.gridWidth && y0 >= 0 && y0 < this.gridHeight) {
        if (this.grid[y0 * this.gridWidth + x0] === 1) return false
      }
      if (x0 === x1 && y0 === y1) break
      const e2 = 2 * err
      if (e2 > -dy) { err -= dy; x0 += sx }
      if (e2 < dx) { err += dx; y0 += sy }
    }
    return true
  }

  // ===== 路径跟随 =====

  startPathFollowing(path) {
    if (!path || path.length === 0) return false

    this.path = path
    this.currentWaypointIndex = 0
    this.isFollowingPath = true

    // 显示目的地标记
    const dest = path[path.length - 1]
    this._showDestinationMarker(dest.x, dest.y)

    debugLog(`PathfindingManager: 开始跟随路径，${path.length} 个路点`)
    return true
  }

  /**
   * 每帧调用，返回 {velocityX, velocityY, direction, arrived} 或 null
   */
  updatePathFollowing(player) {
    if (!this.isFollowingPath || !this.path || !player) return null

    const target = this.path[this.currentWaypointIndex]
    const dx = target.x - player.x
    const dy = target.y - player.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    // 到达当前路点
    if (distance < this.arrivalThreshold) {
      this.currentWaypointIndex++

      // 路径完成
      if (this.currentWaypointIndex >= this.path.length) {
        this.cancelPathFollowing()
        return { velocityX: 0, velocityY: 0, direction: player.currentDirection, arrived: true }
      }

      return this.updatePathFollowing(player)
    }

    // 计算朝路点的速度
    const angle = Math.atan2(dy, dx)
    const velocityX = Math.cos(angle) * this.playerSpeed
    const velocityY = Math.sin(angle) * this.playerSpeed

    // 计算朝向（4方向）
    let direction
    if (Math.abs(dx) > Math.abs(dy)) {
      direction = dx > 0 ? 'right' : 'left'
    } else {
      direction = dy > 0 ? 'down' : 'up'
    }

    return { velocityX, velocityY, direction, arrived: false }
  }

  cancelPathFollowing() {
    this.isFollowingPath = false
    this.path = null
    this.currentWaypointIndex = 0
    this._hideDestinationMarker()
    debugLog('PathfindingManager: 路径跟随已取消')
  }

  // ===== 点击入口 =====

  handlePointerDown(pointer, player) {
    if (!this.grid || !player) {
      console.warn('🖱️ [Pathfinding] 无法寻路:', !this.grid ? '网格未初始化' : '玩家不存在')
      return false
    }

    // 屏幕坐标 → 世界坐标
    const worldPoint = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y)

    console.log(`🖱️ [Pathfinding] 点击: 屏幕(${Math.round(pointer.x)},${Math.round(pointer.y)}) → 世界(${Math.round(worldPoint.x)},${Math.round(worldPoint.y)}), 玩家(${Math.round(player.x)},${Math.round(player.y)})`)

    const path = this.findPath(player.x, player.y, worldPoint.x, worldPoint.y)

    if (path && path.length > 0) {
      console.log(`🖱️ [Pathfinding] 找到路径: ${path.length} 个路点`)
      this.startPathFollowing(path)
      return true
    }

    console.warn('🖱️ [Pathfinding] 未找到路径')
    return false
  }

  // ===== 目的地标记 =====

  _showDestinationMarker(x, y) {
    this._hideDestinationMarker()

    this.destinationMarker = this.scene.add.graphics()
    this.destinationMarker.setDepth(50)

    this.destinationMarker.lineStyle(2, 0x00ff88, 0.8)
    this.destinationMarker.strokeCircle(0, 0, 12)
    this.destinationMarker.fillStyle(0x00ff88, 0.3)
    this.destinationMarker.fillCircle(0, 0, 8)
    this.destinationMarker.setPosition(x, y)

    this.markerTween = this.scene.tweens.add({
      targets: this.destinationMarker,
      scaleX: 1.5,
      scaleY: 1.5,
      alpha: 0.3,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    })
  }

  _hideDestinationMarker() {
    if (this.markerTween) {
      this.markerTween.destroy()
      this.markerTween = null
    }
    if (this.destinationMarker) {
      this.destinationMarker.destroy()
      this.destinationMarker = null
    }
  }

  // ===== 销毁 =====

  destroy() {
    this.cancelPathFollowing()
    this.grid = null
    debugLog('PathfindingManager: 已销毁')
  }
}

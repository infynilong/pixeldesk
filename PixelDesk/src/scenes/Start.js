import { WorkstationManager } from "../logic/WorkstationManager.js"
import { Player } from "../entities/Player.js"
import { WashroomManager } from "../logic/WashroomManager.js"
import { CameraInputManager } from "../logic/CameraInputManager.js"
import { WorkstationBindingUI } from "../components/WorkstationBindingUI.js"
import { ChunkManager } from "../logic/ChunkManager.js"
import { AiNpcManager } from "../logic/AiNpcManager.js"
import { FrontDeskManager } from "../logic/FrontDeskManager.js"
import { DayNightManager } from "../logic/DayNightManager.js"
import { IndoorAreasManager } from "../logic/IndoorAreasManager.js"
import { BillboardManager } from "../logic/BillboardManager.js"
import { MobileControlsManager } from "../logic/MobileControlsManager.js"
import { GameBridgeAPI } from "../logic/GameBridgeAPI.js"
import { AssetLoader } from "../logic/AssetLoader.js"
import { PlayerCollisionManager } from "../logic/PlayerCollisionManager.js"
import { MapRenderer } from "../logic/MapRenderer.js"

// ===== 性能优化配置 =====
const PERFORMANCE_CONFIG = {
  // 禁用控制台日志以大幅减少CPU消耗（开发时可设为true）
  ENABLE_DEBUG_LOGGING: false,
  // 关键错误和警告仍然显示
  ENABLE_ERROR_LOGGING: true,
  // 性能监控日志
  ENABLE_PERFORMANCE_LOGGING: false
}

// 性能优化的日志系统
const debugLog = PERFORMANCE_CONFIG.ENABLE_DEBUG_LOGGING ? console.log.bind(console) : () => { }
const debugWarn = PERFORMANCE_CONFIG.ENABLE_ERROR_LOGGING ? console.warn.bind(console) : () => { }
const debugError = PERFORMANCE_CONFIG.ENABLE_ERROR_LOGGING ? console.error.bind(console) : () => { }
const perfLog = PERFORMANCE_CONFIG.ENABLE_PERFORMANCE_LOGGING ? console.log.bind(console) : () => { }

// ===== 渲染层级 (Depth) 配置 =====
const MAP_DEPTHS = {
  FLOOR: 0,
  CARPET: 1,
  BUILDING: 5,
  FURNITURE: 10,
  BILLBOARD: 15,
  PLAYER: 100,
  NPC: 100,
  UI: 1000
}

export class Start extends Phaser.Scene {
  constructor() {
    super("Start")
    this.workstationManager = null
    this.washroomManager = null // 添加洗手间管理器
    this.chunkManager = null // 区块管理器
    this.aiNpcManager = null // AI NPC管理器
    this.frontDeskManager = null // 前台客服管理器
    this.dayNightManager = null // 昼夜管理器
    this.indoorAreasManager = null // 室内区域管理器
    this.player = null
    this.cameraInput = null // 相机和输入管理器
    this.billboardManager = null // 📺 大屏管理器 (Hot Billboard)
    this.mobileControls = null // 📱 移动端控制
    this.gameBridge = null // Phaser ↔ React 桥接 API
    this.currentUser = null
    this.bindingUI = null
    this.otherPlayers = new Map() // 存储其他玩家
    this.myStatus = null // 我的状态

    // 已加载的工位: id -> sprite (used by chunk system)
    this.loadedWorkstations = new Map()

    // 🔧 碰撞器管理 (由 PlayerCollisionManager 管理)
    this.playerCollisionManager = null

    // 地图渲染器 (tilemap, object layers, collision groups)
    this.mapRenderer = null

    // 资源加载器 (在 preload 中初始化)
    this.assetLoader = null;
  }

  preload() {
    this.assetLoader = new AssetLoader(this)
    this.assetLoader.preload()
  }

  async create() {
    // Phaser scene creation (async to load player position from database)

    // 注册 Phaser ↔ React 桥接 API
    this.gameBridge = new GameBridgeAPI(this)

    if (typeof window !== "undefined") {
      this.gameBridge.registerAll()

      // 🔧 性能优化：监听 Page Visibility API，场景切换、页面隐藏时暂停/恢复后台任务
      this.setupVisibilityListeners();

      // 初始化简单的键盘输入控制
      this.keyboardInputEnabled = true // 默认启用
      // 简化键盘输入控制已初始化

      // 获取用户数据（从场景参数获取，React会通过参数传进来）
      const sceneData = this.scene.settings.data || {}
      this.currentUser = sceneData.userData

      if (!this.currentUser) {
        // 如果没有从React传过来，尝试从本地缓存获取（仅作为备选）
        // 这里的逻辑应该由 React 层面统一调度
        const cachedUser = this.getCurrentUserFromStorage()
        if (cachedUser) {
          this.currentUser = cachedUser
        } else {
          // 没有找到用户数据，使用默认设置
          this.currentUser = {
            id: 'temp_user',
            username: 'Guest',
            character: 'hangli',
            points: 100,
            gold: 100
          }
        }
      }

      // 注意：不再在Phaser内部主动调用 syncUserToDatabase()
      // 用户数据的持久化应由 app/api/player 等后台接口统一处理，或由 React 层面触发同步

      // 确保积分字段一致性 - 如果有gold字段但没有points字段，进行同步
      if (
        this.currentUser.gold !== undefined &&
        this.currentUser.points === undefined
      ) {
        this.currentUser.points = this.currentUser.gold
        // 同步积分字段：gold -> points
      } else if (
        this.currentUser.points !== undefined &&
        this.currentUser.gold === undefined
      ) {
        this.currentUser.gold = this.currentUser.points
        // 同步积分字段：points -> gold
      }

      // 游戏逻辑
      this.userData = {
        username: this.currentUser.username,
        level: 1,
        hp: 80,
        maxHp: 100,
        gold: 150,
        deskCount: 1000,
      }

      // 初始化碰撞管理器（必须在WorkstationManager创建之前，因为loadWorkstation可能会立即尝试添加角色到物理组）
      this.playerCollisionManager = new PlayerCollisionManager(this)
      // Note: PlayerCollisionManager.init() is called later after player is created
      // But we need otherPlayersGroup available now for WorkstationManager
      if (!this.playerCollisionManager.otherPlayersGroup) {
        this.playerCollisionManager.otherPlayersGroup = this.physics.add.group({ immovable: true })
        this.playerCollisionManager.otherPlayersGroup.setDepth(MAP_DEPTHS.PLAYER)
      }
      this.npcGroup = this.physics.add.group({ immovable: true })
      debugLog('✅ [Start] player groups 物理组已初始化')

      // 初始化工位管理器
      this.workstationManager = new WorkstationManager(this)

      // 🚀 启用视口优化功能 
      this.workstationManager.enableViewportOptimization()
      // 视口优化已启用

      // 初始化洗手间管理器
      this.washroomManager = new WashroomManager(this)
      // 初始化工位绑定UI
      this.bindingUI = new WorkstationBindingUI(this)

      // 初始化 AI NPC 管理器
      this.aiNpcManager = new AiNpcManager(this)

      // 初始化前台客服管理器
      this.frontDeskManager = new FrontDeskManager(this)

      // 📺 初始化大屏管理器
      this.billboardManager = new BillboardManager(this)

      // 为UI更新设置定时器而不是每帧更新
      // 暂时禁用UI更新定时器以排查CPU占用问题
      // this.uiUpdateTimer = this.time.addEvent({
      //   delay: 1000, // 改为每秒更新一次
      //   callback: () => {
      //     if (this.bindingUI) {
      //       this.bindingUI.update()
      //     }
      //   },
      //   callbackScope: this,
      //   loop: true
      // })

      this.setupWorkstationEvents()
      this.setupUserEvents()

      // 🔧 性能优化：创建其他玩家/角色的物理group（用于碰撞检测）
      // 已在上方统一初始化，此处仅保留逻辑说明
      debugLog('✅ 玩家物理组已准备就绪')

      // 初始化地图渲染器
      this.mapRenderer = new MapRenderer(this)

      // 🏰 初始化建筑对象组（用于昼夜系统）
      this.mapRenderer.buildingGroup = this.add.group();
      // 📺 初始化大屏/公告栏感应器组
      this.mapRenderer.billboardSensors = this.physics.add.group()
      this.mapRenderer.bulletinBoardSensors = this.physics.add.group()

      const map = this.mapRenderer.createTilemap()

      this.mapLayers = this.mapRenderer.createTilesetLayers(map)
      this.mapRenderer.renderObjectLayer(map, "desk_objs")

      // 创建洗手间
      this.washroomManager.createWashroom(map)
      this.mapRenderer.renderObjectLayer(map, "washroom/washroom_objs")

      // 创建floor图层
      this.mapRenderer.renderObjectLayer(map, "floor")

      // 🔧 关键修复：在渲染前台对象之前，先初始化FrontDeskManager并等待API数据加载完成
      if (this.frontDeskManager) {
        try {
          await this.frontDeskManager.init()
          console.log('✅ [Start] FrontDeskManager 初始化完成，API数据已加载')
        } catch (error) {
          console.error('❌ [Start] FrontDeskManager 初始化失败:', error)
        }
      }

      // 创建前台图层（确保在FrontDeskManager初始化之后）
      try {
        this.mapRenderer.renderObjectLayer(map, "front_desk_objs")
      } catch (e) {
        console.warn("Front desk layer optional/missing")
      }

      // 创建书架图层
      try {
        this.mapRenderer.renderObjectLayer(map, "bookcase_objs")
      } catch (e) {
        console.warn("Bookcase layer optional/missing")
      }

      // 创建大屏预览对象图层
      try {
        this.mapRenderer.renderObjectLayer(map, "front_display")
      } catch (e) {
        console.warn("Front display layer optional/missing")
      }

      // 🖼️ 渲染装饰图层 (由用户新增)
      try {
        this.mapRenderer.renderObjectLayer(map, "wall_obj")
      } catch (e) {
        console.warn("Wall decoration layer missing")
      }

      // 🏰 渲染建筑图层 (由用户新增)
      try {
        this.mapRenderer.renderObjectLayer(map, "building")
      } catch (e) {
        console.warn("Building layer missing")
      }

      // 所有对象层加载完毕后，统一初始化区块系统
      if (this.mapRenderer.workstationObjects.length > 0) {
        this.initializeChunkSystem()
      }

      // 🔧 混合加载逻辑：检查数据库和 localStorage
      let playerStartX = null
      let playerStartY = null
      let playerDirection = null

      try {
        debugLog('🔍 正在加载玩家位置 (数据库)...')
        const response = await fetch('/api/player', {
          method: 'GET',
          credentials: 'include'
        })

        if (response.ok) {
          const data = await response.json()
          if (data.success && data.hasPlayer && data.data?.player) {
            playerStartX = data.data.player.currentX
            playerStartY = data.data.player.currentY
            playerDirection = data.data.player.playerState?.direction || null

            // 同步用户状态
            if (data.data.user && data.data.user.current_status) {
              this.currentUser = { ...this.currentUser, currentStatus: data.data.user.current_status }
            }
          }
        }
      } catch (error) {
        debugWarn('⚠️ 数据库加载失败:', error)
      }

      // 检查本地缓存是否更新
      try {
        const localStateStr = localStorage.getItem('playerState')
        if (localStateStr) {
          const localState = JSON.parse(localStateStr)
          // 如果数据库没有数据，或者本地缓存是最新移动的（简单判断：有本地缓存就优先，因为本地同步是毫秒级的）
          if (playerStartX === null || localState.x !== undefined) {
            debugLog('📱 发现本地缓存位置，将优先使用本地数据以实现无缝恢复')
            playerStartX = localState.x
            playerStartY = localState.y
            playerDirection = localState.direction || playerDirection
          }
        }
      } catch (e) {
        debugWarn('⚠️ 本地缓存解析失败:', e)
      }

      // 创建玩家 - 传入保存的位置和朝向（如果有）
      await this.createPlayer(map, playerStartX, playerStartY, playerDirection)

      // 初始化相机和输入管理器
      this.cameraInput = new CameraInputManager(this)

      // 设置输入
      this.cameraInput.setupInput()

      // 加载 AI NPCs
      if (this.aiNpcManager) {
        this.aiNpcManager.init()
      }

      // 📱 初始化移动端控制
      this.mobileControls = new MobileControlsManager(this)
      this.mobileControls.init()

      // 监听移动端交互
      this.events.on('mobile-action-press', () => {
        this.cameraInput.handleInteraction()
      })

      // 前台客服已在渲染前台对象之前初始化完成，这里不需要再次调用
      // 如果frontDeskManager未初始化，在这里也不应该再初始化（会导致重复加载）

      // 设置相机
      this.cameraInput.setupCamera(map)

      // 🔧 关键修复：相机设置完成后，立即更新区块（确保加载玩家周围的工位）
      if (this.chunkManager) {
        debugLog('🎯 相机设置完成，强制更新区块')
        this.time.delayedCall(50, () => {
          this.chunkManager.updateActiveChunks()
        })

        // 🔧 双保险：区块加载后再次确保碰撞器已创建
        this.time.delayedCall(500, () => {
          this.playerCollisionManager.ensurePlayerDeskCollider()
        })
      }

      // 设置社交功能
      this.setupSocialFeatures()

      // 初始化碰撞管理器（在player和physics groups准备好之后）
      this.playerCollisionManager.init()

      // 创建完成后的初始化
      this.time.delayedCall(100, async () => {
        // 清理所有现有绑定和星星标记
        this.workstationManager.clearAllBindings()
        this.workstationManager.printStatistics()

        // 从服务器同步工位绑定信息 - 重新启用，但添加错误处理
        try {
          await this.workstationManager.syncWorkstationBindings()
        } catch (error) {
          debugError('同步工位绑定失败，但游戏继续运行:', error)
        }

        // 高亮当前用户的工位
        if (this.currentUser) {
          this.workstationManager.highlightUserWorkstation(this.currentUser.id)
        }

        // 检查过期工位
        this.checkExpiredWorkstations()

        // 设置定时同步工位状态（每30秒）- 重新启用但添加错误处理
        this.setupWorkstationSync()

        // 更新UI显示用户数据（积分和工位绑定状态）
        this.sendUserDataToUI()

        // 确保玩家移动是启用的
        // 检查玩家移动状态
        // enableMovement属性检查
        // enableMovement方法类型检查
        if (this.player && !this.player.enableMovement) {
          this.player.enableMovement = true
          // 设置enableMovement属性为true
        } else if (
          this.player &&
          typeof this.player.enableMovement === "function"
        ) {
          this.player.enableMovement()
          // 调用enableMovement()方法
        }

        // 保存游戏场景引用到全局变量，供工位绑定使用
        this.saveGameScene()

        // 移除定期检查玩家移动的定时器以优化CPU使用
        // 玩家移动问题现在通过其他机制处理，不需要每2秒检查
      })

      // 发送用户数据到UI
      this.sendUserDataToUI()

      // 保存游戏场景引用，确保工位绑定功能可用
      this.saveGameScene()

      // AI NPC 已经在上方的 aiNpcManager.init() 中加载

      // 🌓 初始化昼夜系统
      this.initializeDayNightSystem()

      console.log('🎮 游戏配置信息:', {
        渲染器: this.game.renderer.type === 0 ? 'CANVAS' : 'WEBGL',
        尺寸: `${this.game.config.width}x${this.game.config.height}`,
        FPS目标: this.game.loop.targetFps,
        实际FPS: this.game.loop.actualFps
      });

    }

    // 🔧 新增：监听用户登录事件,刷新玩家和工位状态
    this.setupLoginListener()
  }

  update() {
    // 只处理需要每帧更新的核心逻辑
    this.cameraInput.handlePlayerMovement()

    // 更新前台标签位置
    if (this.frontDeskManager) {
      this.frontDeskManager.update()
    }

    // 📺 更新大屏管理器 (处理玩家靠近检测 - 使用碰撞组而非数学计算)
    if (this.billboardManager && this.player) {
      if (this.updateCounter % 5 === 0) { // 每5帧检查一次 overlap
        const nearBillboard = this.mapRenderer?.billboardSensors ? this.physics.overlap(this.player, this.mapRenderer.billboardSensors) : false;
        const nearBulletin = this.mapRenderer?.bulletinBoardSensors ? this.physics.overlap(this.player, this.mapRenderer.bulletinBoardSensors) : false;

        this.billboardManager.setProximity(nearBillboard || nearBulletin);
      }
      this.billboardManager.update()
    }

    // 记录并在控制台打印坐标 (每隔 2 秒打印一次，避免刷屏)
    if (this.player && this.updateCounter % 120 === 0) {
      console.log(`📍 当前坐标: X=${Math.round(this.player.x)}, Y=${Math.round(this.player.y)}`);
    }

    // 为 update 循环添加一个简单的计数器（如果还不存在）
    if (!this.updateCounter) this.updateCounter = 0
    this.updateCounter++

    // 碰撞相关的周期性检查（由 PlayerCollisionManager 管理）
    if (this.playerCollisionManager) {
      this.playerCollisionManager.update(this.updateCounter)

      // 每 100 周期输出一次心跳日志，确认系统在运行
      if (this.updateCounter % 100 === 0) {
        console.log('💓 [Phaser Heartbeat]', {
          hasUser: !!this.currentUser,
          userId: this.currentUser?.id,
          workstationId: this.currentUser?.workstationId,
          activeCollisions: this.playerCollisionManager?.activeCollisions?.size
        })
      }
    }

    // 🤖 每 1 秒 (60 帧) 更新一次动态 NPC 遭遇
    if (this.updateCounter % 60 === 0 && this.aiNpcManager && this.player) {
      this.aiNpcManager.updateDynamicNpcs(this.player.x, this.player.y)
    }
    // 🚀 [Perf] 每 60 帧调用一次工位空间优化 (Visual Culling)
    // 分散负载：在 updateDynamicNpcs 执行后的下一帧执行
    if (this.updateCounter % 60 === 30 && this.workstationManager && this.player) {
      this.workstationManager.updateSpatialOptimization(this.player.x, this.player.y);
    }
  }


  // checkFrontDeskCollisionEnd and checkMyWorkstationProximity moved to PlayerCollisionManager

  // 已删除无用的性能优化系统初始化函数

  // 已删除无用的优化碰撞检测函数

  // ===== 玩家相关方法 =====
  async createPlayer(map, savedX = null, savedY = null, savedDirection = null) {
    // 从对象层获取玩家位置（作为默认fallback）
    const userLayer = map.getObjectLayer("player_objs")
    if (!userLayer) {
      debugWarn("User objects layer not found")
      return
    }

    // 找到玩家身体对象
    const userBody = userLayer.objects.find((obj) => obj.name === "user_body")

    // 使用保存的位置，如果没有则使用Tiled地图的默认位置
    const startX = savedX !== null ? savedX : userBody.x
    const startY = savedY !== null ? savedY : (userBody.y - userBody.height)
    const startDirection = savedDirection || 'down'

    debugLog('🎮 Creating player at position:', startX, startY, 'direction:', startDirection,
      savedX !== null ? '(from database)' : '(from Tiled map default)')

    // 创建玩家实例，启用移动和状态保存
    const playerSpriteKey =
      this.currentUser?.character || "characters_list_image"

    // 🔧 关键修复：确保角色纹理已加载（按需加载）
    await this.assetLoader.ensureCharacterTexture(playerSpriteKey)

    // 创建主玩家的playerData
    const mainPlayerData = {
      id: this.currentUser?.id || "main-player",
      name: this.currentUser?.username || "我",
      currentStatus: this.currentUser?.currentStatus || {
        type: "working",
        status: "工作中",
        emoji: "💼",
        message: "正在使用PixelDesk...",
        timestamp: new Date().toISOString(),
      },
    }

    this.player = new Player(
      this,
      startX,
      startY,
      playerSpriteKey,
      true,
      true,
      false,
      mainPlayerData
    )
    this.add.existing(this.player)
    this.player.setDepth(MAP_DEPTHS.PLAYER)

    // 如果当前下班了，初始化时就隐藏角色（针对主玩家自己）
    if (mainPlayerData.currentStatus.type === 'off_work') {
      this.player.setVisible(false)
    }

    // 记录初始状态到 status_history（用于活动跟踪）
    if (this.currentUser && typeof window !== 'undefined' && mainPlayerData.currentStatus) {
      this.time.delayedCall(1000, async () => {
        if (window.updateMyStatus) {
          // 仅同步，不触发重新记录历史（传入 true 表示跳过 API）
          await window.updateMyStatus(mainPlayerData.currentStatus, true)
          debugLog('✅ 初始玩家状态已同步')
        }
      })
    }

    // 设置保存的朝向
    if (savedDirection) {
      this.player.setDirectionFrame(startDirection)
    }

    // 确保玩家移动是启用的
    this.time.delayedCall(50, () => {
      if (this.player && typeof this.player.enableMovement === "function") {
        this.player.enableMovement()
      } else {
        debugError(
          "Start.js: 玩家创建后 - 无法恢复玩家移动 - player对象或enableMovement方法不存在"
        )
      }
    })

    // 确保在玩家创建后设置与地图图层的碰撞
    this.time.delayedCall(100, () => {
      const officeLayer = this.mapLayers?.office_1
      if (officeLayer) {
        this.physics.add.collider(this.player, officeLayer)
        officeLayer?.setCollisionByProperty({ solid: true })
      }

      const treeLayer = this.mapLayers?.tree
      if (treeLayer) {
        this.physics.add.collider(this.player, treeLayer)
        treeLayer?.setCollisionByProperty({ solid: true })
      }



      // 🔧 移除：group碰撞器会在第一次加载工位后创建，不在这里创建
      // 原因：此时deskColliders可能还是空的（区块异步加载）

      // 添加玩家碰撞边界调试显示
      if (this.player.body) {
        const debugGraphics = this.add.graphics()
        debugGraphics.lineStyle(2, 0x00ff00, 1)
        debugGraphics.strokeRect(
          this.player.body.x,
          this.player.body.y,
          this.player.body.width,
          this.player.body.height
        )
      }
    })

    // debugLog('Player created at:', this.player.x, this.player.y);
  }

  // handlePlayerMovement moved to CameraInputManager.js

  // ===== 工位事件处理 =====
  setupWorkstationEvents() {
    // 监听工位绑定请求事件
    this.events.on("workstation-binding-request", (data) => {
      // Workstation binding request
      this.showWorkstationBindingPrompt(data.workstation)
    })

    // 监听工位相关事件
    this.events.on("workstation-clicked", () => {
      // 在这里添加自定义的点击处理逻辑
    })

    this.events.on("user-bound", (data) => {
      // debugLog('User bound event:', data);
      // 工位绑定后，让对应工位的缓存失效
      if (this.workstationManager && data.workstationId) {
        this.workstationManager.invalidateWorkstationBinding(data.workstationId);
      }

      // 触发DOM事件更新工位绑定
      window.dispatchEvent(new CustomEvent('workstation-binding-updated', {
        detail: { userId: data.userId, workstationId: data.workstationId }
      }));
    })

    this.events.on("user-unbound", (data) => {
      // debugLog('User unbound event:', data);
      // 工位解绑后，让对应工位的缓存失效
      if (this.workstationManager && data.workstationId) {
        this.workstationManager.invalidateWorkstationBinding(data.workstationId);
      }

      if (this.currentUser && this.currentUser.id === data.userId) {
        // 更新用户的工位列表
        if (this.currentUser.workstations) {
          this.currentUser.workstations = this.currentUser.workstations.filter(
            (ws) => ws.id !== data.workstationId
          )
        }
        this.saveCurrentUser()

        // 更新UI显示工位ID
        this.sendUserDataToUI()
      }
    })
  }

  // ===== Map creation, object rendering, and collision methods moved to MapRenderer.js =====

  // ===== 区块系统方法 =====
  initializeChunkSystem() {
    debugLog('🚀 初始化区块管理系统')

    // 创建区块管理器
    this.chunkManager = new ChunkManager(this, {
      chunkSize: 3000,      // 🔧 增加到3000，进一步减少区块总数（每个区块覆盖3000x3000像素）
      loadRadius: 1,        // 加载当前区块及周围1圈区块（固定1圈，最多9个区块）
      unloadDelay: 5000,    // 🔧 从3秒增加到5秒，减少频繁切换
      updateInterval: 3000  // 🔧 从2秒增加到3秒，进一步降低更新频率
    })

    // 设置区块事件监听（必须在初始化区块之前）
    this.setupChunkEvents()

    // 初始化区块（分配工位到区块）
    this.chunkManager.initializeChunks(this.mapRenderer.workstationObjects)

    // 添加全局函数获取区块统计
    if (typeof window !== 'undefined') {
      window.getChunkStats = () => this.chunkManager.getStats()
    }

    debugLog('✅ 区块管理系统初始化完成')
  }

  setupChunkEvents() {
    // 监听区块加载事件
    this.events.on('chunk-load', (data) => {
      debugLog(`📥 加载区块，工位数: ${data.workstations.length}`)
      data.workstations.forEach(obj => {
        this.loadWorkstation(obj)
      })

      // 🔧 性能优化：在第一次加载工位后，创建玩家与deskColliders的group碰撞器
      // 确保此时deskColliders中已有工位，碰撞才能生效
      this.playerCollisionManager.ensurePlayerDeskCollider()
    })

    // 监听区块卸载事件
    this.events.on('chunk-unload', (data) => {
      debugLog(`📤 卸载区块，工位数: ${data.workstations.length}`)
      data.workstations.forEach(obj => {
        this.unloadWorkstation(obj)
      })
    })
  }

  // ensurePlayerDeskCollider moved to PlayerCollisionManager

  loadWorkstation(obj) {
    // 如果已加载，跳过
    if (this.loadedWorkstations.has(obj.id)) {
      return
    }

    // 创建工位精灵
    const adjustedY = obj.y - obj.height
    const sprite = this.mapRenderer.createWorkstationSprite(obj, adjustedY)

    if (sprite) {
      // 使用WorkstationManager创建工位
      const workstation = this.workstationManager.createWorkstation(obj, sprite)

      // 保存引用 (使用统一的 finalId)
      this.loadedWorkstations.set(workstation.id, sprite)

      // 🔧 关键：设置工位ID到精灵上，方便碰撞检测时识别
      sprite.workstationId = workstation.id

      // 🔧 性能优化：使用group碰撞器，避免为每个工位创建独立碰撞器
      this.mapRenderer.addDeskCollision(sprite, obj)
      // 已移除详细工位日志，使用区块级别的统计信息代替

      // 🔧 关键修复：如果工位已有绑定，需要重新应用视觉效果和角色
      if (workstation && workstation.isOccupied) {
        debugLog(`📥 加载已绑定工位 ${obj.id}, 用户: ${workstation.userId}`)

        // 重新应用绑定的视觉效果
        this.workstationManager.setupInteraction(workstation)

        // 重新创建角色精灵和状态图标
        if (workstation.userId && workstation.userInfo) {
          this.workstationManager.updateWorkstationStatusIcon(
            workstation,
            workstation.userInfo.currentStatus
          )

          // 🔧 关键修复：为新创建的角色设置碰撞检测
          if (workstation.characterSprite) {
            this.playerCollisionManager.addCollisionForWorkstationCharacter(workstation.characterSprite)
          }
        }
      }
    }
  }

  unloadWorkstation(obj) {
    const sprite = this.loadedWorkstations.get(obj.id)
    if (!sprite) return

    // 从碰撞组移除
    if (this.mapRenderer?.deskColliders) {
      this.mapRenderer.deskColliders.remove(sprite, true, true) // 移除并销毁
    }

    // 从WorkstationManager移除
    // 注意：我们保留workstation数据，只销毁精灵
    const workstation = this.workstationManager.getWorkstation(obj.id)
    if (workstation) {
      // 🔧 修复：移除角色精灵（如果有）
      if (workstation.characterSprite) {
        // 🔧 性能优化：从玩家group中移除
        if (this.playerCollisionManager?.otherPlayersGroup && workstation.characterSprite.body) {
          this.playerCollisionManager.otherPlayersGroup.remove(workstation.characterSprite, true, true)
          console.log(`🗑️ 角色已从玩家group移除`)
        }

        workstation.characterSprite.destroy()
        workstation.characterSprite = null
        debugLog(`🗑️ 卸载工位 ${obj.id} 的角色精灵`)
      }

      // 移除精灵引用，但保留数据
      workstation.sprite = null

      // 移除交互图标和其他视觉元素
      this.workstationManager.removeInteractionIcon(workstation)
      this.workstationManager.removeOccupiedIcon(workstation)
      this.workstationManager.removeUserWorkstationHighlight(workstation)
    }

    // 从缓存移除
    this.loadedWorkstations.delete(obj.id)
  }

  // createWorkstationSprite and isDeskObject moved to MapRenderer.js

  // setupCamera, setupCameraFollow, createZoomControls, adjustZoom, updateDeadzone,
  // setupInput, handleInteraction moved to CameraInputManager.js

  // ===== 全局函数方法 =====
  saveGameScene() {
    // 保存游戏场景引用的全局函数
    debugLog("Game scene saved globally")
    if (typeof window !== "undefined") {
      window.gameScene = this
    }
  }

  // handleTeleportKeyPress moved to CameraInputManager.js

  getWorkstationCount() {
    // 获取工位总数的全局函数
    if (this.workstationManager) {
      return this.workstationManager.workstations.size
    }
    return 0
  }

  getWorkstationStats() {
    // 获取工位统计的全局函数
    if (this.workstationManager) {
      const stats = this.workstationManager.getStatistics()
      return {
        totalWorkstations: stats.total,
        boundWorkstations: stats.occupied,
        availableWorkstations: stats.available,
        occupancyRate: stats.occupancyRate,
      }
    }
    return {
      totalWorkstations: 0,
      boundWorkstations: 0,
      availableWorkstations: 0,
      occupancyRate: "0%",
    }
  }

  // ===== 工位管理便捷方法 =====
  // 这些方法提供对工位管理器的便捷访问
  bindUser(workstationId, userId, userInfo) {
    return this.workstationManager.bindUserToWorkstation(
      workstationId,
      userId,
      userInfo
    )
  }

  unbindUser(workstationId) {
    return this.workstationManager.unbindUserFromWorkstation(workstationId)
  }

  getWorkstation(workstationId) {
    return this.workstationManager.getWorkstation(workstationId)
  }

  getAvailableWorkstations() {
    return this.workstationManager.getAvailableWorkstations()
  }

  // 根据工位方向计算角色位置和朝向
  calculateCharacterPosition(workstation) {
    const { position, size, direction } = workstation
    const offsetX = -10 // 角色与工位的距离
    const offsetY = workstation.size.height // 角色与工位的垂直距离

    let characterX = position.x
    let characterY = position.y
    let characterDirection = "down"

    switch (direction) {
      case "right":
        // 右侧工位，角色放在工位右侧，面向左
        characterX = position.x + size.width + offsetX
        characterY = position.y - offsetY
        characterDirection = "left"
        break

      case "left":
        // 左侧工位，角色放在工位左侧，面向右
        characterX = position.x - offsetX
        characterY = position.y - offsetY
        characterDirection = "right"
        break

      case "single":
        // 单人桌，角色放在工位上方，面向下
        characterX = position.x + size.width / 2 // 居中
        characterY = position.y - offsetY - 30
        characterDirection = "down"
        break

      case "center":
        // 中间工位，角色放在工位上方，面向下
        characterX = position.x + size.width / 2 - 24 // 居中
        characterY = position.y - offsetY
        characterDirection = "down"
        break

      default:
        // 默认处理
        characterX = position.x + size.width + offsetX
        characterY = position.y
        characterDirection = "left"
    }

    return { x: characterX, y: characterY, direction: characterDirection }
  }

  // ===== 用户管理方法 =====
  getCurrentUserFromStorage() {
    try {
      const userData = localStorage.getItem("pixelDeskUser")
      return userData ? JSON.parse(userData) : null
    } catch (e) {
      debugWarn("Failed to parse user data from localStorage", e)
      return null
    }
  }

  async syncUserToDatabase() {
    if (!this.currentUser) return

    debugLog("同步用户数据到数据库:", this.currentUser)

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: this.currentUser.id,
          name: this.currentUser.username,
          points: this.currentUser.points || 50,
          gold: this.currentUser.gold || 50,
        }),
      })

      const result = await response.json()

      if (result.success) {
        // 更新当前用户数据为服务器返回的数据
        this.currentUser.id = result.data.id
        this.currentUser.points = result.data.points
        this.currentUser.gold = result.data.gold
        this.saveCurrentUser()
      } else {
        debugWarn("用户数据同步失败:", result.error)
      }
    } catch (error) {
      debugWarn("同步用户数据到数据库失败:", error)
    }
  }

  setupUserEvents() {
    // 监听积分更新事件
    this.events.on("user-points-updated", (data) => {
      if (this.currentUser && this.currentUser.id === data.userId) {
        // 同时更新内存中的用户数据和localStorage
        this.currentUser.points = data.points
        this.currentUser.gold = data.points // 同时更新gold字段以确保一致性
        this.saveCurrentUser()
        this.sendUserDataToUI()
      }
    })

    // 监听工位绑定事件
    this.events.on("user-bound", (data) => {

      if (this.currentUser && this.currentUser.id === data.userId) {

        // 更新用户的工位列表
        if (!this.currentUser.workstations) {
          this.currentUser.workstations = []
        }

        const workstationInfo = {
          id: data.workstationId,
          position: data.workstation.position,
          type: data.workstation.type,
          boundAt: data.workstation.boundAt,
          expiresAt: data.workstation.expiresAt,
        }

        this.currentUser.workstations.push(workstationInfo)
        this.saveCurrentUser()

        // 立即更新UI显示工位ID
        this.sendUserDataToUI()

        // 延迟调用确保工位管理器状态同步完成
        setTimeout(() => {
          this.sendUserDataToUI()
        }, 100)

        // 再次延迟调用确保React状态更新
        setTimeout(() => {
          this.sendUserDataToUI()
        }, 500)
      } else {
        debugLog('⚠️ [user-bound事件] 不匹配当前用户，跳过状态更新')
      }
    })
  }

  saveCurrentUser() {
    if (this.currentUser) {
      localStorage.setItem("pixelDeskUser", JSON.stringify(this.currentUser))
    }
  }

  // 设置工位状态定时同步
  setupWorkstationSync() {
    if (this.workstationManager) {
      // 使用 WorkstationManager 自带的带 Page Visibility 优化的轮询机制
      // 默认 30 秒轮询一次，兼顾实时性与性能
      this.workstationManager.startStatusPolling(30000);
      debugLog("✅ 工位状态定时同步已启动（基于 Page Visibility 优化，30s/次）");
    }
  }

  sendUserDataToUI() {
    if (this.currentUser) {
      // 获取当前用户的工位ID
      const userWorkstation = this.workstationManager.getWorkstationByUser(
        this.currentUser.id
      )
      const workstationId = userWorkstation ? userWorkstation.id : ""

      // 修复积分显示 - 优先使用points字段，如果没有则使用gold字段
      const userPoints = this.currentUser.points || this.currentUser.gold || 0

      this.events.emit("update-user-data", {
        username: this.currentUser.username,
        points: userPoints,
        character: this.currentUser.character,
        workstationId: workstationId,
        deskCount: this.userData.deskCount,
      })

      // 触发工位绑定状态更新事件给React组件（确保状态同步）
      if (typeof window !== "undefined") {
        // 只在开发环境下输出调试信息
        if (process.env.NODE_ENV === 'development') {
          debugLog('🔄 [sendUserDataToUI] 触发工位绑定状态更新事件:', {
            userId: this.currentUser.id,
            workstationId: workstationId,
            hasWorkstationId: !!workstationId,
            eventWillBeFired: !!workstationId
          })
        }

        // 只有在Phaser端有工位数据时才触发事件，避免覆盖React端的正确数据
        if (workstationId) {
          window.dispatchEvent(new CustomEvent('workstation-binding-updated', {
            detail: {
              userId: this.currentUser.id,
              workstationId: workstationId,
              timestamp: Date.now(),
              userPoints: userPoints,
              forceReload: true // 强制重新加载状态
            }
          }))
        } else {
          // 跳过事件触发，避免覆盖React端正确数据
        }
      }

      // 触发工位统计更新事件给Next.js
      if (typeof window !== "undefined") {
        const stats = this.getWorkstationStats()
        window.dispatchEvent(
          new CustomEvent("workstation-stats-updated", {
            detail: stats,
          })
        )
      }
    }
  }

  checkExpiredWorkstations() {
    if (this.workstationManager) {
      this.workstationManager.checkExpiredWorkstations()
    }
  }

  // ===== 工位交互方法 =====
  showWorkstationBindingPrompt(workstation) {
    if (workstation && this.currentUser) {

      // 设置工位绑定状态标志
      this.isInWorkstationBinding = true

      // 禁用玩家移动
      if (this.player && typeof this.player.disableMovement === "function") {
        this.player.disableMovement()
      }

      // 设置5秒后自动恢复玩家移动的安全机制
      if (this.playerMovementRestoreTimer) {
        this.time.removeEvent(this.playerMovementRestoreTimer)
      }
      this.playerMovementRestoreTimer = this.time.delayedCall(5000, () => {
        this.isInWorkstationBinding = false
        if (this.player && typeof this.player.enableMovement === "function") {
          this.player.enableMovement()
        } else if (this.player) {
          this.player.enableMovement = true
        }
      })

      // 调用Next.js的工位绑定回调
      if (typeof window !== "undefined" && window.onWorkstationBinding) {
        window.onWorkstationBinding(workstation, this.currentUser)
      }
    }
  }

  // ===== 社交功能方法 =====
  setupSocialFeatures() {
    // 监听状态更新事件
    if (typeof window !== "undefined") {
      window.updateMyStatus = async (statusData, skipApi = false) => {
        console.log('📢 [Start] updateMyStatus called:', statusData, 'skipApi:', skipApi)
        this.myStatus = statusData

        // 🔧 关键修复：同步更新 currentUser 内部的状态，避免逻辑判断使用旧状态
        if (this.currentUser) {
          this.currentUser.currentStatus = statusData
        }

        // 如果明确要求跳过API（通常是初始化同步），则不记录历史，不触发时间追踪
        if (this.currentUser && !skipApi) {
          try {
            // 调用API来保存状态历史
            const response = await fetch('/api/status-history', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                userId: this.currentUser.id,
                status: statusData.status || statusData.type,
                type: statusData.type,
                emoji: statusData.emoji || '',
                message: statusData.message || ''
              })
            })

            if (response.ok) {
              debugLog('状态历史已记录:', statusData.type, statusData.status)
            } else {
              debugWarn('记录状态历史失败:', response.status)
            }
          } catch (error) {
            debugWarn('记录状态历史错误:', error)
          }
        }

        if (this.currentUser && this.workstationManager) {
          const userWorkstation = this.workstationManager.getWorkstationByUser(
            this.currentUser.id
          )
          if (userWorkstation) {
            // 依赖 WorkstationManager.updateWorkstationStatusIcon 方法处理所有视图逻辑（包括下班牌、隐藏角色等）
            this.workstationManager.updateWorkstationStatusIcon(userWorkstation, statusData)
          }
        }

        // 🔧 修复：处理主玩家自身的可见性
        if (this.player) {
          if (statusData.type === 'off_work') {
            this.player.setVisible(false)
            console.log('👻 [Start] 用户下班，隐藏主玩家角色')
          } else {
            this.player.setVisible(true)
            this.player.setAlpha(1) // 确保透明度正常
            console.log('🚶 [Start] 用户上班/在岗，显示主玩家角色')

            // 如果用户刚刚切换到“工作中”，且不在任何工位附近，可以考虑给出提示或自动传送
            // 这里为了稳妥，我们至少保证它是显示的
          }
        }

        // 如果是下班状态且不是初始化同步，结束所有活动
        if (statusData.type === "off_work" && this.currentUser && !skipApi) {
          try {
            const response = await fetch("/api/time-tracking", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                userId: this.currentUser.id,
                action: "end",
              }),
            })

            if (response.ok) {
              await response.json() // 消费响应但不使用结果
            } else {
              debugError("结束活动失败:", response.status)
            }
          } catch (error) {
            debugError("结束活动时出错:", error)
          }
        }
      }

    }

    // Collision event handlers and player collisions are now handled by PlayerCollisionManager.init()
  }

  // All collision methods (setupCollisionEventHandlers, setupPlayerCollisions, handlePlayerCollision,
  // handleWorkstationFurnitureOverlap, etc.) have been moved to PlayerCollisionManager.js

  // 🔧 新增：设置登录监听器
  setupLoginListener() {
    if (typeof window === 'undefined') return

    const handleLoginSuccess = async (event) => {
      console.log('🔄 [Start] 检测到用户登录,开始刷新游戏状态:', event.detail)

      const { userId, characterSprite } = event.detail

      // 1. 更新当前用户信息
      if (this.currentUser) {
        this.currentUser.id = userId
      }

      // 2. 更新玩家角色形象
      if (this.player && characterSprite) {
        console.log('🎨 [Start] 尝试更新玩家角色形象:', characterSprite)
        if (typeof this.player.updateCharacterSprite === 'function') {
          this.player.updateCharacterSprite(characterSprite)
        } else {
          console.warn('⚠️ [Start] this.player 缺少 updateCharacterSprite 方法，尝试手动更新纹理')
          // 后备手动更新逻辑
          if (this.player.headSprite && this.player.bodySprite) {
            this.player.headSprite.setTexture(characterSprite)
            this.player.bodySprite.setTexture(characterSprite)
            if (this.player.setDirectionFrame) {
              this.player.setDirectionFrame(this.player.currentDirection || 'down')
            }
          }
        }
      }

      // 3. 重新同步工位绑定状态
      if (this.workstationManager) {
        console.log('🔄 [Start] 重新同步工位绑定状态')
        await this.workstationManager.syncWorkstationBindings()

        // 4. 移除自己工位上的工位角色 (因为现在你就是工位的主人)
        const myWorkstation = this.workstationManager.getWorkstationByUser(userId)
        if (myWorkstation && myWorkstation.characterSprite) {
          console.log('🗑️ [Start] 移除自己工位上的工位角色')
          myWorkstation.characterSprite.destroy()
          myWorkstation.characterSprite = null
        }
      }

      console.log('✅ [Start] 登录刷新完成')
    }

    window.addEventListener('user-login-success', handleLoginSuccess)

    // 清理函数
    this.events.once('shutdown', () => {
      window.removeEventListener('user-login-success', handleLoginSuccess)
    })
  }

  // ===== 清理方法 =====

  // ===== AI NPC 系统 (由 AiNpcManager.js 管理) =====


  // ===== 昼夜系统方法 =====
  initializeDayNightSystem() {
    debugLog('🌓 初始化昼夜系统')

    // 创建室内区域管理器
    this.indoorAreasManager = new IndoorAreasManager(this)

    // 尝试从 Tiled 地图加载室内区域（如果有的话）
    // this.indoorAreasManager.loadFromTiledMap('indoor-areas')

    // 手动定义室内区域（示例，根据实际地图调整坐标）
    // 如果你知道室内区域的坐标，可以在这里定义
    this.indoorAreasManager.defineIndoorAreas([
      // 示例：办公室内部区域
      // { x: 500, y: 500, width: 800, height: 600, name: '办公室主区域' },
      // { x: 1400, y: 500, width: 400, height: 400, name: '会议室' }
      // TODO: 根据实际地图添加室内区域坐标
    ])

    // 创建昼夜管理器（对 background, tree 图块层及 building 精灵层应用夜晚效果）
    // 🔧 注入 pseudo-layer 'building'
    const layersPlusBuildings = {
      ...this.mapLayers,
      building: this.mapRenderer?.buildingGroup
    }

    this.dayNightManager = new DayNightManager(this, layersPlusBuildings, {
      nightStart: 18,  // 晚上6点开始
      nightEnd: 6,     // 早上6点结束
      transitionDuration: 2000, // 2秒过渡时间
      checkInterval: 60000, // 每分钟检查一次
      nightTint: 0x3030aa,  // 夜晚色调（深蓝紫色）
      nightAlpha: 0.2     // 夜晚透明度
    })

    // 🔧 暂时禁用室内外检测以优化性能
    // 添加定时器，每500ms检查一次玩家位置并调整遮罩
    // this.indoorCheckTimer = this.time.addEvent({
    //   delay: 500, // 每500ms检查一次
    //   callback: this.updateNightOverlayForPlayerPosition,
    //   callbackScope: this,
    //   loop: true
    // })

    // 添加全局函数用于测试和调试
    if (typeof window !== 'undefined') {
      window.forceNight = () => this.dayNightManager.forceNight()
      window.forceDay = () => this.dayNightManager.forceDay()
      window.isNight = () => this.dayNightManager.isNightTime()
      window.getTimeDescription = () => this.dayNightManager.getTimeDescription()
      window.isPlayerIndoor = () => this.indoorAreasManager.isPlayerIndoor()
      window.addIndoorArea = (x, y, w, h, name) => {
        this.indoorAreasManager.addArea({ x, y, width: w, height: h, name })
        debugLog(`🏠 已添加室内区域: ${name} (${x}, ${y}, ${w}x${h})`)
      }
    }

    debugLog('✅ 昼夜系统初始化完成 (影响 background 和 tree 图块层)')
  }

  shutdown() {
    // 清理相机和输入管理器
    if (this.cameraInput) {
      this.cameraInput.destroy()
      this.cameraInput = null
    }

    // 清理碰撞管理器
    if (this.playerCollisionManager) {
      this.playerCollisionManager.destroy()
      this.playerCollisionManager = null
    }

    // 清理昼夜系统
    if (this.dayNightManager) {
      this.dayNightManager.destroy()
      this.dayNightManager = null
    }
    if (this.indoorAreasManager) {
      this.indoorAreasManager.destroy()
      this.indoorAreasManager = null
    }

    // 清理定时器
    if (this.collisionCheckTimer) {
      this.collisionCheckTimer.remove()
      this.collisionCheckTimer = null
    }

    if (this.uiUpdateTimer) {
      this.uiUpdateTimer.remove()
      this.uiUpdateTimer = null
    }

    // 🔧 室内外检测已禁用，相应的清理代码也注释掉
    // if (this.indoorCheckTimer) {
    //   this.indoorCheckTimer.remove()
    //   this.indoorCheckTimer = null
    // }

    // 清理区块管理器
    if (this.chunkManager) {
      this.chunkManager.destroy()
      this.chunkManager = null
    }

    // 清理工位和UI管理器
    if (this.workstationManager) {
      this.workstationManager.destroy()
    }
    if (this.bindingUI) {
      this.bindingUI.hide()
    }

    // 清理其他玩家
    this.otherPlayers.forEach((player) => player.destroy())
    this.otherPlayers.clear()

    // 清理工位缓存
    this.loadedWorkstations.clear()

    // 清理地图渲染器
    if (this.mapRenderer) {
      this.mapRenderer.destroy()
      this.mapRenderer = null
    }

    // 清理 Phaser ↔ React 桥接 API
    if (this.gameBridge) {
      this.gameBridge.destroy()
      this.gameBridge = null
    }

    // 清理资源加载器
    if (this.assetLoader) {
      this.assetLoader.destroy()
      this.assetLoader = null
    }

    // 调用父类的shutdown方法
    super.shutdown()
  }

  // 🔧 新增：设置页面可见性监听
  setupVisibilityListeners() {
    this.visibilityChangeHandler = () => {
      const isVisible = document.visibilityState === 'visible';

      if (isVisible) {
        console.log('🌞 [Start] 页面已恢复可见，唤醒后台任务...');
        this.resumeBackgroundTasks();
      } else {
        console.log('💤 [Start] 页面已退出视口，暂停后台任务以节省资源...');
        this.pauseBackgroundTasks();
      }
    };

    document.addEventListener('visibilitychange', this.visibilityChangeHandler);
  }

  // 🔧 新增：暂停后台密集任务
  pauseBackgroundTasks() {
    // 1. 停止工位状态轮询
    if (this.workstationManager) {
      this.workstationManager.stopStatusPolling();
    }

    // 2. 停止玩家自动保存
    if (this.player) {
      this.player.stopPeriodicSave();
    }

    // 3. 停止昼夜系统滤镜变色（如果有的活跃计算的话）
    if (this.dayNightManager && typeof this.dayNightManager.pause === 'function') {
      this.dayNightManager.pause();
    }
  }

  // 🔧 新增：恢复后台密集任务
  resumeBackgroundTasks() {
    // 1. 立即触发一次同步，然后重新开启轮询
    if (this.workstationManager) {
      this.workstationManager.syncWorkstationBindings()
        .then(() => this.workstationManager.startStatusPolling(30000))
        .catch(err => debugWarn('恢复同步失败:', err));
    }

    // 2. 重新启动玩家自动保存
    if (this.player) {
      // 只有在非其他玩家（也就是主玩家）时才重新启动
      if (!this.player.isOtherPlayer) {
        this.player.startPeriodicSave();
      }
    }

    // 3. 恢复昼夜系统
    if (this.dayNightManager && typeof this.dayNightManager.resume === 'function') {
      this.dayNightManager.resume();
    }
  }
}

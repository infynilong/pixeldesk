import { WorkstationManager } from "../logic/WorkstationManager.js"
import { Player } from "../entities/Player.js"
import { WashroomManager } from "../logic/WashroomManager.js"
import { ZoomControl } from "../components/ZoomControl.js"
import { WorkstationBindingUI } from "../components/WorkstationBindingUI.js"
import { ChunkManager } from "../logic/ChunkManager.js"
import { AiNpcManager } from "../logic/AiNpcManager.js"
import { FrontDeskManager } from "../logic/FrontDeskManager.js"
import { DayNightManager } from "../logic/DayNightManager.js"
import { IndoorAreasManager } from "../logic/IndoorAreasManager.js"
import { BillboardManager } from "../logic/BillboardManager.js"
import { MobileControlsManager } from "../logic/MobileControlsManager.js"

// ===== 性能优化配置 =====
const PERFORMANCE_CONFIG = {
  // 禁用控制台日志以大幅减少CPU消耗（开发时可设为true）
  ENABLE_DEBUG_LOGGING: true,
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
    this.cursors = null
    this.wasdKeys = null
    this.deskColliders = null
    this.billboardSensors = null // 📺 大屏近场感应区
    this.mobileControls = null // 📱 移动端控制
    this.currentUser = null
    this.bindingUI = null
    this.otherPlayers = new Map() // 存储其他玩家
    this.myStatus = null // 我的状态

    // 工位对象缓存（用于区块加载）
    this.workstationObjects = []
    this.loadedWorkstations = new Map() // 已加载的工位: id -> sprite

    // 🔧 碰撞器管理
    this.playerDeskCollider = null // 玩家与工位group的碰撞器
    this.otherPlayersGroup = null  // 其他玩家的物理group
    this.playerCharacterCollider = null // 玩家与角色group的碰撞器

    // 动态资源注册表 (按需加载)
    this.dynamicAssetRegistry = {
      // 书架 (优先使用 webp)
      "bookcase_middle": "/assets/desk/library_bookcase_normal.png",
      "library_bookcase_normal": "/assets/desk/library_bookcase_normal.png",
      "bookcase_tall": "/assets/desk/library_bookcase_tall.webp",
      "library_bookcase_tall": "/assets/desk/library_bookcase_tall.webp",
      "library_bookcase_tall_webp": "/assets/desk/library_bookcase_tall.webp",
      "Classroom_and_Library_Singles_48x48_58": "/assets/desk/Classroom_and_Library_Singles_48x48_58.png",

      // 地垫 / 门垫 (GID 58)
      "door_mat": "/assets/desk/Classroom_and_Library_Singles_48x48_58.png",

      // 洗手间
      "Shadowless_washhand": "/assets/bathroom/Shadowless_washhand.png",
      "Bathroom_matong": "/assets/bathroom/Bathroom_matong.png",
      "Shadowless_glass_2": "/assets/bathroom/Shadowless_glass_2.webp",
      "Shadowless_glass": "/assets/bathroom/Shadowless_glass.png",

      // 沙发
      "sofa-left-1": "/assets/sofa/sofa-left-1.png",
      "sofa-left-2": "/assets/sofa/sofa-left-2.png",
      "sofa-left-3": "/assets/sofa/sofa-left-3.png",
      "sofa-right-1": "/assets/sofa/sofa-right-1.png",
      "sofa-right-2": "/assets/sofa/sofa-right-2.png",
      "sofa-right-3": "/assets/sofa/sofa-right-3.png",

      // 大桌/管理桌
      "desk-big-manager-left-1": "/assets/desk/desk-big-manager-left-1.png",
      "desk-big-manager-center-1": "/assets/desk/desk-big-manager-center-1.png",
      "desk-big-manager-right-1": "/assets/desk/desk-big-manager-right-1.png",
      "desk-big-manager-center-2": "/assets/desk/desk-big-manager-center-2.png",

      // 装饰/其他
      "flower": "/assets/tileset/flower.png",
      "rug": "/assets/tileset/rug.png",
      "cabinet": "/assets/tileset/cabinet.png",
      "stair-red": "/assets/tileset/stair-red.png",
      "announcement_board_wire": "/assets/announcement_board_wire.webp",
      "front_wide_display": "/assets/front_wide_display.webp",
      "wall_decoration_1": "/assets/desk/Classroom_and_Library_Singles_48x48_31.png",
      "wall_decoration_2": "/assets/desk/Classroom_and_Library_Singles_48x48_32.png",
      "wall_decoration_3": "/assets/desk/Classroom_and_Library_Singles_48x48_33.png",
      "wall_decoration_4": "/assets/desk/Classroom_and_Library_Singles_48x48_39.png",
      "wall_decoration_5": "/assets/desk/Classroom_and_Library_Singles_48x48_36.png",
      "pixel_cafe_building": "/assets/building/pixel_cafe_building_512.png",
      "cofe_desk_up": "/assets/desk/cofe_desk_up.png"
    };

    // 正在进行的动态加载任务
    this.pendingLoads = new Set();
    this.failedLoads = new Set(); // 🔧 记录加载失败的资源，避免循环重试
    this.loadTimer = null;
  }

  preload() {
    // 先加载其他资源
    this.loadTilemap()
    this.loadTilesetImages()
    this.loadLibraryImages()
    // 加载下班标识
    this.load.image('closed_sign', '/assets/ui/closed_sign.png')
  }

  async create() {
    // Phaser scene creation (async to load player position from database)

    // 保存场景引用到全局变量，供Next.js调用
    if (typeof window !== "undefined") {
      window.saveGameScene = this.saveGameScene.bind(this)

      // 添加获取工位总数的全局函数
      window.getGameWorkstationCount = this.getWorkstationCount.bind(this)

      // 添加获取工位统计的全局函数
      window.getGameWorkstationStats = this.getWorkstationStats.bind(this)

      // 添加获取视口优化统计的全局函数
      window.getViewportOptimizationStats = () => {
        return this.workstationManager ? this.workstationManager.getViewportStats() : { enabled: false }
      }

      // 快速回到工位功能
      window.teleportToWorkstation = async () => {
        if (!this.currentUser) {
          debugWarn("没有当前用户信息")
          return { success: false, error: "请先登录" }
        }

        try {
          const result = await this.workstationManager.teleportToWorkstation(
            this.currentUser.id,
            this.player
          )

          if (result.success) {
            // 广播积分更新事件
            const event = new CustomEvent("user-points-updated", {
              detail: {
                userId: this.currentUser.id,
                points: result.remainingPoints,
              },
            })
            window.dispatchEvent(event)
          }

          return result
        } catch (error) {
          debugError("传送失败:", error)
          return { success: false, error: "传送失败，请重试" }
        }
      }

      // 添加碰撞管理相关的全局函数
      window.getCurrentCollisions = this.getCurrentCollisions.bind(this)
      window.getCollisionHistory = this.getCollisionHistory.bind(this)
      window.setCollisionSensitivity = this.setCollisionSensitivity.bind(this)

      // 已删除无用的性能优化相关全局函数绑定

      // 已删除无用的FocusManager相关函数

      // 添加强制刷新工位绑定的调试函数
      window.forceRefreshWorkstations = async () => {
        if (this.workstationManager) {
          const result = await this.workstationManager.forceRefreshAllBindings();
          return result;
        }
        return { error: 'WorkstationManager not initialized' };
      }

      // 工位调试函数已移除以优化性能

      // 添加简单的键盘控制接口
      window.disableGameKeyboard = () => {
        console.log('🎮 [Internal] Disabling Game Keyboard');
        this.keyboardInputEnabled = false;

        if (this.input && this.input.keyboard) {
          // 1. 停止当前物理移动
          if (this.player && this.player.body) {
            this.player.body.setVelocity(0, 0);
          }

          // 2. 核心修复：重置所有按键状态，防止“粘滞键”和自动走向大老远的问题
          this.input.keyboard.resetKeys();

          // 3. 停用阻止默认行为，允许在输入框中输入 WASD
          this.input.keyboard.preventDefault = false;

          // 4. 彻底停用按键管理器
          this.input.keyboard.enabled = false;
          if (this.input.keyboard.manager) {
            this.input.keyboard.manager.enabled = false;
          }

          // 5. 暂时禁用 canvas 焦点及TabIndex
          const canvas = this.game.canvas;
          if (canvas) {
            canvas.removeAttribute('tabindex');
            if (document.activeElement === canvas) {
              canvas.blur();
            }
          }

          // 6. 全局拦截拦截穿透事件 (双保险)
          if (!this.keyboardBlockHandler) {
            this.keyboardBlockHandler = (event) => {
              const target = event.target;
              const isFromInput = target.tagName.toLowerCase() === 'input' ||
                target.tagName.toLowerCase() === 'textarea' ||
                target.contentEditable === 'true';

              // 如果是输入框事件，允许传播；否则停止传播以保护 Phaser 内部状态
              if (isFromInput) return;
              event.stopPropagation();
            };
            document.addEventListener('keydown', this.keyboardBlockHandler, true);
            document.addEventListener('keyup', this.keyboardBlockHandler, true);
          }
        }
        return { success: true, enabled: false };
      }

      window.enableGameKeyboard = () => {
        console.log('🎮 [Internal] Enabling Game Keyboard');
        this.keyboardInputEnabled = true;

        if (this.input && this.input.keyboard) {
          // 1. 移除全局拦截器
          if (this.keyboardBlockHandler) {
            document.removeEventListener('keydown', this.keyboardBlockHandler, true);
            document.removeEventListener('keyup', this.keyboardBlockHandler, true);
            this.keyboardBlockHandler = null;
          }

          // 2. 重新启用 Phaser 键盘
          this.input.keyboard.enabled = true;
          if (this.input.keyboard.manager) {
            this.input.keyboard.manager.enabled = true;
          }

          // 3. 恢复阻止默认行为，保护游戏健位
          this.input.keyboard.preventDefault = true;

          // 4. 恢复 canvas 聚焦能力
          const canvas = this.game.canvas;
          if (canvas) {
            canvas.setAttribute('tabindex', '0');
            // 延迟一点点聚焦，确保 DOM 状态已更新
            setTimeout(() => canvas.focus(), 10);
          }

          // 5. 确保按键状态是干净的
          this.input.keyboard.resetKeys();

          // 6. 确保 cursors 重建并可用
          if (!this.cursors) {
            this.cursors = this.input.keyboard.createCursorKeys();
          }
          if (!this.wasdKeys) {
            this.wasdKeys = this.input.keyboard.addKeys('W,S,A,D');
          }
        }
        return { success: true, enabled: true };
      }

      window.isGameKeyboardEnabled = () => {
        return { enabled: this.keyboardInputEnabled !== false };
      }

      // 窗口重新获得焦点时重置按键状态，防止粘滞键
      window.addEventListener('focus', () => {
        if (this.keyboardInputEnabled !== false && this.input && this.input.keyboard) {
          console.log('🎮 [Internal] Window Focused - Resetting Keys');
          this.input.keyboard.resetKeys();
        }
      });

      // 游戏状态测试函数已移除以优化性能

      // 添加恢复玩家移动的全局函数
      window.enablePlayerMovement = () => {
        // 恢复玩家移动

        // 清除工位绑定状态标志
        this.isInWorkstationBinding = false;

        // 清除自动恢复定时器
        if (this.playerMovementRestoreTimer) {
          this.time.removeEvent(this.playerMovementRestoreTimer);
          this.playerMovementRestoreTimer = null;
          // 已清除自动恢复定时器
        }

        if (this.player && typeof this.player.enableMovement === "function") {
          this.player.enableMovement();
          // 玩家移动已恢复
          return { success: true, enabled: true };
        } else if (this.player) {
          // 如果没有enableMovement方法，直接设置属性
          this.player.enableMovement = true;
          // 玩家移动已恢复（通过属性设置）
          return { success: true, enabled: true };
        }
        debugWarn('🎮 无法恢复玩家移动 - 玩家对象不存在');
        return { success: false, error: '玩家对象不存在' };
      }

      // 添加全局鼠标交互控制接口
      window.disableGameMouse = () => {
        console.log('🖱️ [Internal] Disabling Game Mouse');
        if (this.input) this.input.enabled = false;
        return { success: true };
      };

      window.enableGameMouse = () => {
        console.log('🖱️ [Internal] Enabling Game Mouse');
        if (this.input) this.input.enabled = true;
        return { success: true };
      };

      // 添加禁用玩家移动的全局函数
      window.disablePlayerMovement = () => {
        // 禁用玩家移动
        if (this.player && typeof this.player.disableMovement === "function") {
          this.player.disableMovement();
          // 玩家移动已禁用
          return { success: true, enabled: false };
        } else if (this.player) {
          // 如果没有disableMovement方法，直接设置属性
          this.player.enableMovement = false;
          // 玩家移动已禁用（通过属性设置）
          return { success: true, enabled: false };
        }
        debugWarn('🎮 无法禁用玩家移动 - 玩家对象不存在');
        return { success: false, error: '玩家对象不存在' };
      }

      // 交互恢复逻辑：点击游戏区域时，如果焦点在输入框，自动释放焦点以回复键盘控制
      this.input.on('pointerdown', () => {
        const activeElement = document.activeElement;
        const isInput = activeElement && (
          activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'TEXTAREA' ||
          activeElement.contentEditable === 'true'
        );

        console.log('🎮 Game Canvas Clicked, Active Element:', activeElement?.tagName, 'Is Input:', isInput);

        if (isInput) {
          activeElement.blur();
        }

        // 无论当前是否有输入框焦点，点击 Canvas 都尝试唤醒键盘
        window.enableGameKeyboard();

        window.focus();
        if (this.game.canvas) this.game.canvas.focus();
      });

      // 触发Phaser游戏初始化完成事件
      window.dispatchEvent(new Event("phaser-game-ready"))

      // 初始化碰撞检测系统
      this.collisionSensitivity = 50 // 碰撞检测半径
      this.currentCollisions = new Set() // 当前碰撞的玩家
      this.collisionHistory = [] // 碰撞历史记录
      this.collisionDebounceTime = 100 // 防抖时间（毫秒）
      this.lastCollisionCheck = 0

      // 碰撞检测系统已初始化

      // Initialize performance optimization systems - 临时禁用以修复移动问题
      // this.initializeOptimizationSystems()

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

      // 暴露全局方法给React同步最新的用户数据
      if (typeof window !== 'undefined') {
        window.updatePhaserUserData = (userData) => {
          if (!userData) return
          console.log('🔄 [Phaser Sync] 收到 React 数据:', {
            id: userData.id,
            workstationId: userData.workstationId,
            points: userData.points
          })
          this.currentUser = { ...this.currentUser, ...userData }
          // 同时也更新WorkstationManager中的引用
          if (this.workstationManager) {
            this.workstationManager.currentUser = this.currentUser
          }
        }
      }

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

      // 初始化其他玩家物理组（用于碰撞检测）
      // 🔧 关键修复：必须在WorkstationManager创建之前初始化，因为loadWorkstation可能会立即尝试添加角色到这个组
      if (!this.otherPlayersGroup) {
        this.otherPlayersGroup = this.physics.add.group({ immovable: true })
        this.otherPlayersGroup.setDepth(MAP_DEPTHS.PLAYER)
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
      this.billboardSensors = this.physics.add.group() // 动态组，作为触发器用

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

      const map = this.createTilemap()
      this.mapLayers = this.createTilesetLayers(map)
      this.renderObjectLayer(map, "desk_objs")

      // 创建洗手间
      this.washroomManager.createWashroom(map)
      this.renderObjectLayer(map, "washroom/washroom_objs")

      // 创建floor图层
      this.renderObjectLayer(map, "floor")

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
        this.renderObjectLayer(map, "front_desk_objs")
      } catch (e) {
        console.warn("Front desk layer optional/missing")
      }

      // 创建书架图层
      try {
        this.renderObjectLayer(map, "bookcase_objs")
      } catch (e) {
        console.warn("Bookcase layer optional/missing")
      }

      // 创建大屏预览对象图层
      try {
        this.renderObjectLayer(map, "front_display")
      } catch (e) {
        console.warn("Front display layer optional/missing")
      }

      // 🖼️ 渲染装饰图层 (由用户新增)
      try {
        this.renderObjectLayer(map, "wall_obj")
      } catch (e) {
        console.warn("Wall decoration layer missing")
      }

      // 🏰 渲染建筑图层 (由用户新增)
      try {
        this.renderObjectLayer(map, "building")
      } catch (e) {
        console.warn("Building layer missing")
      }

      // 所有对象层加载完毕后，统一初始化区块系统
      if (this.workstationObjects.length > 0) {
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

      // 设置输入
      this.setupInput()

      // 加载 AI NPCs
      if (this.aiNpcManager) {
        this.aiNpcManager.init()
      }

      // 📱 初始化移动端控制
      this.mobileControls = new MobileControlsManager(this)
      this.mobileControls.init()

      // 监听移动端交互
      this.events.on('mobile-action-press', () => {
        this.handleInteraction()
      })

      // 前台客服已在渲染前台对象之前初始化完成，这里不需要再次调用
      // 如果frontDeskManager未初始化，在这里也不应该再初始化（会导致重复加载）

      // 设置相机
      this.setupCamera(map)

      // 🔧 关键修复：相机设置完成后，立即更新区块（确保加载玩家周围的工位）
      if (this.chunkManager) {
        debugLog('🎯 相机设置完成，强制更新区块')
        this.time.delayedCall(50, () => {
          this.chunkManager.updateActiveChunks()
        })

        // 🔧 双保险：区块加载后再次确保碰撞器已创建
        this.time.delayedCall(500, () => {
          this.ensurePlayerDeskCollider()
        })
      }

      // 设置社交功能
      this.setupSocialFeatures()

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
    this.handlePlayerMovement()

    // 更新前台标签位置
    if (this.frontDeskManager) {
      this.frontDeskManager.update()
    }

    // 📺 更新大屏管理器 (处理玩家靠近检测 - 使用碰撞组而非数学计算)
    if (this.billboardManager && this.player && this.billboardSensors) {
      if (this.updateCounter % 5 === 0) { // 每5帧检查一次 overlap
        const isNear = this.physics.overlap(this.player, this.billboardSensors);
        this.billboardManager.setProximity(isNear);
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

    // 每 10 周期进行一次自己的工位距离检查
    if (this.updateCounter % 10 === 0) {
      if (this.currentUser) {
        this.checkMyWorkstationProximity()
      }

      // 每 100 周期输出一次心跳日志，确认系统在运行
      if (this.updateCounter % 100 === 0) {
        console.log('💓 [Phaser Heartbeat]', {
          hasUser: !!this.currentUser,
          userId: this.currentUser?.id,
          workstationId: this.currentUser?.workstationId,
          activeCollisions: this.collisionManager?.activeCollisions?.size
        })
      }
    }

    // 每帧检测前台碰撞，触发离开时的事件
    if (this.updateCounter % 30 === 0 && this.frontDeskManager && this.player) {
      this.checkFrontDeskCollisionEnd()
    }
  }


  // 检查前台碰撞是否结束（玩家离开前台范围）
  checkFrontDeskCollisionEnd() {
    // 检查是否有碰撞中的前台
    if (!this.currentCollidingDesk) return

    // 检查玩家是否还在碰撞范围内
    const collidingDesks = this.frontDeskManager.getCollidingDesks(this.player, 80)

    if (collidingDesks.length === 0) {
      // 玩家已离开前台范围
      console.log(`🏢 [碰撞结束] 离开前台: ${this.currentCollidingDesk.name}`)
      this.currentCollidingDesk = null

      // 触发碰撞结束事件
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('front-desk-collision-end'))
      }
    }
  }

  // 检查与自己工位的距离（物理碰撞的可靠补充）
  checkMyWorkstationProximity() {
    if (!this.player || !this.currentUser) return

    let myWorkstationId = this.currentUser.workstationId

    // 🔧 关键修复：如果 currentUser 中没有 workstationId，尝试从管理器中找
    if (!myWorkstationId && this.workstationManager) {
      const boundWs = this.workstationManager.getWorkstationByUser(this.currentUser.id)
      if (boundWs) {
        myWorkstationId = boundWs.id
        this.currentUser.workstationId = myWorkstationId
        console.log(`✅ [Proximity] 从管理器自动找回了工位 ID: ${myWorkstationId}`)
      }
    }

    if (!myWorkstationId) return
    // 尝试不同的 ID 类型查找桌面
    let desk = this.loadedWorkstations.get(Number(myWorkstationId)) ||
      this.loadedWorkstations.get(String(myWorkstationId))

    if (!desk) {
      // 如果按ID找不到，遍历所有加载的工位看看
      for (const [id, sprite] of this.loadedWorkstations) {
        if (String(id) === String(myWorkstationId)) {
          desk = sprite
          break
        }
      }
    }

    if (!desk) {
      if (this.updateCounter % 200 === 0) {
        console.warn(`[Proximity] 找不到对应的工位对象: ${myWorkstationId}, 当前场景已加载总数: ${this.loadedWorkstations.size}`)
      }
      return
    }

    const deskWidth = desk.displayWidth || desk.width || 48
    const deskHeight = desk.displayHeight || desk.height || 48
    const deskCenterX = desk.x + (desk.originX === 0 ? deskWidth / 2 : 0)
    const deskCenterY = desk.y + (desk.originY === 0 ? deskHeight / 2 : 0)

    const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, deskCenterX, deskCenterY)

    // 如果在 100 像素范围内 (再次放大范围以防万一)，视为"在工位"
    if (dist < 100) {
      if (!this.collisionManager.activeCollisions.has(`workstation_${myWorkstationId}`)) {
        console.log(`[Proximity] 接近工位: ${myWorkstationId}, 距离: ${Math.round(dist)}`)
      }
      this.handleWorkstationFurnitureOverlap(this.player, desk)
    }
  }

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
    await this.ensureCharacterTexture(playerSpriteKey)

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

  // 简化玩家移动处理逻辑
  handlePlayerMovement() {
    if (!this.player || !this.player.body) {
      return;
    }

    // 检查玩家enableMovement状态
    if (!this.player.enableMovement) {
      // 停止移动，防止禁用后继续滑行
      if (this.player.body.setVelocity) {
        this.player.body.setVelocity(0, 0);
      }
      return;
    }

    // 检查是否应该处理输入
    if (this.keyboardInputEnabled === false) {
      // 当输入被禁用时，停止角色移动
      if (this.player.body.setVelocity) {
        this.player.body.setVelocity(0, 0);
      }
      return;
    }

    // 简化键盘检测 - 使用Phaser的基本键盘API
    if (!this.cursors || !this.wasdKeys) {
      // 如果键盘被禁用，不要重新创建键盘对象
      if (this.keyboardInputEnabled === false) {
        return;
      }

      // 如果还没有创建键盘对象，立即创建
      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasdKeys = this.input.keyboard.addKeys('W,S,A,D');
    }

    // 获取摇杆数据
    const joystickVector = this.mobileControls ? this.mobileControls.getVector() : null;

    // 将移动处理委托给Player类
    this.player.handleMovement(this.cursors, this.wasdKeys, joystickVector)
  }

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

  // ===== 资源加载方法 =====
  loadTilemap() {
    this.load.tilemapTiledJSON("officemap", "/assets/officemap.json")
  }

  loadTilesetImages() {
    const tilesetAssets = {
      room_builder_walls_image: "/assets/floor/Room_Builder_Walls_48x48.png",
      ice_creem_floor_image:
        "/assets/floor/Ice_Cream_Shop_Design_layer_1_48x48.png",
      grassgrand: "/assets/tileset/grassgrand.png",
      park: "/assets/tileset/park.jpeg",
      road: "/assets/tileset/road.png",
      park_obj: "/assets/tileset/park_obj.png",
    }

    Object.entries(tilesetAssets).forEach(([key, path]) => {
      this.load.image(key, path)
    })

    const spriteAssets = {
      characters_list_image: "/assets/player/me.png",
    }

    Object.entries(spriteAssets).forEach(([key, path]) => {
      this.load.spritesheet(key, path, { frameWidth: 48, frameHeight: 48 })
    })

    // 动态加载角色图片（从API获取）
    // 使用 Phaser 的 file loading pattern
    const charactersFileKey = 'characters-data'
    this.load.json(charactersFileKey, '/api/characters?pageSize=1000')

    // 监听角色数据加载完成
    this.load.once(`filecomplete-json-${charactersFileKey}`, (_key, _type, data) => {
      this.loadCharacterSprites(data)
    })
  }

  loadLibraryImages() {
    // 核心必需图像 (最小化预加载 - 确保基本场景可见)
    this.load.image("desk_image", "/assets/desk/desk_long_right.png")
    this.load.image("desk_long_right", "/assets/desk/desk_long_right.png")
    this.load.image("desk_long_left", "/assets/desk/desk_long_left.png")
    this.load.image("single_desk", "/assets/desk/single_desk.png")
    this.load.image("desk_short_right", "/assets/desk/single_desk.png")

    // 其余资源已移至 this.dynamicAssetRegistry 进行按需加载
  }

  /**
   * 从API数据加载角色精灵
   */
  /**
   * 优化后的角色加载逻辑：仅存储配置，不立即预加载所有图片
   */
  loadCharacterSprites(apiResponse) {
    try {
      if (!apiResponse || !apiResponse.success || !apiResponse.data || apiResponse.data.length === 0) {
        debugError('Invalid character data from API')
        this.loadDefaultCharacter()
        return
      }

      // 存储角色配置信息供后续使用
      this.characterConfigs = new Map()

      // 收集所有角色配置
      apiResponse.data.forEach((character) => {
        this.characterConfigs.set(character.name, {
          isCompactFormat: character.isCompactFormat,
          totalFrames: character.totalFrames,
          frameWidth: character.frameWidth,
          frameHeight: character.frameHeight,
          imageUrl: character.imageUrl // 保存URL，用于后续按需加载
        })
      })

      debugLog(`✅ Registered ${apiResponse.data.length} character configs (lazy loading enabled)`)

    } catch (error) {
      debugError('Error loading character sprites:', error)
      this.loadDefaultCharacter()
    }
  }

  /**
   * 按需加载角色纹理
   */
  async ensureCharacterTexture(characterName) {
    if (this.textures.exists(characterName)) return true;

    const config = this.characterConfigs?.get(characterName);
    if (!config || !config.imageUrl) return false;

    // 避免并发重复加载同一个角色
    const loadKey = `char_${characterName}`;
    if (this.pendingLoads.has(loadKey)) {
      return new Promise((resolve) => {
        this.load.once(`filecomplete-spritesheet-${characterName}`, () => resolve(true));
        this.load.once(`loaderror-spritesheet-${characterName}`, () => resolve(false));
      });
    }

    this.pendingLoads.add(loadKey);

    return new Promise((resolve) => {
      this.load.spritesheet(characterName, config.imageUrl, {
        frameWidth: config.frameWidth,
        frameHeight: config.frameHeight
      });

      this.load.once(`filecomplete-spritesheet-${characterName}`, () => {
        this.pendingLoads.delete(loadKey);
        debugLog(`🎉 [LazyLoad] Character ${characterName} loaded on-demand`);
        resolve(true);
      });

      this.load.once(`loaderror-spritesheet-${characterName}`, () => {
        this.pendingLoads.delete(loadKey);
        debugError(`❌ [LazyLoad] Failed to load character ${characterName}`);
        resolve(false);
      });

      this.load.start();
    });
  }

  /**
   * 加载默认角色作为后备
   */
  loadDefaultCharacter() {
    debugWarn('Loading default character as fallback')
    this.characterConfigs = new Map()
    this.characterConfigs.set('hangli', {
      isCompactFormat: true,
      totalFrames: 8,
      frameWidth: 48,
      frameHeight: 48
    })
    this.load.spritesheet('hangli', '/assets/characters/hangli.png', {
      frameWidth: 48,
      frameHeight: 48,
    })
    this.load.start()
  }

  // ===== 地图创建方法 =====
  createTilemap() {
    return this.make.tilemap({
      key: "officemap",
      tileWidth: 48,
      tileHeight: 48,
    })
  }

  createTilesetLayers(map) {
    // 添加 tileset
    const tilesets = this.addTilesets(map)

    // 创建图层
    const layerNames = ["background", "tree", "office_1"]
    const layers = {}

    layerNames.forEach((layerName) => {
      layers[layerName] = map.createLayer(layerName, tilesets)
    })

    // 启用渲染优化 - 只渲染屏幕附近的瓦片
    if (layers.office_1) {
      // 修改渲染填充为1，减少不必要的渲染
      layers.office_1.setCullPadding(1, 1)

      // 如果玩家已创建，设置玩家与该图层的碰撞
      if (this.player) {
        this.physics.add.collider(this.player, layers.office_1)
      }
    }



    return layers
  }

  addTilesets(map) {
    const tilesetConfigs = [
      ["room_floor_tileset", "room_builder_walls_image"],
      ["ice_creem_floor", "ice_creem_floor_image"],
      ["characters_list", "characters_list_image"],
      ["grassgrand", "grassgrand"],
      ["park", "park"],
      ["road", "road"],
      ["park_obj", "park_obj"],
    ]

    const addedTilesets = []
    tilesetConfigs.forEach(([tilesetName, imageKey]) => {
      // 尝试不使用imageKey，让Phaser使用tilemap中的原始路径
      const tileset = map.addTilesetImage(tilesetName)
      if (tileset) {
        addedTilesets.push(tileset)
      } else {
        // 如果失败，尝试使用imageKey
        const tilesetWithKey = map.addTilesetImage(tilesetName, imageKey)
        if (tilesetWithKey) {
          addedTilesets.push(tilesetWithKey)
        }
      }
    })

    return addedTilesets
  }

  // ===== 对象渲染方法 =====
  renderObjectLayer(map, layerName) {
    const objectLayer = map.getObjectLayer(layerName)

    if (!objectLayer) {
      debugWarn(`Object layer "${layerName}" not found`)
      return
    }

    // 🔧 性能优化：只在第一次创建deskColliders，避免覆盖
    if (!this.deskColliders) {
      this.deskColliders = this.physics.add.staticGroup()
      debugLog('✅ deskColliders group已创建')
    }

    // 对于desk_objs和bookcase_objs图层，使用区块管理系统
    if (layerName === "desk_objs" || layerName === "bookcase_objs") {
      debugLog(`📦 收集工位对象，总数: ${objectLayer.objects.length}`)

      // 收集所有工位对象（不立即创建精灵）
      objectLayer.objects.forEach((obj) => {
        if (this.isDeskObject(obj)) {
          this.workstationObjects.push(obj)
        }
      })

      // ⚠️ 移除这里对 initializeChunkSystem 的调用，防止重复初始化
      // 这里的逻辑改为只收集对象，统一在 create() 末尾初始化区块系统

      // 更新工位总数 (暂时更新，最后还会再次更新)
      this.userData.deskCount = this.workstationObjects.length
      this.sendUserDataToUI()
    } else {
      // 其他图层正常渲染
      objectLayer.objects.forEach((obj) => this.renderObject(obj))
    }
  }

  renderObject(obj) {
    const adjustedY = obj.y - obj.height
    let sprite = null

    // 渲染对象
    if (obj.gid) {
      sprite = this.renderTilesetObject(obj, adjustedY)
    } else if (this.isDeskObject(obj)) {
      sprite = this.renderGeometricObject(obj, adjustedY)
    }

    // 如果是工位对象，使用工位管理器创建工位
    if (sprite && this.isDeskObject(obj)) {
      this.workstationManager.createWorkstation(obj, sprite)

      // 为桌子添加物理碰撞
      this.addDeskCollision(sprite, obj)
    }

    // 🏢 如果是前台对象，注册到前台管理器
    if (obj.type === "front-desk") {
      console.log(`🏢 [Start] 检测到前台对象: ${obj.name} at (${obj.x}, ${obj.y})`, {
        hasSprite: !!sprite,
        hasFrontDeskManager: !!this.frontDeskManager,
        spriteTexture: sprite?.texture?.key
      });

      if (sprite && this.frontDeskManager) {
        this.frontDeskManager.registerFrontDesk(obj, sprite)
      } else if (!sprite) {
        console.error(`❌ [Start] 前台对象 ${obj.name} 没有创建精灵！`);
      } else if (!this.frontDeskManager) {
        console.error(`❌ [Start] FrontDeskManager 未初始化！`);
      }
    }

    // 📺 如果是大屏推流对象 (Hot Billboard) - 优先判断 Type (Class)
    const isBillboard = obj.type === "billboard" || obj.type === "hot-billboard" ||
      [5569, 5570, 5576, 5577, 5580, 5581].includes(obj.gid);

    if (isBillboard) {
      console.log(`📺 [Start] 检测到大屏对象 at (${obj.x}, ${obj.y}), Type: ${obj.type}`);
      if (sprite) {
        // 为大屏添加物理碰撞，使其不可穿透
        this.addDeskCollision(sprite, obj);

        // 注册到大屏管理器
        if (this.billboardManager) {
          this.billboardManager.createBillboard(obj, sprite);
        }

        // 创建感应区 (比大屏本身大的感应对象，确保容易触发)
        if (this.billboardSensors) {
          const centerX = obj.x + (obj.width / 2);
          const centerY = adjustedY + (obj.height / 2);

          const sensor = this.add.rectangle(centerX, centerY, obj.width + 120, obj.height + 120, 0x000000, 0);
          this.physics.add.existing(sensor, false);
          if (sensor.body) {
            sensor.body.setImmovable(true);
          }
          this.billboardSensors.add(sensor);
        }
      }
    }

    // 🏰 如果是建筑对象 (例如咖啡厅) - 优先判断 Type (Class)
    const isBuilding = obj.type === "building" || obj.name?.includes("building") ||
      [5578, 5582].includes(obj.gid);

    if (isBuilding) {
      if (sprite) {
        console.log(`🏰 [Start] 为建筑添加物理碰撞 at (${obj.x}, ${obj.y}), Type: ${obj.type}`);
        this.addDeskCollision(sprite, obj);
      }
    }

    // 为不同类型的对象设置层级
    if (sprite) {
      if (isBillboard) {
        sprite.setDepth(MAP_DEPTHS.BILLBOARD);
      } else if (isBuilding) {
        sprite.setDepth(MAP_DEPTHS.BUILDING);
      } else if (obj.name === "door_mat" || obj.gid === 58) {
        sprite.setDepth(MAP_DEPTHS.CARPET);
      } else if (this.isDeskObject(obj)) {
        sprite.setDepth(MAP_DEPTHS.FURNITURE);
      } else {
        sprite.setDepth(MAP_DEPTHS.FURNITURE); // 默认大多数对象在家具层
      }
    }

    // 添加调试边界（已注释）
    // this.addDebugBounds(obj, adjustedY);
  }

  addDeskCollision(sprite, obj) {
    // 🔧 修复：先添加到staticGroup，让group管理物理体
    // staticGroup会自动为成员启用物理并设置为immovable
    this.deskColliders.add(sprite)

    // 根据桌子类型调整碰撞边界
    const collisionSettings = this.getCollisionSettings(obj, sprite.texture.key)

    // 🔧 添加到group后，物理体才被创建，现在可以调整碰撞边界
    if (sprite.body) {
      const originalWidth = sprite.body.width
      const originalHeight = sprite.body.height

      // 计算新的碰撞边界大小
      const newWidth = originalWidth * collisionSettings.scaleX
      const newHeight = originalHeight * collisionSettings.scaleY

      // 设置碰撞边界大小（居中）
      sprite.body.setSize(newWidth, newHeight, true)

      // 如果需要偏移碰撞边界
      if (collisionSettings.offsetX !== 0 || collisionSettings.offsetY !== 0) {
        sprite.body.setOffset(
          collisionSettings.offsetX,
          collisionSettings.offsetY
        )
      }

      // 🔧 移除setImmovable调用：StaticBody默认就是immovable，没有这个方法
      // sprite.body.setImmovable(true)  // ❌ StaticBody没有这个方法
    }
  }

  getCollisionSettings(obj, textureKey = "") {
    const objName = obj.name || ""
    const objType = obj.type || ""

    // 针对“向上”朝向的桌子（桌子在后，椅子在前）优化：只需碰撞上半部分的桌体
    if (textureKey.includes("_up") || objName.includes("_up") || objType.includes("_up")) {
      // 缩小高度并向上偏移，使下半部分的椅子区域可通行
      return {
        scaleX: 0.8,
        scaleY: 0.4,
        offsetX: 0,
        offsetY: -20  // 向上偏移，确保碰撞在桌子上
      }
    }

    // 根据不同的类名/类型返回不同的碰撞设置
    if (objType === "billboard" || objName.includes("display") || objType.includes("display") || objName.includes("board")) {
      // 电子告示牌/大屏 - 完全碰撞边界
      return { scaleX: 1.0, scaleY: 1.0, offsetX: 0, offsetY: 0 }
    } else if (objType === "building" || objName.includes("building")) {
      // 建筑 - 完全碰撞边界
      return { scaleX: 1.0, scaleY: 0.8, offsetX: 0, offsetY: 0 }
    } else if (objName.includes("long") || objType.includes("long") || objType === "desk-long") {
      // 长桌子
      return { scaleX: 0.4, scaleY: 0.4, offsetX: 0, offsetY: 0 }
    } else if (objName.includes("single") || objType.includes("single") || objType === "desk-single" || objType === "desk") {
      // 单人桌
      return { scaleX: 0.6, scaleY: 0.6, offsetX: 0, offsetY: 0 }
    } else if (objName.includes("bookcase") || objType.includes("bookcase")) {
      // 书架
      return { scaleX: 0.7, scaleY: 0.7, offsetX: 0, offsetY: 0 }
    } else if (objName.includes("sofa") || objType.includes("sofa")) {
      // 沙发
      return { scaleX: 0.5, scaleY: 0.3, offsetX: 0, offsetY: 0 }
    } else {
      // 默认设置
      return { scaleX: 0.5, scaleY: 0.5, offsetX: 0, offsetY: 0 }
    }
  }

  renderTilesetObject(obj, adjustedY) {
    let imageKey = obj.name

    // 如果名字为空，尝试根据 GID 推断
    if (!imageKey && obj.gid) {
      imageKey = this.resolveKeyByGid(obj.gid)
    }

    // 如果名字为空，尝试根据类型或其他属性推断
    if (!imageKey) {
      if (obj.type === "bookcase") {
        imageKey = "bookcase_middle"
      } else {
        imageKey = "desk_image"
      }
    }

    if (!imageKey) return null

    // 如果找不到纹理，尝试从注册表动态加载
    if (!this.textures.exists(imageKey)) {
      this.dynamicLoadTexture(imageKey)
      // 渲染时使用占位符，等加载完后再自动更新
      const sprite = this.add.image(obj.x, adjustedY, "desk_image")
      sprite._targetTexture = imageKey
      // 保存原始预期大小，以便加载后重置
      sprite._originalWidth = obj.width
      sprite._originalHeight = obj.height
      this.configureSprite(sprite, obj)
      return sprite
    }

    const sprite = this.add.image(obj.x, adjustedY, imageKey)
    this.configureSprite(sprite, obj)
    return sprite
  }

  /**
   * 辅助：根据 GID 获取注册表中的 Key
   */
  resolveKeyByGid(gid) {
    if (!gid) return null;

    // 1. 动态查找 Tileset (核心：防止 GID 位移)
    if (this.map) {
      const tileset = this.map.getTilesetByGID(gid);
      if (tileset) {
        const tsName = tileset.name.toLowerCase();

        // 根据 Tileset 名称映射资源
        if (tsName.includes("announcement")) return "announcement_board_wire";
        if (tsName.includes("display")) return "front_wide_display";
        if (tsName.includes("cafe_building")) return "pixel_cafe_building";
        if (tsName.includes("cofe_desk")) return "cofe_desk_up";
        if (tsName.includes("tall_bookcase")) return "bookcase_tall";
        // 可以根据需要添加更多 Tileset 映射
      }
    }

    // 2. 静态 GID 映射 (回退方案)
    if (gid === 87) return "sofa-left-1"
    if (gid === 88) return "sofa-left-2"
    if (gid === 89) return "sofa-left-3"
    if (gid === 90) return "sofa-right-1"
    if (gid === 91) return "sofa-right-2"
    if (gid === 92) return "sofa-right-3"
    if (gid === 106) return "bookcase_tall"
    if (gid === 107) return "bookcase_middle"
    if (gid === 108) return "wall_decoration_1"
    if (gid === 109) return "wall_decoration_2"
    if (gid === 110) return "wall_decoration_3"
    if (gid === 111) return "wall_decoration_5"
    if (gid === 112) return "wall_decoration_4"
    if (gid === 58) return "door_mat"
    if (gid === 5569 || gid === 5576 || gid === 5580) return "announcement_board_wire"
    if (gid === 5570 || gid === 5577 || gid === 5581) return "front_wide_display"
    if (gid === 5578 || gid === 5582) return "pixel_cafe_building"
    if (gid === 118) return "cofe_desk_up"
    return null
  }

  /**
   * 动态加载纹理并更新现有精灵 (优化版：分步处理+防抖加载)
   */
  dynamicLoadTexture(key) {
    if (this.textures.exists(key) || this.pendingLoads.has(key) || this.failedLoads.has(key)) return

    const path = this.dynamicAssetRegistry[key]
    if (!path) return

    this.pendingLoads.add(key)
    debugLog(`🚚 [LazyLoad] 准备加载: ${key}`)

    this.load.image(key, path)

    // 监听单个文件完成
    this.load.once(`filecomplete-image-${key}`, (fileKey, type, texture) => {
      debugLog(`✅ [LazyLoad] 单个资源加载完成: ${fileKey}`)
      this.pendingLoads.delete(fileKey)
      this.updatePendingSprites(fileKey)
    })

    // 监听加载错误
    this.load.once(`loaderror-image-${key}`, (fileKey) => {
      debugWarn(`❌ [LazyLoad] 资源加载失败: ${fileKey}`)
      this.pendingLoads.delete(fileKey)
      this.failedLoads.add(fileKey)
    })

    // 使用 debounce 机制，确保一帧内多个资源的加载只触发一次 start()
    if (this.loadTimer) clearTimeout(this.loadTimer)
    this.loadTimer = setTimeout(() => {
      if (this.load.isLoading()) {
        // 如果加载器正在忙，确保当前加载完成后再次检查队列
        this.load.once('complete', () => {
          if (this.pendingLoads.size > 0) {
            debugLog(`🔄 [LazyLoad] 忙碌结束，启动后续队列`)
            this.load.start()
          }
        })
        return
      }
      debugLog(`🚀 [LazyLoad] 启动加载器循环`)
      this.load.start()
      this.loadTimer = null
    }, 50)
  }


  /**
   * 刷新那些等待特定纹理的精灵
   */
  updatePendingSprites(specificKey = null) {
    this.children.list.forEach(child => {
      // 如果指定了 specificKey，则只更新匹配该 key 的精灵
      const targetKey = child._targetTexture
      if (!targetKey) return
      if (specificKey && targetKey !== specificKey) return

      if (this.textures.exists(targetKey)) {
        // 关键：检查是否是无效的 missing 纹理
        const texture = this.textures.get(targetKey)
        if (texture.key === '__MISSING') return

        if (typeof child.setTexture === 'function') {
          child.setTexture(targetKey)
          // 重新应用大小，防止纹理切换后显示异常
          if (child._originalWidth && child._originalHeight) {
            child.setDisplaySize(child._originalWidth, child._originalHeight)
          }
          delete child._targetTexture
          debugLog(`✨ [LazyLoad] 精灵贴图已更新: ${targetKey}`)
        }
      }
    })
  }

  renderGeometricObject(obj, adjustedY) {
    const sprite = this.add.image(obj.x, adjustedY, "desk_image")
    this.configureSprite(sprite, obj)
    return sprite
  }

  configureSprite(sprite, obj) {
    sprite.setOrigin(0, 0)
    if (obj.width && obj.height) {
      sprite.setDisplaySize(obj.width, obj.height)
    }

    // 应用对象的旋转角度（如果存在）
    if (obj.rotation !== undefined) {
      // Tiled使用角度，Phaser使用弧度，需要转换
      const rotationRad = (obj.rotation * Math.PI) / 180
      sprite.setRotation(rotationRad)

      // 调整旋转后的坐标偏移
      // Tiled以对象中心为旋转中心，Phaser以左上角为旋转中心
      const centerX = obj.x + obj.width / 2
      const centerY = obj.y - obj.height / 2

      // 计算旋转后的新位置
      const rotatedX =
        centerX -
        (obj.width / 2) * Math.cos(rotationRad) -
        (obj.height / 2) * Math.sin(rotationRad)
      const rotatedY =
        centerY +
        (obj.width / 2) * Math.sin(rotationRad) -
        (obj.height / 2) * Math.cos(rotationRad)

      sprite.setX(rotatedX)
      sprite.setY(rotatedY)
    }
  }

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
    this.chunkManager.initializeChunks(this.workstationObjects)

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
      this.ensurePlayerDeskCollider()
    })

    // 监听区块卸载事件
    this.events.on('chunk-unload', (data) => {
      debugLog(`📤 卸载区块，工位数: ${data.workstations.length}`)
      data.workstations.forEach(obj => {
        this.unloadWorkstation(obj)
      })
    })
  }

  // 🔧 新增：确保玩家与工位group碰撞器已创建（只创建一次）
  ensurePlayerDeskCollider() {
    console.log('🔍 [ensurePlayerDeskCollider] 调用', {
      已创建碰撞器: !!this.playerDeskCollider,
      玩家存在: !!this.player,
      Group存在: !!this.deskColliders,
      Group中工位数: this.deskColliders?.getLength() || 0
    })

    // 如果已创建，跳过
    if (this.playerDeskCollider) {
      console.log('⏭️ 碰撞器已存在，跳过')
      return
    }

    // 检查前提条件
    if (!this.player || !this.deskColliders) {
      console.warn('⚠️ 玩家或deskColliders不存在')
      return
    }

    // 检查deskColliders中是否有工位
    const groupLength = this.deskColliders.getLength()
    if (groupLength === 0) {
      console.log('⏸️ deskColliders为空，等待下次加载')
      return
    }

    // 创建group碰撞器（只有1个）
    // 创建group碰撞器（只有1个），并添加回调函数处理书架和前台交互
    this.playerDeskCollider = this.physics.add.collider(
      this.player,
      this.deskColliders,
      (player, deskSprite) => {
        // 检查是否是书架
        if (deskSprite.texture.key.includes("bookcase")) {
          // 简单的防抖，防止频繁触发
          if (this.lastLibraryTriggerTime && Date.now() - this.lastLibraryTriggerTime < 1000) {
            return;
          }
          this.lastLibraryTriggerTime = Date.now();

          // 触发前端弹窗
          window.dispatchEvent(new CustomEvent('open-library', {
            detail: {
              bookcaseId: deskSprite.workstationId
            }
          }));

          debugLog(`📚 触发图书馆弹窗，书架ID: ${deskSprite.workstationId}`);
        }
        // 🏢 检查是否是前台客服
        else if (deskSprite.deskId) {
          // 防抖，防止频繁触发
          if (this.lastFrontDeskTriggerTime && Date.now() - this.lastFrontDeskTriggerTime < 1000) {
            return;
          }
          this.lastFrontDeskTriggerTime = Date.now();

          // 记录当前碰撞的前台
          this.currentCollidingDesk = {
            id: deskSprite.deskId,
            name: deskSprite.deskName,
            serviceScope: deskSprite.serviceScope,
            greeting: deskSprite.greeting,
            workingHours: deskSprite.workingHours
          };

          // 触发前台交互提示（改为显示 toast，而不是直接打开弹窗）
          window.dispatchEvent(new CustomEvent('front-desk-collision-start', {
            detail: this.currentCollidingDesk
          }));

          console.log(`🏢 [碰撞触发] 显示前台交互提示: ${deskSprite.deskName} (${deskSprite.serviceScope})`);
        }
      }
    )
    console.log(`✅✅✅ 玩家与工位group碰撞器已创建！(1个碰撞器管理${groupLength}个工位)`)
  }

  loadWorkstation(obj) {
    // 如果已加载，跳过
    if (this.loadedWorkstations.has(obj.id)) {
      return
    }

    // 创建工位精灵
    const adjustedY = obj.y - obj.height
    const sprite = this.createWorkstationSprite(obj, adjustedY)

    if (sprite) {
      // 保存引用
      this.loadedWorkstations.set(obj.id, sprite)

      // 使用WorkstationManager创建工位
      const workstation = this.workstationManager.createWorkstation(obj, sprite)

      // 🔧 关键：设置工位ID到精灵上，方便碰撞检测时识别
      sprite.workstationId = obj.id

      // 🔧 性能优化：使用group碰撞器，避免为每个工位创建独立碰撞器
      this.addDeskCollision(sprite, obj)
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
            this.addCollisionForWorkstationCharacter(workstation.characterSprite)
          }
        }
      }
    }
  }

  unloadWorkstation(obj) {
    const sprite = this.loadedWorkstations.get(obj.id)
    if (!sprite) return

    // 从碰撞组移除
    if (this.deskColliders) {
      this.deskColliders.remove(sprite, true, true) // 移除并销毁
    }

    // 从WorkstationManager移除
    // 注意：我们保留workstation数据，只销毁精灵
    const workstation = this.workstationManager.getWorkstation(obj.id)
    if (workstation) {
      // 🔧 修复：移除角色精灵（如果有）
      if (workstation.characterSprite) {
        // 🔧 性能优化：从玩家group中移除
        if (this.otherPlayersGroup && workstation.characterSprite.body) {
          this.otherPlayersGroup.remove(workstation.characterSprite, true, true)
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

  createWorkstationSprite(obj, adjustedY) {
    let imageKey = obj.name

    // 如果名字为空，尝试根据 GID 推断
    if (!imageKey && obj.gid) {
      imageKey = this.resolveKeyByGid(obj.gid)
    }

    // 如果名字为空，尝试根据类型或其他属性推断
    if (!imageKey) {
      if (obj.type === "bookcase") {
        imageKey = "bookcase_middle"
      } else {
        imageKey = "desk_image"
      }
    }

    if (!imageKey) return null

    // 如果找不到纹理，尝试从注册表动态加载 (同步 renderTilesetObject 逻辑)
    if (!this.textures.exists(imageKey)) {
      this.dynamicLoadTexture(imageKey)
      // 渲染时使用占位符，等加载完后再自动更新
      const sprite = this.add.image(obj.x, adjustedY, "desk_image")
      sprite._targetTexture = imageKey
      // 保存原始预期大小，以便加载后重置
      sprite._originalWidth = obj.width
      sprite._originalHeight = obj.height
      this.configureSprite(sprite, obj)
      return sprite
    }

    const sprite = this.add.image(obj.x, adjustedY, imageKey)
    this.configureSprite(sprite, obj)
    return sprite
  }

  // ===== 辅助方法 =====
  isDeskObject(obj) {
    // 识别工位对象的逻辑：支持 Type 识别和传统的 Name/GID 识别
    return (
      obj.type === "desk" ||
      obj.type === "workstation" ||
      obj.name === "desk" ||
      obj.type === "desk" ||
      obj.name.includes("desk_") ||
      obj.type === "bookcase" ||
      obj.name.includes("bookcase") ||
      obj.gid === 106 || // bookcase_tall
      obj.gid === 107 || // bookcase_middle
      obj.gid === 118 || // cofe_desk_up
      obj.type === "sofa" ||
      obj.type === "flower"
    )
  }

  // addDebugBounds function removed for performance optimization

  setupCamera(map) {
    // For infinite maps, we need to calculate the bounds based on the layer data
    const officeLayerData = map.getLayer("office_1")
    if (officeLayerData) {
      const mapWidth = officeLayerData.width * map.tileWidth
      const mapHeight = officeLayerData.height * map.tileHeight
      // Tiled JSON for infinite maps provides startx/starty in tiles, not pixels
      const mapX = officeLayerData.startx * map.tileWidth
      const mapY = officeLayerData.starty * map.tileHeight

      this.cameras.main.setBounds(mapX, mapY, mapWidth, mapHeight)
      this.physics.world.setBounds(mapX, mapY, mapWidth, mapHeight)
    } else {
      // Fallback for non-infinite maps or if layer name changes
      this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels)
      this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels)
    }

    // 启用相机渲染优化 - 限制渲染范围
    this.cameras.main.useBounds = true

    // 从本地存储获取缩放值，如果没有则使用默认值1（而不是0.5）
    const savedZoom = localStorage.getItem("cameraZoom")
    const zoomValue = savedZoom ? parseFloat(savedZoom) : 1

    // 设置相机缩放
    this.cameras.main.setZoom(zoomValue)

    // 设置相机跟随和死区
    this.setupCameraFollow()

    // 创建缩放控制按钮
    this.createZoomControls()
  }

  // 设置相机跟随和死区
  setupCameraFollow() {
    if (this.player) {
      this.cameras.main.startFollow(this.player)
      // 设置较小的lerp值，使相机跟随更平滑 (从 0.05 提升到 0.1 以增强响应速度)
      this.cameras.main.setLerp(0.1, 0.1)
      // 设置死区，允许玩家在屏幕内移动
      this.updateDeadzone()
    } else {
      // 如果玩家尚未创建，延迟设置相机跟随
      this.time.delayedCall(100, () => {
        if (this.player) {
          this.cameras.main.startFollow(this.player)
          // 设置较小的lerp值，使相机跟随更平滑 (从 0.05 提升到 0.1 以增强响应速度)
          this.cameras.main.setLerp(0.1, 0.1)
          // 设置死区
          this.updateDeadzone()
        }
      })
    }
  }

  // createDeadzoneDebug function removed for performance optimization

  createZoomControls() {
    // 使用新创建的ZoomControl组件
    this.zoomControl = new ZoomControl(this)
  }

  adjustZoom(delta) {
    // 获取当前缩放值
    let currentZoom = this.cameras.main.zoom
    // 计算新缩放值
    let newZoom = currentZoom + delta

    // 限制缩放范围在0.1到2之间
    newZoom = Phaser.Math.Clamp(newZoom, 0.1, 2)

    // 使用动画效果调整缩放
    this.tweens.add({
      targets: this.cameras.main,
      zoom: newZoom,
      duration: 300,
      ease: "Sine.easeInOut",
      onComplete: () => {
        // 缩放完成后重新计算死区
        this.updateDeadzone()

        // 🔧 移除手动触发：ChunkManager的定时器会自动检测zoom变化
        // 避免重复调用导致CPU飙升
        // ChunkManager会在下一个500ms更新周期中检测到zoom变化并自动加载
      },
    })

    // 保存到本地存储
    localStorage.setItem("cameraZoom", newZoom.toString())
  }

  // 更新死区大小以适应新的缩放级别
  updateDeadzone() {
    if (this.player && this.cameras.main) {
      const zoom = this.cameras.main.zoom
      const screenWidth = this.game.config.width
      const screenHeight = this.game.config.height

      // 缩小死区范围，让人物更靠近屏幕中心
      // 增加排除比例，从 0.2 提高到 0.6，意味着死区只占投影面积的 40%
      const baseReduction = Math.min(
        400,
        Math.min(screenWidth, screenHeight) * 0.6
      )
      const adjustedWidth = (screenWidth - baseReduction) / zoom
      const adjustedHeight = (screenHeight - baseReduction) / zoom

      this.cameras.main.setDeadzone(adjustedWidth, adjustedHeight)

      // 死区调试可视化功能已移除以优化性能
      if (this.deadzoneDebug) {
        this.deadzoneDebug.destroy()
        this.deadzoneDebug = null
      }
    }
  }

  // ===== 输入设置方法 =====
  setupInput() {
    // 不再使用 createCursorKeys() 和 addKeys() 避免自动键盘捕获
    // 改为手动检查键盘状态，只有在FocusManager允许时才处理

    // 添加鼠标滚轮事件监听，用于缩放控制
    this.input.on("wheel", (pointer, _currentlyOver, _deltaX, deltaY, _deltaZ) => {
      // 检查是否按下了Ctrl键
      if (pointer.event.ctrlKey) {
        // 根据滚轮方向调整缩放值
        // 向上滚动缩小，向下滚动放大
        const zoomDelta = deltaY > 0 ? -0.1 : 0.1
        this.adjustZoom(zoomDelta)
      }
    })

    // T键快速回到工位 - 仍然需要注册，但会通过FocusManager检查
    this.teleportKey = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.T
    )

    // 🏢 配置前台客服的 F 键交互
    this.frontDeskKey = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.F
    )

    // 监听 F 键按下
    if (this.frontDeskKey) {
      this.frontDeskKey.on('down', () => {
        this.handleInteraction()
      })
    }
  }

  /**
   * 统一处理玩家交互逻辑 (F键 或 移动端交互按钮)
   */
  handleInteraction() {
    if (!this.player) return

    // 1. 检查前台客服管理器交互
    if (this.frontDeskManager) {
      const collidingDesks = this.frontDeskManager.getCollidingDesks(this.player, 150)

      if (collidingDesks.length > 0) {
        // 找到最近的前台
        const nearestDesk = collidingDesks.reduce((nearest, current) =>
          current.distance < nearest.distance ? current : nearest
        )

        const deskSprite = nearestDesk.sprite
        console.log(`🏢 [交互] 激活最近的前台: ${deskSprite.deskName}`)

        // 触发前台聊天弹窗
        window.dispatchEvent(new CustomEvent('open-front-desk-chat', {
          detail: {
            id: deskSprite.deskId,
            name: deskSprite.deskName,
            serviceScope: deskSprite.serviceScope,
            greeting: deskSprite.greeting,
            workingHours: deskSprite.workingHours
          }
        }))
        return
      }
    }

    // 2. 这里可以添加其他物体的交互逻辑...
  }

  // ===== 全局函数方法 =====
  saveGameScene() {
    // 保存游戏场景引用的全局函数
    debugLog("Game scene saved globally")
    if (typeof window !== "undefined") {
      window.gameScene = this
    }
  }

  // 处理T键按下事件
  async handleTeleportKeyPress() {
    if (!this.currentUser) {
      debugWarn("没有当前用户信息，无法使用快速回到工位功能")
      return
    }

    // 检查玩家是否有绑定的工位
    const userWorkstation = this.workstationManager.getWorkstationByUser(
      this.currentUser.id
    )
    if (!userWorkstation) {
      debugWarn("用户没有绑定的工位，无法使用快速回到工位功能")
      return
    }

    // 调用全局teleportToWorkstation函数
    if (typeof window !== "undefined" && window.teleportToWorkstation) {
      const result = await window.teleportToWorkstation()
      if (result && result.success) {
      } else if (result && result.error) {
        debugWarn("键盘快捷键：回到工位失败:", result.error)
      }
    }
  }

  // 处理与前台客服的交互
  // 🏢 [已废弃] 前台交互已改为自动碰撞触发,不再使用F键方式
  // 保留此方法以防将来需要恢复F键交互
  // handleFrontDeskInteraction() {
  //   if (!this.player || !this.frontDeskManager) return
  //
  //   // 检查玩家附近是否有前台
  //   const nearbyDesk = this.frontDeskManager.getNearbyDesk(this.player, 80)
  //
  //   if (nearbyDesk) {
  //     console.log(`🏢 [Front Desk] 打开前台对话: ${nearbyDesk.deskName}`)
  //
  //     // 发送事件到React层，打开前台聊天弹窗
  //     const event = new CustomEvent('open-front-desk-chat', {
  //       detail: {
  //         id: nearbyDesk.deskId,
  //         name: nearbyDesk.deskName,
  //         serviceScope: nearbyDesk.serviceScope,
  //         greeting: nearbyDesk.greeting
  //       }
  //     })
  //     window.dispatchEvent(event)
  //   } else {
  //     console.log('🏢 [Front Desk] 附近没有前台客服')
  //   }
  // }

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

      // 设置碰撞事件处理器
      this.setupCollisionEventHandlers()
    }

    // 示例其他玩家已被移除，所有角色都通过工位绑定系统在工位旁边创建

    // 设置玩家碰撞检测
    this.setupPlayerCollisions()
  }

  // 设置碰撞事件处理器
  setupCollisionEventHandlers() {
    // 碰撞开始事件处理器
    window.onPlayerCollisionStart = (collisionEvent) => {

      // 触发自定义事件，供React组件监听
      const customEvent = new CustomEvent("player-collision-start", {
        detail: collisionEvent,
      })
      window.dispatchEvent(customEvent)

      // 可以在这里添加其他碰撞开始的处理逻辑
      this.handleCollisionStartEvent(collisionEvent)
    }

    // 碰撞结束事件处理器
    window.onPlayerCollisionEnd = (collisionEvent) => {

      // 触发自定义事件，供React组件监听
      const customEvent = new CustomEvent("player-collision-end", {
        detail: collisionEvent,
      })
      window.dispatchEvent(customEvent)

      // 可以在这里添加其他碰撞结束的处理逻辑
      this.handleCollisionEndEvent(collisionEvent)
    }

    // 保持向后兼容的碰撞处理器
    if (!window.onPlayerCollision) {
      window.onPlayerCollision = (playerData) => {
        // 触发自定义事件，供React组件监听
        const customEvent = new CustomEvent("player-collision", {
          detail: { playerData },
        })
        window.dispatchEvent(customEvent)
      }
    }
  }

  // 处理碰撞开始事件
  handleCollisionStartEvent(collisionEvent) {
    // 在这里可以添加碰撞开始时的游戏逻辑
    // 例如：播放音效、显示特效等

    // 记录碰撞历史
    if (!this.collisionHistory) {
      this.collisionHistory = []
    }

    this.collisionHistory.push({
      ...collisionEvent,
      eventType: "start",
    })

    // 限制历史记录数量
    if (this.collisionHistory.length > 50) {
      this.collisionHistory.shift()
    }
  }

  // 处理碰撞结束事件
  handleCollisionEndEvent(collisionEvent) {
    // 在这里可以添加碰撞结束时的游戏逻辑

    // 记录碰撞历史
    if (!this.collisionHistory) {
      this.collisionHistory = []
    }

    this.collisionHistory.push({
      ...collisionEvent,
      eventType: "end",
    })

    // 限制历史记录数量
    if (this.collisionHistory.length > 50) {
      this.collisionHistory.shift()
    }
  }

  // createSampleOtherPlayers() 方法已被移除
  // 所有角色现在都通过工位绑定系统在工位旁边创建

  setupPlayerCollisions() {
    // 初始化碰撞管理器
    this.collisionManager = {
      activeCollisions: new Set(),
      debounceTimers: new Map(),
      debounceDelay: 800, // 增加到800ms，配合距离校验更稳定
      collisionThreshold: 70, // 略微增加检测阈值
    }

    // 设置主玩家与其他玩家的碰撞检测
    debugLog('🎯 其他玩家数量:', this.otherPlayers.size)
    this.otherPlayers.forEach((otherPlayer) => {
      this.physics.add.overlap(
        this.player,
        otherPlayer,
        (player1, player2) => {
          // 确保是其他玩家触发了碰撞
          if (player2.isOtherPlayer) {
            this.handlePlayerCollision(player1, player2)
          }
        },
        null,
        this
      )
    })

    // 设置主玩家与工位角色的碰撞检测
    this.setupWorkstationCharacterCollisions()

    // 设置主玩家与工位家具的碰撞重叠检测 (用于触发状态更新)
    this.setupWorkstationFurnitureCollisions()

    // 已删除无用的碰撞检测循环设置
  }

  // 设置工位家具碰撞检测
  setupWorkstationFurnitureCollisions() {
    if (!this.player || !this.deskColliders) return

    debugLog('🎯 [Start] 设置玩家与工位家具的重叠检测')
    this.physics.add.overlap(
      this.player,
      this.deskColliders,
      (player, desk) => {
        this.handleWorkstationFurnitureOverlap(player, desk)
      },
      null,
      this
    )
  }

  // 处理工位家具重叠
  handleWorkstationFurnitureOverlap(player, desk) {
    // ⚡ 性能优化：只在玩家停止移动时检查（避免帧帧触发）
    if (player.body && (player.body.velocity.x !== 0 || player.body.velocity.y !== 0)) {
      return
    }

    if (!this.currentUser || !desk.workstationId) {
      // 静默返回，不再打印日志以优化性能
      return
    }

    // 获取当前用户及其绑定的工位ID
    const myBoundWorkstationId = this.currentUser.workstationId

    // 如果没有任何绑定，尝试从WorkstationManager获取最新的
    const userWorkstation = myBoundWorkstationId ?
      { id: myBoundWorkstationId } :
      this.workstationManager.getWorkstationByUser(this.currentUser.id)

    if (!userWorkstation || String(userWorkstation.id) !== String(desk.workstationId)) {
      // 不匹配用户的工位，静默返回
      return
    }

    // 🔧 新增：检查玩家是否真的非常靠近工位中心,避免误触发
    const deskCenterX = desk.x + (desk.displayWidth || desk.width || 48) / 2
    const deskCenterY = desk.y + (desk.displayHeight || desk.height || 48) / 2
    const distance = Phaser.Math.Distance.Between(player.x, player.y, deskCenterX, deskCenterY)

    // 只有距离小于 70 像素时才触发工位状态弹窗
    if (distance > 70) {
      console.log(`⏭️ [工位碰撞] 距离过远(${Math.round(distance)}px > 70px)，跳过触发`)
      return
    }

    const workstationId = desk.workstationId
    const collisionId = `workstation_${workstationId}`

    // 如果这是一个新的碰撞
    if (!this.collisionManager.activeCollisions.has(collisionId)) {
      this.collisionManager.activeCollisions.add(collisionId)

      console.log(`🚀 [Phaser] 触发工位家具碰撞! workstationId: ${workstationId}, 用户ID: ${this.currentUser.id}, 用户绑定工位ID: ${myBoundWorkstationId}`)

      // 触发自定义事件给React组件
      if (typeof window !== 'undefined') {
        console.log(`📢 [Phaser] 即将dispatch my-workstation-collision-start 事件`)
        window.dispatchEvent(new CustomEvent('my-workstation-collision-start', {
          detail: {
            workstationId,
            userId: this.currentUser.id,
            position: { x: desk.x, y: desk.y }
          }
        }))
      }
    }

    // 重置防抖计时器
    this.resetWorkstationCollisionDebounceTimer(collisionId, player, desk)
  }

  // 重置工位碰撞防抖计时器
  resetWorkstationCollisionDebounceTimer(collisionId, player, desk) {
    if (this.collisionManager.debounceTimers.has(collisionId)) {
      this.time.removeEvent(this.collisionManager.debounceTimers.get(collisionId))
    }

    const timer = this.time.delayedCall(
      this.collisionManager.debounceDelay,
      () => {
        if (this.collisionManager.activeCollisions.has(collisionId)) {
          // 粘性检查：即使没有物理接触，只要还在附近就认为碰撞仍在继续
          // 🔧 修复：使用更可靠的中心点计算方式
          const deskWidth = desk.displayWidth || desk.width || 48
          const deskHeight = desk.displayHeight || desk.height || 48

          // 如果origin是0，0 (Start.js 1142行设置的)，则desk.x/y是左上角
          const deskCenterX = desk.x + (desk.originX === 0 ? deskWidth / 2 : 0)
          const deskCenterY = desk.y + (desk.originY === 0 ? deskHeight / 2 : 0)

          const dist = Phaser.Math.Distance.Between(player.x, player.y, deskCenterX, deskCenterY)

          // 如果玩家离工位足够近 (100像素内，比之前略大以适应边缘情况)
          if (dist < 100) {
            this.resetWorkstationCollisionDebounceTimer(collisionId, player, desk)
          } else {
            console.log(`🔚 离开自己的工位: ${collisionId}, 距离: ${Math.round(dist)}`)
            this.collisionManager.activeCollisions.delete(collisionId)

            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('my-workstation-collision-end', {
                detail: { workstationId: collisionId.replace('workstation_', '') }
              }))
            }
          }
        }
      }
    )
    this.collisionManager.debounceTimers.set(collisionId, timer)
  }

  // 处理玩家碰撞（带防抖机制）
  handlePlayerCollision(mainPlayer, otherPlayer) {
    const playerId = otherPlayer.playerData.id

    // 🔧 新增：如果对方是 AI NPC，让它面向玩家
    if (playerId.toString().startsWith('npc_') && typeof otherPlayer.setDirectionFrame === 'function') {
      const dx = mainPlayer.x - otherPlayer.x
      const dy = mainPlayer.y - otherPlayer.y

      // 根据位移差判断方向
      if (Math.abs(dx) > Math.abs(dy)) {
        otherPlayer.setDirectionFrame(dx > 0 ? 'right' : 'left')
      } else {
        otherPlayer.setDirectionFrame(dy > 0 ? 'down' : 'up')
      }

      // 🔧 特殊逻辑：碰撞时强制停止 NPC 的移动速度
      if (otherPlayer.body) {
        otherPlayer.body.setVelocity(0, 0)
      }
    }

    // 如果这是一个新的碰撞
    if (!this.collisionManager.activeCollisions.has(playerId)) {
      // 添加到活动碰撞集合
      this.collisionManager.activeCollisions.add(playerId)

      // ... 触发碰撞事件逻辑保持不变 ...
      otherPlayer.handleCollisionStart(mainPlayer)

      // 保持向后兼容的碰撞处理
      if (window.onPlayerCollision) {
        window.onPlayerCollision(otherPlayer.playerData)
      }
    }

    // 重置或设置防抖计时器
    this.resetCollisionDebounceTimer(playerId, mainPlayer, otherPlayer)
  }

  // 重置碰撞防抖计时器
  resetCollisionDebounceTimer(playerId, mainPlayer, otherPlayer) {
    // 清除现有的计时器
    if (this.collisionManager.debounceTimers.has(playerId)) {
      this.time.removeEvent(this.collisionManager.debounceTimers.get(playerId))
    }

    // 设置新的防抖计时器
    const timer = this.time.delayedCall(
      this.collisionManager.debounceDelay,
      () => {
        // 防抖时间到，执行“粘性”检查：如果玩家虽然没有物理碰撞但依然在附近，则维持状态
        if (this.collisionManager.activeCollisions.has(playerId)) {
          // 获取当前距离
          const dist = Phaser.Math.Distance.Between(mainPlayer.x, mainPlayer.y, otherPlayer.x, otherPlayer.y);

          // 如果距离依然在阈值内，说明玩家只是停下了或者被物理引擎推开了一点点，不应关闭面板
          if (dist < this.collisionManager.collisionThreshold) {
            // 自动续期
            this.resetCollisionDebounceTimer(playerId, mainPlayer, otherPlayer);
            return;
          }

          // 距离过远，真正断开
          this.collisionManager.activeCollisions.delete(playerId)

          // 触发碰撞结束事件
          otherPlayer.handleCollisionEnd(mainPlayer)

          // 清理计时器
          this.collisionManager.debounceTimers.delete(playerId)
        }
      }
    )

    // 保存计时器引用
    this.collisionManager.debounceTimers.set(playerId, timer)
  }

  // 已删除无用的空碰撞检测循环函数

  // 更新碰撞检测
  updateCollisionDetection() {
    if (!this.player || !this.player.body) return

    // 检查当前活动的碰撞是否仍然有效
    this.collisionManager.activeCollisions.forEach((playerId) => {
      const otherPlayer = this.getOtherPlayerById(playerId)
      if (otherPlayer && otherPlayer.body) {
        // 检查两个玩家是否仍在碰撞范围内
        const distance = Phaser.Math.Distance.Between(
          this.player.x,
          this.player.y,
          otherPlayer.x,
          otherPlayer.y
        )

        // 如果距离超过碰撞阈值，立即结束碰撞
        const collisionThreshold =
          this.collisionManager.collisionThreshold || 60 // 碰撞检测阈值
        if (distance > collisionThreshold) {
          // 立即结束碰撞，不等待防抖
          this.endCollisionImmediately(playerId, otherPlayer)
        }
      }
    })
  }

  // 立即结束碰撞
  endCollisionImmediately(playerId, otherPlayer) {
    // 从活动碰撞中移除
    this.collisionManager.activeCollisions.delete(playerId)

    // 清除防抖计时器
    if (this.collisionManager.debounceTimers.has(playerId)) {
      this.time.removeEvent(this.collisionManager.debounceTimers.get(playerId))
      this.collisionManager.debounceTimers.delete(playerId)
    }

    // 触发碰撞结束事件
    otherPlayer.handleCollisionEnd(this.player)
  }

  // 根据ID获取其他玩家
  getOtherPlayerById(playerId) {
    for (const [, player] of this.otherPlayers) {
      if (player.playerData.id === playerId) {
        return player
      }
    }

    // 如果在otherPlayers中没找到，检查工位绑定的角色
    const workstations = this.workstationManager.getAllWorkstations()
    for (const workstation of workstations) {
      if (
        workstation.character &&
        workstation.character.player &&
        workstation.character.player.playerData.id === playerId
      ) {
        return workstation.character.player
      }
    }

    return null
  }

  // 设置工位角色碰撞检测
  setupWorkstationCharacterCollisions() {
    // 延迟设置，确保工位角色已经创建
    this.time.delayedCall(500, () => {
      const workstations = this.workstationManager.getAllWorkstations()

      workstations.forEach((workstation) => {
        // 检查新的角色精灵结构
        if (workstation.characterSprite && workstation.characterSprite.isOtherPlayer) {
          const character = workstation.characterSprite

          // 设置碰撞检测
          this.physics.add.overlap(
            this.player,
            character,
            (player1, player2) => {
              // 确保是其他玩家触发了碰撞
              if (player2.isOtherPlayer) {
                this.handlePlayerCollision(player1, player2)
              }
            },
            null,
            this
          )

          debugLog("设置工位角色碰撞检测:", character.playerData.name)
        }
        // 同时支持旧的结构以保持兼容性
        else if (
          workstation.character &&
          workstation.character.player &&
          workstation.character.player.isOtherPlayer
        ) {
          const character = workstation.character.player

          // 设置碰撞检测
          this.physics.add.overlap(
            this.player,
            character,
            (player1, player2) => {
              // 确保是其他玩家触发了碰撞
              if (player2.isOtherPlayer) {
                this.handlePlayerCollision(player1, player2)
              }
            },
            null,
            this
          )

          debugLog("设置工位角色碰撞检测 (旧结构):", character.playerData.name)
        }
      })
    })
  }

  // 🔧 性能优化：为新创建的工位角色添加到group（不单独创建碰撞检测）
  addCollisionForWorkstationCharacter(character) {
    if (character && character.isOtherPlayer) {
      // 添加到其他玩家group
      if (this.otherPlayersGroup) {
        this.otherPlayersGroup.add(character)
        console.log(`👤 角色 ${character.playerData.name} 已添加到玩家group，当前group大小: ${this.otherPlayersGroup.getLength()}`)

        // 确保group overlap检测器已创建
        this.ensurePlayerCharacterOverlap()
      }
    }
  }

  // 🔧 新增：确保玩家与角色group的overlap检测器已创建（只创建一次）
  ensurePlayerCharacterOverlap() {
    // 如果已创建，跳过
    if (this.playerCharacterCollider) {
      return
    }

    // 检查前提条件
    if (!this.player || !this.otherPlayersGroup) {
      return
    }

    // 检查group中是否有角色
    if (this.otherPlayersGroup.getLength() === 0) {
      console.log('⏸️ otherPlayersGroup为空，等待下次添加')
      return
    }

    // 创建 group 物理阻挡 (Collider) + 交互触发 (逻辑注入)
    // 仅使用 overlap 进行交互检测，允许穿透（防止推走其他玩家/NPC）
    this.playerCharacterCollider = this.physics.add.overlap(
      this.player,
      this.otherPlayersGroup,
      (player1, player2) => {
        if (player2.isOtherPlayer) {
          this.handlePlayerCollision(player1, player2)
        }
      },
      null,
      this
    )

    console.log(`✅✅✅ 玩家与角色group碰撞器已创建！(1个overlap检测器管理${this.otherPlayersGroup.getLength()}个角色)`)
  }

  // 获取当前碰撞状态
  getCurrentCollisions() {
    const currentCollisions = []

    this.collisionManager.activeCollisions.forEach((playerId) => {
      const player = this.getOtherPlayerById(playerId)
      if (player) {
        currentCollisions.push(player.playerData)
      }
    })

    return currentCollisions
  }

  // 获取碰撞历史
  getCollisionHistory() {
    return this.collisionHistory || []
  }

  // 设置碰撞敏感度
  setCollisionSensitivity(radius) {
    if (this.collisionManager) {
      this.collisionManager.collisionThreshold = radius
      debugLog("碰撞敏感度已设置为:", radius)
    }
  }

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

  // 已删除重复的碰撞检测函数

  // 已删除无用的性能优化相关全局函数

  // 检查玩家碰撞
  checkPlayerCollisions() {
    if (!this.player) return

    const mainPlayerX = this.player.x
    const mainPlayerY = this.player.y

    // 检查与工位上的真实玩家的碰撞
    const workstations = this.workstationManager.getAllWorkstations()
    let realPlayersFound = 0
    let collisionChecks = 0

    workstations.forEach((workstation) => {
      // 检查工位管理器创建的角色精灵（真实玩家）
      if (
        workstation.characterSprite &&
        workstation.characterSprite.isOtherPlayer
      ) {
        const otherPlayer = workstation.characterSprite
        realPlayersFound++
        collisionChecks++

        const distance = Phaser.Math.Distance.Between(
          mainPlayerX,
          mainPlayerY,
          otherPlayer.x,
          otherPlayer.y
        )

        const isColliding = distance <= this.collisionSensitivity
        const wasColliding = this.currentCollisions.has(
          otherPlayer.playerData.id
        )

        // 调试信息（每5秒输出一次）
        // if (Date.now() % 5000 < 100) {
        //   debugLog(
        //     `[CollisionDebug] 检查真实玩家 ${
        //       otherPlayer.playerData.name
        //     }: 距离=${Math.round(distance)}px, 敏感度=${
        //       this.collisionSensitivity
        //     }px, 碰撞=${isColliding}`
        //   )
        // }

        if (isColliding && !wasColliding) {
          // 碰撞开始
          this.handleCollisionStart(otherPlayer)
        } else if (!isColliding && wasColliding) {
          // 碰撞结束
          this.handleCollisionEnd(otherPlayer)
        }
      }

      // 兼容旧的character结构（如果存在）
      else if (
        workstation.character &&
        workstation.character.player &&
        workstation.character.player.isOtherPlayer
      ) {
        const otherPlayer = workstation.character.player
        realPlayersFound++
        collisionChecks++

        const distance = Phaser.Math.Distance.Between(
          mainPlayerX,
          mainPlayerY,
          otherPlayer.x,
          otherPlayer.y
        )

        const isColliding = distance <= this.collisionSensitivity
        const wasColliding = this.currentCollisions.has(
          otherPlayer.playerData.id
        )

        if (isColliding && !wasColliding) {
          this.handleCollisionStart(otherPlayer)
        } else if (!isColliding && wasColliding) {
          this.handleCollisionEnd(otherPlayer)
        }
      }
    })

    // 调试信息（每5秒输出一次）
    // if (Date.now() % 5000 < 100) {
    //   debugLog(
    //     `[CollisionDebug] 主玩家位置: (${Math.round(mainPlayerX)}, ${Math.round(
    //       mainPlayerY
    //     )}), 真实玩家: ${realPlayersFound}, 碰撞检查: ${collisionChecks}`
    //   )
    // }
  }

  // 处理碰撞开始
  handleCollisionStart(otherPlayer) {
    const playerId = otherPlayer.playerData.id

    // 添加到当前碰撞
    this.currentCollisions.add(playerId)

    // 调用角色的碰撞处理
    if (otherPlayer.handleCollisionStart) {
      otherPlayer.handleCollisionStart(this.player)
    }

    // 记录碰撞历史
    this.collisionHistory.push({
      playerId: playerId,
      playerName: otherPlayer.playerData.name,
      startTime: Date.now(),
      endTime: null,
      duration: null,
    })

    return true
  }

  // 处理碰撞结束
  handleCollisionEnd(otherPlayer) {
    const playerId = otherPlayer.playerData.id

    // 从当前碰撞中移除
    this.currentCollisions.delete(playerId)

    // 调用角色的碰撞结束处理
    if (otherPlayer.handleCollisionEnd) {
      otherPlayer.handleCollisionEnd(this.player)
    }

    // 更新碰撞历史记录
    const collisionRecord = this.collisionHistory
      .reverse()
      .find(record => record.playerId === playerId && !record.endTime)

    if (collisionRecord) {
      collisionRecord.endTime = Date.now()
      collisionRecord.duration = collisionRecord.endTime - collisionRecord.startTime
    }

    return true
  }

  // 获取当前碰撞的玩家
  getCurrentCollisions() {
    const collisions = []
    this.currentCollisions.forEach((playerId) => {
      const workstations = this.workstationManager.getAllWorkstations()
      const workstation = workstations.find(
        (ws) =>
          ws.character &&
          ws.character.player &&
          ws.character.player.playerData.id === playerId
      )

      if (workstation && workstation.character.player) {
        collisions.push(workstation.character.player.playerData)
      }
    })

    return collisions
  }

  // 获取碰撞历史
  getCollisionHistory() {
    return [...this.collisionHistory]
  }

  // 设置碰撞敏感度
  setCollisionSensitivity(radius) {
    if (radius > 0 && radius <= 200) {
      this.collisionSensitivity = radius
      debugLog(`碰撞敏感度设置为: ${this.collisionSensitivity}px`)
      return true
    }
    return false
  }

  // debugCollisionSystem函数已移除以优化性能

  // forceCollisionTest function removed for performance optimization

  // 获取玩家信息
  getPlayerInfo() {
    const workstations = this.workstationManager.getAllWorkstations()
    const realPlayers = []

    // 收集所有真实玩家信息
    workstations.forEach((ws) => {
      // 检查工位管理器创建的角色精灵（真实玩家）
      if (ws.characterSprite && ws.characterSprite.isOtherPlayer) {
        realPlayers.push({
          name: ws.characterSprite.playerData.name,
          id: ws.characterSprite.playerData.id,
          position: { x: ws.characterSprite.x, y: ws.characterSprite.y },
          workstationId: ws.id,
          userInfo: ws.userInfo,
        })
      }
      // 兼容旧的character结构
      else if (
        ws.character &&
        ws.character.player &&
        ws.character.player.isOtherPlayer
      ) {
        realPlayers.push({
          name: ws.character.player.playerData.name,
          id: ws.character.player.playerData.id,
          position: { x: ws.character.player.x, y: ws.character.player.y },
          workstationId: ws.id,
          userInfo: ws.userInfo,
        })
      }
    })

    return {
      mainPlayer: this.player
        ? {
          position: { x: this.player.x, y: this.player.y },
          playerData: this.player.playerData,
          enableMovement: this.player.enableMovement,
        }
        : null,
      realPlayers: realPlayers,
      testPlayers: realPlayers, // 保持向后兼容
      collisionSystem: {
        sensitivity: this.collisionSensitivity,
        currentCollisions: Array.from(this.currentCollisions),
        historyCount: this.collisionHistory.length,
      },
      workstationStats: {
        totalWorkstations: workstations.length,
        occupiedWorkstations: workstations.filter((ws) => ws.isOccupied).length,
        playersWithCharacters: realPlayers.length,
      },
    }
  }

  // 显示碰撞通知
  showCollisionNotification(message, type = "info") {
    // 在游戏中显示通知
    if (this.collisionNotificationText) {
      this.collisionNotificationText.destroy()
    }

    const color =
      type === "start" ? "#4CAF50" : type === "end" ? "#FF9800" : "#2196F3"
    const emoji = type === "start" ? "🎯" : type === "end" ? "✅" : "ℹ️"

    this.collisionNotificationText = this.add
      .text(this.cameras.main.centerX, 100, `${emoji} ${message}`, {
        fontSize: "16px",
        fill: color,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        padding: { x: 10, y: 5 },
        borderRadius: 5,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1000)

    // 3秒后自动消失
    this.time.delayedCall(3000, () => {
      if (this.collisionNotificationText) {
        this.collisionNotificationText.destroy()
        this.collisionNotificationText = null
      }
    })

    // 同时触发浏览器通知（如果支持）
    if (typeof window !== "undefined" && window.dispatchEvent) {
      const event = new CustomEvent("collision-notification", {
        detail: {
          message: message,
          type: type,
          timestamp: Date.now(),
        },
      })
      window.dispatchEvent(event)
    }

    debugLog(`📢 [通知] ${message}`)
  }

  // 已删除无用的清理优化系统函数

  // testCollisionSystem function removed for performance optimization

  updateOtherPlayerStatus(playerId, newStatus) {
    const otherPlayer = this.otherPlayers.get(playerId)
    if (otherPlayer) {
      otherPlayer.updateStatus(newStatus)
    }
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

    // 创建昼夜管理器（只对 background 图块层应用夜晚效果）
    this.dayNightManager = new DayNightManager(this, this.mapLayers, {
      nightStart: 20,  // 晚上8点开始
      nightEnd: 6,     // 早上6点结束
      transitionDuration: 2000, // 2秒过渡时间
      checkInterval: 60000, // 每分钟检查一次
      nightTint: 0x3030aa,  // 夜晚色调（深蓝紫色）
      nightAlpha: 0.7      // 夜晚透明度
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
    this.workstationObjects = []
    this.loadedWorkstations.clear()

    // 清理全局函数
    if (typeof window !== "undefined") {
      delete window.onPlayerCollisionStart
      delete window.onPlayerCollisionEnd
      delete window.getCurrentCollisions
      delete window.getCollisionHistory
      delete window.setCollisionSensitivity
      delete window.getChunkStats
      delete window.gameScene
    }

    // 调用父类的shutdown方法
    super.shutdown()
  }
}

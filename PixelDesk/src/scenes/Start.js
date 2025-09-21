import { WorkstationManager } from "../logic/WorkstationManager.js"
import { Player } from "../entities/Player.js"
import { WashroomManager } from "../logic/WashroomManager.js"
import { ZoomControl } from "../components/ZoomControl.js"
import { WorkstationBindingUI } from "../components/WorkstationBindingUI.js"

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
const debugLog = PERFORMANCE_CONFIG.ENABLE_DEBUG_LOGGING ? console.log.bind(console) : () => {}
const debugWarn = PERFORMANCE_CONFIG.ENABLE_ERROR_LOGGING ? console.warn.bind(console) : () => {}
const debugError = PERFORMANCE_CONFIG.ENABLE_ERROR_LOGGING ? console.error.bind(console) : () => {}
const perfLog = PERFORMANCE_CONFIG.ENABLE_PERFORMANCE_LOGGING ? console.log.bind(console) : () => {}

export class Start extends Phaser.Scene {
  constructor() {
    super("Start")
    this.workstationManager = null
    this.washroomManager = null // 添加洗手间管理器
    this.player = null
    this.cursors = null
    this.wasdKeys = null
    this.deskColliders = null
    this.currentUser = null
    this.bindingUI = null
    this.otherPlayers = new Map() // 存储其他玩家
    this.myStatus = null // 我的状态
    
    // 已删除无用的优化系统属性
  }

  preload() {
    this.loadTilemap()
    this.loadTilesetImages()
    this.loadLibraryImages()
  }

  create() {
    // Phaser scene creation
    
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
        // 游戏键盘输入已禁用
        this.keyboardInputEnabled = false;
        
        // 彻底停用Phaser的键盘处理
        if (this.input && this.input.keyboard) {
          // 移除所有键盘监听
          this.input.keyboard.removeAllKeys();
          this.cursors = null;
          this.wasdKeys = null;
          
          // 停用键盘管理器
          this.input.keyboard.enabled = false;
          
          // 清除任何现有的键盘事件捕获
          if (this.input.keyboard.capture && this.input.keyboard.capture.length > 0) {
            this.input.keyboard.capture = [];
          }
          
          // 移除canvas上的键盘事件监听
          const canvas = this.game.canvas;
          if (canvas) {
            // 移除tabindex，让canvas不能获得焦点
            canvas.removeAttribute('tabindex');
            // 如果canvas当前有焦点，移除焦点
            if (document.activeElement === canvas) {
              canvas.blur();
            }
            
            // 临时添加事件监听器阻止键盘事件传播到Phaser
            this.keyboardBlockHandler = (event) => {
              // 检查事件是否来自输入元素
              const isFromInput = event.target.tagName.toLowerCase() === 'input' || 
                                 event.target.tagName.toLowerCase() === 'textarea' ||
                                 event.target.contentEditable === 'true';
              
              if (isFromInput) {
                // 如果来自输入元素，不阻止事件，让输入正常工作
                return;
              }
              
              // 对于其他情况，阻止事件传播到Phaser
              event.stopPropagation();
            };
            
            // 在捕获阶段添加监听器，优先级更高
            document.addEventListener('keydown', this.keyboardBlockHandler, true);
            document.addEventListener('keyup', this.keyboardBlockHandler, true);
            document.addEventListener('keypress', this.keyboardBlockHandler, true);
          }
          
          // 完全禁用Phaser的keyboard插件
          if (this.input.keyboard.manager) {
            this.input.keyboard.manager.enabled = false;
          }
          
          // Phaser键盘完全禁用
        }
        
        return { success: true, enabled: false };
      }
      
      window.enableGameKeyboard = () => {
        // 游戏键盘输入已启用
        this.keyboardInputEnabled = true;
        
        // 重新启用Phaser的键盘处理
        if (this.input && this.input.keyboard) {
          // 移除临时的键盘事件拦截器
          if (this.keyboardBlockHandler) {
            document.removeEventListener('keydown', this.keyboardBlockHandler, true);
            document.removeEventListener('keyup', this.keyboardBlockHandler, true);
            document.removeEventListener('keypress', this.keyboardBlockHandler, true);
            this.keyboardBlockHandler = null;
            // 已移除键盘事件拦截器
          }
          
          // 重新启用键盘管理器
          this.input.keyboard.enabled = true;
          
          // 重新启用Phaser的keyboard插件
          if (this.input.keyboard.manager) {
            this.input.keyboard.manager.enabled = true;
          }
          
          // 恢复canvas的tabindex，让它可以获得焦点
          const canvas = this.game.canvas;
          if (canvas) {
            canvas.setAttribute('tabindex', '0');
          }
          
          // 重新创建键盘监听
          this.cursors = this.input.keyboard.createCursorKeys();
          this.wasdKeys = this.input.keyboard.addKeys('W,S,A,D');
          
          // Phaser键盘完全恢复
        }
        
        return { success: true, enabled: true };
      }
      
      window.isGameKeyboardEnabled = () => {
        return { enabled: this.keyboardInputEnabled !== false };
      }

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

      // 触发Phaser游戏初始化完成事件
      window.dispatchEvent(new Event("phaser-game-ready"))
    }

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

    // 获取用户数据（从场景参数或本地存储）
    const sceneData = this.scene.settings.data || {}
    this.currentUser = sceneData.userData || this.getCurrentUserFromStorage()

    if (!this.currentUser) {
      // 在新的认证系统下，如果没有用户数据，创建默认临时数据
      // React层面已经处理了认证和角色创建
      // 没有找到用户数据，使用默认设置
      this.currentUser = {
        id: 'temp_user',
        username: 'Guest',
        character: 'Premade_Character_48x48_01',
        points: 50,
        gold: 50
      }
    }

    // 同步用户数据到数据库
    this.syncUserToDatabase()

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

    // 初始化工位管理器
    this.workstationManager = new WorkstationManager(this)
    
    // 🚀 启用视口优化功能 
    this.workstationManager.enableViewportOptimization()
    // 视口优化已启用
    
    // 初始化洗手间管理器
    this.washroomManager = new WashroomManager(this)
    // 初始化工位绑定UI
    this.bindingUI = new WorkstationBindingUI(this)

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

    const map = this.createTilemap()
    this.mapLayers = this.createTilesetLayers(map)
    this.renderObjectLayer(map, "desk_objs")

    // 创建洗手间
    this.washroomManager.createWashroom(map)
    this.renderObjectLayer(map, "washroom/washroom_objs")

    // 创建floor图层
    this.renderObjectLayer(map, "floor")

    // 创建玩家
    this.createPlayer(map)

    // 设置输入
    this.setupInput()

    // 设置相机
    this.setupCamera(map)

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
  }

  update() {
    // 只处理需要每帧更新的核心逻辑
    this.handlePlayerMovement()

    // 检查T键按下，快速回到工位（临时禁用）
    // if (this.teleportKey && Phaser.Input.Keyboard.JustDown(this.teleportKey)) {
    //   this.handleTeleportKeyPress()
    // }

    // 移除不必要的每帧UI更新和碰撞检测，改为定时执行
    // bindingUI.update() 和 collision detection 现在使用定时器
  }

  // 已删除无用的性能优化系统初始化函数

  // 已删除无用的优化碰撞检测函数

  // ===== 玩家相关方法 =====
  createPlayer(map) {
    // 从对象层获取玩家位置
    const userLayer = map.getObjectLayer("player_objs")
    if (!userLayer) {
      debugWarn("User objects layer not found")
      return
    }

    // 找到玩家身体对象
    const userBody = userLayer.objects.find((obj) => obj.name === "user_body")

    // 创建玩家实例，启用移动和状态保存
    const playerSpriteKey =
      this.currentUser?.character || "characters_list_image"

    // 创建主玩家的playerData
    const mainPlayerData = {
      id: this.currentUser?.id || "main-player",
      name: this.currentUser?.username || "我",
      currentStatus: {
        type: "working",
        status: "工作中",
        emoji: "💼",
        message: "正在使用PixelDesk...",
        timestamp: new Date().toISOString(),
      },
    }

    this.player = new Player(
      this,
      userBody.x,
      userBody.y - userBody.height,
      playerSpriteKey,
      true,
      true,
      false,
      mainPlayerData
    )
    this.add.existing(this.player)

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
      // debugLog('DEBUG: Player movement is disabled, enableMovement =', this.player.enableMovement);
      return;
    }

    // 检查是否应该处理键盘输入（简化版本）
    if (this.keyboardInputEnabled === false) {
      // 当键盘输入被禁用时，停止角色移动
      this.player.body.setVelocityX(0);
      this.player.body.setVelocityY(0);
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

    const cursors = this.cursors;
    const wasdKeys = this.wasdKeys;

    // 将移动处理委托给Player类
    this.player.handleMovement(cursors, wasdKeys)
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

    // 加载角色图片（每个都包含4个方向的帧）
    const characterAssets = [
      "Premade_Character_48x48_01.png",
      "Premade_Character_48x48_02.png",
      "Premade_Character_48x48_03.png",
      "Premade_Character_48x48_04.png",
      "Premade_Character_48x48_05.png",
      "Premade_Character_48x48_06.png",
      "Premade_Character_48x48_07.png",
      "Premade_Character_48x48_08.png",
      "Premade_Character_48x48_09.png",
      "Premade_Character_48x48_10.png",
      "Premade_Character_48x48_11.png",
      "Premade_Character_48x48_12.png",
      "Premade_Character_48x48_13.png",
      "Premade_Character_48x48_14.png",
      "Premade_Character_48x48_15.png",
      "Premade_Character_48x48_16.png",
      "Premade_Character_48x48_17.png",
      "Premade_Character_48x48_18.png",
      "Premade_Character_48x48_19.png",
      "Premade_Character_48x48_20.png",
    ]

    characterAssets.forEach((filename) => {
      const key = filename.replace(".png", "")
      this.load.spritesheet(key, `/assets/characters/${filename}`, {
        frameWidth: 48,
        frameHeight: 48,
      })
    })
  }

  loadLibraryImages() {
    // 默认桌子图像
    this.load.image("desk_image", "/assets/desk/desk_long_right.png")
    this.load.image("desk_long_right", "/assets/desk/desk_long_right.png")
    this.load.image("desk_long_left", "/assets/desk/desk_long_left.png")
    this.load.image("desk_short_right", "/assets/desk/single_desk.png")
    this.load.image(
      "desk_short_left",
      "/assets/desk/single_desk_short_left.png"
    )
    this.load.image(
      "desk_park_short_down",
      "/assets/desk/desk_park_short_down.png"
    )
    this.load.image(
      "desk_park_short_top",
      "/assets/desk/desk_park_short_top.png"
    )
    this.load.image("desk_park_long_top", "/assets/desk/desk_park_long_top.png")
    this.load.image("single_desk", "/assets/desk/single_desk.png")
    this.load.image(
      "library_bookcase_normal",
      "/assets/desk/library_bookcase_normal.png"
    )
    this.load.image(
      "library_bookcase_tall",
      "/assets/desk/library_bookcase_tall.png"
    )

    this.load.image(
      "Shadowless_washhand",
      "/assets/bathroom/Shadowless_washhand.png"
    )
    this.load.image("Bathroom_matong", "/assets/bathroom/Bathroom_matong.png")
    this.load.image(
      "Shadowless_glass_2",
      "/assets/bathroom/Shadowless_glass_2.webp"
    )
    this.load.image("Shadowless_glass", "/assets/bathroom/Shadowless_glass.png")

    this.load.image("sofa-left-1", "/assets/sofa/sofa-left-1.png")
    this.load.image("sofa-left-2", "/assets/sofa/sofa-left-2.png")
    this.load.image("sofa-left-3", "/assets/sofa/sofa-left-3.png")
    this.load.image("sofa-right-1", "/assets/sofa/sofa-right-1.png")
    this.load.image("sofa-right-2", "/assets/sofa/sofa-right-2.png")
    this.load.image("sofa-right-3", "/assets/sofa/sofa-right-3.png")

    this.load.image(
      "desk-big-manager-left-1",
      "/assets/desk/desk-big-manager-left-1.png"
    )
    this.load.image(
      "desk-big-manager-center-1",
      "/assets/desk/desk-big-manager-center-1.png"
    )
    this.load.image(
      "desk-big-manager-right-1",
      "/assets/desk/desk-big-manager-right-1.png"
    )
    this.load.image(
      "desk-big-manager-center-2",
      "/assets/desk/desk-big-manager-center-2.png"
    )

    this.load.image("flower", "/assets/tileset/flower.png")
    this.load.image("rug", "/assets/tileset/rug.png")
    this.load.image("cabinet", "/assets/tileset/cabinet.png")
    this.load.image("stair-red", "/assets/tileset/stair-red.png")
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

    // 创建桌子碰撞组
    this.deskColliders = this.physics.add.staticGroup()

    objectLayer.objects.forEach((obj) => this.renderObject(obj))

    // 在所有工位创建完成后更新deskCount - 只对desk_objs图层执行
    if (layerName === "desk_objs") {
      this.userData.deskCount =
        this.workstationManager.getWorkstationsByType("desk").length
      // Desk count updated

      // 发送更新到UI
      this.sendUserDataToUI()
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

    // 添加调试边界（已注释）
    // this.addDebugBounds(obj, adjustedY);
  }

  addDeskCollision(sprite, obj) {
    // 启用sprite的物理特性
    this.physics.world.enable(sprite)
    sprite.body.setImmovable(true)

    // 根据桌子类型调整碰撞边界
    const collisionSettings = this.getCollisionSettings(obj)
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

    // 添加到碰撞组
    this.deskColliders.add(sprite)

    // 设置玩家与桌子的碰撞
    if (this.player) {
      this.physics.add.collider(this.player, sprite)
    } else {
      // 如果玩家还未创建，稍后再设置碰撞
      this.time.delayedCall(200, () => {
        if (this.player) {
          this.physics.add.collider(this.player, sprite)
        }
      })
    }
  }

  getCollisionSettings(obj) {
    const objName = obj.name || ""
    const objType = obj.type || ""

    // 根据不同的桌子类型返回不同的碰撞设置
    if (objName.includes("long") || objType.includes("long")) {
      // 长桌子 - 更小的碰撞边界
      return { scaleX: 0.4, scaleY: 0.4, offsetX: 0, offsetY: 0 }
    } else if (objName.includes("single") || objType.includes("single")) {
      // 单人桌 - 中等碰撞边界
      return { scaleX: 0.6, scaleY: 0.6, offsetX: 0, offsetY: 0 }
    } else if (objName.includes("bookcase") || objType.includes("bookcase")) {
      // 书架 - 更大的碰撞边界
      return { scaleX: 0.7, scaleY: 0.7, offsetX: 0, offsetY: 0 }
    } else if (objName.includes("sofa") || objType.includes("sofa")) {
      // 沙发 - 特殊的碰撞边界
      return { scaleX: 0.5, scaleY: 0.3, offsetX: 0, offsetY: 0 }
    } else {
      // 默认设置
      return { scaleX: 0.5, scaleY: 0.5, offsetX: 0, offsetY: 0 }
    }
  }

  renderTilesetObject(obj, adjustedY) {
    const imageKey = obj.name || "desk_image"
    if (!imageKey) return null

    const sprite = this.add.image(obj.x, adjustedY, imageKey)
    this.configureSprite(sprite, obj)
    return sprite
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

  // ===== 辅助方法 =====
  isDeskObject(obj) {
    // 修改为同时识别desk和bookcase对象
    return (
      obj.name === "desk" ||
      obj.type === "desk" ||
      obj.name.includes("desk_") ||
      obj.name === "library_bookcase_normal" ||
      obj.name === "library_bookcase_tall" ||
      obj.type === "bookcase" ||
      obj.type === "bookcase_tall" ||
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
      // 设置较小的lerp值，使相机跟随更平滑
      this.cameras.main.setLerp(0.05, 0.05)
      // 设置死区，允许玩家在屏幕内移动
      this.updateDeadzone()
    } else {
      // 如果玩家尚未创建，延迟设置相机跟随
      this.time.delayedCall(100, () => {
        if (this.player) {
          this.cameras.main.startFollow(this.player)
          // 设置较小的lerp值，使相机跟随更平滑
          this.cameras.main.setLerp(0.05, 0.05)
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

      // 动态计算死区大小，基于缩放级别
      const baseReduction = Math.min(
        200,
        Math.min(screenWidth, screenHeight) * 0.2
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

  // setupTestBindings and placeCharactersAtOccupiedWorkstations functions removed for performance optimization

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
    // 每30秒同步一次工位状态
    // 暂时禁用定时同步以排查CPU占用问题
    // this.time.addEvent({
    //   delay: 60000, // 改为60秒
    //   callback: async () => {
    //     try {
    //       await this.workstationManager.syncWorkstationBindings()
    //     } catch (error) {
    //       debugError('定时同步工位状态失败，跳过此次同步:', error)
    //     }
    //   },
    //   callbackScope: this,
    //   loop: true,
    // })

    debugLog("工位状态定时同步已设置（每30秒）")
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
      window.updateMyStatus = async (statusData) => {
        this.myStatus = statusData
        // 根据状态更新工位角色可见性
        if (this.currentUser && this.workstationManager) {
          const userWorkstation = this.workstationManager.getWorkstationByUser(
            this.currentUser.id
          )
          if (userWorkstation && userWorkstation.character) {
            // 如果状态是"下班了"，隐藏角色；否则显示角色
            const isOffWork = statusData.type === "off_work"
            userWorkstation.character.player.setVisible(!isOffWork)
          }
        }

        // 如果是下班状态，结束所有活动
        if (statusData.type === "off_work" && this.currentUser) {
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
      debounceDelay: 300, // 300ms防抖延迟
      collisionThreshold: 60, // 碰撞检测阈值（像素）
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

    // 已删除无用的碰撞检测循环设置
  }

  // 处理玩家碰撞（带防抖机制）
  handlePlayerCollision(mainPlayer, otherPlayer) {
    const playerId = otherPlayer.playerData.id

    // 如果这是一个新的碰撞
    if (!this.collisionManager.activeCollisions.has(playerId)) {
      // 添加到活动碰撞集合
      this.collisionManager.activeCollisions.add(playerId)

      // 触发碰撞开始事件
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
        // 防抖时间到，检查是否仍在碰撞
        if (this.collisionManager.activeCollisions.has(playerId)) {
          // 从活动碰撞中移除
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

  // 为新创建的工位角色添加碰撞检测
  addCollisionForWorkstationCharacter(character) {
    if (character && character.isOtherPlayer && this.player) {
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

      debugLog("为新工位角色添加碰撞检测:", character.playerData.name)
    }
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

  shutdown() {
    // 清理定时器
    if (this.collisionCheckTimer) {
      this.collisionCheckTimer.remove()
      this.collisionCheckTimer = null
    }

    if (this.uiUpdateTimer) {
      this.uiUpdateTimer.remove()
      this.uiUpdateTimer = null
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

    // 清理全局函数
    if (typeof window !== "undefined") {
      delete window.onPlayerCollisionStart
      delete window.onPlayerCollisionEnd
      delete window.getCurrentCollisions
      delete window.getCollisionHistory
      delete window.setCollisionSensitivity
      delete window.gameScene
    }

    // 调用父类的shutdown方法
    super.shutdown()
  }
}

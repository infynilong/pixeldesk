// ===== GameBridgeAPI =====
// Phaser ↔ React/Next.js 桥接层
// 管理所有 window.* 全局函数的注册和清理

const ENABLE_DEBUG_LOGGING = false
const ENABLE_ERROR_LOGGING = true

const debugLog = ENABLE_DEBUG_LOGGING ? console.log.bind(console) : () => { }
const debugWarn = ENABLE_ERROR_LOGGING ? console.warn.bind(console) : () => { }
const debugError = ENABLE_ERROR_LOGGING ? console.error.bind(console) : () => { }

export class GameBridgeAPI {
  constructor(scene) {
    this.scene = scene
  }

  /**
   * 注册所有 window.* 全局函数，供 React/Next.js 调用。
   * 在 Start.create() 中调用，所有 manager 初始化之前。
   */
  registerAll() {
    if (typeof window === 'undefined') return
    const scene = this.scene

    // === 场景引用 ===
    window.saveGameScene = scene.saveGameScene.bind(scene)

    // === 工位查询 ===
    window.getGameWorkstationCount = scene.getWorkstationCount.bind(scene)
    window.getGameWorkstationStats = scene.getWorkstationStats.bind(scene)

    window.getViewportOptimizationStats = () => {
      return scene.workstationManager ? scene.workstationManager.getViewportStats() : { enabled: false }
    }

    // 快速回到工位
    window.teleportToWorkstation = async () => {
      if (!scene.currentUser) {
        debugWarn("没有当前用户信息")
        return { success: false, error: "请先登录" }
      }

      try {
        const result = await scene.workstationManager.teleportToWorkstation(
          scene.currentUser.id,
          scene.player
        )

        if (result.success) {
          const event = new CustomEvent("user-points-updated", {
            detail: {
              userId: scene.currentUser.id,
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

    // === 碰撞查询 (delegated to PlayerCollisionManager) ===
    window.getCurrentCollisions = () => scene.playerCollisionManager?.getCurrentCollisions() || []
    window.getCollisionHistory = () => scene.playerCollisionManager?.getCollisionHistory() || []
    window.setCollisionSensitivity = (radius) => scene.playerCollisionManager?.setCollisionSensitivity(radius)

    // === 工位调试 ===
    window.forceRefreshWorkstations = async () => {
      if (scene.workstationManager) {
        const result = await scene.workstationManager.forceRefreshAllBindings();
        return result;
      }
      return { error: 'WorkstationManager not initialized' };
    }

    // === 键盘控制 ===
    window.disableGameKeyboard = () => this.disableGameKeyboard()
    window.enableGameKeyboard = () => this.enableGameKeyboard()
    window.isGameKeyboardEnabled = () => {
      return { enabled: scene.keyboardInputEnabled !== false }
    }

    // 窗口重新获得焦点时重置按键状态，防止粘滞键
    scene.handleWindowFocus = () => {
      if (scene.keyboardInputEnabled !== false && scene.input && scene.input.keyboard) {
        console.log('🎮 [Internal] Window Focused - Resetting Keys')
        scene.input.keyboard.resetKeys()
      }
    }
    window.addEventListener('focus', scene.handleWindowFocus)

    scene.events.once('shutdown', () => {
      if (scene.handleWindowFocus) {
        window.removeEventListener('focus', scene.handleWindowFocus)
      }
    })

    // === 玩家移动控制 ===
    window.enablePlayerMovement = () => this.enablePlayerMovement()
    window.disablePlayerMovement = () => this.disablePlayerMovement()

    // === 鼠标控制 ===
    window.disableGameMouse = () => {
      console.log('🖱️ [Internal] Disabling Game Mouse')
      if (scene.input) scene.input.enabled = false
      return { success: true }
    }

    window.enableGameMouse = () => {
      console.log('🖱️ [Internal] Enabling Game Mouse')
      if (scene.input) scene.input.enabled = true
      return { success: true }
    }

    // === 焦点恢复：点击游戏区域时自动释放输入框焦点 ===
    scene.input.on('pointerdown', (pointer) => {
      const activeElement = document.activeElement
      const isInput = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.contentEditable === 'true'
      )

      console.log('🎮 Game Canvas Clicked, Active Element:', activeElement?.tagName, 'Is Input:', isInput)

      if (isInput) {
        activeElement.blur()
      }

      window.enableGameKeyboard()

      window.focus()
      if (scene.game.canvas) scene.game.canvas.focus()

      // 🖱️ 点击寻路：点击空白区域触发自动行走
      if (scene.pathfindingManager && scene.player && scene.player.enableMovement) {
        const hitObjects = scene.input.hitTestPointer(pointer)
        const hitInteractive = hitObjects.some(obj =>
          obj !== scene.player && obj.input && obj.input.enabled
        )

        if (!hitInteractive) {
          const started = scene.pathfindingManager.handlePointerDown(pointer, scene.player)
          if (started) {
            scene.player.isAutoWalking = true
          }
        }
      }
    })

    // === 触发 Phaser 游戏初始化完成事件 ===
    window.dispatchEvent(new Event("phaser-game-ready"))

    // === 用户数据同步 ===
    window.updatePhaserUserData = (userData) => this.updatePhaserUserData(userData)
  }

  // ===== 键盘控制方法 =====

  disableGameKeyboard() {
    const scene = this.scene
    console.log('🎮 [Internal] Disabling Game Keyboard')
    scene.keyboardInputEnabled = false

    if (scene.input && scene.input.keyboard) {
      // 1. 停止当前物理移动
      if (scene.player && scene.player.body) {
        scene.player.body.setVelocity(0, 0)
      }

      // 2. 核心修复：重置所有按键状态，防止"粘滞键"和自动走向大老远的问题
      scene.input.keyboard.resetKeys()

      // 3. 停用阻止默认行为，允许在输入框中输入 WASD
      scene.input.keyboard.preventDefault = false

      // 4. 彻底停用按键管理器
      scene.input.keyboard.enabled = false
      if (scene.input.keyboard.manager) {
        scene.input.keyboard.manager.enabled = false
      }

      // 5. 暂时禁用 canvas 焦点及TabIndex
      const canvas = scene.game.canvas
      if (canvas) {
        canvas.removeAttribute('tabindex')
        if (document.activeElement === canvas) {
          canvas.blur()
        }
      }

      // 6. 全局拦截拦截穿透事件 (双保险)
      if (!scene.keyboardBlockHandler) {
        scene.keyboardBlockHandler = (event) => {
          const target = event.target
          const isFromInput = target.tagName.toLowerCase() === 'input' ||
            target.tagName.toLowerCase() === 'textarea' ||
            target.contentEditable === 'true'

          // 如果是输入框事件，允许传播；否则停止传播以保护 Phaser 内部状态
          if (isFromInput) return
          event.stopPropagation()
        }
        document.addEventListener('keydown', scene.keyboardBlockHandler, true)
        document.addEventListener('keyup', scene.keyboardBlockHandler, true)
      }
    }
    return { success: true, enabled: false }
  }

  enableGameKeyboard() {
    const scene = this.scene
    console.log('🎮 [Internal] Enabling Game Keyboard')
    scene.keyboardInputEnabled = true

    if (scene.input && scene.input.keyboard) {
      // 1. 移除全局拦截器
      if (scene.keyboardBlockHandler) {
        document.removeEventListener('keydown', scene.keyboardBlockHandler, true)
        document.removeEventListener('keyup', scene.keyboardBlockHandler, true)
        scene.keyboardBlockHandler = null
      }

      // 2. 重新启用 Phaser 键盘
      scene.input.keyboard.enabled = true
      if (scene.input.keyboard.manager) {
        scene.input.keyboard.manager.enabled = true
      }

      // 3. 恢复阻止默认行为，保护游戏健位
      scene.input.keyboard.preventDefault = true

      // 4. 恢复 canvas 聚焦能力
      const canvas = scene.game.canvas
      if (canvas) {
        canvas.setAttribute('tabindex', '0')
        // 延迟一点点聚焦，确保 DOM 状态已更新
        setTimeout(() => canvas.focus(), 10)
      }

      // 5. 确保按键状态是干净的
      scene.input.keyboard.resetKeys()

      // 6. 确保 cursors 重建并可用 (managed by CameraInputManager)
      if (scene.cameraInput) {
        if (!scene.cameraInput.cursors) {
          scene.cameraInput.cursors = scene.input.keyboard.createCursorKeys()
        }
        if (!scene.cameraInput.wasdKeys) {
          scene.cameraInput.wasdKeys = scene.input.keyboard.addKeys('W,S,A,D')
        }
      }
    }
    return { success: true, enabled: true }
  }

  // ===== 玩家移动控制方法 =====

  enablePlayerMovement() {
    const scene = this.scene
    // 清除工位绑定状态标志
    scene.isInWorkstationBinding = false

    // 清除自动恢复定时器
    if (scene.playerMovementRestoreTimer) {
      scene.time.removeEvent(scene.playerMovementRestoreTimer)
      scene.playerMovementRestoreTimer = null
    }

    if (scene.player && typeof scene.player.enableMovement === "function") {
      scene.player.enableMovement()
      return { success: true, enabled: true }
    } else if (scene.player) {
      scene.player.enableMovement = true
      return { success: true, enabled: true }
    }
    debugWarn('🎮 无法恢复玩家移动 - 玩家对象不存在')
    return { success: false, error: '玩家对象不存在' }
  }

  disablePlayerMovement() {
    const scene = this.scene
    if (scene.player && typeof scene.player.disableMovement === "function") {
      scene.player.disableMovement()
      return { success: true, enabled: false }
    } else if (scene.player) {
      scene.player.enableMovement = false
      return { success: true, enabled: false }
    }
    debugWarn('🎮 无法禁用玩家移动 - 玩家对象不存在')
    return { success: false, error: '玩家对象不存在' }
  }

  // ===== 用户数据同步方法 =====

  updatePhaserUserData(userData) {
    const scene = this.scene
    if (!userData) return
    console.log('🔄 [Phaser Sync] 收到 React 数据:', {
      id: userData.id,
      workstationId: userData.workstationId,
      points: userData.points,
      character: userData.character
    })

    const oldCharacter = scene.currentUser?.character
    scene.currentUser = { ...scene.currentUser, ...userData }

    // 同时也更新WorkstationManager中的引用
    if (scene.workstationManager) {
      scene.workstationManager.currentUser = scene.currentUser
    }

    // 如果角色形象发生了变化，更新玩家外观
    if (userData.character && userData.character !== oldCharacter && scene.player) {
      console.log('👕 [Phaser Sync] 检测到角色形象变更，正在更新外观:', userData.character)
      if (typeof scene.player.updateCharacterSprite === 'function') {
        scene.player.updateCharacterSprite(userData.character)
      } else {
        console.warn('⚠️ Player class missing updateCharacterSprite method, attempting reload')
        const x = scene.player.x
        const y = scene.player.y
        const direction = scene.player.direction || 'down'
        scene.player.destroy()
        scene.createPlayer(scene.map, x, y, direction).then(() => {
          scene.cameraInput.setupCamera(scene.map)
          scene.cameraInput.setupInput()
        })
      }
    }
  }

  // ===== 清理方法 =====

  /**
   * 清理所有 window.* 全局函数和事件监听器。
   * 在 Start.shutdown() 中调用。
   */
  unregisterAll() {
    if (typeof window === 'undefined') return
    const scene = this.scene

    // 1. 移除键盘拦截监听器
    if (scene.keyboardBlockHandler) {
      document.removeEventListener('keydown', scene.keyboardBlockHandler, true)
      document.removeEventListener('keyup', scene.keyboardBlockHandler, true)
      scene.keyboardBlockHandler = null
    }

    // 2. 移除焦点监听器
    if (scene.handleWindowFocus) {
      window.removeEventListener('focus', scene.handleWindowFocus)
      scene.handleWindowFocus = null
    }

    // 3. 移除可见性监听器
    if (scene.visibilityChangeHandler) {
      document.removeEventListener('visibilitychange', scene.visibilityChangeHandler)
      scene.visibilityChangeHandler = null
    }

    // 4. 清理登录监听器
    if (scene.loginEventListener) {
      window.removeEventListener('user-logged-in', scene.loginEventListener)
      scene.loginEventListener = null
    }

    // 5. 清理全局函数
    delete window.saveGameScene
    delete window.getGameWorkstationCount
    delete window.getGameWorkstationStats
    delete window.getViewportOptimizationStats
    delete window.teleportToWorkstation
    delete window.getCurrentCollisions
    delete window.getCollisionHistory
    delete window.setCollisionSensitivity
    delete window.forceRefreshWorkstations
    delete window.disableGameKeyboard
    delete window.enableGameKeyboard
    delete window.isGameKeyboardEnabled
    delete window.enablePlayerMovement
    delete window.disablePlayerMovement
    delete window.disableGameMouse
    delete window.enableGameMouse
    delete window.updatePhaserUserData
    delete window.onPlayerCollisionStart
    delete window.onPlayerCollisionEnd
    delete window.onPlayerCollision
    delete window.updateMyStatus
    delete window.getChunkStats
    delete window.gameScene
    delete window.forceNight
    delete window.forceDay
    delete window.isNight
    delete window.getTimeDescription
    delete window.isPlayerIndoor
    delete window.addIndoorArea
  }

  destroy() {
    this.unregisterAll()
    this.scene = null
  }
}

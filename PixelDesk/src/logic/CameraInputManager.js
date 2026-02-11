// ===== CameraInputManager =====
// Manages camera setup, zoom controls, keyboard/mouse input, and per-frame player movement.
// Extracted from Start.js to reduce file size.

import { ZoomControl } from "../components/ZoomControl.js"

const ENABLE_DEBUG_LOGGING = false
const ENABLE_ERROR_LOGGING = true

const debugLog = ENABLE_DEBUG_LOGGING ? console.log.bind(console) : () => { }
const debugWarn = ENABLE_ERROR_LOGGING ? console.warn.bind(console) : () => { }

export class CameraInputManager {
  constructor(scene) {
    this.scene = scene
    this.cursors = null
    this.wasdKeys = null
    this.zoomControl = null
    this.deadzoneDebug = null
    this.teleportKey = null
    this.frontDeskKey = null
  }

  // ===== Camera Methods =====

  setupCamera(map) {
    const scene = this.scene
    // For infinite maps, we need to calculate the bounds based on the layer data
    const officeLayerData = map.getLayer("office_1")
    if (officeLayerData) {
      const mapWidth = officeLayerData.width * map.tileWidth
      const mapHeight = officeLayerData.height * map.tileHeight
      // Tiled JSON for infinite maps provides startx/starty in tiles, not pixels
      const mapX = officeLayerData.startx * map.tileWidth
      const mapY = officeLayerData.starty * map.tileHeight

      scene.cameras.main.setBounds(mapX, mapY, mapWidth, mapHeight)
      scene.physics.world.setBounds(mapX, mapY, mapWidth, mapHeight)
    } else {
      // Fallback for non-infinite maps or if layer name changes
      scene.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels)
      scene.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels)
    }

    // 启用相机渲染优化 - 限制渲染范围
    scene.cameras.main.useBounds = true

    // 从本地存储获取缩放值，如果没有则使用默认值1（而不是0.5）
    const savedZoom = localStorage.getItem("cameraZoom")
    const zoomValue = savedZoom ? parseFloat(savedZoom) : 1

    // 设置相机缩放
    scene.cameras.main.setZoom(zoomValue)

    // 设置相机跟随和死区
    this.setupCameraFollow()

    // 创建缩放控制按钮
    this.createZoomControls()
  }

  // 设置相机跟随和死区
  setupCameraFollow() {
    const scene = this.scene
    if (scene.player) {
      scene.cameras.main.startFollow(scene.player)
      // 设置较小的lerp值，使相机跟随更平滑 (从 0.05 提升到 0.1 以增强响应速度)
      scene.cameras.main.setLerp(0.1, 0.1)
      // 设置死区，允许玩家在屏幕内移动
      this.updateDeadzone()
    } else {
      // 如果玩家尚未创建，延迟设置相机跟随
      scene.time.delayedCall(100, () => {
        if (scene.player) {
          scene.cameras.main.startFollow(scene.player)
          // 设置较小的lerp值，使相机跟随更平滑 (从 0.05 提升到 0.1 以增强响应速度)
          scene.cameras.main.setLerp(0.1, 0.1)
          // 设置死区
          this.updateDeadzone()
        }
      })
    }
  }

  createZoomControls() {
    // 使用新创建的ZoomControl组件
    this.zoomControl = new ZoomControl(this.scene)
  }

  adjustZoom(delta) {
    const scene = this.scene
    // 获取当前缩放值
    let currentZoom = scene.cameras.main.zoom
    // 计算新缩放值
    let newZoom = currentZoom + delta

    // 限制缩放范围在0.1到2之间
    newZoom = Phaser.Math.Clamp(newZoom, 0.1, 2)

    // 使用动画效果调整缩放
    scene.tweens.add({
      targets: scene.cameras.main,
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
    const scene = this.scene
    if (scene.player && scene.cameras.main) {
      const zoom = scene.cameras.main.zoom
      const screenWidth = scene.game.config.width
      const screenHeight = scene.game.config.height

      // 缩小死区范围，让人物更靠近屏幕中心
      // 增加排除比例，从 0.2 提高到 0.6，意味着死区只占投影面积的 40%
      const baseReduction = Math.min(
        400,
        Math.min(screenWidth, screenHeight) * 0.6
      )
      const adjustedWidth = (screenWidth - baseReduction) / zoom
      const adjustedHeight = (screenHeight - baseReduction) / zoom

      scene.cameras.main.setDeadzone(adjustedWidth, adjustedHeight)

      // 死区调试可视化功能已移除以优化性能
      if (this.deadzoneDebug) {
        this.deadzoneDebug.destroy()
        this.deadzoneDebug = null
      }
    }
  }

  // ===== Input Methods =====

  setupInput() {
    const scene = this.scene
    // 不再使用 createCursorKeys() 和 addKeys() 避免自动键盘捕获
    // 改为手动检查键盘状态，只有在FocusManager允许时才处理

    // 添加鼠标滚轮事件监听，用于缩放控制
    scene.input.on("wheel", (pointer, _currentlyOver, _deltaX, deltaY, _deltaZ) => {
      // 检查是否按下了Ctrl键
      if (pointer.event.ctrlKey) {
        // 根据滚轮方向调整缩放值
        // 向上滚动缩小，向下滚动放大
        const zoomDelta = deltaY > 0 ? -0.1 : 0.1
        this.adjustZoom(zoomDelta)
      }
    })

    // T键快速回到工位 - 仍然需要注册，但会通过FocusManager检查
    this.teleportKey = scene.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.T
    )

    // 🏢 配置前台客服的 F 键交互
    this.frontDeskKey = scene.input.keyboard.addKey(
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
    const scene = this.scene
    if (!scene.player) return

    // 1. 检查前台客服管理器交互
    if (scene.frontDeskManager) {
      const collidingDesks = scene.frontDeskManager.getCollidingDesks(scene.player, 150)

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

    // 2. 检查公告栏/大屏 (Billboard & Bulletin) 交互
    if (scene.billboardManager) {
      const nearBillboard = scene.mapRenderer?.billboardSensors && scene.physics.overlap(scene.player, scene.mapRenderer.billboardSensors);
      const nearBulletin = scene.mapRenderer?.bulletinBoardSensors && scene.physics.overlap(scene.player, scene.mapRenderer.bulletinBoardSensors);

      if (nearBillboard || nearBulletin) {
        console.log('📋 [交互] 触发公告栏 UI');
        // 如果是特殊感应器（公告栏感应器），可以在 detail 中带上 tab 提示
        scene.billboardManager.showBillboardUI();
        return;
      }
    }

    // 3. 这里可以添加其他物体的交互逻辑...
  }

  // 简化玩家移动处理逻辑
  handlePlayerMovement() {
    const scene = this.scene
    if (!scene.player || !scene.player.body) {
      return;
    }

    // 检查玩家enableMovement状态
    if (!scene.player.enableMovement) {
      // 停止移动，防止禁用后继续滑行
      if (scene.player.body.setVelocity) {
        scene.player.body.setVelocity(0, 0);
      }
      return;
    }

    // 检查是否应该处理输入
    if (scene.keyboardInputEnabled === false) {
      // 当输入被禁用时，停止角色移动
      if (scene.player.body.setVelocity) {
        scene.player.body.setVelocity(0, 0);
      }
      return;
    }

    // 简化键盘检测 - 使用Phaser的基本键盘API
    if (!this.cursors || !this.wasdKeys) {
      // 如果键盘被禁用，不要重新创建键盘对象
      if (scene.keyboardInputEnabled === false) {
        return;
      }

      // 如果还没有创建键盘对象，立即创建
      this.cursors = scene.input.keyboard.createCursorKeys();
      this.wasdKeys = scene.input.keyboard.addKeys('W,S,A,D');
    }

    // 获取摇杆数据
    const joystickVector = scene.mobileControls ? scene.mobileControls.getVector() : null;

    // 将移动处理委托给Player类
    scene.player.handleMovement(this.cursors, this.wasdKeys, joystickVector)
  }

  // 处理T键按下事件
  async handleTeleportKeyPress() {
    const scene = this.scene
    if (!scene.currentUser) {
      debugWarn("没有当前用户信息，无法使用快速回到工位功能")
      return
    }

    // 检查玩家是否有绑定的工位
    const userWorkstation = scene.workstationManager.getWorkstationByUser(
      scene.currentUser.id
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

  // ===== Cleanup =====

  destroy() {
    if (this.zoomControl) {
      this.zoomControl.destroy()
      this.zoomControl = null
    }

    if (this.deadzoneDebug) {
      this.deadzoneDebug.destroy()
      this.deadzoneDebug = null
    }

    // Clean up key bindings
    if (this.teleportKey) {
      this.teleportKey.destroy()
      this.teleportKey = null
    }
    if (this.frontDeskKey) {
      this.frontDeskKey.removeAllListeners()
      this.frontDeskKey.destroy()
      this.frontDeskKey = null
    }

    this.cursors = null
    this.wasdKeys = null
    this.scene = null
  }
}

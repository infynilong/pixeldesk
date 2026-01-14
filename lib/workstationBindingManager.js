/**
 * 工位绑定管理器 - 处理Next.js和Phaser之间的通信
 */
export class WorkstationBindingManager {
  constructor() {
    this.currentWorkstation = null
    this.currentUser = null
    this.isProcessing = false
  }

  /**
   * 显示工位绑定弹窗或工位信息弹窗
   */
  async showBindingDialog(workstation, user) {
    console.log('showBindingDialog 被调用')
    console.log('工位信息:', workstation)
    console.log('用户信息:', user)

    this.currentWorkstation = workstation
    this.currentUser = user
    this.isProcessing = false

    // 检查游戏场景和工位管理器是否已准备好
    if (typeof window !== 'undefined' && (!window.gameScene || !window.gameScene.workstationManager)) {
      console.log('⏳ [showBindingDialog] 游戏场景尚未准备好，等待中...')

      // 等待游戏场景准备好（最多等待5秒）
      let attempts = 0
      const maxAttempts = 50 // 5秒，每100ms检查一次

      const waitForScene = () => {
        attempts++
        if (window.gameScene && window.gameScene.workstationManager) {
          console.log('✅ [showBindingDialog] 游戏场景和工位管理器现在可用，继续绑定流程')
          this.proceedWithBinding()
          return
        }

        if (attempts >= maxAttempts) {
          console.log('❌ [showBindingDialog] 等待游戏场景超时')
          this.restorePlayerMovement()
          if (typeof window !== 'undefined' && window.showNotification) {
            window.showNotification('游戏还未完全加载，请稍后再试', 'error')
          }
          return
        }

        setTimeout(waitForScene, 100) // 100ms后重试
      }

      waitForScene()
      return
    }

    this.proceedWithBinding()
  }

  /**
   * 继续绑定流程（游戏场景准备好后）
   */
  async proceedWithBinding() {
    // 检查用户是否已登录（基于 UserContext 的 user 状态）
    if (typeof window !== 'undefined' && !window.isUserAuthenticated) {
      console.log('🚫 未登录用户尝试绑定工位，显示认证提示')

      // 恢复玩家移动，避免卡住
      this.restorePlayerMovement()

      // 触发认证提示
      if (window.showTempPlayerAuthPrompt) {
        window.showTempPlayerAuthPrompt('绑定工位需要注册账号，这样您的工位就能永久保存了！')
      } else {
        console.warn('showTempPlayerAuthPrompt 函数不存在')
      }

      return { success: false, error: 'authentication_required' }
    }

    // 首先检查工位是否已被绑定
    const isAlreadyBound = await this.checkWorkstationBinding(this.currentWorkstation.id, this.currentUser.id)

    if (isAlreadyBound) {
      // 如果已绑定，显示工位信息弹窗
      if (typeof window !== 'undefined' && window.showWorkstationInfo) {
        console.log('显示工位信息弹窗')
        window.showWorkstationInfo(this.currentWorkstation.id, this.currentUser.id)
      } else {
        console.log('showWorkstationInfo 函数不存在')
      }
    } else {
      // 如果未绑定，显示绑定弹窗
      if (typeof window !== 'undefined' && window.setWorkstationBindingModal) {
        console.log('调用 setWorkstationBindingModal (BIND)')
        window.setWorkstationBindingModal({
          isVisible: true,
          workstation: this.currentWorkstation,
          user: this.currentUser,
          mode: 'bind'
        })
      } else {
        console.log('setWorkstationBindingModal 函数不存在')
      }
    }
  }

  /**
   * 显示工位解约弹窗
   */
  async showUnbindingDialog(workstation, user) {
    console.log('showUnbindingDialog 被调用')
    this.currentWorkstation = workstation
    this.currentUser = user
    this.isProcessing = false

    if (typeof window !== 'undefined' && window.setWorkstationBindingModal) {
      window.setWorkstationBindingModal({
        isVisible: true,
        workstation: this.currentWorkstation,
        user: this.currentUser,
        mode: 'unbind'
      })
    }
  }

  /**
   * 隐藏工位绑定弹窗
   */
  hideBindingDialog() {
    this.currentWorkstation = null
    this.currentUser = null
    this.isProcessing = false

    // 直接调用React状态更新函数
    if (typeof window !== 'undefined' && window.setWorkstationBindingModal) {
      window.setWorkstationBindingModal({
        isVisible: false,
        workstation: null,
        user: null
      })
    }

    // 恢复玩家移动
    this.restorePlayerMovement()
  }

  /**
   * 处理工位绑定确认
   */
  async handleBindingConfirm() {
    console.log('=== handleBindingConfirm 被调用 ===')
    console.log('当前工位:', this.currentWorkstation)
    console.log('当前用户:', this.currentUser)
    console.log('是否正在处理:', this.isProcessing)
    console.log('WorkstationBindingManager 实例:', this)

    if (!this.currentWorkstation || !this.currentUser || this.isProcessing) {
      console.log('绑定参数检查失败:', {
        hasWorkstation: !!this.currentWorkstation,
        hasUser: !!this.currentUser,
        isProcessing: this.isProcessing,
        workstation: this.currentWorkstation,
        user: this.currentUser
      })
      return { success: false, error: '绑定参数不完整或正在处理中' }
    }

    this.isProcessing = true

    try {
      // 通过Phaser场景处理绑定逻辑
      const result = await this.executeBindingInPhaser()

      if (result.success) {
        // 更新本地用户数据
        this.currentUser.points = result.remainingPoints
        this.currentUser.gold = result.remainingPoints

        // 保存到localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('pixelDeskUser', JSON.stringify(this.currentUser))
        }

        // 触发积分更新事件
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('user-points-updated', {
            detail: {
              userId: this.currentUser.id,
              points: result.remainingPoints
            }
          }))
        }

        // 触发工位绑定状态更新事件
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('workstation-binding-updated', {
            detail: {
              userId: this.currentUser.id,
              workstationId: this.currentWorkstation.id
            }
          }))
        }
      }

      return result
    } catch (error) {
      console.error('工位绑定失败:', error)
      return { success: false, error: '绑定失败，请重试' }
    } finally {
      this.isProcessing = false
    }
  }

  /**
   * 处理工位解约确认
   */
  async handleUnbindingConfirm() {
    console.log('=== handleUnbindingConfirm 被调用 ===')

    if (!this.currentWorkstation || !this.currentUser || this.isProcessing) {
      return { success: false, error: '解约参数不完整或正在处理中' }
    }

    this.isProcessing = true

    try {
      // 1. 调用后端 API 解除绑定
      const response = await fetch(`/api/workstations/bindings?userId=${this.currentUser.id}&workstationId=${this.currentWorkstation.id}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (result.success) {
        // 2. 在 Phaser 中解除绑定（更新视觉效果）
        if (typeof window !== 'undefined' && window.gameScene && window.gameScene.workstationManager) {
          window.gameScene.workstationManager.unbindUserFromWorkstation(this.currentWorkstation.id)
        }

        // 3. 触发解约成功事件
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('workstation-unbound', {
            detail: {
              userId: this.currentUser.id,
              workstationId: this.currentWorkstation.id
            }
          }))

          // 更新本地用户数据中的 workstationId
          if (this.currentUser.workstationId === this.currentWorkstation.id) {
            delete this.currentUser.workstationId
          }
        }

        return { success: true }
      } else {
        return { success: false, error: result.error || '解约失败' }
      }
    } catch (error) {
      console.error('工位解约失败:', error)
      return { success: false, error: '解约请求异常，请稍后重试' }
    } finally {
      this.isProcessing = false
    }
  }

  /**
   * 在Phaser中执行绑定逻辑
   */
  async executeBindingInPhaser() {
    return new Promise((resolve) => {
      // 调试信息
      console.log('🔍 [executeBindingInPhaser] 开始执行工位绑定检查:', {
        hasWindow: typeof window !== 'undefined',
        hasGameScene: typeof window !== 'undefined' && !!window.gameScene,
        gameSceneType: typeof window !== 'undefined' ? typeof window.gameScene : 'no-window'
      })

      if (typeof window === 'undefined' || !window.gameScene) {
        console.log('❌ [executeBindingInPhaser] 游戏场景不可用')
        resolve({ success: false, error: '游戏还未完全加载，请稍后再试' })
        return
      }

      const scene = window.gameScene
      console.log('🔍 [executeBindingInPhaser] 场景检查:', {
        hasWorkstationManager: !!scene.workstationManager,
        sceneName: scene.scene?.key,
        sceneActive: scene.scene?.isActive()
      })

      if (!scene.workstationManager) {
        console.log('❌ [executeBindingInPhaser] 工位管理器不可用')
        resolve({ success: false, error: '工位系统还未准备就绪，请稍后再试' })
        return
      }

      // 执行绑定
      scene.workstationManager.purchaseWorkstation(
        this.currentWorkstation.id,
        this.currentUser.id,
        this.currentUser
      ).then(result => {
        resolve(result)
      }).catch(error => {
        resolve({ success: false, error: error.message || '绑定失败' })
      })
    })
  }

  /**
   * 处理工位绑定取消
   */
  handleBindingCancel() {
    this.hideBindingDialog()
  }

  /**
   * 恢复玩家移动
   */
  restorePlayerMovement() {
    if (typeof window !== 'undefined' && window.gameScene) {
      const scene = window.gameScene
      if (scene.player) {
        console.log('恢复玩家移动')

        // 如果enableMovement是属性，直接设置
        if (typeof scene.player.enableMovement !== 'function') {
          scene.player.enableMovement = true
          console.log('已设置enableMovement属性为true')
        }
        // 如果enableMovement是方法，调用它
        else if (typeof scene.player.enableMovement === 'function') {
          scene.player.enableMovement()
          console.log('已调用enableMovement方法')
        }
      }
    }
  }

  /**
   * 获取当前工位信息
   */
  getCurrentWorkstation() {
    return this.currentWorkstation
  }

  /**
   * 获取当前用户信息
   */
  getCurrentUser() {
    return this.currentUser
  }

  /**
   * 检查工位是否已被绑定
   */
  async checkWorkstationBinding(workstationId, userId) {
    try {
      const response = await fetch(`/api/workstations/user-bindings?userId=${userId}`)
      const result = await response.json()

      if (result.success) {
        const binding = result.data.find(b => b.workstationId === workstationId)
        return !!binding
      }
      return false
    } catch (error) {
      console.error('检查工位绑定失败:', error)
      return false
    }
  }

  /**
   * 检查是否正在处理中
   */
  isBindingProcessing() {
    return this.isProcessing
  }
}

// 创建全局实例
export const workstationBindingManager = new WorkstationBindingManager()

// 设置全局回调函数
if (typeof window !== 'undefined') {
  window.onWorkstationBinding = async (workstation, user) => {
    await workstationBindingManager.showBindingDialog(workstation, user)
  }

  // 保存游戏场景引用
  window.saveGameScene = (scene) => {
    window.gameScene = scene
  }

  // 导出全局实例
  window.workstationBindingManager = workstationBindingManager
}
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
   * 显示工位绑定弹窗
   */
  showBindingDialog(workstation, user) {
    console.log('showBindingDialog 被调用')
    console.log('工位信息:', workstation)
    console.log('用户信息:', user)
    
    this.currentWorkstation = workstation
    this.currentUser = user
    this.isProcessing = false
    
    // 直接调用React状态更新函数
    if (typeof window !== 'undefined' && window.setWorkstationBindingModal) {
      console.log('调用 setWorkstationBindingModal')
      window.setWorkstationBindingModal({
        isVisible: true,
        workstation,
        user
      })
    } else {
      console.log('setWorkstationBindingModal 函数不存在')
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
   * 在Phaser中执行绑定逻辑
   */
  async executeBindingInPhaser() {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !window.gameScene) {
        resolve({ success: false, error: '游戏场景不可用' })
        return
      }

      const scene = window.gameScene
      if (!scene.workstationManager) {
        resolve({ success: false, error: '工位管理器不可用' })
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
  window.onWorkstationBinding = (workstation, user) => {
    workstationBindingManager.showBindingDialog(workstation, user)
  }

  // 保存游戏场景引用
  window.saveGameScene = (scene) => {
    window.gameScene = scene
  }
  
  // 导出全局实例
  window.workstationBindingManager = workstationBindingManager
}
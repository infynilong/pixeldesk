'use client'

import { useEffect, useRef } from 'react'
import Phaser from 'phaser'

// 导入 Phaser 场景
import { Start } from '../PixelDesk/src/scenes/Start.js'

interface PhaserGameProps {
  onPlayerCollision: (playerData: any) => void
  onWorkstationBinding: (workstationData: any, userData: any) => void
  onPlayerClick: (playerData: any) => void
}

export default function PhaserGame({ onPlayerCollision, onWorkstationBinding, onPlayerClick }: PhaserGameProps) {
  const gameRef = useRef<Phaser.Game | null>(null)
  const gameContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (typeof window !== 'undefined' && !gameRef.current) {
      // 自定义 Phaser 配置 - 修复WebGL framebuffer错误，改为Canvas渲染器
      const config = {
        type: Phaser.CANVAS, // 修复: 从WEBGL改为CANVAS，避免framebuffer错误
        title: 'PixelDesk Social',
        description: '社交办公游戏',
        parent: gameContainerRef.current,
        width: 800,
        height: 600,
        backgroundColor: '#000000',
        pixelArt: true,
        scene: [
          Start
        ],
        scale: {
          mode: Phaser.Scale.RESIZE,
          autoCenter: Phaser.Scale.CENTER_BOTH,
          width: gameContainerRef.current?.clientWidth || 800,
          height: gameContainerRef.current?.clientHeight || 600
        },
        physics: {
          default: "arcade",
          arcade: {
            gravity: { x: 0, y: 0 },
            debug: false,
            // 优化物理引擎性能
            overlapBias: 4,
            tileBias: 16,
            forceX: false,
            skipQuadTree: false
          }
        },
        input: {
          keyboard: {
            target: null, // 不自动绑定到window，由场景控制
            capture: [] // 不预先捕获任何按键，避免与输入框冲突
          }
        },
        // Canvas渲染器优化配置（移除WebGL专用设置）
        render: {
          antialias: false, // 像素艺术不需要抗锯齿
          pixelArt: true,
          roundPixels: true
          // 移除WebGL专用配置：batchSize和maxTextures
        },
        // 设置低FPS限制以节省CPU - 测试20FPS的性能表现
        fps: {
          target: 20, // 调整到20FPS
          min: 15,
          forceSetTimeOut: true // 强制使用setTimeout而不是requestAnimationFrame，更节省CPU
        }
      }

      // 创建游戏实例
      gameRef.current = new Phaser.Game(config)

      // 设置canvas ID，供FocusManager识别
      setTimeout(() => {
        if (gameRef.current && gameRef.current.canvas) {
          gameRef.current.canvas.id = 'phaser-game'
          gameRef.current.canvas.setAttribute('tabindex', '0')
          console.log('🎮 Phaser canvas ID set to: phaser-game')
        }
      }, 100)

      // 设置全局回调函数，用于与 React 通信
      if (typeof window !== 'undefined') {
        (window as any).onPlayerCollision = (playerData: any) => {
          if (onPlayerCollision) {
            onPlayerCollision(playerData)
          }
        }

        // 设置工位绑定回调函数 - 使用全局workstationBindingManager
        (window as any).onWorkstationBinding = (workstationData: any, userData: any) => {
          console.log('PhaserGame onWorkstationBinding 被调用:', { workstationData, userData })

          // 确保workstationBindingManager已加载
          if (typeof window !== 'undefined' && (window as any).workstationBindingManager) {
            (window as any).workstationBindingManager.showBindingDialog(workstationData, userData)
          } else {
            console.error('workstationBindingManager 未加载')
            // 如果manager未加载，调用React handler作为备用
            if (onWorkstationBinding) {
              onWorkstationBinding(workstationData, userData)
            }
          }
        }

        // 设置玩家点击回调函数
        (window as any).onPlayerClick = (playerData: any) => {
          if (onPlayerClick) {
            onPlayerClick(playerData)
          }
        }
      }

      // 清理函数
      return () => {
        if (gameRef.current) {
          gameRef.current.destroy(true)
          gameRef.current = null
        }
      }
    }
  }, [onPlayerCollision, onWorkstationBinding, onPlayerClick])

  // 处理窗口大小变化 - 优化防抖
  useEffect(() => {
    let resizeTimeout: NodeJS.Timeout

    const handleResize = () => {
      if (gameRef.current && gameContainerRef.current) {
        const width = gameContainerRef.current.clientWidth
        const height = gameContainerRef.current.clientHeight
        gameRef.current.scale.resize(width, height)
      }
    }

    // 防抖版本resize处理器，避免频繁调用
    const debouncedHandleResize = () => {
      clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(handleResize, 300) // 300ms防抖
    }

    window.addEventListener('resize', debouncedHandleResize)
    return () => {
      window.removeEventListener('resize', debouncedHandleResize)
      clearTimeout(resizeTimeout)
    }
  }, [])

  return (
    <div
      ref={gameContainerRef}
      className="w-full h-full"
    />
  )
}
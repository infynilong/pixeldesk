'use client'

import { useEffect, useRef } from 'react'
import Phaser from 'phaser'

// 导入 Phaser 场景
import { Start } from '../PixelDesk/src/scenes/Start.js'
import { RegisterScene } from '../PixelDesk/src/scenes/RegisterScene.js'

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
      // 自定义 Phaser 配置
      const config = {
        type: Phaser.WEBGL,
        title: 'PixelDesk Social',
        description: '社交办公游戏',
        parent: gameContainerRef.current,
        width: 800,
        height: 600,
        backgroundColor: '#000000',
        pixelArt: true,
        scene: [
          RegisterScene,
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
            debug: false
          }
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

  // 处理窗口大小变化
  useEffect(() => {
    const handleResize = () => {
      if (gameRef.current && gameContainerRef.current) {
        const width = gameContainerRef.current.clientWidth
        const height = gameContainerRef.current.clientHeight
        gameRef.current.scale.resize(width, height)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div 
      ref={gameContainerRef}
      className="w-full h-full"
    />
  )
}
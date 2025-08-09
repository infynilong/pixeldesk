'use client'

import { useEffect, useRef } from 'react'
import Phaser from 'phaser'

// 导入 Phaser 场景
import { Start } from '../PixelDesk/src/scenes/Start.js'
import { TextUIScene } from '../PixelDesk/src/scenes/TextUIScene.js'
import { RegisterScene } from '../PixelDesk/src/scenes/RegisterScene.js'

export default function PhaserGame({ onPlayerCollision }) {
  const gameRef = useRef(null)
  const gameContainerRef = useRef(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // 自定义 Phaser 配置
      const config = {
        type: Phaser.CANVAS,
        title: 'PixelDesk Social',
        description: '社交办公游戏',
        parent: gameContainerRef.current,
        width: gameContainerRef.current?.clientWidth || 800,
        height: gameContainerRef.current?.clientHeight || 600,
        backgroundColor: '#000000',
        pixelArt: true,
        scene: [
          RegisterScene,
          Start,
          TextUIScene
        ],
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH
        },
        physics: {
          default: "arcade",
          arcade: {
            gravity: { y: 0 },
            debug: false
          }
        }
      }

      // 创建游戏实例
      gameRef.current = new Phaser.Game(config)

      // 设置全局回调函数，用于与 React 通信
      window.onPlayerCollision = (playerData) => {
        if (onPlayerCollision) {
          onPlayerCollision(playerData)
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
  }, [onPlayerCollision])

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
      style={{ position: 'relative' }}
    />
  )
}
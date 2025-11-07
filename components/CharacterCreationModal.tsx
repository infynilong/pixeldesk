'use client'

import { useState } from 'react'
import GameCompatibleInput from './GameCompatibleInput'

interface CharacterCreationModalProps {
  isOpen: boolean
  userName: string
  onComplete: (playerData: any) => void
  onSkip?: () => void
}

// 可选的角色精灵列表
const characterSprites = [
  'hangli',
  'Premade_Character_48x48_01', 'Premade_Character_48x48_02', 'Premade_Character_48x48_03',
  'Premade_Character_48x48_04', 'Premade_Character_48x48_05', 'Premade_Character_48x48_06',
  'Premade_Character_48x48_07', 'Premade_Character_48x48_08', 'Premade_Character_48x48_09',
  'Premade_Character_48x48_10', 'Premade_Character_48x48_11', 'Premade_Character_48x48_12',
  'Premade_Character_48x48_13', 'Premade_Character_48x48_14', 'Premade_Character_48x48_15',
  'Premade_Character_48x48_16', 'Premade_Character_48x48_17', 'Premade_Character_48x48_18',
  'Premade_Character_48x48_19', 'Premade_Character_48x48_20'
]

export default function CharacterCreationModal({ isOpen, userName, onComplete, onSkip }: CharacterCreationModalProps) {
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleCreateCharacter = async () => {
    if (!selectedCharacter) {
      setError('请选择一个角色形象')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/player', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          playerName: userName,
          characterSprite: selectedCharacter
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        onComplete(data.data)
      } else {
        setError(data.error || '创建角色失败，请重试')
      }
    } catch (err) {
      console.error('Character creation error:', err)
      setError('网络错误，请重试')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center z-50 p-4">
      {/* 背景装饰 */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(0,0,0,0.8)_100%)]"></div>
      
      <div className="relative bg-gradient-to-br from-retro-bg-darker via-gray-900 to-retro-bg-darker border-2 border-retro-purple/30 rounded-xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* 顶部装饰线 */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-20 h-1 bg-gradient-to-r from-retro-purple to-retro-pink"></div>
        
        {/* 标题区域 */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-r from-retro-purple to-retro-pink rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🎮</span>
          </div>
          <h2 className="text-white text-2xl font-bold mb-2">创建你的游戏角色</h2>
          <p className="text-retro-textMuted text-sm">你的角色名称将是：<span className="text-retro-purple font-semibold">{userName}</span><br/>请选择你的角色外观</p>
        </div>

        <div className="space-y-6">
          {/* 角色选择区域 */}
          <div className="space-y-4">
            <label className="block text-white text-sm font-medium">选择角色形象</label>
            
            {/* 角色选择网格 */}
            <div className="grid grid-cols-5 gap-3 p-4 bg-gradient-to-br from-retro-bg-dark/50 to-retro-bg-darker/50 rounded-xl border border-retro-border/30">
              {characterSprites.map((sprite, index) => (
                <div
                  key={sprite}
                  onClick={() => setSelectedCharacter(sprite)}
                  className={`
                    relative aspect-square rounded-lg border-2 cursor-pointer  overflow-hidden
                    ${selectedCharacter === sprite 
                      ? 'border-retro-purple bg-retro-purple/20 shadow-lg shadow-retro-purple/30' 
                      : 'border-retro-border/50 bg-retro-bg-dark/30 hover:border-retro-purple/50 hover:bg-retro-purple/10'
                    }
                  `}
                >
                  {/* 角色精灵图片预览区域 */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div 
                      className="w-12 h-12 bg-center bg-no-repeat bg-contain"
                      style={{
                        backgroundImage: `url(/assets/characters/${sprite}.png)`,
                        imageRendering: 'pixelated'
                      }}
                    />
                  </div>
                  
                  {/* 选中指示器 */}
                  {selectedCharacter === sprite && (
                    <div className="absolute top-1 right-1 w-4 h-4 bg-retro-purple rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </div>
                  )}
                  
                  {/* 角色编号 */}
                  <div className="absolute bottom-1 left-1 text-xs text-retro-textMuted bg-black/50 px-1 rounded">
                    {String(index + 1).padStart(2, '0')}
                  </div>
                </div>
              ))}
            </div>

            {/* 选中角色显示 */}
            {selectedCharacter && (
              <div className="text-center p-3 bg-gradient-to-r from-retro-purple/10 to-retro-pink/10 rounded-lg border border-retro-purple/20">
                <p className="text-retro-textMuted text-sm">
                  已选择角色: <span className="text-white font-medium">{selectedCharacter}</span>
                </p>
              </div>
            )}
          </div>

          {/* 错误显示 */}
          {error && (
            <div className="text-red-400 text-sm flex items-center space-x-2 p-3 bg-red-900/20 rounded-lg border border-red-500/30">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* 按钮区域 */}
          <div className="flex items-center justify-between space-x-4 pt-4 border-t border-retro-border/30">
            {onSkip && (
              <button
                type="button"
                onClick={onSkip}
                disabled={isLoading}
                className="text-retro-textMuted hover:text-white text-sm  disabled:opacity-50"
              >
                跳过 (稍后创建)
              </button>
            )}
            
            <div className="flex-1"></div>
            
            <button
              type="button"
              onClick={handleCreateCharacter}
              disabled={isLoading || !userName.trim() || !selectedCharacter}
              className="bg-gradient-to-r from-retro-purple to-retro-pink hover:from-retro-purple/90 hover:to-retro-pink/90 text-white font-bold py-3 px-8 rounded-lg  disabled:opacity-50 shadow-lg hover:shadow-purple-500/25  disabled:scale-100"
            >
              {isLoading ? (
                <span className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full "></div>
                  <span>创建中...</span>
                </span>
              ) : (
                <span className="flex items-center space-x-2">
                  <span>🚀</span>
                  <span>开始游戏</span>
                </span>
              )}
            </button>
          </div>
        </div>

        {/* 底部提示 */}
        <div className="mt-6 pt-4 border-t border-retro-border/30">
          <p className="text-retro-textMuted text-xs text-center">
            💡 提示：创建角色后，你可以在游戏中获得积分和金币，完成各种有趣的任务
          </p>
        </div>
      </div>
    </div>
  )
}
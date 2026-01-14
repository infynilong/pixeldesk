'use client'

import { useState, useEffect } from 'react'
import GameCompatibleInput from './GameCompatibleInput'
import { useTranslation } from '@/lib/hooks/useTranslation'
import { getAvailableCharacters, type Character } from '@/lib/services/characterService'

interface CharacterCreationModalProps {
  isOpen: boolean
  userName: string
  onComplete: (playerData: any) => void
}

export default function CharacterCreationModal({ isOpen, userName, onComplete }: CharacterCreationModalProps) {
  const [characters, setCharacters] = useState<Character[]>([])
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingCharacters, setIsLoadingCharacters] = useState(true)
  const [error, setError] = useState('')
  const { t } = useTranslation()

  // 加载角色列表
  useEffect(() => {
    if (isOpen) {
      loadCharacters()
    }
  }, [isOpen])

  const loadCharacters = async () => {
    setIsLoadingCharacters(true)
    try {
      const response = await getAvailableCharacters({ pageSize: 1000 })
      setCharacters(response.data)
    } catch (error) {
      console.error('Failed to load characters:', error)
      setError(t.character.err_load)
    } finally {
      setIsLoadingCharacters(false)
    }
  }

  if (!isOpen) return null

  const handleCreateCharacter = async () => {
    if (!selectedCharacter) {
      setError(t.character.err_select)
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
        setError(data.error || t.character.err_create)
      }
    } catch (err) {
      console.error('Character creation error:', err)
      setError(t.auth.network_error)
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
          <h2 className="text-white text-2xl font-bold mb-2">{t.character.create_title}</h2>
          <p className="text-retro-textMuted text-sm">{t.character.name_hint}<span className="text-retro-purple font-semibold">{userName}</span><br />{t.character.create_subtitle}</p>
        </div>

        <div className="space-y-6">
          {/* 角色选择区域 */}
          <div className="space-y-4">
            <label className="block text-white text-sm font-medium">{t.character.select_title}</label>

            {/* 角色选择网格 */}
            <div className="grid grid-cols-5 gap-3 p-4 bg-gradient-to-br from-retro-bg-dark/50 to-retro-bg-darker/50 rounded-xl border border-retro-border/30">
              {isLoadingCharacters ? (
                <div className="col-span-5 text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-retro-purple mx-auto"></div>
                  <p className="text-retro-textMuted text-sm mt-2">{t.common.loading}</p>
                </div>
              ) : characters.length === 0 ? (
                <div className="col-span-5 text-center py-8 text-retro-textMuted">
                  {t.character.no_characters}
                </div>
              ) : (
                characters.map((character) => (
                  <div
                    key={character.id}
                    onClick={() => setSelectedCharacter(character.name)}
                    className={`
                      relative aspect-square rounded-xl border-2 cursor-pointer transition-all duration-300 group
                      ${selectedCharacter === character.name
                        ? 'border-retro-purple bg-retro-purple/30 shadow-[0_0_20px_rgba(168,85,247,0.4)] scale-105 z-10'
                        : 'border-retro-border/30 bg-gray-800/40 hover:border-retro-purple/50 hover:bg-retro-purple/10 hover:scale-102'
                      }
                    `}
                  >
                    {/* 选中时的对勾效果 */}
                    {selectedCharacter === character.name && (
                      <div className="absolute -top-2 -right-2 w-7 h-7 bg-retro-purple rounded-full flex items-center justify-center border-2 border-white shadow-lg z-20 animate-bounce-subtle">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}

                    <div className="absolute inset-0 flex items-center justify-center p-2">
                      <img
                        src={character.imageUrl}
                        alt={character.displayName}
                        className={`w-full h-full object-contain pixelated transition-transform ${selectedCharacter === character.name ? 'scale-110' : 'group-hover:scale-110'}`}
                        style={{
                          imageRendering: 'pixelated'
                        }}
                      />
                    </div>

                    {/* 显示名称提示 */}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs py-1 px-2 text-center truncate">
                      {character.displayName}
                    </div>

                    {/* 价格标签 */}
                    {character.price > 0 && (
                      <div className="absolute top-1 right-1 bg-yellow-500 text-black text-xs px-1 rounded">
                        {character.price}
                      </div>
                    )}

                    {/* 默认标签 */}
                    {character.isDefault && (
                      <div className="absolute top-1 left-1 bg-green-500 text-white text-xs px-1 rounded">
                        {t.character.recommended}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 错误信息 */}
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={handleCreateCharacter}
              disabled={!selectedCharacter || isLoading}
              className="flex-1 py-3 bg-gradient-to-r from-retro-purple to-retro-pink text-white font-semibold rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
            >
              {isLoading ? t.character.creating : t.character.confirm_create}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

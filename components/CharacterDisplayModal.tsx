'use client'

import React, { useState, useEffect } from 'react'

interface CharacterDisplayProps {
  userId: string
  userInfo: {
    name?: string
    character?: string
    avatar?: string
    status?: string
    points?: number
  }
  position?: { x: number; y: number }
  onClose: () => void
}

export default function CharacterDisplayModal({ 
  userId, 
  userInfo, 
  position, 
  onClose 
}: CharacterDisplayProps) {
  const [characterImage, setCharacterImage] = useState<string>('/assets/characters/Premade_Character_48x48_01.png')
  const [activeTab, setActiveTab] = useState<'info' | 'chat' | 'history'>('info')
  const [message, setMessage] = useState('')
  const [chatHistory, setChatHistory] = useState([
    { id: 1, sender: 'system', message: '你开始与玩家对话', timestamp: new Date().toISOString() }
  ])
  
  useEffect(() => {
    // 设置角色图片
    if (userInfo.character || userInfo.avatar) {
      const characterKey = userInfo.character || userInfo.avatar
      setCharacterImage(`/assets/characters/${characterKey}.png`)
    }
  }, [userInfo.character, userInfo.avatar])

  const getCharacterName = () => {
    return userInfo.name || `玩家${userId.slice(-4)}`
  }

  const handleSendMessage = () => {
    if (message.trim()) {
      const newMessage = {
        id: chatHistory.length + 1,
        sender: 'me',
        message: message.trim(),
        timestamp: new Date().toISOString()
      }
      setChatHistory([...chatHistory, newMessage])
      setMessage('')
    }
  }

  const handleInteraction = (type: string) => {
    const interactionMessages = {
      greet: '👋 你好！很高兴见到你！',
      like: '👍 给你点个赞！',
      follow: '➕ 关注了你！'
    }
    
    const newMessage = {
      id: chatHistory.length + 1,
      sender: 'system',
      message: interactionMessages[type as keyof typeof interactionMessages],
      timestamp: new Date().toISOString()
    }
    setChatHistory([...chatHistory, newMessage])
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      {/* 透明背景 */}
      <div className="absolute inset-0" onClick={onClose}></div>
      
      {/* 模态框内容 */}
      <div className="relative bg-gradient-to-br from-purple-900/95 to-blue-900/95 backdrop-blur-lg border border-white/20 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
        {/* 关闭按钮 */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
        >
          ✕
        </button>
        
        {/* 选项卡导航 */}
        <div className="flex space-x-2 mb-6 border-b border-white/20 pb-2">
          <button 
            onClick={() => setActiveTab('info')}
            className={`px-3 py-1 rounded-lg text-sm transition-all ${
              activeTab === 'info' 
                ? 'bg-white/20 text-white' 
                : 'text-white/60 hover:text-white'
            }`}
          >
            信息
          </button>
          <button 
            onClick={() => setActiveTab('chat')}
            className={`px-3 py-1 rounded-lg text-sm transition-all ${
              activeTab === 'chat' 
                ? 'bg-white/20 text-white' 
                : 'text-white/60 hover:text-white'
            }`}
          >
            聊天
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1 rounded-lg text-sm transition-all ${
              activeTab === 'history' 
                ? 'bg-white/20 text-white' 
                : 'text-white/60 hover:text-white'
            }`}
          >
            历史
          </button>
        </div>

        {activeTab === 'info' && (
          <div className="space-y-4">
            {/* 角色头像和信息 */}
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 border-2 border-white/30 rounded-lg overflow-hidden">
                <img 
                  src={characterImage}
                  alt={getCharacterName()}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.src = '/assets/characters/Premade_Character_48x48_01.png'
                  }}
                />
              </div>
              <div>
                <h4 className="text-white text-lg font-semibold">{getCharacterName()}</h4>
                <p className="text-white/60 text-sm">ID: {userId}</p>
                {userInfo.points && (
                  <p className="text-yellow-400 text-sm">💰 {userInfo.points} 积分</p>
                )}
              </div>
            </div>

            {/* 状态信息 */}
            {userInfo.status && (
              <div className="bg-white/10 rounded-lg p-3">
                <p className="text-white text-sm">📝 {userInfo.status}</p>
              </div>
            )}

            {/* 快速互动按钮 */}
            <div className="flex space-x-2">
              <button 
                onClick={() => handleInteraction('greet')}
                className="flex-1 bg-blue-500/20 hover:bg-blue-500/30 text-white py-2 px-3 rounded-lg transition-all text-sm"
              >
                👋 打招呼
              </button>
              <button 
                onClick={() => handleInteraction('like')}
                className="flex-1 bg-green-500/20 hover:bg-green-500/30 text-white py-2 px-3 rounded-lg transition-all text-sm"
              >
                👍 点赞
              </button>
              <button 
                onClick={() => handleInteraction('follow')}
                className="flex-1 bg-purple-500/20 hover:bg-purple-500/30 text-white py-2 px-3 rounded-lg transition-all text-sm"
              >
                ➕ 关注
              </button>
            </div>

            {position && (
              <div className="text-white/50 text-xs">
                位置: ({position.x}, {position.y})
              </div>
            )}
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="space-y-3">
            {/* 聊天记录 */}
            <div className="h-48 overflow-y-auto space-y-2">
              {chatHistory.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs px-3 py-2 rounded-lg ${
                    msg.sender === 'me' 
                      ? 'bg-blue-500/20 text-white' 
                      : msg.sender === 'system'
                      ? 'bg-gray-500/20 text-white/70'
                      : 'bg-white/10 text-white'
                  }`}>
                    <p className="text-sm">{msg.message}</p>
                    <p className="text-xs opacity-50 mt-1">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* 消息输入 */}
            <div className="flex space-x-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="输入消息..."
                className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:border-white/40"
              />
              <button 
                onClick={handleSendMessage}
                className="bg-blue-500/30 hover:bg-blue-500/40 text-white px-4 py-2 rounded-lg transition-all"
                disabled={!message.trim()}
              >
                发送
              </button>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-3">
            <h5 className="text-white text-sm font-medium">互动历史</h5>
            <div className="h-48 overflow-y-auto space-y-2">
              {chatHistory.map((msg) => (
                <div key={msg.id} className="bg-white/5 rounded-lg p-3">
                  <p className="text-white text-sm">{msg.message}</p>
                  <p className="text-white/50 text-xs mt-1">
                    {new Date(msg.timestamp).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
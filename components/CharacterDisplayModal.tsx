'use client'

import React, { useState, useEffect } from 'react'

interface CharacterDisplayProps {
  userId: string
  userInfo: {
    name?: string
    username?: string
    character?: string
    avatar?: string
    status?: string
    points?: number
    currentStatus?: {
      type?: string
      status?: string
      emoji?: string
      message?: string
      timestamp?: string
    }
    statusHistory?: Array<{
      type: string
      status: string
      emoji: string
      message: string
      timestamp: string
    }>
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
  const [realStatusHistory, setRealStatusHistory] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [userInfoState, setUserInfoState] = useState(userInfo)
  
  useEffect(() => {
    // 设置角色图片
    if (userInfoState.character || userInfoState.avatar) {
      const characterKey = userInfoState.character || userInfoState.avatar
      setCharacterImage(`/assets/characters/${characterKey}.png`)
    }
  }, [userInfoState.character, userInfoState.avatar])

  useEffect(() => {
    // 当用户ID变化时，从数据库获取真实的状态数据
    if (userId) {
      fetchRealStatusData()
    }
  }, [userId])

  const fetchRealStatusData = async () => {
    console.log('🚫 [CharacterDisplayModal] API调用已临时禁用以修复性能问题')
    setIsLoading(true)
    try {
      // 只获取用户信息，禁用状态历史API调用以修复性能问题
      const userResponse = await fetch(`/api/users?userId=${userId}`)

      if (userResponse.ok) {
        const userData = await userResponse.json()
        if (userData.success && userData.data) {
          // 更新userInfo
          setUserInfoState(prev => ({
            ...prev,
            ...userData.data
          }))
        }
      }

      // 禁用状态历史API调用，使用空数组作为默认值
      console.log('🚫 [CharacterDisplayModal] 状态历史API调用已禁用，使用空数据')
      setRealStatusHistory([])
      
      // 不设置当前状态，使用传入的userInfo中的状态信息
    } catch (error) {
      console.error('获取用户数据时出错:', error)
    } finally {
      setIsLoading(false)
    }
  }


  const getCharacterName = () => {
    return userInfoState.name || userInfoState.username || `玩家${userId.slice(-4)}`
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
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
      {/* 现代像素风格背景 */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-retro-bg-dark/80 to-black/60 backdrop-blur-md animate-fade-in" onClick={onClose}></div>
      
      {/* 模态框内容 - 现代像素艺术设计 */}
      <div className="relative bg-gradient-to-br from-retro-bg-darker/95 via-retro-bg-dark/90 to-retro-bg-darker/95 backdrop-blur-xl border-2 border-retro-border rounded-2xl p-8 max-w-lg w-full shadow-2xl shadow-retro-purple/20 animate-slide-in-up">
        {/* 装饰性光效 */}
        <div className="absolute inset-0 bg-gradient-to-br from-retro-purple/5 via-retro-blue/8 to-retro-pink/5 rounded-2xl animate-pulse"></div>
        <div className="absolute inset-0 border border-retro-purple/20 rounded-2xl animate-pulse"></div>
        
        {/* 关闭按钮 - 像素化设计 */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 bg-gradient-to-br from-retro-red/20 to-retro-orange/20 hover:from-retro-red/30 hover:to-retro-orange/30 text-white/80 hover:text-white rounded-lg border-2 border-retro-red/30 hover:border-retro-red/50 transition-all duration-200 flex items-center justify-center shadow-lg group"
        >
          <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg"></div>
          <span className="relative font-bold">✕</span>
        </button>
        
        {/* 选项卡导航 - 现代像素风格 */}
        <div className="relative flex space-x-3 mb-8 pb-4 border-b-2 border-retro-border/50">
          {['info', 'chat', 'history'].map((tab) => {
            const isActive = activeTab === tab
            const tabLabels = { info: 'INFO', chat: 'CHAT', history: 'HISTORY' }
            const tabIcons = { info: '👤', chat: '💬', history: '📊' }
            
            return (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab as 'info' | 'chat' | 'history')}
                className={`group relative overflow-hidden flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all duration-300 ${
                  isActive
                    ? 'bg-gradient-to-r from-retro-purple/30 to-retro-blue/30 text-white border-retro-purple/50 shadow-lg shadow-retro-purple/20' 
                    : 'text-retro-textMuted hover:text-white border-retro-border hover:border-retro-blue/30 hover:bg-gradient-to-r hover:from-retro-blue/10 hover:to-retro-cyan/10'
                } ${isActive ? '' : 'hover:scale-105'}`}
              >
                {/* 激活状态光效 */}
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-white/5 rounded-xl animate-pulse"></div>
                )}
                
                {/* 选项卡内容 */}
                <div className="relative flex items-center gap-2">
                  <div className={`w-5 h-5 ${isActive ? 'bg-white/20' : 'bg-retro-textMuted/20'} rounded flex items-center justify-center transition-all duration-200`}>
                    <span className="text-xs">{tabIcons[tab as keyof typeof tabIcons]}</span>
                  </div>
                  <span className={`text-sm font-bold tracking-wide ${isActive ? 'font-pixel' : 'font-retro'}`}>
                    {tabLabels[tab as keyof typeof tabLabels]}
                  </span>
                </div>
                
                {/* 激活指示器 */}
                {isActive && (
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-retro-purple rounded-full animate-ping"></div>
                )}
              </button>
            )
          })}
        </div>

        {activeTab === 'info' && (
          <div className="relative space-y-6">
            {/* 背景装饰 */}
            <div className="absolute inset-0 bg-gradient-to-br from-retro-blue/3 via-retro-purple/5 to-retro-pink/3 rounded-xl opacity-60 pointer-events-none"></div>
            
            {/* 角色头像和信息 - 现代像素艺术卡片 */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-retro-purple/10 to-retro-blue/10 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 animate-pulse"></div>
              <div className="relative bg-gradient-to-br from-retro-bg-dark/50 to-retro-bg-darker/50 backdrop-blur-sm border-2 border-retro-border/50 rounded-xl p-5 shadow-lg hover:border-retro-purple/40 transition-all duration-300">
                <div className="flex items-center space-x-5">
                  {/* 像素化头像容器 */}
                  <div className="relative">
                    <div className="w-20 h-20 bg-gradient-to-br from-retro-purple/20 to-retro-blue/20 border-2 border-retro-border rounded-xl overflow-hidden shadow-xl group-hover:shadow-retro-purple/30 transition-all duration-300">
                      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-white/5 rounded-xl"></div>
                      <img 
                        src={characterImage}
                        alt={getCharacterName()}
                        className="relative w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.src = '/assets/characters/Premade_Character_48x48_01.png'
                        }}
                      />
                    </div>
                    {/* 在线状态指示器 */}
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-to-br from-retro-green to-retro-cyan rounded-full border-2 border-retro-bg-darker shadow-lg">
                      <div className="w-full h-full bg-retro-green rounded-full animate-ping opacity-60"></div>
                    </div>
                  </div>
                  
                  {/* 用户信息区域 */}
                  <div className="flex-1 space-y-2">
                    <h4 className="text-white text-xl font-bold font-pixel tracking-wide drop-shadow-sm">
                      {getCharacterName()}
                    </h4>
                    <div className="flex items-center gap-3">
                      <div className="px-2 py-1 bg-gradient-to-r from-retro-cyan/20 to-retro-blue/20 rounded border border-retro-cyan/30">
                        <span className="text-retro-cyan text-xs font-bold font-pixel tracking-wide">
                          ID: {userId.slice(-6).toUpperCase()}
                        </span>
                      </div>
                      {userInfoState.points && (
                        <div className="flex items-center gap-2 px-2 py-1 bg-gradient-to-r from-retro-yellow/20 to-retro-orange/20 rounded border border-retro-yellow/30">
                          <span className="text-sm animate-bounce">💎</span>
                          <span className="text-retro-yellow text-xs font-bold font-pixel">
                            {userInfoState.points}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 当前状态信息 - 像素艺术状态卡片 */}
            {userInfoState.currentStatus ? (
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-retro-green/5 to-retro-blue/5 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
                <div className="relative bg-gradient-to-br from-retro-green/15 via-retro-blue/20 to-retro-cyan/15 backdrop-blur-sm border-2 border-retro-green/30 rounded-xl p-4 shadow-lg hover:border-retro-green/50 transition-all duration-300">
                  <div className="flex items-start space-x-4">
                    {/* 状态图标 */}
                    <div className="w-12 h-12 bg-gradient-to-br from-retro-green/30 to-retro-cyan/30 rounded-lg flex items-center justify-center shadow-lg border border-white/20">
                      <span className="text-2xl drop-shadow-lg">{userInfoState.currentStatus.emoji || '💼'}</span>
                    </div>
                    
                    {/* 状态详情 */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-white text-base font-bold font-pixel tracking-wide drop-shadow-sm">
                          {userInfoState.currentStatus.status || '当前状态'}
                        </span>
                        <div className="w-2 h-2 bg-retro-green rounded-full animate-pulse"></div>
                      </div>
                      <p className="text-retro-text text-sm font-retro leading-relaxed">
                        {userInfoState.currentStatus.message || '正在工作中...'}
                      </p>
                      {userInfoState.currentStatus.timestamp && (
                        <div className="flex items-center gap-2 pt-1">
                          <div className="w-1 h-1 bg-retro-textMuted rounded-full"></div>
                          <span className="text-retro-textMuted text-xs font-retro tracking-wide">
                            {new Date(userInfoState.currentStatus.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-retro-textMuted/5 to-retro-border/5 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
                <div className="relative bg-gradient-to-br from-retro-textMuted/10 to-retro-border/15 backdrop-blur-sm border-2 border-retro-textMuted/20 rounded-xl p-4 shadow-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-retro-textMuted/20 to-retro-border/20 rounded-lg flex items-center justify-center shadow-lg border border-white/10">
                      <span className="text-2xl">🤔</span>
                    </div>
                    <div className="space-y-2">
                      <p className="text-white text-base font-bold font-pixel tracking-wide">暂无状态</p>
                      <p className="text-retro-textMuted text-sm font-retro">该用户还没有发布过状态</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 快速互动按钮 - 像素艺术按钮组 */}
            <div className="grid grid-cols-3 gap-3">
              <button 
                onClick={() => handleInteraction('greet')}
                className="group relative overflow-hidden bg-gradient-to-br from-retro-blue/20 to-retro-cyan/20 hover:from-retro-blue/30 hover:to-retro-cyan/30 text-white py-3 px-4 rounded-xl border-2 border-retro-blue/30 hover:border-retro-blue/50 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 backdrop-blur-sm"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative flex flex-col items-center gap-2">
                  <div className="w-6 h-6 bg-white/20 rounded flex items-center justify-center">
                    <span className="text-sm">👋</span>
                  </div>
                  <span className="text-xs font-bold font-pixel tracking-wide">GREET</span>
                </div>
              </button>
              
              <button 
                onClick={() => handleInteraction('like')}
                className="group relative overflow-hidden bg-gradient-to-br from-retro-green/20 to-retro-cyan/20 hover:from-retro-green/30 hover:to-retro-cyan/30 text-white py-3 px-4 rounded-xl border-2 border-retro-green/30 hover:border-retro-green/50 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 backdrop-blur-sm"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative flex flex-col items-center gap-2">
                  <div className="w-6 h-6 bg-white/20 rounded flex items-center justify-center">
                    <span className="text-sm">👍</span>
                  </div>
                  <span className="text-xs font-bold font-pixel tracking-wide">LIKE</span>
                </div>
              </button>
              
              <button 
                onClick={() => handleInteraction('follow')}
                className="group relative overflow-hidden bg-gradient-to-br from-retro-purple/20 to-retro-pink/20 hover:from-retro-purple/30 hover:to-retro-pink/30 text-white py-3 px-4 rounded-xl border-2 border-retro-purple/30 hover:border-retro-purple/50 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 backdrop-blur-sm"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative flex flex-col items-center gap-2">
                  <div className="w-6 h-6 bg-white/20 rounded flex items-center justify-center">
                    <span className="text-sm">➕</span>
                  </div>
                  <span className="text-xs font-bold font-pixel tracking-wide">FOLLOW</span>
                </div>
              </button>
            </div>

            {/* 位置信息 - 像素化信息条 */}
            {position && (
              <div className="relative">
                <div className="bg-gradient-to-r from-retro-bg-dark/40 to-retro-bg-darker/40 backdrop-blur-sm border border-retro-border/30 rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 bg-gradient-to-br from-retro-cyan/30 to-retro-blue/30 rounded flex items-center justify-center">
                      <span className="text-xs">📍</span>
                    </div>
                    <span className="text-retro-textMuted text-xs font-retro tracking-wide">
                      POSITION: ({position.x}, {position.y})
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="relative space-y-5">
            {/* 背景装饰 */}
            <div className="absolute inset-0 bg-gradient-to-br from-retro-cyan/3 via-retro-blue/5 to-retro-purple/3 rounded-xl opacity-60 pointer-events-none"></div>
            
            {/* 聊天记录区域 - 像素化聊天界面 */}
            <div className="relative">
              {/* 聊天区域标题 */}
              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-retro-border/30">
                <div className="w-6 h-6 bg-gradient-to-br from-retro-cyan to-retro-blue rounded-lg flex items-center justify-center shadow-lg">
                  <span className="text-sm">💬</span>
                </div>
                <h4 className="text-white font-bold text-base font-pixel tracking-wide">CHAT LOG</h4>
                <div className="flex items-center gap-2 ml-auto">
                  <div className="w-2 h-2 bg-retro-green rounded-full animate-pulse"></div>
                  <span className="text-xs text-retro-textMuted font-retro">ACTIVE</span>
                </div>
              </div>
              
              {/* 聊天消息列表 */}
              <div className="h-56 overflow-y-auto space-y-3 pr-2 scrollbar-hide">
                {chatHistory.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                    <div className={`group relative max-w-xs ${
                      msg.sender === 'me' 
                        ? 'bg-gradient-to-br from-retro-blue/30 to-retro-cyan/30 border-retro-blue/40' 
                        : msg.sender === 'system'
                        ? 'bg-gradient-to-br from-retro-textMuted/20 to-retro-border/20 border-retro-textMuted/30'
                        : 'bg-gradient-to-br from-retro-purple/20 to-retro-pink/20 border-retro-purple/30'
                    } backdrop-blur-sm border-2 rounded-xl p-3 shadow-lg hover:shadow-xl transition-all duration-300`}>
                      {/* 消息气泡装饰 */}
                      <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
                      
                      {/* 消息内容 */}
                      <div className="relative space-y-2">
                        <p className="text-white text-sm font-retro leading-relaxed">{msg.message}</p>
                        <div className="flex items-center gap-2">
                          <div className="w-1 h-1 bg-white/40 rounded-full"></div>
                          <span className="text-xs text-white/60 font-retro tracking-wide">
                            {new Date(msg.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                      
                      {/* 发送者标识 */}
                      {msg.sender !== 'system' && (
                        <div className={`absolute -top-2 ${msg.sender === 'me' ? 'right-3' : 'left-3'} px-2 py-1 ${
                          msg.sender === 'me' 
                            ? 'bg-gradient-to-r from-retro-blue to-retro-cyan' 
                            : 'bg-gradient-to-r from-retro-purple to-retro-pink'
                        } rounded-full border border-white/20 shadow-lg`}>
                          <span className="text-xs font-bold font-pixel text-white">
                            {msg.sender === 'me' ? 'YOU' : 'THEM'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 消息输入区域 - 像素化输入界面 */}
            <div className="relative">
              {/* 输入区域标题 */}
              <div className="flex items-center gap-2 mb-3">
                <div className="w-5 h-5 bg-gradient-to-br from-retro-green/30 to-retro-cyan/30 rounded flex items-center justify-center">
                  <span className="text-xs">✍️</span>
                </div>
                <span className="text-xs text-retro-textMuted font-pixel tracking-wide">MESSAGE INPUT</span>
              </div>
              
              {/* 输入框和发送按钮 */}
              <div className="flex gap-3">
                {/* 像素化输入框 */}
                <div className="flex-1 relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-retro-cyan/10 to-retro-blue/10 rounded-xl opacity-0 group-focus-within:opacity-100 transition-all duration-300 blur-sm"></div>
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === 'Enter') handleSendMessage();
                    }}
                    onKeyUp={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="Type your message..."
                    className="relative w-full bg-gradient-to-br from-retro-bg-dark/80 to-retro-bg-darker/80 border-2 border-retro-border focus:border-retro-cyan rounded-xl px-4 py-3 text-white placeholder-retro-textMuted focus:outline-none backdrop-blur-md transition-all duration-300 font-retro text-sm focus:shadow-lg focus:shadow-retro-cyan/20"
                  />
                  {/* 字符计数器 */}
                  <div className="absolute bottom-1 right-2 text-xs text-retro-textMuted/60 font-retro">
                    {message.length}/100
                  </div>
                </div>
                
                {/* 像素化发送按钮 */}
                <button 
                  onClick={handleSendMessage}
                  disabled={!message.trim()}
                  className="group relative overflow-hidden bg-gradient-to-br from-retro-green/30 to-retro-cyan/30 hover:from-retro-green/40 hover:to-retro-cyan/40 disabled:from-retro-textMuted/20 disabled:to-retro-border/20 text-white px-6 py-3 rounded-xl border-2 border-retro-green/40 hover:border-retro-green/60 disabled:border-retro-textMuted/20 transition-all duration-300 shadow-lg hover:shadow-xl disabled:shadow-none transform hover:scale-105 active:scale-95 disabled:scale-100 backdrop-blur-sm disabled:cursor-not-allowed"
                >
                  {/* 按钮光效 */}
                  <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-white/20 opacity-0 group-hover:opacity-100 group-disabled:opacity-0 transition-opacity duration-300"></div>
                  
                  {/* 按钮内容 */}
                  <div className="relative flex items-center gap-2">
                    <div className="w-5 h-5 bg-white/20 rounded flex items-center justify-center group-disabled:bg-retro-textMuted/20">
                      <span className="text-sm">{!message.trim() ? '📝' : '🚀'}</span>
                    </div>
                    <span className="font-pixel text-sm tracking-wide">
                      SEND
                    </span>
                  </div>
                </button>
              </div>
              
              {/* 输入提示 - 像素化帮助文本 */}
              <div className="flex items-center gap-2 mt-2">
                <div className="w-3 h-3 bg-retro-purple/30 rounded-sm"></div>
                <span className="text-xs text-retro-textMuted font-retro tracking-wide">
                  Press ENTER to send, ESC to close
                </span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="relative space-y-5">
            {/* 背景装饰 */}
            <div className="absolute inset-0 bg-gradient-to-br from-retro-orange/3 via-retro-yellow/5 to-retro-red/3 rounded-xl opacity-60 pointer-events-none"></div>
            
            {/* 历史区域标题 */}
            <div className="relative flex items-center justify-between pb-4 border-b border-retro-border/30">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-retro-orange to-retro-yellow rounded-lg flex items-center justify-center shadow-lg">
                  <span className="text-lg">📊</span>
                </div>
                <h4 className="text-white font-bold text-base font-pixel tracking-wide">STATUS TIMELINE</h4>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-retro-orange rounded-full animate-pulse"></div>
                <span className="text-xs text-retro-textMuted font-retro tracking-wide">
                  {realStatusHistory.length + (userInfoState.currentStatus ? 1 : 0)} RECORDS
                </span>
              </div>
            </div>
            
            {/* 状态历史列表 */}
            <div className="relative h-56 overflow-y-auto space-y-4 pr-2 scrollbar-hide">
              {/* 当前状态 - 置顶显示 */}
              {userInfoState.currentStatus && (
                <div className="group relative animate-fade-in">
                  <div className="absolute inset-0 bg-gradient-to-r from-retro-green/5 to-retro-cyan/5 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
                  <div className="relative bg-gradient-to-br from-retro-green/20 via-retro-cyan/25 to-retro-blue/20 backdrop-blur-sm border-2 border-retro-green/40 rounded-xl p-4 shadow-lg hover:shadow-xl transition-all duration-300">
                    {/* 当前状态标识 */}
                    <div className="absolute -top-2 left-4 px-3 py-1 bg-gradient-to-r from-retro-green to-retro-cyan rounded-full border border-white/20 shadow-lg">
                      <span className="text-xs font-bold font-pixel text-white">CURRENT</span>
                    </div>
                    
                    <div className="flex items-start space-x-4 pt-2">
                      {/* 状态图标 */}
                      <div className="w-12 h-12 bg-gradient-to-br from-retro-green/40 to-retro-cyan/40 rounded-lg flex items-center justify-center shadow-lg border border-white/20">
                        <span className="text-2xl drop-shadow-lg">{userInfoState.currentStatus.emoji || '💼'}</span>
                      </div>
                      
                      {/* 状态详情 */}
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-white text-base font-bold font-pixel tracking-wide drop-shadow-sm">
                            {userInfoState.currentStatus.status || '当前状态'}
                          </span>
                          <div className="w-2 h-2 bg-retro-green rounded-full animate-pulse"></div>
                        </div>
                        <p className="text-retro-text text-sm font-retro leading-relaxed pl-2 border-l-2 border-retro-green/40">
                          {userInfoState.currentStatus.message || '正在工作中...'}
                        </p>
                        {userInfoState.currentStatus.timestamp && (
                          <div className="flex items-center gap-2 pt-1">
                            <div className="w-1 h-1 bg-retro-textMuted rounded-full"></div>
                            <span className="text-retro-textMuted text-xs font-retro tracking-wide">
                              {new Date(userInfoState.currentStatus.timestamp).toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 加载状态 */}
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <div className="relative">
                    <div className="w-12 h-12 bg-gradient-to-br from-retro-purple/20 to-retro-pink/20 rounded-xl flex items-center justify-center border-2 border-retro-purple/30 animate-pulse">
                      <div className="w-6 h-6 border-2 border-retro-purple border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    <div className="absolute inset-0 border-2 border-retro-purple/20 rounded-xl animate-ping"></div>
                  </div>
                  <div className="text-center space-y-2">
                    <div className="text-white font-bold font-pixel text-sm tracking-wide">LOADING</div>
                    <div className="text-retro-textMuted text-xs font-retro">Fetching status history...</div>
                  </div>
                </div>
              ) : realStatusHistory.length > 0 ? (
                /* 历史状态记录 */
                realStatusHistory.map((status, index) => (
                  <div key={index} className="group relative animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
                    <div className="absolute inset-0 bg-gradient-to-r from-retro-purple/5 to-retro-pink/5 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
                    <div className="relative bg-gradient-to-br from-retro-bg-dark/60 to-retro-bg-darker/60 backdrop-blur-sm border-2 border-retro-border/50 rounded-xl p-4 shadow-lg hover:border-retro-purple/40 hover:shadow-xl transition-all duration-300">
                      <div className="flex items-start space-x-4">
                        {/* 历史状态图标 */}
                        <div className="w-10 h-10 bg-gradient-to-br from-retro-purple/30 to-retro-pink/30 rounded-lg flex items-center justify-center shadow-lg border border-white/10">
                          <span className="text-lg drop-shadow-lg">{status.emoji}</span>
                        </div>
                        
                        {/* 历史状态详情 */}
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-white text-sm font-bold font-pixel tracking-wide">
                              {status.status}
                            </span>
                            <div className="w-1 h-1 bg-retro-textMuted rounded-full"></div>
                          </div>
                          <p className="text-retro-text text-sm font-retro leading-relaxed pl-2 border-l-2 border-retro-purple/30">
                            {status.message}
                          </p>
                          <div className="flex items-center gap-2 pt-1">
                            <div className="w-1 h-1 bg-retro-textMuted rounded-full"></div>
                            <span className="text-retro-textMuted text-xs font-retro tracking-wide">
                              {new Date(status.timestamp).toLocaleString()}
                            </span>
                          </div>
                        </div>
                        
                        {/* 历史记录序号 */}
                        <div className="w-6 h-6 bg-gradient-to-br from-retro-textMuted/20 to-retro-border/20 rounded-full flex items-center justify-center border border-retro-textMuted/30">
                          <span className="text-xs font-bold font-pixel text-retro-textMuted">
                            {realStatusHistory.length - index}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                /* 空状态显示 */
                <div className="flex flex-col items-center justify-center py-12 space-y-6">
                  {/* 空状态图标 */}
                  <div className="relative">
                    <div className="w-20 h-20 bg-gradient-to-br from-retro-textMuted/20 via-retro-border/25 to-retro-textMuted/20 rounded-xl flex items-center justify-center border-2 border-retro-textMuted/30 shadow-xl">
                      <div className="absolute inset-1 bg-gradient-to-br from-white/5 to-white/2 rounded-lg"></div>
                      <span className="text-4xl opacity-60 relative z-10">📝</span>
                    </div>
                    {/* 装饰性脉冲环 */}
                    <div className="absolute inset-0 border-2 border-retro-textMuted/20 rounded-xl animate-ping"></div>
                  </div>
                  
                  {/* 空状态文本 */}
                  <div className="text-center space-y-3">
                    <h3 className="text-white font-bold text-base font-pixel tracking-wider drop-shadow-sm">
                      NO HISTORY YET
                    </h3>
                    <p className="text-retro-textMuted text-sm font-retro leading-relaxed max-w-xs">
                      This player hasn't shared any status updates yet. Check back later!
                    </p>
                  </div>
                  
                  {/* 装饰性元素 */}
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-retro-textMuted/40 rounded-sm animate-pulse"></div>
                    <div className="w-3 h-1 bg-retro-border/40 rounded-sm"></div>
                    <div className="w-2 h-2 bg-retro-textMuted/40 rounded-sm animate-pulse"></div>
                  </div>
                </div>
              )}
            </div>
            
            {/* 历史统计信息 - 像素化统计面板 */}
            {(realStatusHistory.length > 0 || userInfoState.currentStatus) && (
              <div className="relative pt-4 border-t border-retro-border/30">
                <div className="grid grid-cols-2 gap-4">
                  {/* 总记录数统计 */}
                  <div className="group relative bg-gradient-to-br from-retro-blue/15 to-retro-cyan/15 backdrop-blur-sm border-2 border-retro-blue/30 rounded-lg p-4 hover:border-retro-blue/50 transition-all duration-300 shadow-lg hover:shadow-xl">
                    <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg"></div>
                    <div className="relative text-center space-y-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-retro-blue/40 to-retro-cyan/40 rounded-lg flex items-center justify-center mx-auto shadow-lg">
                        <span className="text-sm">📈</span>
                      </div>
                      <div className="text-2xl font-bold text-white font-pixel drop-shadow-lg">
                        {realStatusHistory.length + (userInfoState.currentStatus ? 1 : 0)}
                      </div>
                      <div className="text-xs text-retro-textMuted font-retro tracking-wide">TOTAL UPDATES</div>
                    </div>
                  </div>
                  
                  {/* 最新活动时间 */}
                  <div className="group relative bg-gradient-to-br from-retro-purple/15 to-retro-pink/15 backdrop-blur-sm border-2 border-retro-purple/30 rounded-lg p-4 hover:border-retro-purple/50 transition-all duration-300 shadow-lg hover:shadow-xl">
                    <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg"></div>
                    <div className="relative text-center space-y-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-retro-purple/40 to-retro-pink/40 rounded-lg flex items-center justify-center mx-auto shadow-lg">
                        <span className="text-sm">⏰</span>
                      </div>
                      <div className="text-sm font-bold text-white font-pixel drop-shadow-lg leading-tight">
                        {userInfoState.currentStatus?.timestamp || realStatusHistory[0]?.timestamp 
                          ? new Date(userInfoState.currentStatus?.timestamp || realStatusHistory[0]?.timestamp).toLocaleDateString('zh-CN')
                          : 'N/A'
                        }
                      </div>
                      <div className="text-xs text-retro-textMuted font-retro tracking-wide">LAST ACTIVITY</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
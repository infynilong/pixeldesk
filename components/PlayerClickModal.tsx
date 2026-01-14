'use client'

import { useState, useCallback, memo, useRef, useEffect } from 'react'
import { useTranslation } from '@/lib/hooks/useTranslation'

interface PlayerClickModalProps {
  isVisible: boolean
  player: any
  onClose: () => void
}

interface WorkstationAd {
  workstationId: number
  adText: string | null
  adImage: string | null
  adUrl: string | null
  adUpdatedAt: string | null
}

const PlayerClickModal = memo(({
  isVisible,
  player,
  onClose
}: PlayerClickModalProps) => {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<'status' | 'interaction' | 'info'>('status')
  const inputRef = useRef<HTMLInputElement>(null)
  const [workstationAd, setWorkstationAd] = useState<WorkstationAd | null>(null)
  const [isLoadingAd, setIsLoadingAd] = useState(false)
  const [isSwapping, setIsSwapping] = useState(false)

  // 监听标签切换，自动聚焦输入框
  useEffect(() => {
    if (isVisible && activeTab === 'interaction') {
      setTimeout(() => inputRef.current?.focus(), 200)
    }
  }, [isVisible, activeTab])

  // 获取玩家的工位广告信息
  useEffect(() => {
    const fetchWorkstationAd = async () => {
      if (!isVisible || !player?.id) return

      setIsLoadingAd(true)
      try {
        // 1. 获取玩家绑定的工位信息
        const bindingResponse = await fetch(`/api/workstations/user-bindings?userId=${player.id}`)
        const bindingResult = await bindingResponse.json()

        if (bindingResult.success && bindingResult.data && bindingResult.data.length > 0) {
          // 获取第一个有效的工位绑定
          const binding = bindingResult.data[0]

          // 2. 获取该工位的广告信息
          const adResponse = await fetch(`/api/workstations/${binding.workstationId}/advertisement`)
          const adResult = await adResponse.json()

          if (adResult.success && adResult.data && (adResult.data.adText || adResult.data.adImage)) {
            setWorkstationAd({
              workstationId: binding.workstationId,
              adText: adResult.data.adText,
              adImage: adResult.data.adImage,
              adUrl: adResult.data.adUrl,
              adUpdatedAt: adResult.data.adUpdatedAt
            })
          } else {
            setWorkstationAd(null)
          }
        } else {
          setWorkstationAd(null)
        }
      } catch (error) {
        console.error('Failed to fetch workstation ad:', error)
        setWorkstationAd(null)
      } finally {
        setIsLoadingAd(false)
      }
    }

    fetchWorkstationAd()
  }, [isVisible, player?.id])

  // 处理关闭
  const handleClose = useCallback(() => {
    onClose()
  }, [onClose])

  const handleSwapPostcard = async () => {
    if (!player?.id) return
    setIsSwapping(true)
    try {
      const res = await fetch('/api/postcards/exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverId: player.id })
      })
      const data = await res.json()
      if (data.success) {
        alert(t.postcard.swap_request_sent)
      } else {
        alert(data.error)
      }
    } catch (error) {
      alert('Swap request failed')
    } finally {
      setIsSwapping(false)
    }
  }

  // 如果弹窗不可见或没有玩家数据，返回null
  if (!isVisible || !player) {
    return null
  }

  // 获取状态徽章样式
  const getStatusBadge = (type: string) => {
    const badges: Record<string, string> = {
      working: 'from-retro-blue to-retro-cyan',
      break: 'from-retro-green to-retro-blue',
      reading: 'from-retro-purple to-retro-pink',
      restroom: 'from-retro-yellow to-retro-orange',
      meeting: 'from-retro-red to-retro-pink',
      lunch: 'from-retro-orange to-retro-yellow'
    }
    return badges[type] || 'from-retro-textMuted to-retro-border'
  }

  // 获取状态图标
  const getStatusIcon = (type: string) => {
    const icons: Record<string, string> = {
      working: '💼',
      break: '☕',
      reading: '📚',
      restroom: '🚻',
      meeting: '👥',
      lunch: '🍽️'
    }
    return icons[type] || '👤'
  }

  // 模拟玩家历史状态
  const playerHistory = [
    {
      id: 1,
      type: 'working',
      status: '工作中',
      emoji: '💼',
      message: '正在处理一个重要的项目',
      timestamp: '2分钟前'
    },
    {
      id: 2,
      type: 'break',
      status: '休息时间',
      emoji: '☕',
      message: '刚喝完咖啡，准备继续加油',
      timestamp: '15分钟前'
    },
    {
      id: 3,
      type: 'reading',
      status: '正在看书',
      emoji: '📚',
      message: '在读《深度工作》，很有启发',
      timestamp: '1小时前'
    }
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 现代像素风格背景 */}
      <div
        className="absolute inset-0 bg-retro-bg-darker/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* 模态框容器 - 现代像素艺术设计 */}
      <div className="relative bg-retro-bg-darker border-2 border-retro-border rounded-2xl p-8 w-full max-w-lg shadow-2xl shadow-retro-purple/20 overflow-hidden">
        {/* 装饰性光效 */}
        <div className="absolute inset-0 bg-gradient-to-br from-retro-purple/5 via-retro-blue/8 to-retro-pink/5 rounded-2xl "></div>
        <div className="absolute inset-0 border border-retro-purple/20 rounded-2xl "></div>

        {/* 关闭按钮 - 像素化设计 */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 w-8 h-8 bg-gradient-to-br from-retro-red/20 to-retro-orange/20 hover:from-retro-red/30 hover:to-retro-orange/30 text-white/80 hover:text-white rounded-lg border-2 border-retro-red/30 hover:border-retro-red/50  flex items-center justify-center shadow-lg group z-10"
        >
          <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100  rounded-lg"></div>
          <span className="relative font-bold">✕</span>
        </button>

        {/* 玩家信息头部 - 现代像素艺术卡片 */}
        <div className="relative mb-8">
          {/* 背景装饰 */}
          <div className="absolute inset-0 bg-gradient-to-r from-retro-purple/10 to-retro-pink/10 rounded-xl opacity-60 pointer-events-none"></div>

          <div className="relative bg-gradient-to-br from-retro-bg-dark/50 to-retro-bg-darker/50 backdrop-blur-sm border-2 border-retro-border/50 rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-5 mb-4">
              {/* 像素化头像容器 */}
              <div className="relative">
                <div className="w-20 h-20 bg-gradient-to-br from-retro-purple via-retro-pink to-retro-blue rounded-xl flex items-center justify-center shadow-xl border-2 border-white/20 group-hover:shadow-retro-purple/50 ">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-white/5 rounded-xl"></div>
                  <span className="relative text-2xl font-bold text-white font-pixel drop-shadow-lg">
                    {player.name?.charAt(0) || 'P'}
                  </span>
                </div>
                {/* 在线状态指示器 */}
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-to-br from-retro-green to-retro-cyan rounded-full border-2 border-retro-bg-darker shadow-lg">
                  <div className="w-full h-full bg-retro-green rounded-full  opacity-60"></div>
                </div>
              </div>

              {/* 用户信息区域 */}
              <div className="flex-1 space-y-3">
                <h2 className="text-white text-2xl font-bold font-pixel tracking-wide drop-shadow-sm">
                  {player.name || '未知玩家'}
                </h2>
                <div className="flex items-center gap-3">
                  <div className={`px-3 py-2 rounded-lg bg-gradient-to-r ${getStatusBadge(player.currentStatus?.type || 'working')} border border-white/20 shadow-lg`}>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{player.currentStatus?.emoji || '💼'}</span>
                      <span className="text-white text-sm font-bold font-pixel tracking-wide">
                        {player.currentStatus?.status || '在线'}
                      </span>
                    </div>
                  </div>
                  <div className="w-3 h-3 bg-retro-green rounded-full  shadow-lg"></div>
                </div>
              </div>
            </div>

            {/* 装饰性分割线 */}
            <div className="w-16 h-2 bg-gradient-to-r from-retro-purple via-retro-pink to-retro-blue rounded-full shadow-lg"></div>
          </div>
        </div>

        {/* 选项卡导航 - 现代像素风格 */}
        <div className="relative flex space-x-3 mb-8 pb-4 border-b-2 border-retro-border/50">
          {[
            { id: 'status', label: 'HISTORY', icon: '📊' },
            { id: 'interaction', label: 'INTERACT', icon: '🎮' },
            { id: 'info', label: 'INFO', icon: '👤' }
          ].map((tab) => {
            const isActive = activeTab === tab.id

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`group relative overflow-hidden flex items-center gap-2 px-4 py-3 rounded-xl border-2  ${isActive
                  ? 'bg-gradient-to-r from-retro-purple/30 to-retro-blue/30 text-white border-retro-purple/50 shadow-lg shadow-retro-purple/20'
                  : 'text-retro-textMuted hover:text-white border-retro-border hover:border-retro-blue/30 hover:bg-gradient-to-r hover:from-retro-blue/10 hover:to-retro-cyan/10'
                  } ${isActive ? '' : 'hover:scale-105'}`}
              >
                {/* 激活状态光效 */}
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-white/5 rounded-xl "></div>
                )}

                {/* 选项卡内容 */}
                <div className="relative flex items-center gap-2">
                  <div className={`w-5 h-5 ${isActive ? 'bg-white/20' : 'bg-retro-textMuted/20'} rounded flex items-center justify-center `}>
                    <span className="text-xs">{tab.icon}</span>
                  </div>
                  <span className={`text-sm font-bold tracking-wide ${isActive ? 'font-pixel' : 'font-retro'}`}>
                    {tab.label}
                  </span>
                </div>

                {/* 激活指示器 */}
                {isActive && (
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-retro-purple rounded-full "></div>
                )}
              </button>
            )
          })}
        </div>

        {/* 标签页内容 - 现代像素风格 */}
        <div className="relative space-y-6 overflow-y-auto max-h-[40vh] pr-2 scrollbar-hide">
          {activeTab === 'status' && (
            <div className="relative space-y-4">
              {/* 状态历史标题 */}
              <div className="flex items-center gap-3 pb-3 border-b border-retro-border/30">
                <div className="w-6 h-6 bg-gradient-to-br from-retro-orange to-retro-yellow rounded-lg flex items-center justify-center shadow-lg">
                  <span className="text-sm">📊</span>
                </div>
                <h3 className="text-white font-bold text-base font-pixel tracking-wide uppercase">Status Timeline</h3>
              </div>

              {/* 状态历史列表 */}
              <div className="space-y-4">
                {playerHistory.map((history, index) => (
                  <div key={history.id} className="group relative">
                    <div className="relative bg-gradient-to-br from-retro-bg-dark/60 to-retro-bg-darker/60 backdrop-blur-sm border-2 border-retro-border/50 rounded-xl p-4 shadow-lg hover:border-retro-purple/40">
                      <div className="flex items-start justify-between mb-3">
                        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r ${getStatusBadge(history.type)} border border-white/20 shadow-lg`}>
                          <span className="text-sm">{history.emoji}</span>
                          <span className="text-white text-sm font-bold font-pixel tracking-wide">
                            {history.status}
                          </span>
                        </div>
                        <span className="text-retro-textMuted text-xs font-retro tracking-wide">
                          {history.timestamp}
                        </span>
                      </div>
                      <p className="text-retro-text text-sm font-retro leading-relaxed pl-2 border-l-2 border-retro-purple/30">
                        {history.message}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'interaction' && (
            <div className="relative space-y-5">
              <div className="bg-gradient-to-br from-retro-bg-dark/50 to-retro-bg-darker/50 backdrop-blur-sm border-2 border-retro-border/50 rounded-xl p-5 shadow-lg">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { emoji: '👋', label: 'WAVE', action: 'wave', color: 'from-retro-blue/20 to-retro-cyan/20 border-retro-blue/30' },
                    { emoji: '🎉', label: 'CELEBRATE', action: 'celebrate', color: 'from-retro-green/20 to-retro-blue/20 border-retro-green/30' },
                    { emoji: '👍', label: 'LIKE', action: 'like', color: 'from-retro-purple/20 to-retro-pink/20 border-retro-purple/30' },
                    { emoji: '❤️', label: 'LOVE', action: 'love', color: 'from-retro-pink/20 to-retro-red/20 border-retro-pink/30' }
                  ].map((action) => (
                    <button
                      key={action.action}
                      className={`group relative overflow-hidden bg-gradient-to-br ${action.color} text-white py-3 px-4 rounded-xl border-2 shadow-md hover:scale-105 active:scale-95 transition-all`}
                    >
                      <div className="relative flex flex-col items-center gap-2">
                        <span className="text-sm">{action.emoji}</span>
                        <span className="text-[10px] font-bold font-pixel tracking-tight">{action.label}</span>
                      </div>
                    </button>
                  ))}

                  {/* Swap Postcard Button */}
                  <button
                    onClick={handleSwapPostcard}
                    disabled={isSwapping}
                    className="col-span-2 group relative overflow-hidden bg-gradient-to-br from-amber-500/20 to-orange-500/20 text-white py-4 px-4 rounded-xl border-2 border-amber-500/40 shadow-md hover:scale-[1.02] active:scale-98 transition-all disabled:opacity-50"
                  >
                    <div className="relative flex items-center justify-center gap-3">
                      <span className="text-xl">🕊️</span>
                      <span className="text-xs font-black font-pixel tracking-widest">{t.postcard.swap}</span>
                    </div>
                    {isSwapping && (
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                  </button>
                </div>
              </div>

              <div className="bg-gradient-to-br from-retro-bg-dark/50 to-retro-bg-darker/50 backdrop-blur-sm border-2 border-retro-border/50 rounded-xl p-5 shadow-lg">
                <div className="flex gap-3">
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Type a message..."
                    className="flex-1 bg-retro-bg-dark/80 border-2 border-retro-border focus:border-retro-purple rounded-xl px-4 py-3 text-white placeholder-retro-textMuted focus:outline-none font-retro text-sm"
                    onFocus={() => (window as any).disableGameKeyboard?.()}
                    onBlur={() => (window as any).enableGameKeyboard?.()}
                  />
                  <button className="bg-gradient-to-br from-retro-purple/30 to-retro-pink/30 text-white px-4 py-3 rounded-xl border-2 border-retro-purple/40 font-pixel text-xs tracking-tight">
                    SEND
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'info' && (
            <div className="relative space-y-5">
              <div className="bg-gradient-to-br from-retro-bg-dark/50 to-retro-bg-darker/50 backdrop-blur-sm border-2 border-retro-border/50 rounded-xl p-5 shadow-lg">
                <div className="space-y-4">
                  {[
                    { label: 'PLAYER ID', value: player.id, icon: '🆔' },
                    { label: 'STATUS', value: player.currentStatus?.status || 'Online', icon: '📊' },
                    { label: 'MESSAGE', value: player.currentStatus?.message || 'None', icon: '💬' }
                  ].map((info, index) => (
                    <div key={index} className="flex items-center justify-between bg-black/20 rounded-lg p-3 border border-white/5">
                      <div className="flex items-center gap-3">
                        <span className="text-sm">{info.icon}</span>
                        <span className="text-retro-textMuted text-[10px] font-pixel">{info.label}</span>
                      </div>
                      <span className="text-white text-xs font-retro truncate max-w-[150px]">{info.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {workstationAd && (
                <a
                  href={workstationAd.adUrl || '#'}
                  target="_blank"
                  className="block relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/90 to-orange-600/90 p-6 shadow-xl hover:scale-[1.01] transition-transform"
                >
                  <div className="relative z-10">
                    <h4 className="text-white font-pixel text-[10px] mb-2 uppercase tracking-widest">Workstation Ad</h4>
                    {workstationAd.adImage && <img src={workstationAd.adImage} className="w-full h-24 object-cover rounded-lg mb-3 shadow-md" />}
                    <p className="text-white text-sm font-retro leading-tight">{workstationAd.adText}</p>
                  </div>
                </a>
              )}
            </div>
          )}
        </div>

        {/* 底部操作按钮 */}
        <div className="relative flex gap-4 mt-8 pt-6 border-t-2 border-retro-border/50">
          <button
            onClick={handleClose}
            className="flex-1 bg-retro-bg-dark border-2 border-retro-border text-white py-4 px-6 rounded-xl font-pixel text-sm tracking-widest hover:bg-retro-border/40 transition-all"
          >
            CLOSE
          </button>
          <button
            className="flex-1 bg-gradient-to-r from-retro-purple via-retro-pink to-retro-blue text-white py-4 px-6 rounded-xl border-2 border-white/20 font-pixel text-sm tracking-widest hover:opacity-90 transition-all shadow-lg shadow-retro-purple/30"
          >
            FOLLOW
          </button>
        </div>
      </div>
    </div>
  )
})

export default PlayerClickModal
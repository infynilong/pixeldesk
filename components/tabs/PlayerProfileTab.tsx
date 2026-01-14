'use client'

import { useState, useEffect, useRef } from 'react'
import { useSocialPosts } from '@/lib/hooks/useSocialPosts'
import { useCurrentUserId } from '@/lib/hooks/useCurrentUser'
import PostCard from '@/components/PostCard'
import LoadingSpinner from '@/components/LoadingSpinner'
import UserAvatar from '@/components/UserAvatar'
import { useTranslation } from '@/lib/hooks/useTranslation'

interface PlayerProfileTabProps {
  collisionPlayer?: any
  isActive?: boolean
  isMobile?: boolean
  isTablet?: boolean
}

interface WorkstationAd {
  workstationId: number
  adText: string | null
  adImage: string | null
  adUrl: string | null
  adUpdatedAt: string | null
}

export default function PlayerProfileTab({
  collisionPlayer,
  isActive = false,
  isMobile = false,
  isTablet = false
}: PlayerProfileTabProps) {
  const currentUserId = useCurrentUserId()
  const [workstationAd, setWorkstationAd] = useState<WorkstationAd | null>(null)
  const [isLoadingAd, setIsLoadingAd] = useState(false)

  const [isCardCompact, setIsCardCompact] = useState(false)
  const [isSwapping, setIsSwapping] = useState(false)
  const { t } = useTranslation()
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // 调试信息：确认碰撞玩家信息
  useEffect(() => {
    if (collisionPlayer && isActive) {
      console.log('📱 [PlayerProfileTab] Collision player received:', {
        playerId: collisionPlayer.id,
        playerName: collisionPlayer.name,
        isTabActive: isActive,
        currentUserId
      })
    }
  }, [collisionPlayer, isActive, currentUserId])

  // 获取玩家的工位广告信息
  useEffect(() => {
    const fetchWorkstationAd = async () => {
      if (!isActive || !collisionPlayer?.id) {
        setWorkstationAd(null)
        return
      }

      setIsLoadingAd(true)
      try {
        // 1. 获取玩家绑定的工位信息
        const bindingResponse = await fetch(`/api/workstations/user-bindings?userId=${collisionPlayer.id}`)
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
            console.log('✅ [PlayerProfileTab] 工位广告已加载:', adResult.data)
          } else {
            setWorkstationAd(null)
          }
        } else {
          setWorkstationAd(null)
        }
      } catch (error) {
        console.error('❌ [PlayerProfileTab] 获取工位广告失败:', error)
        setWorkstationAd(null)
      } finally {
        setIsLoadingAd(false)
      }
    }

    fetchWorkstationAd()
  }, [isActive, collisionPlayer?.id])

  // 使用社交帖子hook，获取特定用户的帖子
  const {
    posts,
    isLoading,
    isRefreshing,
    error,
    pagination,
    refreshPosts,
    loadMorePosts,
    likePost
  } = useSocialPosts({
    userId: currentUserId || '', // 当前登录用户ID
    autoFetch: isActive && !!collisionPlayer?.id && !!currentUserId,
    refreshInterval: isActive && !!collisionPlayer?.id ? 30000 : 0, // 30秒刷新一次，仅在有碰撞且激活时
    filterByAuthor: collisionPlayer?.id // 只显示被碰撞用户的帖子
  })

  // Debug: 监控useSocialPosts的状态变化
  useEffect(() => {
    if (isActive && collisionPlayer?.id) {
      console.log('🔍 [PlayerProfileTab] useSocialPosts状态:', {
        autoFetch: isActive && !!collisionPlayer?.id && !!currentUserId,
        filterByAuthor: collisionPlayer?.id,
        postsCount: posts.length,
        isLoading,
        error
      })
    }
  }, [isActive, collisionPlayer?.id, currentUserId, posts.length, isLoading, error])

  // 监听滚动,实现卡片展开/压缩切换
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current
    if (!scrollContainer) return

    let ticking = false

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollTop = scrollContainer.scrollTop
          const shouldCompact = scrollTop > 50

          // 只在状态真正需要改变时才更新,避免频繁渲染
          setIsCardCompact(prev => {
            if (prev !== shouldCompact) {
              console.log('🔄 [PlayerProfileTab] 卡片模式切换:', shouldCompact ? '压缩' : '展开', `(scrollTop: ${scrollTop}px)`)
            }
            return shouldCompact
          })

          ticking = false
        })
        ticking = true
      }
    }

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true })
    return () => scrollContainer.removeEventListener('scroll', handleScroll)
  }, [])

  // 处理交换名信片
  const handleSwapPostcard = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!currentUserId || !collisionPlayer?.id) return

    setIsSwapping(true)
    try {
      const res = await fetch('/api/postcards/exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverId: collisionPlayer.id })
      })
      const data = await res.json()

      if (data.success) {
        alert(t.postcard?.swap_request_sent || 'Exchanged request sent!')
      } else {
        alert(data.error || 'Failed to send request')
      }
    } catch (error) {
      console.error('Swap postcard error:', error)
      alert('Failed to send request')
    } finally {
      setIsSwapping(false)
    }
  }

  const handleLikePost = async (postId: string) => {
    if (!currentUserId) {
      return
    }

    try {
      await likePost(postId)
    } catch (error) {
      // Error handled by hook
    }
  }

  const handleReplyCountUpdate = (postId: string, newCount: number) => {
    // 这里可以选择性地触发帖子列表的刷新，或者直接更新本地状态
    // 目前我们依赖自然的刷新机制来更新计数
  }

  // 处理滚动到底部加载更多
  const handleLoadMore = () => {
    if (pagination.hasNextPage && !isRefreshing) {
      loadMorePosts()
    }
  }

  // 定义容器样式类
  const containerClasses = isMobile
    ? "h-full flex flex-col bg-gradient-to-br from-retro-bg-dark to-retro-bg-darker"
    : "h-full flex flex-col bg-gradient-to-br from-retro-bg-dark to-retro-bg-darker";

  // 如果没有碰撞玩家，显示等待状态
  if (!collisionPlayer) {
    const emptyStateClasses = isMobile
      ? "h-full flex flex-col items-center justify-center p-4 text-center relative"
      : "h-full flex flex-col items-center justify-center p-6 text-center relative";

    const iconSize = isMobile ? "w-12 h-12" : "w-16 h-16";
    const iconInnerSize = isMobile ? "w-6 h-6" : "w-8 h-8";
    const titleSize = isMobile ? "text-sm" : "text-base";
    const textSize = isMobile ? "text-xs" : "text-sm";

    return (
      <div className={emptyStateClasses}>
        {/* 简化背景效果 - 移除CPU消耗高的动画 */}
        <div className="absolute inset-0 bg-gradient-to-br from-retro-purple/8 via-retro-blue/10 to-retro-pink/8"></div>

        <div className="relative z-10 space-y-6">
          {/* 像素化等待图标 - 增加雷达扫描动效 */}
          <div className="relative">
            <div className="absolute inset-0 bg-retro-purple/30 rounded-xl animate-ping opacity-20 scale-150"></div>
            <div className="absolute inset-0 bg-retro-blue/20 rounded-xl animate-pulse delay-75 opacity-20 scale-125"></div>
            <div className={`${iconSize} relative bg-gradient-to-br from-retro-purple/40 via-retro-pink/40 to-retro-blue/40 rounded-xl flex items-center justify-center mx-auto shadow-2xl border-2 border-white/20 overflow-hidden group`}>
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
              {/* 扫过光线 */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></div>
              <svg className={`${iconInnerSize} text-white drop-shadow-lg relative z-10 transition-transform group-hover:scale-110`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          </div>

          {/* 标题文本 - 使用翻译 */}
          <div className="text-center space-y-3">
            <h3 className={`text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60 font-bold mb-2 font-pixel tracking-widest drop-shadow-xl ${titleSize}`}>
              {t.social.waiting_interaction || "WAITING FOR INTERACTION"}
            </h3>
            <p className={`text-white/40 leading-relaxed font-retro italic ${textSize} max-w-[240px] mx-auto`}>
              {t.social.interaction_hint || (isMobile ? "Get close to other players\nto view their posts" : "Move near other players to\nview their social posts")}
            </p>
          </div>

          {/* 静态装饰点 - 移除bounce动画以节省CPU */}
          <div className="flex items-center justify-center space-x-3">
            <div className="w-3 h-3 bg-gradient-to-br from-retro-purple to-retro-pink rounded-sm shadow-lg"></div>
            <div className="w-3 h-3 bg-gradient-to-br from-retro-pink to-retro-blue rounded-sm shadow-lg"></div>
            <div className="w-3 h-3 bg-gradient-to-br from-retro-blue to-retro-cyan rounded-sm shadow-lg"></div>
          </div>

          <div className="text-center">
            <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-md shadow-inner transition-all hover:bg-white/10">
              <div className="w-2.5 h-2.5 bg-retro-cyan rounded-full animate-pulse shadow-[0_0_10px_rgba(34,211,238,0.8)]"></div>
              <span className="text-[10px] text-white/60 font-pixel uppercase tracking-[0.2em]">
                {t.social.collision_active || "COLLISION DETECTION ACTIVE"}
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 渲染用户信息+广告卡片合并组件
  const renderUserProfileCard = () => {
    const CardWrapper = workstationAd?.adUrl ? 'a' : 'div'
    const cardProps = workstationAd?.adUrl ? {
      href: workstationAd.adUrl,
      target: "_blank",
      rel: "noopener noreferrer"
    } : {}

    if (isCardCompact) {
      // 压缩模式 - 横条式布局,高度<60px
      return (
        <div className="flex-shrink-0 px-4 py-1.5 transition-all duration-500 ease-out">
          <CardWrapper
            {...cardProps}
            className={`flex items-center gap-2.5 h-[56px] rounded-lg overflow-hidden transition-all duration-500 ease-in-out ${workstationAd?.adUrl
              ? 'bg-gradient-to-r from-amber-500/90 to-pink-500/90 cursor-pointer hover:shadow-lg'
              : 'bg-gradient-to-r from-retro-bg-dark/80 to-retro-bg-darker/80 border border-retro-border/50'
              }`}
          >
            {/* 左侧:用户头像+广告图片 */}
            <div className="flex-shrink-0 flex items-center gap-2 pl-2.5 transition-all duration-500 ease-in-out">
              <UserAvatar
                userId={collisionPlayer.id}
                userName={collisionPlayer.name}
                userAvatar={collisionPlayer.avatar}
                size="sm"
                showStatus={true}
                isOnline={collisionPlayer.isOnline}
              />
              {workstationAd?.adImage && (
                <img
                  src={workstationAd.adImage}
                  alt="Ad"
                  className="w-10 h-10 object-cover rounded-md transition-all duration-500 ease-in-out"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.style.display = 'none'
                  }}
                />
              )}
            </div>

            {/* 中间:用户名+工位标识 */}
            <div className="flex-1 min-w-0 py-1.5 transition-all duration-500 ease-in-out">
              <div className="flex items-center gap-2 mb-0.5">
                <h3 className="text-sm font-bold text-white font-pixel truncate transition-all duration-500 ease-in-out">
                  {collisionPlayer.name}
                </h3>
                {workstationAd && (
                  <span className="text-2xs text-white/60 font-pixel tracking-wider uppercase whitespace-nowrap">
                    WS#{workstationAd.workstationId}
                  </span>
                )}
              </div>
              <p className="text-xs text-white/80 truncate transition-all duration-500 ease-in-out leading-tight">
                {workstationAd?.adText || collisionPlayer.currentStatus?.message || 'Online'}
              </p>
            </div>

            {/* 交换按钮 (Compact) */}
            <button
              onClick={handleSwapPostcard}
              disabled={isSwapping}
              className="flex-shrink-0 p-1.5 text-amber-400 hover:text-amber-300 hover:bg-amber-400/10 rounded-md mr-1 disabled:opacity-50 transition-all duration-300 ease-in-out"
              title={t.postcard.swap || "Swap Postcard"}
            >
              <span className="text-xs">🕊️</span>
            </button>

            {/* 刷新按钮 */}
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                refreshPosts()
              }}
              disabled={isRefreshing}
              className="flex-shrink-0 p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-md mr-2 disabled:opacity-50 transition-all duration-300 ease-in-out"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </CardWrapper>
        </div>
      )
    }

    // 展开模式 - 完整显示
    return (
      <div className="flex-shrink-0 px-4 py-3 transition-all duration-500 ease-out">
        <CardWrapper
          {...cardProps}
          className={`block relative overflow-hidden rounded-xl transition-all duration-500 ease-in-out ${workstationAd?.adUrl
            ? 'bg-gradient-to-br from-amber-500/95 via-orange-500/95 to-pink-500/95 shadow-2xl hover:shadow-[0_0_30px_rgba(251,146,60,0.5)] hover:scale-[1.01] cursor-pointer'
            : 'bg-gradient-to-br from-retro-bg-dark/80 to-retro-bg-darker/80 border-2 border-retro-border/50'
            }`}
        >
          {workstationAd && (
            <>
              {/* 像素点装饰背景 */}
              <div className="absolute inset-0 opacity-20" style={{
                backgroundImage: `
                  repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px),
                  repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px)
                `,
                backgroundSize: '8px 8px'
              }}></div>
              {/* 顶部光晕效果 */}
              <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-white/30 to-transparent"></div>
              {/* 点击提示图标 */}
              {workstationAd.adUrl && (
                <div className="absolute top-3 right-3 w-6 h-6 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </div>
              )}
            </>
          )}

          <div className="relative p-4">
            {/* 用户信息区域 */}
            <div className="flex items-center gap-3 mb-3">
              <UserAvatar
                userId={collisionPlayer.id}
                userName={collisionPlayer.name}
                userAvatar={collisionPlayer.avatar}
                size={isMobile ? 'md' : 'lg'}
                showStatus={true}
                isOnline={collisionPlayer.isOnline}
                lastSeen={collisionPlayer.lastSeen}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-bold text-white font-pixel tracking-wide drop-shadow-sm">
                    {collisionPlayer.name}
                  </h3>
                  {workstationAd && (
                    <span className="text-xs text-white/70 font-pixel tracking-wider uppercase">
                      WS#{workstationAd.workstationId}
                    </span>
                  )}
                </div>
                {collisionPlayer.currentStatus ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{collisionPlayer.currentStatus.emoji}</span>
                    <span className="text-sm text-white/90 font-retro">
                      {collisionPlayer.currentStatus.status}
                    </span>
                  </div>
                ) : (
                  <p className="text-sm text-white/70 font-retro">Online</p>
                )}
              </div>
              {/* 交换按钮 (Expanded) */}
              <button
                onClick={handleSwapPostcard}
                disabled={isSwapping}
                className={`p-2 rounded-lg disabled:opacity-50 mr-2 ${workstationAd ? 'text-white/80 hover:text-white hover:bg-white/10' : 'text-amber-400 hover:text-amber-300 hover:bg-amber-400/10'
                  }`}
                title={t.postcard?.swap || "Swap Postcard"}
              >
                <span className="text-lg">🕊️</span>
              </button>

              {/* 刷新按钮 */}
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  refreshPosts()
                }}
                disabled={isRefreshing}
                className={`p-2 rounded-lg disabled:opacity-50 ${workstationAd ? 'text-white/80 hover:text-white hover:bg-white/10' : 'text-retro-cyan hover:text-retro-blue hover:bg-retro-blue/10'
                  }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>

            {workstationAd && (
              <>
                {/* 广告图片 */}
                {workstationAd.adImage && (
                  <div className="relative mb-3 rounded-lg overflow-hidden shadow-lg">
                    <img
                      src={workstationAd.adImage}
                      alt="工位广告"
                      className="w-full h-auto object-cover max-h-40"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                  </div>
                )}

                {/* 广告文案 */}
                {workstationAd.adText && (
                  <div className="bg-white/95 backdrop-blur-sm rounded-lg p-3 shadow-lg">
                    <p className="text-gray-800 text-xs font-retro leading-relaxed whitespace-pre-wrap break-words">
                      {workstationAd.adText}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </CardWrapper>
      </div>
    )
  }

  return (
    <div className={containerClasses}>
      {isLoadingAd ? (
        <div className="flex-shrink-0 p-4">
          <div className="flex items-center justify-center gap-4 py-10 bg-white/5 rounded-2xl border border-white/5 m-2 animate-pulse">
            <div className="w-6 h-6 border-2 border-retro-cyan/40 border-t-retro-cyan rounded-full animate-spin"></div>
            <span className="text-[10px] font-pixel text-retro-cyan tracking-[0.3em] uppercase">{t.social.loading || "LOADING"}...</span>
          </div>
        </div>
      ) : (
        renderUserProfileCard()
      )}

      {/* 帖子内容区域 - 现代像素风格,带滚动监听 */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto scrollbar-hide relative">
        {/* 内容区域背景装饰 */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-retro-purple/2 to-retro-blue/3 pointer-events-none"></div>

        {/* 错误状态 - 像素化错误显示 */}
        {error && (
          <div className="p-4 m-4">
            <div className="relative bg-gradient-to-r from-retro-red/15 to-retro-orange/15 backdrop-blur-sm border-2 border-retro-red/30 rounded-lg p-4 shadow-lg">
              <div className="absolute inset-0 bg-retro-red/5 rounded-lg"></div>
              <div className="relative flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-retro-red to-retro-orange rounded-lg flex items-center justify-center shadow-lg">
                  <span className="text-sm">⚠️</span>
                </div>
                <div>
                  <div className="text-retro-red font-bold text-sm font-pixel tracking-wide">ERROR</div>
                  <p className="text-retro-red/80 text-xs font-retro">{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 加载状态 - 像素化加载器 */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full space-y-6">
            <div className="relative group">
              <div className="absolute inset-0 bg-retro-cyan/20 blur-xl rounded-full scale-150 animate-pulse"></div>
              <LoadingSpinner />
            </div>
            <div className="text-center space-y-3 relative">
              <div className="text-transparent bg-clip-text bg-gradient-to-b from-white to-white/40 font-bold font-pixel text-[10px] tracking-[0.4em] uppercase">
                {t.social.loading || "LOADING"}
              </div>
              <div className="text-white/20 text-[10px] font-pixel tracking-widest uppercase">
                {t.social.loading_player_posts || "Fetching player posts..."}
              </div>
            </div>
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-6">
            {/* 空状态图标 */}
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-br from-retro-purple/20 via-retro-pink/25 to-retro-blue/20 rounded-xl flex items-center justify-center border-2 border-retro-purple/30 shadow-xl">
                <div className="absolute inset-1 bg-gradient-to-br from-white/5 to-white/2 rounded-lg"></div>
                <svg className="w-10 h-10 text-retro-purple drop-shadow-lg relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10m0 0V6a2 2 0 00-2-2H9a2 2 0 00-2 2v2m10 0v10a2 2 0 01-2 2H9a2 2 0 01-2-2V8m0 0V6a2 2 0 012-2h8a2 2 0 012 2v2" />
                </svg>
              </div>
              {/* 装饰性边框 - 移除动画以节省CPU */}
              <div className="absolute inset-0 border-2 border-retro-purple/20 rounded-xl opacity-50"></div>
            </div>

            {/* 空状态文本 */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-white font-pixel tracking-widest drop-shadow-sm uppercase">
                {t.social.no_posts_yet || "NO POSTS YET"}
              </h3>
              <p className="text-white/40 text-xs font-retro leading-relaxed max-w-[240px] mx-auto italic">
                {t.social.no_posts_hint?.replace('{name}', collisionPlayer.name) || (collisionPlayer.name + " hasn't shared any posts yet. Check back later!")}
              </p>
            </div>

            {/* 装饰性元素 - 移除动画以节省CPU */}
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-retro-purple rounded-sm"></div>
              <div className="w-3 h-1 bg-retro-pink rounded-sm"></div>
              <div className="w-2 h-2 bg-retro-blue rounded-sm"></div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 p-4">
            {posts.map((post, index) => (
              <div key={post.id}>
                <PostCard
                  key={post.id}
                  post={post}
                  currentUserId={currentUserId || ''}
                  onLike={() => handleLikePost(post.id)}
                  onReplyCountUpdate={handleReplyCountUpdate}
                  isMobile={isMobile}
                />
              </div>
            ))}

            {/* 加载更多按钮 - 像素化设计 */}
            {pagination.hasNextPage && (
              <div className="flex justify-center py-6">
                <button
                  onClick={handleLoadMore}
                  disabled={isRefreshing}
                  className="group/loadmore relative overflow-hidden bg-white/5 hover:bg-white/10 text-white/70 hover:text-white font-bold py-3.5 px-10 rounded-2xl border border-white/10 hover:border-retro-cyan/30 transition-all duration-300 active:scale-95 disabled:opacity-50 shadow-xl shadow-black/40"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-retro-cyan/0 via-retro-cyan/5 to-retro-cyan/0 -translate-x-full group-hover/loadmore:translate-x-full transition-transform duration-1000"></div>

                  {/* 按钮内容 */}
                  <div className="relative flex items-center gap-4">
                    <div className={`w-6 h-6 bg-white/5 rounded-lg flex items-center justify-center transition-transform duration-500 group-hover/loadmore:rotate-12 ${isRefreshing ? 'animate-spin' : ''}`}>
                      <span className="text-xs">{isRefreshing ? '⏳' : '⬇️'}</span>
                    </div>
                    <span className="font-pixel text-[10px] tracking-[0.2em] uppercase">
                      {isRefreshing ? `${t.social.loading || 'LOADING'}...` : (t.social.load_more || 'LOAD MORE')}
                    </span>
                  </div>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
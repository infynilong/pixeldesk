'use client'

import { useState, useEffect } from 'react'
import { useSocialPosts } from '@/lib/hooks/useSocialPosts'
import { useCurrentUserId } from '@/lib/hooks/useCurrentUser'
import PostCard from '@/components/PostCard'
import LoadingSpinner from '@/components/LoadingSpinner'
import UserAvatar from '@/components/UserAvatar'

interface PlayerProfileTabProps {
  collisionPlayer?: any
  isActive?: boolean
  isMobile?: boolean
  isTablet?: boolean
}

export default function PlayerProfileTab({ 
  collisionPlayer,
  isActive = false,
  isMobile = false,
  isTablet = false
}: PlayerProfileTabProps) {
  const currentUserId = useCurrentUserId()
  
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
          {/* 像素化等待图标 */}
          <div className="relative">
            <div className={`${iconSize} bg-gradient-to-br from-retro-purple/30 via-retro-pink/40 to-retro-blue/30 rounded-xl flex items-center justify-center mx-auto shadow-xl border-2 border-retro-border/50`}>
              <div className="absolute inset-1 bg-gradient-to-br from-white/10 to-white/5 rounded-lg"></div>
              <svg className={`${iconInnerSize} text-white drop-shadow-lg relative z-10`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            {/* 静态装饰环 - 移除动画以节省CPU */}
            <div className="absolute inset-0 border-2 border-retro-purple/30 rounded-xl opacity-50"></div>
          </div>
          
          {/* 标题文本 */}
          <div className="text-center space-y-3">
            <h3 className={`text-white font-bold mb-2 font-pixel tracking-wider drop-shadow-lg ${titleSize}`}>
              WAITING FOR INTERACTION
            </h3>
            <p className={`text-retro-textMuted leading-relaxed font-retro ${textSize}`}>
              {isMobile ? "Get close to other players\nto view their posts" : "Move near other players to\nview their social posts"}
            </p>
          </div>
          
          {/* 静态装饰点 - 移除bounce动画以节省CPU */}
          <div className="flex items-center justify-center space-x-3">
            <div className="w-3 h-3 bg-gradient-to-br from-retro-purple to-retro-pink rounded-sm shadow-lg"></div>
            <div className="w-3 h-3 bg-gradient-to-br from-retro-pink to-retro-blue rounded-sm shadow-lg"></div>
            <div className="w-3 h-3 bg-gradient-to-br from-retro-blue to-retro-cyan rounded-sm shadow-lg"></div>
          </div>
          
          {/* 操作提示 */}
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-retro-bg-dark/50 rounded-lg border border-retro-border/30 backdrop-blur-sm">
              <div className="w-2 h-2 bg-retro-cyan rounded-full"></div>
              <span className="text-xs text-retro-textMuted font-retro tracking-wide">
                COLLISION DETECTION ACTIVE
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={containerClasses}>
      {/* 用户信息头部 - 现代像素风格 */}
      <div className="flex-shrink-0 p-4 border-b-2 border-retro-border/50 bg-gradient-to-r from-retro-bg-darker/60 to-retro-bg-dark/60 backdrop-blur-sm">
        <div className="flex items-center space-x-4">
          {/* 头像区域 */}
          <div className="relative">
            <UserAvatar
              userId={collisionPlayer.id}
              userName={collisionPlayer.name}
              userAvatar={collisionPlayer.avatar}
              size={isMobile ? 'md' : 'lg'}
              showStatus={true}
              isOnline={collisionPlayer.isOnline}
              lastSeen={collisionPlayer.lastSeen}
            />
            {/* 互动标识 - 简化为静态效果 */}
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-br from-retro-green to-retro-cyan rounded-full border-2 border-retro-bg-darker shadow-lg">
              <div className="w-full h-full bg-retro-green rounded-full opacity-60"></div>
            </div>
          </div>
          
          {/* 用户信息 */}
          <div className="flex-1 space-y-1">
            <h3 className="text-lg font-bold text-white font-pixel tracking-wide drop-shadow-sm">
              {collisionPlayer.name}
            </h3>
            {collisionPlayer.currentStatus ? (
              <div className="flex items-center gap-2">
                <span className="text-sm">{collisionPlayer.currentStatus.emoji}</span>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-retro-cyan font-retro">
                    {collisionPlayer.currentStatus.status}
                  </span>
                  <p className="text-xs text-retro-textMuted font-retro leading-tight">
                    {collisionPlayer.currentStatus.message}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-retro-textMuted font-retro leading-tight">
                Exploring their social feed...
              </p>
            )}
          </div>
          
          {/* 刷新按钮 - 简洁设计 */}
          <button
            onClick={refreshPosts}
            disabled={isRefreshing}
            className="p-2 text-retro-cyan hover:text-retro-blue hover:bg-retro-blue/10 rounded-lg  disabled:opacity-50"
            title="刷新动态"
          >
            <svg className={`w-4 h-4 ${isRefreshing ? '' : 'hover:rotate-180'} `} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* 帖子内容区域 - 现代像素风格 */}
      <div className="flex-1 overflow-hidden relative">
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
          <div className="flex flex-col items-center justify-center h-full space-y-4">
            <div className="relative">
              <LoadingSpinner />
              <div className="absolute inset-0 border-2 border-retro-cyan/30 rounded-full opacity-30"></div>
            </div>
            <div className="text-center space-y-2">
              <div className="text-white font-bold font-pixel text-sm tracking-wide">LOADING</div>
              <div className="text-retro-textMuted text-xs font-retro">Fetching player posts...</div>
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
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-white font-pixel tracking-wider drop-shadow-sm">
                NO POSTS YET
              </h3>
              <p className="text-retro-textMuted text-sm font-retro leading-relaxed max-w-xs">
                {collisionPlayer.name} hasn't shared any posts yet. Check back later!
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
          <div className="h-full overflow-y-auto scrollbar-hide">
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
                    className="group relative overflow-hidden bg-gradient-to-r from-retro-blue/20 to-retro-cyan/20 hover:from-retro-blue/30 hover:to-retro-cyan/30 text-white font-bold py-3 px-8 rounded-xl border-2 border-retro-blue/30 hover:border-retro-cyan/50  disabled:opacity-50 shadow-lg hover:shadow-xl backdrop-blur-sm"
                  >
                    {/* 按钮装饰 */}
                    <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-white/10 opacity-0 group-hover:opacity-100 "></div>
                    
                    {/* 按钮内容 */}
                    <div className="relative flex items-center gap-3">
                      <div className="w-5 h-5 bg-white/20 rounded flex items-center justify-center">
                        <span className="text-xs">{isRefreshing ? '⏳' : '⬇️'}</span>
                      </div>
                      <span className="font-pixel text-sm tracking-wide">
                        {isRefreshing ? 'LOADING...' : 'LOAD MORE'}
                      </span>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
'use client'

import { useState, useEffect } from 'react'
import { useSocialPosts } from '@/lib/hooks/useSocialPosts'
import { useCurrentUser } from '@/lib/hooks/useCurrentUser'
import PostCard from '@/components/PostCard'
import LoadingSpinner from '@/components/LoadingSpinner'
import CreatePostForm from '@/components/CreatePostForm'
import { CreatePostData } from '@/types/social'
import { useTranslation } from '@/lib/hooks/useTranslation'

interface MyPostsTabProps {
  isActive?: boolean
  isMobile?: boolean
  isTablet?: boolean
}

export default function MyPostsTab({
  isActive = false,
  isMobile = false,
  isTablet = false
}: MyPostsTabProps) {
  // 获取当前用户信息
  const { currentUser, userId: currentUserId, isLoading: isUserLoading } = useCurrentUser()
  const { t } = useTranslation()

  // 使用社交帖子hook，只获取当前用户的帖子
  const {
    posts,
    isLoading,
    isRefreshing,
    error,
    pagination,
    refreshPosts,
    loadMorePosts,
    likePost,
    createPost
  } = useSocialPosts({
    userId: currentUserId || '',
    autoFetch: isActive && !!currentUserId,
    refreshInterval: isActive ? 30000 : 0, // 30秒刷新一次，仅在激活时
    filterByAuthor: currentUserId || undefined // 只显示当前用户的帖子
  })

  const handleLikePost = async (postId: string) => {
    if (!currentUserId) {
      console.warn('用户未登录，无法点赞')
      return
    }

    try {
      await likePost(postId)
    } catch (error) {
      console.error('点赞失败:', error)
    }
  }

  const handleReplyCountUpdate = (postId: string, newCount: number) => {
    console.log(`回复计数更新：帖子 ${postId} 现在有 ${newCount} 个回复`)
  }

  // 处理创建帖子
  const handleCreatePost = async (postData: CreatePostData) => {
    console.log('📝 [MyPostsTab] 开始创建帖子, userId:', currentUserId)
    console.log('📝 [MyPostsTab] 帖子数据:', postData)

    if (!currentUserId) {
      console.error('❌ [MyPostsTab] 用户ID未获取到,无法发帖')
      console.error('💡 提示: 请检查 localStorage 中的 pixelDeskUser 数据')

      // 检查 localStorage
      const userData = localStorage.getItem('pixelDeskUser')
      console.log('🔍 [MyPostsTab] localStorage.pixelDeskUser:', userData)

      return false
    }

    const newPost = await createPost(postData)
    if (newPost) {
      console.log('✅ [MyPostsTab] 帖子发布成功:', newPost)
      // 刷新帖子列表
      refreshPosts()
    } else {
      console.error('❌ [MyPostsTab] 帖子创建失败')
    }
    return !!newPost
  }

  // 处理滚动到底部加载更多
  const handleLoadMore = () => {
    if (pagination.hasNextPage && !isRefreshing) {
      loadMorePosts()
    }
  }

  // 如果不活跃，显示占位符
  if (!isActive) {
    return (
      <div className="h-full flex items-center justify-center p-4 text-center">
        <div className="text-retro-textMuted">
          <div className="w-12 h-12 bg-retro-purple/20 rounded-full flex items-center justify-center mx-auto mb-2">
            <svg className="w-6 h-6 text-retro-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10m0 0V6a2 2 0 00-2-2H9a2 2 0 00-2 2v2m10 0v10a2 2 0 01-2 2H9a2 2 0 01-2-2V8m0 0V6a2 2 0 012-2h8a2 2 0 012 2v2" />
            </svg>
          </div>
          <p className="text-sm">我的帖子</p>
        </div>
      </div>
    )
  }

  const containerClasses = isMobile
    ? "h-full flex flex-col bg-retro-bg"
    : "h-full flex flex-col bg-retro-bg"

  return (
    <div className={containerClasses}>
      {/* 头部 - 现代像素风格 */}
      <div className="flex-shrink-0 p-5 border-b border-white/5 bg-gradient-to-r from-retro-bg-darker/80 via-retro-bg-dark/60 to-retro-bg-darker/80 backdrop-blur-xl relative overflow-hidden group/header">
        {/* 背景装饰光晕 */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-retro-purple/10 rounded-full blur-[50px] transition-all duration-700 group-hover/header:bg-retro-purple/20"></div>
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-retro-blue/10 rounded-full blur-[50px] transition-all duration-700 group-hover/header:bg-retro-blue/20"></div>

        <div className="relative flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 relative group/icon">
              <div className="absolute inset-0 bg-gradient-to-br from-retro-purple via-retro-pink to-retro-blue rounded-xl blur-md opacity-40 group-hover/icon:opacity-70 transition-opacity duration-500"></div>
              <div className="relative h-full w-full bg-gradient-to-br from-retro-purple via-retro-pink to-retro-blue rounded-xl flex items-center justify-center shadow-2xl border border-white/20 overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
                <svg className="w-6 h-6 text-white drop-shadow-md transform transition-transform duration-500 group-hover/icon:scale-110 group-hover/icon:rotate-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10m0 0V6a2 2 0 00-2-2H9a2 2 0 00-2 2v2m10 0v10a2 2 0 01-2 2H9a2 2 0 01-2-2V8m0 0V6a2 2 0 012-2h8a2 2 0 012 2v2" />
                </svg>
              </div>
            </div>
            <div>
              <h3 className="text-white text-xl font-bold font-pixel tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] bg-clip-text text-transparent bg-gradient-to-b from-white to-white/70">
                {t.social.mine || "MY POSTS"}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-1.5 h-1.5 bg-retro-purple rounded-full animate-pulse shadow-[0_0_8px_rgba(168,85,247,0.8)]"></div>
                <span className="text-white/40 text-[10px] font-pixel uppercase tracking-widest">
                  {t.social.posts_history || "Feed Records"}
                </span>
                {isRefreshing && (
                  <div className="flex items-center gap-1 ml-3 px-2 py-0.5 bg-white/5 rounded-full border border-white/5 animate-pulse">
                    <div className="w-1 h-1 bg-retro-cyan rounded-full"></div>
                    <span className="text-[8px] text-retro-cyan font-pixel uppercase tracking-tighter">Syncing...</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={refreshPosts}
            disabled={isRefreshing}
            className="group/refresh p-2.5 text-white/40 hover:text-retro-cyan bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 hover:border-retro-cyan/30 transition-all duration-300 disabled:opacity-50"
            title={t.common.refresh}
          >
            <svg className={`w-5 h-5 transition-transform duration-700 ${isRefreshing ? 'animate-spin' : 'group-hover/refresh:rotate-180'} `} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* 发帖区域 */}
      <div className="flex-shrink-0 border-b border-retro-border/50 bg-gradient-to-r from-retro-bg-darker/40 to-retro-bg-dark/40">
        <CreatePostForm
          onSubmit={handleCreatePost}
          onCancel={() => { }} // 不需要取消功能，因为表单始终显示
          isMobile={isMobile}
        />
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-hidden">
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 m-4 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <LoadingSpinner />
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-gradient-to-b from-transparent to-black/20">
            <div className="relative group/empty mb-6">
              <div className="absolute inset-0 bg-retro-purple/20 blur-2xl rounded-full scale-150 transition-all duration-700 group-hover/empty:bg-retro-purple/40"></div>
              <div className="relative w-24 h-24 bg-gradient-to-br from-retro-bg-dark/80 to-retro-bg-darker/80 rounded-2xl flex items-center justify-center border-2 border-retro-border/30 shadow-2xl transition-transform duration-500 group-hover/empty:scale-110 group-hover/empty:rotate-3">
                <svg className="w-10 h-10 text-retro-purple/60 group-hover:text-retro-purple transition-colors duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 8h10m0 0V6a2 2 0 00-2-2H9a2 2 0 00-2 2v2m10 0v10a2 2 0 01-2 2H9a2 2 0 01-2-2V8m0 0V6a2 2 0 012-2h8a2 2 0 012 2v2" />
                </svg>
              </div>
            </div>
            <h3 className="text-xl font-bold text-white mb-3 font-pixel tracking-wide uppercase">
              {t.social.no_posts_yet || "No Posts Yet"}
            </h3>
            <p className="text-white/40 text-xs font-retro leading-relaxed max-w-[200px] mx-auto italic">
              {t.social.no_posts_hint?.replace('{name}', 'You') || "Share your moments and thoughts with the pixel world!"}
            </p>
          </div>
        ) : (
          <div className="h-full overflow-y-auto">
            <div className="space-y-4 p-4">
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  currentUserId={currentUserId || ''}
                  onLike={() => handleLikePost(post.id)}
                  onReplyCountUpdate={handleReplyCountUpdate}
                  isMobile={isMobile}
                />
              ))}

              {/* 加载更多按钮 */}
              {pagination.hasNextPage && (
                <div className="flex justify-center py-4">
                  <button
                    onClick={handleLoadMore}
                    disabled={isRefreshing}
                    className="group/loadmore relative px-8 py-2.5 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-xl border border-white/10 hover:border-retro-purple/30 transition-all duration-300 active:scale-95 disabled:opacity-50 font-pixel text-[10px] uppercase tracking-widest overflow-hidden shadow-lg"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-retro-purple/0 via-retro-purple/5 to-retro-purple/0 -translate-x-full group-hover/loadmore:translate-x-full transition-transform duration-1000"></div>
                    {isRefreshing ? `${t.social.loading || 'Loading'}...` : (t.social.load_more || 'Load More')}
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
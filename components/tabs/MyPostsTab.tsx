'use client'

import { useState, useEffect } from 'react'
import { useSocialPosts } from '@/lib/hooks/useSocialPosts'
import { useCurrentUser } from '@/lib/hooks/useCurrentUser'
import PostCard from '@/components/PostCard'
import LoadingSpinner from '@/components/LoadingSpinner'
import CreatePostForm from '@/components/CreatePostForm'
import { CreatePostData } from '@/types/social'

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
      <div className="flex-shrink-0 p-4 border-b-2 border-retro-border/50 bg-gradient-to-r from-retro-bg-darker/60 to-retro-bg-dark/60 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-gradient-to-br from-retro-purple via-retro-pink to-retro-blue rounded-xl flex items-center justify-center shadow-xl border-2 border-white/20 ">
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-white/5 rounded-xl"></div>
              <svg className="relative w-5 h-5 text-white drop-shadow-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10m0 0V6a2 2 0 00-2-2H9a2 2 0 00-2 2v2m10 0v10a2 2 0 01-2 2H9a2 2 0 01-2-2V8m0 0V6a2 2 0 012-2h8a2 2 0 012 2v2" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-white text-xl font-bold font-pixel tracking-wide drop-shadow-sm">MY POSTS</h3>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-2 h-2 bg-retro-purple rounded-full "></div>
                <span className="text-retro-textMuted text-xs font-retro tracking-wide">我的发布记录</span>
                {isRefreshing && (
                  <div className="flex items-center gap-1 ml-2">
                    <div className="w-2 h-2 bg-retro-cyan rounded-full " style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-retro-blue rounded-full " style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-retro-purple rounded-full " style={{ animationDelay: '300ms' }}></div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* 刷新按钮 */}
          <button
            onClick={refreshPosts}
            disabled={isRefreshing}
            className="p-2 text-retro-cyan hover:text-retro-blue hover:bg-retro-blue/10 rounded-lg  disabled:opacity-50"
            title="刷新我的帖子"
          >
            <svg className={`w-4 h-4 ${isRefreshing ? '' : 'hover:rotate-180'} `} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* 发帖区域 */}
      <div className="flex-shrink-0 border-b border-retro-border/50 bg-gradient-to-r from-retro-bg-darker/40 to-retro-bg-dark/40">
        <CreatePostForm
          onSubmit={handleCreatePost}
          onCancel={() => {}} // 不需要取消功能，因为表单始终显示
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
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <div className="w-16 h-16 bg-retro-purple/20 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-retro-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10m0 0V6a2 2 0 00-2-2H9a2 2 0 00-2 2v2m10 0v10a2 2 0 01-2 2H9a2 2 0 01-2-2V8m0 0V6a2 2 0 012-2h8a2 2 0 012 2v2" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-white mb-2">还没有发布帖子</h3>
            <p className="text-retro-textMuted text-sm mb-4">
              使用上方的输入框发布你的第一个帖子吧！
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
                    className="px-4 py-2 bg-retro-surface text-white rounded-lg hover:bg-retro-surface/80  disabled:opacity-50"
                  >
                    {isRefreshing ? '加载中...' : '加载更多'}
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
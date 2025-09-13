'use client'

import { useState, useEffect } from 'react'
import { useSocialPosts } from '@/lib/hooks/useSocialPosts'
import { useCurrentUser } from '@/lib/hooks/useCurrentUser'
import { Post, CreatePostData } from '@/types/social'
import PostCard from '@/components/PostCard'
import CreatePostForm from '@/components/CreatePostForm'
import LoadingSpinner from '@/components/LoadingSpinner'

interface SocialFeedTabProps {
  collisionPlayer?: any
  isActive?: boolean
  isMobile?: boolean
  isTablet?: boolean
}

export default function SocialFeedTab({ 
  collisionPlayer,
  isActive = false,
  isMobile = false,
  isTablet = false
}: SocialFeedTabProps) {
  const [showCreateForm, setShowCreateForm] = useState(false)
  
  // 使用新的用户hook获取当前用户信息
  const { currentUser, userId: currentUserId, isLoading: isUserLoading, error: userError } = useCurrentUser()

  // 使用社交帖子hook，只在tab激活且有用户ID时启用
  const {
    posts,
    isLoading,
    isRefreshing,
    error,
    pagination,
    createPost,
    likePost,
    refreshPosts,
    loadMorePosts
  } = useSocialPosts({
    userId: currentUserId || '',
    autoFetch: isActive && !!currentUserId,
    refreshInterval: isActive ? 30000 : 0 // 30秒刷新一次，仅在激活时
  })

  // 处理创建帖子
  const handleCreatePost = async (postData: CreatePostData) => {
    const newPost = await createPost(postData)
    if (newPost) {
      setShowCreateForm(false)
    }
    return !!newPost
  }

  // 处理点赞
  const handleLikePost = async (postId: string) => {
    await likePost(postId)
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a2 2 0 01-2-2v-6a2 2 0 012-2h2V4a2 2 0 012-2h4a2 2 0 012 2v4z" />
            </svg>
          </div>
          <p className="text-sm">社交动态</p>
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
            <div className="w-10 h-10 bg-gradient-to-br from-retro-purple via-retro-pink to-retro-blue rounded-xl flex items-center justify-center shadow-xl border-2 border-white/20 animate-pixel-glow">
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-white/5 rounded-xl"></div>
              <svg className="relative w-5 h-5 text-white drop-shadow-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a2 2 0 01-2-2v-6a2 2 0 012-2h2V4a2 2 0 012-2h4a2 2 0 012 2v4z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-white text-xl font-bold font-pixel tracking-wide drop-shadow-sm">SOCIAL FEED</h3>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-2 h-2 bg-retro-purple rounded-full animate-pulse"></div>
                <span className="text-retro-textMuted text-xs font-retro tracking-wide">COMMUNITY POSTS</span>
                {isRefreshing && (
                  <div className="flex items-center gap-1 ml-2">
                    <div className="w-2 h-2 bg-retro-cyan rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-retro-blue rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-retro-purple rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={refreshPosts}
              disabled={isRefreshing}
              className="group relative overflow-hidden p-3 bg-gradient-to-br from-retro-bg-dark/80 to-retro-bg-darker/80 hover:from-retro-blue/20 hover:to-retro-cyan/20 rounded-lg border-2 border-retro-border hover:border-retro-cyan/50 transition-all duration-200 disabled:opacity-50 shadow-lg"
              title="Refresh feed"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-retro-cyan/5 to-retro-blue/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <svg className={`relative w-5 h-5 text-retro-cyan drop-shadow-sm ${isRefreshing ? 'animate-spin' : 'group-hover:rotate-180'} transition-transform duration-300`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="group relative overflow-hidden bg-gradient-to-r from-retro-purple via-retro-pink to-retro-blue hover:from-retro-blue hover:via-retro-cyan hover:to-retro-green text-white font-bold py-2 px-5 rounded-xl border-2 border-white/20 hover:border-white/40 transition-all duration-300 shadow-lg hover:shadow-2xl transform hover:scale-[1.02] active:scale-[0.98] backdrop-blur-sm"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-white/20 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative flex items-center gap-2">
                <div className="w-5 h-5 bg-white/20 rounded-lg flex items-center justify-center">
                  <span className="text-sm">{showCreateForm ? '✕' : '✏️'}</span>
                </div>
                <span className="font-pixel text-sm tracking-wide drop-shadow-lg">
                  {showCreateForm ? 'CANCEL' : 'NEW POST'}
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* 创建帖子表单 */}
      {showCreateForm && (
        <div className="flex-shrink-0 border-b border-retro-border">
          <CreatePostForm
            onSubmit={handleCreatePost}
            onCancel={() => setShowCreateForm(false)}
            isMobile={isMobile}
          />
        </div>
      )}

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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a2 2 0 01-2-2v-6a2 2 0 012-2h2V4a2 2 0 012-2h4a2 2 0 012 2v4z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-white mb-2">还没有帖子</h3>
            <p className="text-retro-textMuted text-sm mb-4">
              成为第一个分享动态的人吧！
            </p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-4 py-2 bg-gradient-to-r from-retro-purple to-retro-pink text-white rounded-lg hover:shadow-lg transition-all duration-200"
            >
              发布第一个帖子
            </button>
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
                  isMobile={isMobile}
                />
              ))}
              
              {/* 加载更多按钮 */}
              {pagination.hasNextPage && (
                <div className="flex justify-center py-4">
                  <button
                    onClick={handleLoadMore}
                    disabled={isRefreshing}
                    className="px-4 py-2 bg-retro-surface text-white rounded-lg hover:bg-retro-surface/80 transition-colors disabled:opacity-50"
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
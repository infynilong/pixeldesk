'use client'

import { useState, useEffect } from 'react'
import { useSocialPosts } from '@/lib/hooks/useSocialPosts'
import { useCurrentUser } from '@/lib/hooks/useCurrentUser'
import { useUser } from '@/contexts/UserContext'
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
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)

  // 使用新的用户hook获取当前用户信息
  const { currentUser, userId: currentUserId, isLoading: isUserLoading, error: userError } = useCurrentUser()

  // 使用 UserContext 获取真实的登录状态（排除临时玩家）
  const { user } = useUser()

  // 正确的登录状态判断：只有 UserContext 的 user 存在才算真正登录
  // 临时玩家虽然有 currentUser，但 user 为 null
  const isAuthenticated = !!user

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

  // 处理点击发帖按钮
  const handlePostButtonClick = () => {
    if (!isAuthenticated) {
      setShowLoginPrompt(true)
      return
    }
    setShowCreateForm(!showCreateForm)
  }

  // 处理创建帖子
  const handleCreatePost = async (postData: CreatePostData) => {
    if (!isAuthenticated) {
      setShowLoginPrompt(true)
      return false
    }
    const newPost = await createPost(postData)
    if (newPost) {
      setShowCreateForm(false)
    }
    return !!newPost
  }

  // 处理点赞
  const handleLikePost = async (postId: string) => {
    // 检查登录状态
    if (!isAuthenticated) {
      setShowLoginPrompt(true)
      return
    }
    await likePost(postId)
  }

  // 处理回复计数更新
  const handleReplyCountUpdate = (postId: string, newCount: number) => {
    console.log(`回复计数更新：帖子 ${postId} 现在有 ${newCount} 个回复`)
    // 这里可以选择性地触发帖子列表的刷新
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
        <div className="text-gray-500">
          <div className="w-12 h-12 bg-gray-800 border border-gray-700 rounded-lg flex items-center justify-center mx-auto mb-2">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a2 2 0 01-2-2v-6a2 2 0 012-2h2V4a2 2 0 012-2h4a2 2 0 012 2v4z" />
            </svg>
          </div>
          <p className="text-sm font-mono">社交动态</p>
        </div>
      </div>
    )
  }

  const containerClasses = "h-full flex flex-col bg-transparent"

  return (
    <div className={containerClasses}>
      {/* 头部 - 深色极客风格 */}
      <div className="flex-shrink-0 p-4 border-b border-gray-800 bg-gray-900/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex-1">
              <h3 className="text-gray-200 text-lg font-medium font-mono">SOCIAL FEED</h3>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full  shadow-sm shadow-emerald-400/50"></div>
                <span className="text-gray-500 text-xs font-mono">COMMUNITY POSTS</span>
                {isRefreshing && (
                  <div className="flex items-center gap-1 ml-2">
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full " style={{ animationDelay: '0ms' }}></div>
                    <div className="w-1.5 h-1.5 bg-gray-500 rounded-full " style={{ animationDelay: '150ms' }}></div>
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full " style={{ animationDelay: '300ms' }}></div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={refreshPosts}
              disabled={isRefreshing}
              className="p-2 bg-gray-800 border border-gray-700 hover:bg-gray-700 rounded-lg  disabled:opacity-50"
              title="Refresh feed"
            >
              <svg className={`w-4 h-4 text-gray-400 ${isRefreshing ? '' : ''} `} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>

            <button
              onClick={handlePostButtonClick}
              className="bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-600 text-gray-300 hover:text-gray-200 py-2 px-3 rounded-lg  text-xs font-mono"
            >
              <div className="flex items-center gap-1.5">
                <span className="text-xs">{showCreateForm ? '✕' : '+'}</span>
                <span>{showCreateForm ? 'CANCEL' : 'POST'}</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* 登录提示模态框 */}
      {showLoginPrompt && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 border-2 border-retro-purple/50 rounded-xl p-6 max-w-md mx-4 shadow-2xl shadow-retro-purple/20">
            <div className="text-center space-y-4">
              {/* 图标 */}
              <div className="w-16 h-16 bg-gradient-to-br from-retro-purple to-retro-blue rounded-full flex items-center justify-center mx-auto shadow-lg shadow-retro-purple/30">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>

              {/* 标题和消息 */}
              <div>
                <h3 className="text-xl font-bold text-white mb-2 font-retro">需要登录</h3>
                <p className="text-gray-300 text-sm font-pixel">请先登录后再发布帖子</p>
              </div>

              {/* 按钮 */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowLoginPrompt(false)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg border border-gray-600 font-pixel text-sm transition-all"
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    setShowLoginPrompt(false)
                    // 这里可以触发登录流程，暂时只是关闭提示
                    alert('请在游戏主界面进行登录')
                  }}
                  className="flex-1 bg-gradient-to-r from-retro-purple to-retro-blue hover:from-retro-blue hover:to-retro-cyan text-white font-bold py-2 px-4 rounded-lg border border-white/20 shadow-lg shadow-retro-purple/30 font-pixel text-sm transition-all"
                >
                  前往登录
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 创建帖子表单 */}
      {showCreateForm && (
        <div className="flex-shrink-0 border-b border-gray-800 bg-gray-900/30">
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
          <div className="p-4 bg-red-950/50 border border-red-800/30 m-4 rounded-lg">
            <p className="text-red-300 text-sm font-mono">{error}</p>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <LoadingSpinner />
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <div className="w-16 h-16 bg-gray-800 border border-gray-700 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a2 2 0 01-2-2v-6a2 2 0 012-2h2V4a2 2 0 012-2h4a2 2 0 012 2v4z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-200 mb-2">暂无帖子</h3>
            <p className="text-gray-500 text-sm mb-4 font-mono">
              Be the first to share something
            </p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-600 text-gray-300 rounded-lg  text-sm font-mono"
            >
              CREATE FIRST POST
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
                  onReplyCountUpdate={handleReplyCountUpdate}
                  isMobile={isMobile}
                  isAuthenticated={isAuthenticated}
                  onShowLoginPrompt={() => setShowLoginPrompt(true)}
                />
              ))}
              
              {/* 加载更多按钮 */}
              {pagination.hasNextPage && (
                <div className="flex justify-center py-4">
                  <button
                    onClick={handleLoadMore}
                    disabled={isRefreshing}
                    className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 rounded-lg  disabled:opacity-50 text-sm font-mono"
                  >
                    {isRefreshing ? 'LOADING...' : 'LOAD MORE'}
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
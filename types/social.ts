export interface SocialUser {
  id: string
  name: string
  avatar?: string | null
  isOnline?: boolean
  lastSeen?: string | null
}

export interface Post {
  id: string
  title?: string | null
  content: string
  type: 'TEXT' | 'IMAGE' | 'MIXED'
  imageUrl?: string | null
  isPublic: boolean
  likeCount: number
  replyCount: number
  viewCount: number
  createdAt: string
  updatedAt: string
  author: SocialUser
  isLiked?: boolean
  replies?: PostReply[]
  _count?: {
    replies: number
    likes: number
  }
}

export interface PostReply {
  id: string
  postId: string
  content: string
  createdAt: string
  updatedAt: string
  author: SocialUser
}

export interface PostLike {
  id: string
  postId: string
  userId: string
  likedAt: string
}

export interface CreatePostData {
  title?: string
  content: string
  type?: 'TEXT' | 'IMAGE' | 'MIXED'
  imageUrl?: string
}

export interface CreateReplyData {
  content: string
}

export interface PostsPagination {
  page: number
  limit: number
  totalCount: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export interface PostsResponse {
  success: boolean
  data?: {
    posts: Post[]
    pagination: PostsPagination
  }
  error?: string
}

export interface PostResponse {
  success: boolean
  data?: Post
  error?: string
}

export interface RepliesResponse {
  success: boolean
  data?: {
    replies: PostReply[]
    pagination: PostsPagination
  }
  error?: string
}

export interface LikeResponse {
  success: boolean
  data?: {
    action: 'liked' | 'unliked'
    likeCount: number
    isLiked: boolean
  }
  error?: string
}
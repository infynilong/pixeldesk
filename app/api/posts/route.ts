import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { rewardPoints } from '@/lib/pointsManager'

// 获取帖子列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const sortBy = searchParams.get('sortBy') || 'latest' // latest, popular, trending
    const authorId = searchParams.get('authorId')
    const postType = searchParams.get('type') // 可选：TEXT, IMAGE, MARKDOWN

    const skip = (page - 1) * limit

    // 构建查询条件
    const where: any = {
      isPublic: true,
      isDraft: false // 只显示已发布的帖子，不显示草稿
    }

    if (authorId) {
      where.authorId = authorId
    }

    // 根据类型筛选
    if (postType) {
      where.type = postType
    }

    // 构建排序条件
    let orderBy: any = {}
    switch (sortBy) {
      case 'popular':
        orderBy = { likeCount: 'desc' }
        break
      case 'trending':
        orderBy = [
          { likeCount: 'desc' },
          { replyCount: 'desc' },
          { createdAt: 'desc' }
        ]
        break
      case 'latest':
      default:
        orderBy = { createdAt: 'desc' }
        break
    }

    const [posts, totalCount] = await Promise.all([
      prisma.post.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              avatar: true,
              customAvatar: true
            }
          },
          _count: {
            select: {
              replies: true,
              likes: true
            }
          }
        }
      }),
      prisma.post.count({ where })
    ])

    const totalPages = Math.ceil(totalCount / limit)

    return NextResponse.json({
      success: true,
      data: {
        posts,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    })

  } catch (error) {
    console.error('Error fetching posts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch posts' },
      { status: 500 }
    )
  }
}

// 创建新帖子
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    // 验证用户身份 - 必须提供 userId
    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized: User authentication required',
          message: '需要登录才能发布帖子'
        },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      title,
      content,
      type = 'TEXT',
      imageUrl,
      summary,
      wordCount = 0,
      readTime = 1,
      tags = [],
      coverImage,
      isDraft = false,
      publishedAt
    } = body

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Content is required',
          message: '帖子内容不能为空'
        },
        { status: 400 }
      )
    }

    // 对非 MARKDOWN 类型的帖子进行长度限制
    if (type !== 'MARKDOWN' && content.length > 2000) {
      return NextResponse.json(
        {
          success: false,
          error: 'Content too long (max 2000 characters)',
          message: '内容过长（最多2000字符）'
        },
        { status: 400 }
      )
    }

    // 验证用户存在且账户有效
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true }
    })

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'User not found or invalid',
          message: '用户不存在或无效，请重新登录'
        },
        { status: 401 }
      )
    }

    const post = await prisma.post.create({
      data: {
        title: title?.trim() || null,
        content: content.trim(),
        type,
        imageUrl: imageUrl || null,
        authorId: userId,
        // 博客相关字段
        summary: summary || null,
        wordCount,
        readTime,
        tags,
        coverImage: coverImage || null,
        isDraft,
        publishedAt: publishedAt ? new Date(publishedAt) : null
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      }
    })

    // 奖励积分（仅对已发布的非草稿帖子）
    if (!isDraft) {
      const rewardKey = type === 'MARKDOWN' ? 'create_blog_reward' : 'create_post_reward'
      const postTypeText = type === 'MARKDOWN' ? '博客' : '帖子'

      rewardPoints(userId, rewardKey, `发布${postTypeText} ${post.id}`)
        .then(reward => {
          if (reward.success) {
            console.log(`✨ [POST posts] 用户 ${userId} 发布${postTypeText}获得 ${reward.points} 积分奖励`)
          }
        })
        .catch(err => {
          console.error('❌ [POST posts] 积分奖励失败:', err)
        })
    }

    return NextResponse.json({
      success: true,
      data: post
    })

  } catch (error) {
    console.error('Error creating post:', error)
    return NextResponse.json(
      { error: 'Failed to create post' },
      { status: 500 }
    )
  }
}
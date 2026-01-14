import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// 获取当前用户的博客列表（包括草稿）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || 'all' // all, published, draft

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const skip = (page - 1) * limit

    // 构建查询条件
    const where: any = {
      authorId: userId,
      type: 'MARKDOWN' // 只获取博客类型的帖子
    }

    // 状态筛选
    if (status === 'published') {
      where.isDraft = false
    } else if (status === 'draft') {
      where.isDraft = true
    }

    // 搜索条件
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
        { tags: { hasSome: [search] } }
      ]
    }

    const [posts, totalCount] = await Promise.all([
      prisma.posts.findMany({
        where,
        orderBy: [
          { isDraft: 'desc' }, // 草稿优先
          { updatedAt: 'desc' } // 按更新时间倒序
        ],
        skip,
        take: limit,
        select: {
          id: true,
          title: true,
          content: true,
          summary: true,
          tags: true,
          coverImage: true,
          isDraft: true,
          publishedAt: true,
          createdAt: true,
          updatedAt: true,
          viewCount: true,
          likeCount: true,
          replyCount: true,
          wordCount: true,
          readTime: true,
          _count: {
            select: {
              post_replies: true,
              post_likes: true
            }
          }
        }
      }),
      prisma.posts.count({ where })
    ])

    // 获取统计信息
    const stats = await prisma.posts.groupBy({
      by: ['isDraft'],
      where: {
        authorId: userId,
        type: 'MARKDOWN'
      },
      _count: true
    })

    const publishedCount = stats.find(s => !s.isDraft)?._count || 0
    const draftCount = stats.find(s => s.isDraft)?._count || 0

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
        },
        stats: {
          total: publishedCount + draftCount,
          published: publishedCount,
          draft: draftCount
        }
      }
    })

  } catch (error) {
    console.error('Error fetching my blogs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch blogs' },
      { status: 500 }
    )
  }
}

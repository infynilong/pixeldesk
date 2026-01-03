import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params
    const { searchParams } = new URL(request.url)
    const currentUserId = searchParams.get('currentUserId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const skip = (page - 1) * limit

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      )
    }

    // 获取用户的所有博客
    const [blogs, totalCount] = await Promise.all([
      prisma.posts.findMany({
        where: {
          authorId: userId,
          type: 'MARKDOWN',
          isDraft: false,
          isPublic: true
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              avatar: true
            }
          },
          likes: currentUserId ? {
            where: {
              userId: currentUserId
            },
            select: {
              userId: true
            }
          } : false
        }
      }),
      prisma.posts.count({
        where: {
          authorId: userId,
          type: 'MARKDOWN',
          isDraft: false,
          isPublic: true
        }
      })
    ])

    // 处理点赞状态
    const blogsWithLikeStatus = blogs.map(blog => ({
      ...blog,
      isLiked: currentUserId ? (blog.likes && blog.likes.length > 0) : false,
      likes: undefined
    }))

    const totalPages = Math.ceil(totalCount / limit)

    return NextResponse.json({
      success: true,
      data: {
        blogs: blogsWithLikeStatus,
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
    console.error('Error fetching user blogs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user blogs' },
      { status: 500 }
    )
  }
}

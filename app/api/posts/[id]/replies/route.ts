import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// 获取帖子的回复
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: postId } = params
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    
    const skip = (page - 1) * limit

    // 验证帖子存在
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true }
    })

    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      )
    }

    const [replies, totalCount] = await Promise.all([
      prisma.postReply.findMany({
        where: { postId },
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              avatar: true
            }
          }
        }
      }),
      prisma.postReply.count({ where: { postId } })
    ])

    const totalPages = Math.ceil(totalCount / limit)

    return NextResponse.json({
      success: true,
      data: {
        replies,
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
    console.error('Error fetching post replies:', error)
    return NextResponse.json(
      { error: 'Failed to fetch replies' },
      { status: 500 }
    )
  }
}

// 创建新回复
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: postId } = params
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { content } = body

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      )
    }

    if (content.length > 1000) {
      return NextResponse.json(
        { error: 'Reply too long (max 1000 characters)' },
        { status: 400 }
      )
    }

    // 验证帖子存在，并获取作者信息
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { 
        id: true, 
        authorId: true,
        title: true,
        content: true,
        author: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      )
    }

    // 验证用户存在
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // 使用事务创建回复并更新帖子的回复计数
    const result = await prisma.$transaction(async (tx) => {
      const reply = await tx.postReply.create({
        data: {
          postId,
          authorId: userId,
          content: content.trim()
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

      // 更新帖子回复计数
      await tx.post.update({
        where: { id: postId },
        data: { replyCount: { increment: 1 } }
      })

      // 创建通知：如果回复者不是帖子作者，为帖子作者创建通知
      if (post.authorId !== userId) {
        await tx.notification.create({
          data: {
            userId: post.authorId, // 帖子作者接收通知
            type: 'POST_REPLY',
            title: '新的回复',
            message: `${user.name} 回复了你的帖子${post.title ? `"${post.title}"` : ''}`,
            relatedPostId: postId,
            relatedReplyId: reply.id,
            relatedUserId: userId // 回复者
          }
        })
        console.log(`✅ [PostReply] 已为用户 ${post.authorId} 创建回复通知`)
      }

      return reply
    })

    return NextResponse.json({
      success: true,
      data: result
    })

  } catch (error) {
    console.error('Error creating reply:', error)
    return NextResponse.json(
      { error: 'Failed to create reply' },
      { status: 500 }
    )
  }
}
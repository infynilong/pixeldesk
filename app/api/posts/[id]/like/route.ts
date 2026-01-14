import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { randomUUID } from 'crypto'

// 点赞/取消点赞帖子
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: postId } = params
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    // 验证用户身份
    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized: User authentication required',
          message: '需要登录才能点赞'
        },
        { status: 401 }
      )
    }

    // 验证帖子存在，并获取作者信息
    const post = await prisma.posts.findUnique({
      where: { id: postId },
      select: {
        id: true,
        likeCount: true,
        authorId: true,
        title: true,
        content: true,
        users: {
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

    // 验证用户存在，并获取用户名
    const user = await prisma.users.findUnique({
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

    // 检查是否已经点赞
    const existingLike = await prisma.post_likes.findUnique({
      where: {
        postId_userId: {
          postId,
          userId
        }
      }
    })

    let action: 'liked' | 'unliked'
    let newLikeCount: number

    if (existingLike) {
      // 取消点赞
      await prisma.$transaction(async (tx) => {
        await tx.post_likes.delete({
          where: { id: existingLike.id }
        })

        await tx.posts.update({
          where: { id: postId },
          data: { likeCount: { decrement: 1 } }
        })
      })

      action = 'unliked'
      newLikeCount = post.likeCount - 1
    } else {
      // 点赞
      await prisma.$transaction(async (tx) => {
        await tx.post_likes.create({
          data: {
            id: randomUUID(),
            postId,
            userId
          }
        })

        await tx.posts.update({
          where: { id: postId },
          data: { likeCount: { increment: 1 } }
        })

        // 创建通知：如果点赞者不是帖子作者，为帖子作者创建点赞通知
        if (post.authorId !== userId) {
          await tx.notifications.create({
            data: {
              id: randomUUID(),
              userId: post.authorId, // 帖子作者接收通知
              type: 'POST_LIKE',
              title: '新的点赞',
              message: `${user.name} 点赞了你的帖子${post.title ? `"${post.title}"` : ''}`,
              relatedPostId: postId,
              relatedUserId: userId, // 点赞者
              updatedAt: new Date()
            }
          })
          console.log(`✅ [PostLike] 已为用户 ${post.authorId} 创建点赞通知`)
        }
      })

      action = 'liked'
      newLikeCount = post.likeCount + 1
    }

    return NextResponse.json({
      success: true,
      data: {
        action,
        likeCount: newLikeCount,
        isLiked: action === 'liked'
      }
    })

  } catch (error) {
    console.error('Error toggling post like:', error)
    return NextResponse.json(
      { error: 'Failed to toggle like' },
      { status: 500 }
    )
  }
}
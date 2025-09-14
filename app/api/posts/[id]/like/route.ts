import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// 点赞/取消点赞帖子
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

    // 验证帖子存在，并获取作者信息
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { 
        id: true, 
        likeCount: true,
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

    // 验证用户存在，并获取用户名
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

    // 检查是否已经点赞
    const existingLike = await prisma.postLike.findUnique({
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
        await tx.postLike.delete({
          where: { id: existingLike.id }
        })
        
        await tx.post.update({
          where: { id: postId },
          data: { likeCount: { decrement: 1 } }
        })
      })
      
      action = 'unliked'
      newLikeCount = post.likeCount - 1
    } else {
      // 点赞
      await prisma.$transaction(async (tx) => {
        await tx.postLike.create({
          data: {
            postId,
            userId
          }
        })
        
        await tx.post.update({
          where: { id: postId },
          data: { likeCount: { increment: 1 } }
        })

        // 创建通知：如果点赞者不是帖子作者，为帖子作者创建点赞通知
        if (post.authorId !== userId) {
          await tx.notification.create({
            data: {
              userId: post.authorId, // 帖子作者接收通知
              type: 'POST_LIKE',
              title: '新的点赞',
              message: `${user.name} 点赞了你的帖子${post.title ? `"${post.title}"` : ''}`,
              relatedPostId: postId,
              relatedUserId: userId // 点赞者
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
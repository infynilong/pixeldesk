import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// 更新 post 的审核状态
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()
    const { moderationStatus, reviewNotes, reviewedBy } = body

    // 验证状态值
    const validStatuses = ['pending', 'approved', 'rejected', 'flagged']
    if (!moderationStatus || !validStatuses.includes(moderationStatus)) {
      return NextResponse.json(
        { error: 'Invalid moderation status' },
        { status: 400 }
      )
    }

    // 获取当前 post
    const post = await prisma.posts.findUnique({
      where: { id }
    })

    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      )
    }

    // 更新 post 状态
    const updatedPost = await prisma.posts.update({
      where: { id },
      data: {
        moderationStatus,
        reviewNotes: reviewNotes || post.reviewNotes,
        reviewedBy: reviewedBy || post.reviewedBy,
        reviewedAt: new Date(),
        // 如果审核拒绝，自动禁用；如果审核通过，自动启用
        isActive: moderationStatus === 'approved' ? true :
                 moderationStatus === 'rejected' ? false :
                 post.isActive
      }
    })

    return NextResponse.json({
      success: true,
      data: updatedPost
    })

  } catch (error) {
    console.error('Error updating post status:', error)
    return NextResponse.json(
      { error: 'Failed to update post status' },
      { status: 500 }
    )
  }
}

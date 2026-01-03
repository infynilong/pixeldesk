import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// 切换 post 的启用/禁用状态
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()
    const { isActive, reviewNotes, reviewedBy } = body

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
        isActive: isActive !== undefined ? isActive : !post.isActive,
        reviewNotes: reviewNotes || post.reviewNotes,
        reviewedBy: reviewedBy || post.reviewedBy,
        reviewedAt: new Date(),
        moderationStatus: isActive === false ? 'rejected' :
                         (isActive === true && post.moderationStatus === 'rejected') ? 'approved' :
                         post.moderationStatus
      }
    })

    return NextResponse.json({
      success: true,
      data: updatedPost
    })

  } catch (error) {
    console.error('Error toggling post status:', error)
    return NextResponse.json(
      { error: 'Failed to toggle post status' },
      { status: 500 }
    )
  }
}

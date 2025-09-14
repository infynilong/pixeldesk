import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// 标记用户所有通知为已读
export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'User ID is required'
      }, { status: 400 })
    }

    // 更新所有未读通知为已读
    const result = await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false
      },
      data: {
        isRead: true
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        updatedCount: result.count
      }
    })

  } catch (error) {
    console.error('批量标记已读失败:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to mark notifications as read'
    }, { status: 500 })
  }
}
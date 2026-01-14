import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

interface Params {
  params: {
    id: string
  }
}

// 更新单个通知状态
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = params
    const body = await request.json()
    const { isRead } = body

    if (typeof isRead !== 'boolean') {
      return NextResponse.json({
        success: false,
        error: 'isRead must be a boolean'
      }, { status: 400 })
    }

    const notification = await prisma.notifications.update({
      where: { id },
      data: { isRead },
      include: {
        posts: {
          select: {
            id: true,
            title: true,
            content: true,
            users: {
              select: {
                id: true,
                name: true,
                avatar: true
              }
            }
          }
        },
        users_notifications_relatedUserIdTousers: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      }
    })

    // 将 posts 映射为 relatedPost, users_notifications_relatedUserIdTousers 映射为 relatedUser 以保持 API 兼容性
    const notificationAny = notification as any
    const notificationWithAuthor = {
      ...notification,
      relatedPost: notificationAny.posts ? {
        ...notificationAny.posts,
        author: notificationAny.posts.users,
        users: undefined
      } : null,
      relatedUser: notificationAny.users_notifications_relatedUserIdTousers
    }

    return NextResponse.json({
      success: true,
      data: notificationWithAuthor
    })

  } catch (error) {
    console.error('更新通知状态失败:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to update notification'
    }, { status: 500 })
  }
}

// 删除通知
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { id } = params

    await prisma.notifications.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      message: 'Notification deleted successfully'
    })

  } catch (error) {
    console.error('删除通知失败:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to delete notification'
    }, { status: 500 })
  }
}
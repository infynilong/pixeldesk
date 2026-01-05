import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { NotificationType } from '@/types/notifications'

// 获取用户通知列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const unreadOnly = searchParams.get('unreadOnly') === 'true'

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'User ID is required'
      }, { status: 400 })
    }

    const skip = (page - 1) * limit

    // 构建查询条件
    const where: any = { userId }
    if (unreadOnly) {
      where.isRead = false
    }

    // 获取通知列表
    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notifications.findMany({
        where,
        include: {
          relatedPost: {
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
          relatedUser: {
            select: {
              id: true,
              name: true,
              avatar: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.notifications.count({ where: { userId } }),
      prisma.notifications.count({ where: { userId, isRead: false } })
    ])

    const totalPages = Math.ceil(total / limit)
    const hasNextPage = page < totalPages

    // 将 relatedPost.users 映射为 relatedPost.author 以保持 API 兼容性
    const notificationsWithAuthor = notifications.map(notification => ({
      ...notification,
      relatedPost: notification.relatedPost ? {
        ...notification.relatedPost,
        author: notification.relatedPost.users,
        users: undefined
      } : null
    }))

    return NextResponse.json({
      success: true,
      data: {
        notifications: notificationsWithAuthor,
        pagination: {
          page,
          totalPages,
          hasNextPage,
          total,
          unreadCount
        }
      }
    })

  } catch (error) {
    console.error('获取通知失败:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch notifications'
    }, { status: 500 })
  }
}

// 创建新通知
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, type, title, message, relatedPostId, relatedReplyId, relatedUserId } = body

    if (!userId || !type || !title || !message) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 })
    }

    // 验证通知类型
    if (!Object.values(NotificationType).includes(type)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid notification type'
      }, { status: 400 })
    }

    const notification = await prisma.notifications.create({
      data: {
        userId,
        type,
        title,
        message,
        relatedPostId,
        relatedReplyId,
        relatedUserId
      },
      include: {
        relatedPost: {
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
        relatedUser: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      }
    })

    // 将 relatedPost.users 映射为 relatedPost.author 以保持 API 兼容性
    const notificationWithAuthor = {
      ...notification,
      relatedPost: notification.relatedPost ? {
        ...notification.relatedPost,
        author: notification.relatedPost.users,
        users: undefined
      } : null
    }

    return NextResponse.json({
      success: true,
      data: notificationWithAuthor
    })

  } catch (error) {
    console.error('创建通知失败:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to create notification'
    }, { status: 500 })
  }
}
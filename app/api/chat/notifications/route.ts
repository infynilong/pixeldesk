import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/db'
import { verifyToken } from '../../../../lib/auth'

// GET /api/chat/notifications - Get user's notifications
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const payload = verifyToken(token)
    if (!payload?.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const userId = payload.userId
    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get('limit') || '50')
    const onlyUnread = url.searchParams.get('unread') === 'true'

    // Get notifications by finding messages in conversations where user is participant
    // and the message is not from the user and was created after their last read time
    
    // First get the user's last read times for all conversations
    const userConversations = await prisma.conversation.findMany({
      where: {
        participants: {
          some: {
            userId: userId,
            isActive: true
          }
        }
      },
      select: { id: true }
    })
    
    const conversationIds = userConversations.map(c => c.id)
    
    const participant = await prisma.conversationParticipant.findFirst({
      where: {
        userId: userId,
        conversationId: { in: conversationIds }
      },
      select: { lastReadAt: true }
    })
    
    const lastReadAt = participant?.lastReadAt || new Date(0)
    
    const notifications = await prisma.message.findMany({
      where: {
        AND: [
          {
            conversation: {
              participants: {
                some: {
                  userId: userId,
                  isActive: true
                }
              }
            }
          },
          {
            senderId: {
              not: userId
            }
          },
          ...(onlyUnread ? [{
            createdAt: {
              gt: lastReadAt
            }
          }] : [])
        ]
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        },
        conversation: {
          include: {
            participants: {
              where: {
                userId: userId
              },
              select: {
                lastReadAt: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    })

    // Transform messages to notification format
    const formattedNotifications = notifications.map(message => {
      const userParticipant = message.conversation.participants[0]
      const isRead = userParticipant ? message.createdAt <= userParticipant.lastReadAt : false

      return {
        id: `notif_${message.id}`,
        conversationId: message.conversationId,
        messageId: message.id,
        senderId: message.senderId,
        senderName: message.sender.name || message.sender.email,
        content: message.content,
        timestamp: message.createdAt.toISOString(),
        isRead: isRead
      }
    })

    return NextResponse.json({
      success: true,
      notifications: formattedNotifications,
      totalCount: formattedNotifications.length
    })

  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
}

// POST /api/chat/notifications/mark-read - Mark notifications as read
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const payload = verifyToken(token)
    if (!payload?.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const userId = payload.userId
    const body = await request.json()
    const { conversationIds, markAll = false } = body

    if (markAll) {
      // Mark all conversations as read by updating lastReadAt to current time
      await prisma.conversationParticipant.updateMany({
        where: {
          userId: userId,
          isActive: true
        },
        data: {
          lastReadAt: new Date()
        }
      })
    } else if (conversationIds && Array.isArray(conversationIds)) {
      // Mark specific conversations as read
      await prisma.conversationParticipant.updateMany({
        where: {
          userId: userId,
          conversationId: {
            in: conversationIds
          },
          isActive: true
        },
        data: {
          lastReadAt: new Date()
        }
      })
    } else {
      return NextResponse.json(
        { error: 'Invalid request: provide conversationIds or set markAll to true' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Notifications marked as read'
    })

  } catch (error) {
    console.error('Error marking notifications as read:', error)
    return NextResponse.json(
      { error: 'Failed to mark notifications as read' },
      { status: 500 }
    )
  }
}

// DELETE /api/chat/notifications - Clear old notifications
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const payload = verifyToken(token)
    if (!payload?.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const userId = payload.userId

    const url = new URL(request.url)
    const olderThanDays = parseInt(url.searchParams.get('olderThanDays') || '30')
    
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)

    // We don't actually delete messages, but we can update the user's lastReadAt
    // to effectively "clear" old notifications by marking them as read
    await prisma.conversationParticipant.updateMany({
      where: {
        userId: userId,
        isActive: true,
        lastReadAt: {
          lt: cutoffDate
        }
      },
      data: {
        lastReadAt: cutoffDate
      }
    })

    return NextResponse.json({
      success: true,
      message: `Cleared notifications older than ${olderThanDays} days`
    })

  } catch (error) {
    console.error('Error clearing notifications:', error)
    return NextResponse.json(
      { error: 'Failed to clear notifications' },
      { status: 500 }
    )
  }
}
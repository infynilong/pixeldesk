import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { ConversationManager } from '@/lib/conversationManager'
import { ApiResponse, ConversationsResponse, CreateConversationRequest, ChatConversation } from '@/types/chat'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'User ID required',
        code: 'MISSING_USER_ID',
        retryable: false
      } as ApiResponse<null>, { status: 400 })
    }

    // Validate user exists
    const userExists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }
    })

    if (!userExists) {
      return NextResponse.json({ 
        success: false, 
        error: 'User not found',
        code: 'USER_NOT_FOUND',
        retryable: false
      } as ApiResponse<null>, { status: 404 })
    }

    // Get user's conversations with participants and last message
    const conversations = await prisma.conversation.findMany({
      where: {
        participants: {
          some: {
            userId: userId,
            isActive: true
          }
        }
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true
              }
            }
          },
          where: {
            isActive: true
          }
        },
        messages: {
          orderBy: {
            createdAt: 'desc'
          },
          take: 1,
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                avatar: true
              }
            }
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    })

    // Transform to response format and calculate unread counts
    const transformedConversations: ChatConversation[] = await Promise.all(
      conversations.map(async (conv) => {
        // Get unread count for this user
        const userParticipant = conv.participants.find(p => p.userId === userId)
        const unreadCount = await prisma.message.count({
          where: {
            conversationId: conv.id,
            createdAt: {
              gt: userParticipant?.lastReadAt || new Date(0)
            },
            senderId: {
              not: userId
            }
          }
        })

        return {
          id: conv.id,
          type: conv.type as 'private' | 'group',
          name: conv.name || undefined,
          participants: conv.participants.map(p => ({
            id: p.id,
            userId: p.userId,
            userName: p.user.name,
            userAvatar: p.user.avatar || undefined,
            joinedAt: p.joinedAt.toISOString(),
            lastReadAt: p.lastReadAt.toISOString(),
            isActive: p.isActive
          })),
          lastMessage: conv.messages[0] ? {
            id: conv.messages[0].id,
            conversationId: conv.messages[0].conversationId,
            senderId: conv.messages[0].senderId,
            senderName: conv.messages[0].sender.name,
            senderAvatar: conv.messages[0].sender.avatar || undefined,
            content: conv.messages[0].content,
            type: conv.messages[0].type as any,
            status: conv.messages[0].status as any,
            createdAt: conv.messages[0].createdAt.toISOString(),
            updatedAt: conv.messages[0].updatedAt.toISOString()
          } : undefined,
          unreadCount,
          createdAt: conv.createdAt.toISOString(),
          updatedAt: conv.updatedAt.toISOString()
        }
      })
    )

    const response: ConversationsResponse = {
      conversations: transformedConversations,
      totalCount: transformedConversations.length
    }

    return NextResponse.json({ 
      success: true, 
      data: response 
    } as ApiResponse<ConversationsResponse>)

  } catch (error) {
    console.error('Error fetching conversations:', error)
    
    // Handle specific database errors
    let errorCode = 'INTERNAL_SERVER_ERROR'
    let errorMessage = 'Internal server error'
    let statusCode = 500
    let retryable = true

    if (error instanceof Error) {
      if (error.message.includes('prisma') || error.message.includes('database')) {
        errorCode = 'DATABASE_ERROR'
        errorMessage = 'Database connection error'
        retryable = true
      } else if (error.message.includes('timeout')) {
        errorCode = 'REQUEST_TIMEOUT'
        errorMessage = 'Request timeout'
        retryable = true
      }
    }

    return NextResponse.json({ 
      success: false, 
      error: errorMessage,
      code: errorCode,
      retryable
    } as ApiResponse<null>, { status: statusCode })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateConversationRequest = await request.json()
    const { participantIds, type = 'private', name } = body
    
    if (!participantIds || participantIds.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Participant IDs required',
        code: 'MISSING_PARTICIPANTS',
        retryable: false
      } as ApiResponse<null>, { status: 400 })
    }

    // Validate participant IDs
    const validParticipants = await prisma.user.findMany({
      where: {
        id: { in: participantIds }
      },
      select: { id: true }
    })

    if (validParticipants.length !== participantIds.length) {
      const invalidIds = participantIds.filter(id => 
        !validParticipants.some(p => p.id === id)
      )
      
      return NextResponse.json({ 
        success: false, 
        error: `Invalid participant IDs: ${invalidIds.join(', ')}`,
        code: 'INVALID_PARTICIPANTS',
        retryable: false,
        data: { invalidIds }
      } as ApiResponse<{ invalidIds: string[] }>, { status: 400 })
    }

    // Validate conversation type constraints
    if (type === 'private' && participantIds.length !== 2) {
      return NextResponse.json({ 
        success: false, 
        error: 'Private conversations must have exactly 2 participants',
        code: 'INVALID_CONVERSATION_TYPE',
        retryable: false
      } as ApiResponse<null>, { status: 400 })
    }

    // Check if private conversation already exists
    if (type === 'private') {
      const existingConversation = await prisma.conversation.findFirst({
        where: {
          type: 'private',
          participants: {
            every: {
              userId: { in: participantIds },
              isActive: true
            }
          }
        },
        include: {
          participants: {
            where: { isActive: true }
          }
        }
      })

      if (existingConversation && 
          existingConversation.participants.length === participantIds.length) {
        return NextResponse.json({ 
          success: false, 
          error: 'Private conversation already exists',
          code: 'CONVERSATION_EXISTS',
          retryable: false,
          data: { existingConversationId: existingConversation.id }
        } as ApiResponse<{ existingConversationId: string }>, { status: 409 })
      }
    }

    // Use ConversationManager to create conversation
    const conversation = await ConversationManager.createConversation(
      participantIds,
      type,
      name
    )

    return NextResponse.json({ 
      success: true, 
      data: conversation 
    } as ApiResponse<ChatConversation>, { status: 201 })

  } catch (error) {
    console.error('Error creating conversation:', error)
    
    // Handle specific errors
    let errorCode = 'INTERNAL_SERVER_ERROR'
    let errorMessage = 'Internal server error'
    let statusCode = 500
    let retryable = true

    if (error instanceof Error) {
      if (error.message.includes('prisma') || error.message.includes('database')) {
        errorCode = 'DATABASE_ERROR'
        errorMessage = 'Database connection error'
        retryable = true
      } else if (error.message.includes('unique') || error.message.includes('duplicate')) {
        errorCode = 'DUPLICATE_CONVERSATION'
        errorMessage = 'Conversation already exists'
        retryable = false
        statusCode = 409
      }
    }

    return NextResponse.json({ 
      success: false, 
      error: errorMessage,
      code: errorCode,
      retryable
    } as ApiResponse<null>, { status: statusCode })
  }
}
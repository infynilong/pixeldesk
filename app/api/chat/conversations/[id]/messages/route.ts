import { NextRequest, NextResponse } from 'next/server'
import { MessageManager } from '@/lib/messageManager'
import { ApiResponse, MessagesResponse, SendMessageRequest, ChatMessage } from '@/types/chat'
import { prisma } from '@/lib/db'
import { broadcastMessageToConversation, createBroadcastMessage } from '@/lib/websocketUtils'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const conversationId = params.id
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const limit = parseInt(searchParams.get('limit') || '50')
    const cursor = searchParams.get('cursor')
    
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

    // Validate conversation exists and user is participant
    const participant = await prisma.conversationParticipant.findFirst({
      where: {
        userId,
        conversationId,
        isActive: true
      }
    })

    if (!participant) {
      return NextResponse.json({ 
        success: false, 
        error: 'Conversation not found or access denied',
        code: 'CONVERSATION_NOT_FOUND',
        retryable: false
      } as ApiResponse<null>, { status: 404 })
    }

    // Validate limit parameter
    if (limit < 1 || limit > 100) {
      return NextResponse.json({ 
        success: false, 
        error: 'Limit must be between 1 and 100',
        code: 'INVALID_LIMIT',
        retryable: false
      } as ApiResponse<null>, { status: 400 })
    }

    // Use MessageManager to get messages
    const result = await MessageManager.getMessages(conversationId, userId, {
      limit,
      cursor: cursor || undefined
    })

    const response: MessagesResponse = {
      messages: result.messages,
      totalCount: result.totalCount,
      hasMore: result.hasMore,
      nextCursor: result.nextCursor
    }

    return NextResponse.json({ 
      success: true, 
      data: response 
    } as ApiResponse<MessagesResponse>)

  } catch (error) {
    console.error('Error fetching messages:', error)
    
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
      } else if (error.message.includes('timeout')) {
        errorCode = 'REQUEST_TIMEOUT'
        errorMessage = 'Request timeout'
        retryable = true
      } else if (error.message.includes('not found') || error.message.includes('not exist')) {
        errorCode = 'CONVERSATION_NOT_FOUND'
        errorMessage = 'Conversation not found'
        retryable = false
        statusCode = 404
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

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const conversationId = params.id
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const body: SendMessageRequest = await request.json()
    const { content, type = 'text' } = body
    
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

    // Validate conversation exists and user is participant
    const participant = await prisma.conversationParticipant.findFirst({
      where: {
        userId,
        conversationId,
        isActive: true
      }
    })

    if (!participant) {
      return NextResponse.json({ 
        success: false, 
        error: 'Conversation not found or access denied',
        code: 'CONVERSATION_NOT_FOUND',
        retryable: false
      } as ApiResponse<null>, { status: 404 })
    }

    // Validate message content
    if (!content || content.trim().length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Message content cannot be empty',
        code: 'EMPTY_MESSAGE',
        retryable: false
      } as ApiResponse<null>, { status: 400 })
    }

    if (content.length > 5000) {
      return NextResponse.json({ 
        success: false, 
        error: 'Message content too long (max 5000 characters)',
        code: 'MESSAGE_TOO_LONG',
        retryable: false
      } as ApiResponse<null>, { status: 400 })
    }

    // Validate message type
    const validTypes = ['text', 'image', 'file', 'system']
    if (!validTypes.includes(type)) {
      return NextResponse.json({ 
        success: false, 
        error: `Invalid message type. Must be one of: ${validTypes.join(', ')}`,
        code: 'INVALID_MESSAGE_TYPE',
        retryable: false
      } as ApiResponse<null>, { status: 400 })
    }

    // Use MessageManager to create message
    const message = await MessageManager.createMessage(
      conversationId,
      userId,
      content,
      type
    )

    // Get conversation details for broadcasting
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: {
          where: { isActive: true },
          select: {
            userId: true,
            user: {
              select: {
                id: true,
                name: true,
                avatar: true
              }
            }
          }
        }
      }
    });

    // Broadcast message to conversation participants
    try {
      const broadcastMessage = createBroadcastMessage({
        ...message,
        sender: {
          name: message.senderName,
          avatar: message.senderAvatar
        }
      }, conversation);
      
      await broadcastMessageToConversation(conversationId, broadcastMessage, userId);
    } catch (broadcastError) {
      console.error('Error broadcasting message:', broadcastError);
      // Don't fail the request if broadcasting fails
    }

    return NextResponse.json({ 
      success: true, 
      data: message 
    } as ApiResponse<ChatMessage>, { status: 201 })

  } catch (error) {
    console.error('Error sending message:', error)
    
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
      } else if (error.message.includes('timeout')) {
        errorCode = 'REQUEST_TIMEOUT'
        errorMessage = 'Request timeout'
        retryable = true
      } else if (error.message.includes('not found') || error.message.includes('not exist')) {
        errorCode = 'CONVERSATION_NOT_FOUND'
        errorMessage = 'Conversation not found'
        retryable = false
        statusCode = 404
      } else if (error.message.includes('rate limit') || error.message.includes('too many')) {
        errorCode = 'RATE_LIMIT_EXCEEDED'
        errorMessage = 'Rate limit exceeded. Please try again later.'
        retryable = true
        statusCode = 429
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
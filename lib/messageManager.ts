import { prisma } from '@/lib/db'
import { ChatMessage } from '@/types/chat'

// Import WebSocket handler functions (will be used dynamically)
// We'll use dynamic imports or direct function calls to avoid module conflicts

export class MessageManager {
  /**
   * Create and save a new message
   */
  static async createMessage(
    conversationId: string,
    senderId: string,
    content: string,
    type: 'text' | 'emoji' | 'system' | 'image' = 'text'
  ): Promise<ChatMessage> {
    // Validate input
    if (!content || content.trim().length === 0) {
      throw new Error('Message content cannot be empty')
    }

    if (content.length > 4000) {
      throw new Error('Message content too long (max 4000 characters)')
    }

    // Verify sender is participant in conversation
    const participant = await prisma.conversationParticipant.findFirst({
      where: {
        conversationId,
        userId: senderId,
        isActive: true
      }
    })

    if (!participant) {
      throw new Error('User is not a participant in this conversation')
    }

    // Create message and update conversation timestamp in transaction
    const [message] = await prisma.$transaction([
      prisma.message.create({
        data: {
          conversationId,
          senderId,
          content: content.trim(),
          type,
          status: 'sent'
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              avatar: true
            }
          },
          conversation: {
            include: {
              participants: {
                where: { isActive: true },
                select: {
                  userId: true
                }
              }
            }
          }
        }
      }),
      prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() }
      })
    ])

    const transformedMessage = this.transformMessage(message)

    // WebSocket broadcasting is handled by the WebSocket handler when messages
    // are sent via WebSocket. For HTTP API calls, broadcasting should be handled
    // at the API level or by a separate service.
    console.log('Message created, WebSocket broadcasting should be handled separately');

    return transformedMessage
  }

  /**
   * Get messages for a conversation with pagination
   */
  static async getMessages(
    conversationId: string,
    userId: string,
    options: {
      limit?: number
      cursor?: string
      before?: string
    } = {}
  ): Promise<{
    messages: ChatMessage[]
    totalCount: number
    hasMore: boolean
    nextCursor?: string
  }> {
    const { limit = 50, cursor, before } = options

    // Verify user is participant
    const participant = await prisma.conversationParticipant.findFirst({
      where: {
        conversationId,
        userId,
        isActive: true
      }
    })

    if (!participant) {
      throw new Error('User is not a participant in this conversation')
    }

    // Build query conditions
    const whereConditions: any = {
      conversationId
    }

    if (cursor) {
      whereConditions.createdAt = {
        lt: new Date(cursor)
      }
    } else if (before) {
      whereConditions.createdAt = {
        lt: new Date(before)
      }
    }

    // Get messages with pagination
    const messages = await prisma.message.findMany({
      where: whereConditions,
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit + 1 // Take one extra to check if there are more
    })

    const hasMore = messages.length > limit
    const messagesToReturn = hasMore ? messages.slice(0, limit) : messages

    // Get total count
    const totalCount = await prisma.message.count({
      where: {
        conversationId
      }
    })

    return {
      messages: messagesToReturn.map(this.transformMessage).reverse(), // Reverse to show oldest first
      totalCount,
      hasMore,
      nextCursor: hasMore ? messagesToReturn[messagesToReturn.length - 1].createdAt.toISOString() : undefined
    }
  }

  /**
   * Update message status (sent, delivered, read)
   */
  static async updateMessageStatus(
    messageId: string,
    status: 'sent' | 'delivered' | 'read',
    userId?: string
  ): Promise<ChatMessage> {
    // If userId provided, verify they have access to this message
    if (userId) {
      const message = await prisma.message.findUnique({
        where: { id: messageId },
        include: {
          conversation: {
            include: {
              participants: {
                where: {
                  userId,
                  isActive: true
                }
              }
            }
          }
        }
      })

      if (!message || message.conversation.participants.length === 0) {
        throw new Error('Message not found or access denied')
      }
    }

    const updatedMessage = await prisma.message.update({
      where: { id: messageId },
      data: { 
        status,
        updatedAt: new Date()
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      }
    })

    return this.transformMessage(updatedMessage)
  }

  /**
   * Get unread message count for a user in a conversation
   */
  static async getUnreadCount(
    conversationId: string,
    userId: string
  ): Promise<number> {
    // Get user's last read timestamp
    const participant = await prisma.conversationParticipant.findFirst({
      where: {
        conversationId,
        userId,
        isActive: true
      }
    })

    if (!participant) {
      return 0
    }

    return await prisma.message.count({
      where: {
        conversationId,
        createdAt: {
          gt: participant.lastReadAt
        },
        senderId: {
          not: userId
        }
      }
    })
  }

  /**
   * Get recent messages across all user's conversations
   */
  static async getRecentMessages(
    userId: string,
    limit: number = 20
  ): Promise<ChatMessage[]> {
    // Get user's conversation IDs
    const participations = await prisma.conversationParticipant.findMany({
      where: {
        userId,
        isActive: true
      },
      select: {
        conversationId: true
      }
    })

    const conversationIds = participations.map(p => p.conversationId)

    if (conversationIds.length === 0) {
      return []
    }

    const messages = await prisma.message.findMany({
      where: {
        conversationId: {
          in: conversationIds
        }
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    })

    return messages.map(this.transformMessage)
  }

  /**
   * Search messages in a conversation
   */
  static async searchMessages(
    conversationId: string,
    userId: string,
    query: string,
    limit: number = 20
  ): Promise<ChatMessage[]> {
    // Verify user is participant
    const participant = await prisma.conversationParticipant.findFirst({
      where: {
        conversationId,
        userId,
        isActive: true
      }
    })

    if (!participant) {
      throw new Error('User is not a participant in this conversation')
    }

    const messages = await prisma.message.findMany({
      where: {
        conversationId,
        content: {
          contains: query,
          mode: 'insensitive'
        }
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    })

    return messages.map(this.transformMessage)
  }

  /**
   * Delete a message (soft delete by updating content)
   */
  static async deleteMessage(
    messageId: string,
    userId: string
  ): Promise<ChatMessage> {
    // Verify user owns the message
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      }
    })

    if (!message) {
      throw new Error('Message not found')
    }

    if (message.senderId !== userId) {
      throw new Error('You can only delete your own messages')
    }

    // Soft delete by updating content and type
    const deletedMessage = await prisma.message.update({
      where: { id: messageId },
      data: {
        content: '[Message deleted]',
        type: 'system',
        updatedAt: new Date()
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      }
    })

    return this.transformMessage(deletedMessage)
  }

  /**
   * Broadcast message to conversation participants
   */
  private static async broadcastMessageToConversation(message: ChatMessage): Promise<void> {
    try {
      // Get all active participants in the conversation
      const participants = await prisma.conversationParticipant.findMany({
        where: {
          conversationId: message.conversationId,
          isActive: true,
          userId: { not: message.senderId } // Exclude sender
        },
        select: {
          userId: true
        }
      });

      // Create broadcast message format
      const broadcastMessage = {
        type: 'message_received',
        data: {
          message: {
            id: message.id,
            conversationId: message.conversationId,
            senderId: message.senderId,
            senderName: message.senderName,
            senderAvatar: message.senderAvatar,
            content: message.content,
            type: message.type,
            status: message.status,
            timestamp: message.createdAt,
            createdAt: message.createdAt,
            updatedAt: message.updatedAt
          },
          conversation: {
            id: message.conversationId,
            type: (message as any)._conversation?.type || 'direct',
            name: (message as any)._conversation?.name || null
          }
        }
      };

      // In a real implementation, we would send this to WebSocket connections
      // For now, we'll just log it since the actual WebSocket broadcasting
      // should be handled by the WebSocket handler when messages are sent via WebSocket
      console.log('Broadcasting message to participants:', {
        conversationId: message.conversationId,
        participantCount: participants.length,
        messageId: message.id
      });

      // TODO: Integrate with WebSocket server to actually send messages
      // This would require access to the WebSocket server instance
      
    } catch (error) {
      console.error('Error in broadcastMessageToConversation:', error);
      throw error;
    }
  }

  /**
   * Transform database message to API format
   */
  private static transformMessage(message: any): ChatMessage {
    const transformed: ChatMessage = {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      senderName: message.sender.name,
      senderAvatar: message.sender.avatar || undefined,
      content: message.content,
      type: message.type as any,
      status: message.status as any,
      createdAt: message.createdAt.toISOString(),
      updatedAt: message.updatedAt.toISOString()
    }
    
    // Add conversation data for broadcasting
    if (message.conversation) {
      (transformed as any)._conversation = message.conversation;
    }
    
    // Add sender data for broadcasting
    if (message.sender) {
      (transformed as any)._sender = message.sender;
    }
    
    return transformed;
  }
}
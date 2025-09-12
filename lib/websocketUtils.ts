/**
 * WebSocket Utilities for API routes
 * 
 * This module provides access to WebSocket functionality from API routes
 * without causing module resolution conflicts between TypeScript and CommonJS
 */

import { prisma } from '@/lib/db';

/**
 * Broadcast message to conversation participants from API routes
 */
export async function broadcastMessageToConversation(
  conversationId: string,
  message: any,
  excludeUserId?: string
): Promise<void> {
  try {
    // Get all active participants in the conversation
    const participants = await prisma.conversationParticipant.findMany({
      where: {
        conversationId,
        isActive: true,
        ...(excludeUserId && { userId: { not: excludeUserId } })
      },
      select: {
        userId: true
      }
    });

    console.log('Would broadcast to participants:', {
      conversationId,
      participantCount: participants.length,
      participantIds: participants.map(p => p.userId),
      messageType: message.type
    });

    // In a real implementation, this would use the WebSocket server
    // to send messages to the specific users
    // For now, we rely on the WebSocket handler to handle real-time messaging
    
  } catch (error) {
    console.error('Error in broadcastMessageToConversation:', error);
    throw error;
  }
}

/**
 * Create broadcast message format for WebSocket
 */
export function createBroadcastMessage(message: any, conversation: any) {
  return {
    type: 'message_received',
    data: {
      message: {
        id: message.id,
        conversationId: message.conversationId,
        senderId: message.senderId,
        senderName: message.sender?.name || message.senderName || 'Unknown',
        senderAvatar: message.sender?.avatar || message.senderAvatar || undefined,
        content: message.content,
        type: message.type,
        status: message.status,
        timestamp: message.createdAt,
        createdAt: message.createdAt,
        updatedAt: message.updatedAt
      },
      conversation: {
        id: conversation?.id || message.conversationId,
        type: conversation?.type || 'direct',
        name: conversation?.name || null
      }
    }
  };
}
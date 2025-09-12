const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { createClient } = require('redis');

const prisma = new PrismaClient();

// Redis client for pub/sub and connection management
let redisClient;
let redisSubscriber;

async function initializeRedis() {
  if (!redisClient) {
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    
    redisSubscriber = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });

    await redisClient.connect().catch(console.error);
    await redisSubscriber.connect().catch(console.error);
  }
}

// Connection management
const connections = new Map(); // userId -> Set of WebSocket connections
const userSockets = new Map(); // socketId -> { userId, ws, lastActivity }

/**
 * Authenticate WebSocket connection using JWT token
 */
function authenticateConnection(req) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get('token');
    
    if (!token) {
      throw new Error('No token provided');
    }

    // Try to verify as JWT token first
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      return decoded;
    } catch (jwtError) {
      // If JWT verification fails, try to use token as user ID directly for development
      console.log('JWT verification failed, using token as user ID:', token);
      
      // Basic validation - ensure it looks like a user ID
      if (/^\d+$/.test(token) && token.length > 5) {
        return { userId: token };
      }
      
      throw new Error('Invalid token format');
    }
  } catch (error) {
    console.error('WebSocket authentication failed:', error.message);
    return null;
  }
}

/**
 * Generate unique socket ID
 */
function generateSocketId() {
  return `socket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Add user connection
 */
async function addUserConnection(userId, ws, socketId) {
  // Add to local connection maps
  if (!connections.has(userId)) {
    connections.set(userId, new Set());
  }
  connections.get(userId).add(ws);
  
  userSockets.set(socketId, {
    userId,
    ws,
    lastActivity: Date.now()
  });

  // Update user online status in database
  try {
    await prisma.userOnlineStatus.upsert({
      where: { userId },
      update: {
        isOnline: true,
        lastSeen: new Date(),
        socketId,
        updatedAt: new Date()
      },
      create: {
        userId,
        isOnline: true,
        lastSeen: new Date(),
        socketId,
        updatedAt: new Date()
      }
    });

    // Broadcast user online status
    await broadcastUserStatus(userId, true);
  } catch (error) {
    console.error('Error updating user online status:', error);
  }
}

/**
 * Remove user connection
 */
async function removeUserConnection(userId, ws, socketId) {
  // Remove from local connection maps
  if (connections.has(userId)) {
    connections.get(userId).delete(ws);
    if (connections.get(userId).size === 0) {
      connections.delete(userId);
      
      // User has no more connections, mark as offline
      try {
        await prisma.userOnlineStatus.update({
          where: { userId },
          data: {
            isOnline: false,
            lastSeen: new Date(),
            socketId: null,
            updatedAt: new Date()
          }
        });

        // Broadcast user offline status
        await broadcastUserStatus(userId, false);
      } catch (error) {
        console.error('Error updating user offline status:', error);
      }
    }
  }
  
  userSockets.delete(socketId);
}

/**
 * Broadcast user online status to relevant users
 */
async function broadcastUserStatus(userId, isOnline) {
  try {
    // Find all conversations this user is part of
    const conversations = await prisma.conversationParticipant.findMany({
      where: { userId, isActive: true },
      include: {
        conversation: {
          include: {
            participants: {
              where: { isActive: true }
            }
          }
        }
      }
    });

    // Get all other participants in these conversations
    const participantIds = new Set();
    conversations.forEach(conv => {
      conv.conversation.participants.forEach(participant => {
        if (participant.userId !== userId) {
          participantIds.add(participant.userId);
        }
      });
    });

    // Broadcast to all relevant users
    const statusMessage = {
      type: 'user_online',
      data: {
        userId,
        isOnline,
        timestamp: new Date().toISOString()
      }
    };

    participantIds.forEach(participantId => {
      sendToUser(participantId, statusMessage);
    });

  } catch (error) {
    console.error('Error broadcasting user status:', error);
  }
}

/**
 * Send message to specific user (all their connections)
 */
function sendToUser(userId, message) {
  const userConnections = connections.get(userId);
  if (userConnections) {
    const messageStr = JSON.stringify(message);
    userConnections.forEach(ws => {
      if (ws.readyState === ws.OPEN) {
        ws.send(messageStr);
      }
    });
  }
}

/**
 * Send message to all participants in a conversation
 */
async function sendToConversation(conversationId, message, excludeUserId = null) {
  try {
    const participants = await prisma.conversationParticipant.findMany({
      where: {
        conversationId,
        isActive: true,
        ...(excludeUserId && { userId: { not: excludeUserId } })
      }
    });

    participants.forEach(participant => {
      sendToUser(participant.userId, message);
    });
  } catch (error) {
    console.error('Error sending to conversation:', error);
  }
}

/**
 * Handle incoming WebSocket messages
 */
async function handleMessage(ws, message, userId, socketId) {
  try {
    // Validate message format
    if (typeof message !== 'string') {
      throw new Error('Message must be a string');
    }

    let data;
    try {
      data = JSON.parse(message);
    } catch (parseError) {
      throw new Error('Invalid JSON format');
    }

    // Validate message structure
    if (!data.type || typeof data.type !== 'string') {
      throw new Error('Message must have a valid type field');
    }

    // Update last activity
    const socketInfo = userSockets.get(socketId);
    if (socketInfo) {
      socketInfo.lastActivity = Date.now();
    }

    // Rate limiting check (simple implementation)
    const rateLimitKey = `rate_limit:${userId}`;
    if (redisClient) {
      const currentCount = await redisClient.incr(rateLimitKey);
      if (currentCount === 1) {
        await redisClient.expire(rateLimitKey, 60); // 1 minute window
      }
      
      // Allow 100 messages per minute per user
      if (currentCount > 100) {
        throw new Error('Rate limit exceeded');
      }
    }

    switch (data.type) {
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        break;

      case 'join_room':
        if (!data.conversationId) {
          throw new Error('conversationId is required for join_room');
        }
        await handleJoinRoom(userId, data.conversationId);
        break;

      case 'leave_room':
        if (!data.conversationId) {
          throw new Error('conversationId is required for leave_room');
        }
        await handleLeaveRoom(userId, data.conversationId);
        break;

      case 'send_message':
        if (!data.conversationId || !data.content) {
          throw new Error('conversationId and content are required for send_message');
        }
        if (data.content.length > 5000) {
          throw new Error('Message content too long (max 5000 characters)');
        }
        await handleSendMessage(userId, data);
        break;

      case 'typing_start':
        if (!data.conversationId) {
          throw new Error('conversationId is required for typing_start');
        }
        await handleTypingStart(userId, data.conversationId);
        break;

      case 'typing_stop':
        if (!data.conversationId) {
          throw new Error('conversationId is required for typing_stop');
        }
        await handleTypingStop(userId, data.conversationId);
        break;

      case 'mark_read':
        if (!data.conversationId) {
          throw new Error('conversationId is required for mark_read');
        }
        await handleMarkRead(userId, data);
        break;

      case 'get_conversation_status':
        if (!data.conversationId) {
          throw new Error('conversationId is required for get_conversation_status');
        }
        await handleGetConversationStatus(userId, data.conversationId);
        break;

      default:
        console.warn('Unknown message type:', data.type);
        ws.send(JSON.stringify({
          type: 'error',
          message: `Unknown message type: ${data.type}`,
          code: 'UNKNOWN_MESSAGE_TYPE',
          retryable: false
        }));
    }
  } catch (error) {
    console.error('Error handling WebSocket message:', error);
    
    // Determine if error is retryable
    const retryable = !error.message.includes('Rate limit') && 
                     !error.message.includes('not authorized') &&
                     !error.message.includes('Invalid JSON');

    ws.send(JSON.stringify({
      type: 'error',
      message: error.message || 'Failed to process message',
      code: getErrorCode(error.message),
      retryable
    }));
  }
}

/**
 * Get error code based on error message
 */
function getErrorCode(errorMessage) {
  if (errorMessage.includes('Rate limit')) return 'RATE_LIMIT_EXCEEDED';
  if (errorMessage.includes('not authorized')) return 'UNAUTHORIZED';
  if (errorMessage.includes('Invalid JSON')) return 'INVALID_JSON';
  if (errorMessage.includes('required')) return 'MISSING_REQUIRED_FIELD';
  if (errorMessage.includes('too long')) return 'CONTENT_TOO_LONG';
  return 'UNKNOWN_ERROR';
}

/**
 * Handle get conversation status request
 */
async function handleGetConversationStatus(userId, conversationId) {
  try {
    // Verify user is participant in conversation
    const participant = await prisma.conversationParticipant.findFirst({
      where: {
        userId,
        conversationId,
        isActive: true
      }
    });

    if (!participant) {
      throw new Error('User not authorized for this conversation');
    }

    // Get conversation participants and their online status
    const participants = await prisma.conversationParticipant.findMany({
      where: {
        conversationId,
        isActive: true
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    const participantStatuses = await Promise.all(
      participants.map(async (p) => {
        const onlineStatus = await prisma.userOnlineStatus.findUnique({
          where: { userId: p.userId }
        });
        
        return {
          userId: p.userId,
          userName: p.user.name,
          userEmail: p.user.email,
          isOnline: onlineStatus?.isOnline || false,
          lastSeen: onlineStatus?.lastSeen?.toISOString() || null
        };
      })
    );

    // Get active typing indicators
    const typingIndicators = await getActiveTypingIndicators(conversationId);

    // Send conversation status
    sendToUser(userId, {
      type: 'conversation_status',
      data: {
        conversationId,
        participants: participantStatuses,
        typingIndicators,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error getting conversation status:', error);
    sendToUser(userId, {
      type: 'error',
      message: 'Failed to get conversation status',
      code: 'GET_STATUS_FAILED',
      data: { conversationId }
    });
  }
}

/**
 * Handle join room event
 */
async function handleJoinRoom(userId, conversationId) {
  try {
    // Verify user is participant in conversation
    const participant = await prisma.conversationParticipant.findFirst({
      where: {
        userId,
        conversationId,
        isActive: true
      }
    });

    if (!participant) {
      throw new Error('User not authorized for this conversation');
    }

    // Get online status of all participants in this conversation
    const participants = await prisma.conversationParticipant.findMany({
      where: {
        conversationId,
        isActive: true
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    const participantStatuses = await Promise.all(
      participants.map(async (p) => {
        const onlineStatus = await prisma.userOnlineStatus.findUnique({
          where: { userId: p.userId }
        });
        
        return {
          userId: p.userId,
          userName: p.user.name,
          userEmail: p.user.email,
          isOnline: onlineStatus?.isOnline || false,
          lastSeen: onlineStatus?.lastSeen?.toISOString() || null
        };
      })
    );

    // User successfully joined room
    sendToUser(userId, {
      type: 'room_joined',
      data: { 
        conversationId,
        participants: participantStatuses
      }
    });

    // Notify other participants that this user joined
    const joinMessage = {
      type: 'user_joined_room',
      data: {
        conversationId,
        userId,
        timestamp: new Date().toISOString()
      }
    };

    await sendToConversation(conversationId, joinMessage, userId);

  } catch (error) {
    console.error('Error joining room:', error);
    sendToUser(userId, {
      type: 'error',
      message: 'Failed to join room',
      code: 'JOIN_ROOM_FAILED'
    });
  }
}

/**
 * Handle leave room event
 */
async function handleLeaveRoom(userId, conversationId) {
  try {
    // Notify other participants that this user left
    const leaveMessage = {
      type: 'user_left_room',
      data: {
        conversationId,
        userId,
        timestamp: new Date().toISOString()
      }
    };

    await sendToConversation(conversationId, leaveMessage, userId);

    // Confirm to user that they left the room
    sendToUser(userId, {
      type: 'room_left',
      data: { conversationId }
    });

  } catch (error) {
    console.error('Error leaving room:', error);
    sendToUser(userId, {
      type: 'error',
      message: 'Failed to leave room',
      code: 'LEAVE_ROOM_FAILED'
    });
  }
}

/**
 * Handle send message event
 */
async function handleSendMessage(userId, data) {
  try {
    const { conversationId, content, type = 'text' } = data;

    if (!conversationId || !content) {
      throw new Error('Missing required fields: conversationId, content');
    }

    // Verify user is participant in conversation
    const participant = await prisma.conversationParticipant.findFirst({
      where: {
        userId,
        conversationId,
        isActive: true
      }
    });

    if (!participant) {
      throw new Error('User not authorized for this conversation');
    }

    // Create message in database
    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId: userId,
        content,
        type,
        status: 'sent'
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true
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
    });

    // Update conversation's updatedAt timestamp
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() }
    });

    // Broadcast message to all conversation participants
    const broadcastMessage = {
      type: 'message_received',
      data: {
        message: {
          id: message.id,
          conversationId: message.conversationId,
          senderId: message.senderId,
          senderName: message.sender.name,
          senderEmail: message.sender.email,
          content: message.content,
          type: message.type,
          status: message.status,
          timestamp: message.createdAt.toISOString(),
          createdAt: message.createdAt.toISOString(),
          updatedAt: message.updatedAt.toISOString()
        },
        conversation: {
          id: message.conversation.id,
          type: message.conversation.type,
          name: message.conversation.name
        }
      }
    };

    // Send to all participants
    await sendToConversation(conversationId, broadcastMessage);

    // Send confirmation to sender
    sendToUser(userId, {
      type: 'message_sent',
      data: {
        messageId: message.id,
        conversationId,
        status: 'sent',
        timestamp: message.createdAt.toISOString()
      }
    });

  } catch (error) {
    console.error('Error handling send message:', error);
    sendToUser(userId, {
      type: 'error',
      message: 'Failed to send message',
      code: 'SEND_MESSAGE_FAILED',
      data: { conversationId: data.conversationId }
    });
  }
}

/**
 * Handle typing start event
 */
async function handleTypingStart(userId, conversationId) {
  try {
    if (!conversationId) {
      throw new Error('Missing conversationId');
    }

    // Verify user is participant in conversation
    const participant = await prisma.conversationParticipant.findFirst({
      where: {
        userId,
        conversationId,
        isActive: true
      },
      include: {
        user: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!participant) {
      throw new Error('User not authorized for this conversation');
    }

    // Broadcast typing indicator to other participants
    const typingMessage = {
      type: 'user_typing',
      data: {
        userId,
        userName: participant.user.name,
        conversationId,
        isTyping: true,
        timestamp: new Date().toISOString()
      }
    };

    // Send to all participants except the sender
    await sendToConversation(conversationId, typingMessage, userId);

    // Store typing state in Redis with expiration (auto-cleanup after 10 seconds)
    if (redisClient) {
      const typingKey = `typing:${conversationId}:${userId}`;
      await redisClient.setEx(typingKey, 10, JSON.stringify({
        userId,
        userName: participant.user.name,
        conversationId,
        timestamp: Date.now()
      }));
    }

  } catch (error) {
    console.error('Error handling typing start:', error);
    sendToUser(userId, {
      type: 'error',
      message: 'Failed to send typing indicator',
      code: 'TYPING_START_FAILED'
    });
  }
}

/**
 * Handle typing stop event
 */
async function handleTypingStop(userId, conversationId) {
  try {
    if (!conversationId) {
      throw new Error('Missing conversationId');
    }

    // Verify user is participant in conversation
    const participant = await prisma.conversationParticipant.findFirst({
      where: {
        userId,
        conversationId,
        isActive: true
      },
      include: {
        user: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!participant) {
      throw new Error('User not authorized for this conversation');
    }

    // Broadcast typing stop indicator to other participants
    const typingMessage = {
      type: 'user_typing',
      data: {
        userId,
        userName: participant.user.name,
        conversationId,
        isTyping: false,
        timestamp: new Date().toISOString()
      }
    };

    // Send to all participants except the sender
    await sendToConversation(conversationId, typingMessage, userId);

    // Remove typing state from Redis
    if (redisClient) {
      const typingKey = `typing:${conversationId}:${userId}`;
      await redisClient.del(typingKey);
    }

  } catch (error) {
    console.error('Error handling typing stop:', error);
    sendToUser(userId, {
      type: 'error',
      message: 'Failed to stop typing indicator',
      code: 'TYPING_STOP_FAILED'
    });
  }
}

/**
 * Handle mark read event
 */
async function handleMarkRead(userId, data) {
  try {
    const { conversationId, messageId } = data;

    if (!conversationId) {
      throw new Error('Missing conversationId');
    }

    // Verify user is participant in conversation
    const participant = await prisma.conversationParticipant.findFirst({
      where: {
        userId,
        conversationId,
        isActive: true
      }
    });

    if (!participant) {
      throw new Error('User not authorized for this conversation');
    }

    // Update participant's lastReadAt timestamp
    await prisma.conversationParticipant.update({
      where: {
        id: participant.id
      },
      data: {
        lastReadAt: new Date()
      }
    });

    // If specific messageId provided, update message status to 'read'
    if (messageId) {
      const message = await prisma.message.findFirst({
        where: {
          id: messageId,
          conversationId,
          senderId: { not: userId } // Can't mark own messages as read
        }
      });

      if (message) {
        await prisma.message.update({
          where: { id: messageId },
          data: { status: 'read' }
        });

        // Broadcast message status update to sender
        await broadcastMessageStatus(messageId, conversationId, 'read');
      }
    }

    // Send confirmation to user
    sendToUser(userId, {
      type: 'messages_marked_read',
      data: {
        conversationId,
        messageId,
        timestamp: new Date().toISOString()
      }
    });

    // Broadcast read receipt to other participants
    const readReceiptMessage = {
      type: 'message_read_receipt',
      data: {
        conversationId,
        userId,
        messageId,
        timestamp: new Date().toISOString()
      }
    };

    await sendToConversation(conversationId, readReceiptMessage, userId);

  } catch (error) {
    console.error('Error handling mark read:', error);
    sendToUser(userId, {
      type: 'error',
      message: 'Failed to mark messages as read',
      code: 'MARK_READ_FAILED',
      data: { conversationId: data.conversationId }
    });
  }
}

/**
 * Cleanup inactive connections
 */
function cleanupInactiveConnections() {
  const now = Date.now();
  const timeout = 5 * 60 * 1000; // 5 minutes

  userSockets.forEach((socketInfo, socketId) => {
    if (now - socketInfo.lastActivity > timeout) {
      if (socketInfo.ws.readyState === socketInfo.ws.OPEN) {
        socketInfo.ws.close();
      }
      removeUserConnection(socketInfo.userId, socketInfo.ws, socketId);
    }
  });
}

/**
 * Main WebSocket connection handler
 */
async function handleWebSocketConnection(ws, req, wss) {
  await initializeRedis();
  
  // Authenticate connection
  const user = authenticateConnection(req);
  if (!user) {
    ws.close(1008, 'Authentication failed');
    return;
  }

  const userId = user.userId || user.id;
  const socketId = generateSocketId();

  console.log(`WebSocket connection established for user ${userId} (${socketId})`);

  // Add user connection
  await addUserConnection(userId, ws, socketId);

  // Send connection confirmation
  ws.send(JSON.stringify({
    type: 'connection_established',
    data: {
      socketId,
      userId,
      timestamp: new Date().toISOString()
    }
  }));

  // Handle incoming messages
  ws.on('message', (message) => {
    handleMessage(ws, message, userId, socketId);
  });

  // Handle connection close
  ws.on('close', async (code, reason) => {
    console.log(`WebSocket connection closed for user ${userId} (${socketId}):`, code, reason?.toString());
    await removeUserConnection(userId, ws, socketId);
  });

  // Handle connection errors
  ws.on('error', (error) => {
    console.error(`WebSocket error for user ${userId} (${socketId}):`, error);
  });

  // Send periodic ping to keep connection alive
  const pingInterval = setInterval(() => {
    if (ws.readyState === ws.OPEN) {
      ws.ping();
    } else {
      clearInterval(pingInterval);
    }
  }, 30000); // 30 seconds

  // Handle pong responses
  ws.on('pong', () => {
    const socketInfo = userSockets.get(socketId);
    if (socketInfo) {
      socketInfo.lastActivity = Date.now();
    }
  });
}

/**
 * Cleanup expired typing indicators
 */
async function cleanupExpiredTypingIndicators() {
  if (!redisClient) return;

  try {
    const keys = await redisClient.keys('typing:*');
    const now = Date.now();
    const expiredKeys = [];

    for (const key of keys) {
      const data = await redisClient.get(key);
      if (data) {
        const typingData = JSON.parse(data);
        // If typing indicator is older than 10 seconds, it's expired
        if (now - typingData.timestamp > 10000) {
          expiredKeys.push(key);
          
          // Send typing stop message
          const [, conversationId, userId] = key.split(':');
          const typingMessage = {
            type: 'user_typing',
            data: {
              userId,
              userName: typingData.userName,
              conversationId,
              isTyping: false,
              timestamp: new Date().toISOString()
            }
          };
          
          await sendToConversation(conversationId, typingMessage, userId);
        }
      }
    }

    // Remove expired keys
    if (expiredKeys.length > 0) {
      await redisClient.del(expiredKeys);
    }

  } catch (error) {
    console.error('Error cleaning up typing indicators:', error);
  }
}

// Cleanup inactive connections every 5 minutes
setInterval(cleanupInactiveConnections, 5 * 60 * 1000);

// Cleanup expired typing indicators every 30 seconds
setInterval(cleanupExpiredTypingIndicators, 30 * 1000);

/**
 * Get active typing indicators for a conversation
 */
async function getActiveTypingIndicators(conversationId) {
  if (!redisClient) return [];

  try {
    const keys = await redisClient.keys(`typing:${conversationId}:*`);
    const typingIndicators = [];

    for (const key of keys) {
      const data = await redisClient.get(key);
      if (data) {
        const typingData = JSON.parse(data);
        // Only include if not expired (within last 10 seconds)
        if (Date.now() - typingData.timestamp <= 10000) {
          typingIndicators.push({
            userId: typingData.userId,
            userName: typingData.userName,
            conversationId: typingData.conversationId,
            timestamp: typingData.timestamp
          });
        }
      }
    }

    return typingIndicators;
  } catch (error) {
    console.error('Error getting typing indicators:', error);
    return [];
  }
}

/**
 * Broadcast message delivery status update
 */
async function broadcastMessageStatus(messageId, conversationId, status) {
  const statusMessage = {
    type: 'message_status_updated',
    data: {
      messageId,
      conversationId,
      status,
      timestamp: new Date().toISOString()
    }
  };

  await sendToConversation(conversationId, statusMessage);
}

module.exports = {
  handleWebSocketConnection,
  sendToUser,
  sendToConversation,
  getActiveTypingIndicators,
  broadcastMessageStatus,
  connections,
  userSockets
};
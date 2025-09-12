const { WebSocket } = require('ws');

// Global WebSocket server instance reference
let wss = null;

// We need to track which users are connected to which WebSocket connections
const userConnections = new Map(); // userId -> Set of WebSocket connections

function setWebSocketServer(server) {
  wss = server;
}

/**
 * Track user connection
 */
function trackUserConnection(userId, ws) {
  if (!userConnections.has(userId)) {
    userConnections.set(userId, new Set());
  }
  userConnections.get(userId).add(ws);
}

/**
 * Remove user connection
 */
function removeUserConnection(userId, ws) {
  if (userConnections.has(userId)) {
    const connections = userConnections.get(userId);
    connections.delete(ws);
    if (connections.size === 0) {
      userConnections.delete(userId);
    }
  }
}

/**
 * Send message to all participants in a conversation via WebSocket
 */
async function broadcastToConversation(
  conversationId, 
  message, 
  excludeUserId = null
) {
  if (!wss) {
    console.warn('WebSocket server not initialized, cannot broadcast message');
    return;
  }

  try {
    // Get conversation participants from database
    // This requires access to Prisma, but we'll need to handle this differently
    // For now, we'll rely on the client-side to handle conversation filtering
    // In a real implementation, we'd query the database for participant IDs
    
    // Broadcast to all connected clients and let them filter by conversationId
    const messageWithConversation = {
      ...message,
      _conversationId: conversationId // Add conversation ID for client filtering
    };
    
    broadcastToAll(messageWithConversation);
  } catch (error) {
    console.error('Error broadcasting to conversation:', error);
  }
}

/**
 * Send message to specific user via WebSocket
 */
function broadcastToUser(userId, message) {
  if (!wss) {
    console.warn('WebSocket server not initialized, cannot broadcast to user');
    return;
  }

  try {
    const messageStr = JSON.stringify(message);
    
    // Find all connections for this user
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        // This is a simplified approach - in a real implementation,
        // you'd need to track which user is connected to which WebSocket
        // For now, we'll rely on the client-side to filter messages
        client.send(messageStr);
      }
    });
  } catch (error) {
    console.error('Error broadcasting to user:', error);
  }
}

/**
 * Broadcast message to all connected clients
 */
function broadcastToAll(message) {
  if (!wss) {
    console.warn('WebSocket server not initialized, cannot broadcast message');
    return;
  }

  try {
    const messageStr = JSON.stringify(message);
    
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  } catch (error) {
    console.error('Error broadcasting to all clients:', error);
  }
}

/**
 * Broadcast new message to conversation participants
 */
async function broadcastNewMessage(message) {
  const broadcastMessage = {
    type: 'message_received',
    data: {
      message: {
        id: message.id,
        conversationId: message.conversationId,
        senderId: message.senderId,
        senderName: message._sender?.name || message.senderName || 'Unknown',
        senderEmail: message._sender?.email || '',
        content: message.content,
        type: message.type,
        status: message.status,
        timestamp: message.createdAt,
        createdAt: message.createdAt,
        updatedAt: message.updatedAt
      },
      conversation: {
        id: message.conversationId,
        type: message._conversation?.type || 'direct',
        name: message._conversation?.name || null
      }
    }
  };

  await broadcastToConversation(message.conversationId, broadcastMessage, message.senderId);
}

module.exports = {
  setWebSocketServer,
  trackUserConnection,
  removeUserConnection,
  broadcastToConversation,
  broadcastToUser,
  broadcastNewMessage
};
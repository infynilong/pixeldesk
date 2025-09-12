import { useEffect, useRef, useState, useCallback } from 'react';
import { ChatWebSocketClient, getChatWebSocketClient } from '@/lib/websocketClient';
import { type ChatError, type ConnectionState } from '@/lib/chatErrorHandler';

interface UseChatWebSocketOptions {
  userId: string;
  autoConnect?: boolean;
  onConnected?: () => void;
  onDisconnected?: (data: { code: number; reason: string }) => void;
  onError?: (error: any) => void;
  onUserOnline?: (data: { userId: string; isOnline: boolean }) => void;
  onMessageReceived?: (data: any) => void;
  onMessageSent?: (data: any) => void;
  onUserTyping?: (data: any) => void;
  onRateLimitExceeded?: (data: any) => void;
  onUnauthorized?: (data: any) => void;
  onChatError?: (error: ChatError) => void;
  onConnectionStateChange?: (state: ConnectionState) => void;
  onMessageSendFailure?: (error: ChatError) => void;
  enableGracefulDegradation?: boolean;
}

interface UseChatWebSocketReturn {
  client: ChatWebSocketClient | null;
  isConnected: boolean;
  isConnecting: boolean;
  connectionState: ConnectionState | null;
  lastError: ChatError | null;
  retryQueueCount: number;
  connect: () => Promise<void>;
  disconnect: () => void;
  send: (type: string, data?: any) => boolean;
  sendMessage: (conversationId: string, content: string, type?: string) => boolean;
  startTyping: (conversationId: string) => boolean;
  stopTyping: (conversationId: string) => boolean;
  markAsRead: (conversationId: string, messageId: string) => boolean;
  joinRoom: (conversationId: string) => boolean;
  leaveRoom: (conversationId: string) => boolean;
  clearRetryQueue: () => void;
  getConnectionHealth: () => any;
}

export function useChatWebSocket(options: UseChatWebSocketOptions): UseChatWebSocketReturn {
  const {
    userId,
    autoConnect = true,
    onConnected,
    onDisconnected,
    onError,
    onUserOnline,
    onMessageReceived,
    onMessageSent,
    onUserTyping,
    onRateLimitExceeded,
    onUnauthorized,
    onChatError,
    onConnectionStateChange,
    onMessageSendFailure,
    enableGracefulDegradation = true
  } = options;

  const [client, setClient] = useState<ChatWebSocketClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState | null>(null);
  const [lastError, setLastError] = useState<ChatError | null>(null);
  const [retryQueueCount, setRetryQueueCount] = useState(0);
  const [token, setToken] = useState<string | null>(null);
  
  const clientRef = useRef<ChatWebSocketClient | null>(null);

  // Generate WebSocket token
  const generateToken = useCallback(async () => {
    try {
      const response = await fetch('/api/chat/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate WebSocket token');
      }

      const data = await response.json();
      console.log('Token API response:', data);
      if (!data.token) {
        console.error('No token in API response:', data);
        throw new Error('No token received from API');
      }
      return data.token;
    } catch (error) {
      console.error('Error generating WebSocket token:', error);
      throw error;
    }
  }, [userId]);

  // Initialize client
  useEffect(() => {
    if (!userId) return;

    const initializeClient = async () => {
      try {
        console.log('Generating WebSocket token for user:', userId);
        const wsToken = await generateToken();
        setToken(wsToken);
        
        console.log('Getting WebSocket client with token:', wsToken.substring(0, 20) + '...');
        console.log('Full token for debugging:', wsToken);
        const wsClient = getChatWebSocketClient(wsToken);
        if (wsClient) {
          console.log('WebSocket client created, setting up event handlers');
          setClient(wsClient);
          clientRef.current = wsClient;

          // Set up event handlers
          wsClient.on('connected', () => {
            setIsConnected(true);
            setIsConnecting(false);
            onConnected?.();
          });

          wsClient.on('disconnected', (data) => {
            setIsConnected(false);
            setIsConnecting(false);
            onDisconnected?.(data);
          });

          wsClient.on('error', (error) => {
            setIsConnecting(false);
            onError?.(error);
          });

          wsClient.on('reconnecting', () => {
            setIsConnecting(true);
          });

          wsClient.on('user_online', (data) => {
            onUserOnline?.(data);
          });

          wsClient.on('message_received', (data) => {
            onMessageReceived?.(data);
          });

          wsClient.on('message_sent', (data) => {
            onMessageSent?.(data);
          });

          wsClient.on('user_typing', (data) => {
            onUserTyping?.(data);
          });

          wsClient.on('rate_limit_exceeded', (data) => {
            onRateLimitExceeded?.(data);
          });

          wsClient.on('unauthorized', (data) => {
            onUnauthorized?.(data);
          });

          wsClient.on('message_retry_failed', (data) => {
            console.warn('Message retry failed:', data);
          });

          wsClient.on('message_queued', (data) => {
            console.log('Message queued:', data);
          });

          // Enhanced error handling events
          wsClient.on('chat_error', (error: ChatError) => {
            setLastError(error);
            onChatError?.(error);
            
            if (error.type === 'send_failed') {
              onMessageSendFailure?.(error);
            }
          });

          wsClient.on('connection_state_changed', (state: ConnectionState) => {
            setConnectionState(state);
            onConnectionStateChange?.(state);
            
            // Update retry queue count
            const health = wsClient.getConnectionHealth();
            setRetryQueueCount(health.retryQueueStatus.totalMessages);
          });

          wsClient.on('message_send_success', (data) => {
            // Clear any previous send errors for successful messages
            setLastError(null);
          });

          wsClient.on('connection_health', (health) => {
            setRetryQueueCount(health.retryQueueStatus.totalMessages);
          });

          wsClient.on('graceful_degradation_enabled', () => {
            console.log('Graceful degradation mode enabled');
          });

          wsClient.on('graceful_degradation_disabled', () => {
            console.log('Graceful degradation mode disabled');
          });

          // Auto-connect if enabled
          if (autoConnect) {
            setIsConnecting(true);
            await wsClient.connect();
          }
        }
      } catch (error) {
        console.error('Error initializing WebSocket client:', error);
        setIsConnecting(false);
        onError?.(error);
      }
    };

    initializeClient();

    // Cleanup on unmount
    return () => {
      if (clientRef.current) {
        clientRef.current.disconnect();
        clientRef.current = null;
      }
      setClient(null);
      setIsConnected(false);
      setIsConnecting(false);
    };
  }, [userId, autoConnect, generateToken, onConnected, onDisconnected, onError, onUserOnline, onMessageReceived, onMessageSent, onUserTyping, onRateLimitExceeded, onUnauthorized]);

  // Connect function
  const connect = useCallback(async () => {
    if (!client) {
      throw new Error('WebSocket client not initialized');
    }

    if (isConnected || isConnecting) {
      return;
    }

    setIsConnecting(true);
    try {
      await client.connect();
    } catch (error) {
      setIsConnecting(false);
      throw error;
    }
  }, [client, isConnected, isConnecting]);

  // Disconnect function
  const disconnect = useCallback(() => {
    if (client) {
      client.disconnect();
    }
  }, [client]);

  // Send message function
  const send = useCallback((type: string, data?: any) => {
    if (!client) {
      console.warn('WebSocket client not available');
      return false;
    }
    return client.send(type, data);
  }, [client]);

  // Join room function
  const joinRoom = useCallback((conversationId: string) => {
    return send('join_room', { conversationId });
  }, [send]);

  // Leave room function
  const leaveRoom = useCallback((conversationId: string) => {
    return send('leave_room', { conversationId });
  }, [send]);

  // Send message function
  const sendMessage = useCallback((conversationId: string, content: string, type: string = 'text') => {
    if (!client) {
      console.warn('WebSocket client not available');
      return false;
    }
    return client.sendMessage(conversationId, content, type);
  }, [client]);

  // Start typing function
  const startTyping = useCallback((conversationId: string) => {
    if (!client) {
      console.warn('WebSocket client not available');
      return false;
    }
    return client.startTyping(conversationId);
  }, [client]);

  // Stop typing function
  const stopTyping = useCallback((conversationId: string) => {
    if (!client) {
      console.warn('WebSocket client not available');
      return false;
    }
    return client.stopTyping(conversationId);
  }, [client]);

  // Mark as read function
  const markAsRead = useCallback((conversationId: string, messageId: string) => {
    if (!client) {
      console.warn('WebSocket client not available');
      return false;
    }
    return client.markAsRead(conversationId, messageId);
  }, [client]);

  // Clear retry queue function
  const clearRetryQueue = useCallback(() => {
    if (client) {
      const errorHandler = client.getErrorHandler();
      errorHandler.clearRetryQueue();
      setRetryQueueCount(0);
    }
  }, [client]);

  // Get connection health function
  const getConnectionHealth = useCallback(() => {
    if (!client) return null;
    return client.getConnectionHealth();
  }, [client]);

  // Set up graceful degradation if enabled
  useEffect(() => {
    if (client && enableGracefulDegradation) {
      client.setGracefulDegradation(true);
    }
  }, [client, enableGracefulDegradation]);

  return {
    client,
    isConnected,
    isConnecting,
    connectionState,
    lastError,
    retryQueueCount,
    connect,
    disconnect,
    send,
    sendMessage,
    startTyping,
    stopTyping,
    markAsRead,
    joinRoom,
    leaveRoom,
    clearRetryQueue,
    getConnectionHealth
  };
}
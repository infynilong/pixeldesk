/**
 * Chat Error Handling System
 * Provides comprehensive error handling for the chat system including
 * WebSocket connection errors, message failures, and offline scenarios
 */

export interface ChatError {
  type: 'connection' | 'send_failed' | 'load_failed' | 'permission_denied' | 'rate_limit' | 'server_error' | 'network_error';
  message: string;
  code?: string | number;
  conversationId?: string;
  messageId?: string;
  retryable: boolean;
  timestamp: number;
  context?: Record<string, any>;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
}

export interface ConnectionState {
  status: 'connected' | 'connecting' | 'disconnected' | 'reconnecting' | 'failed';
  lastConnected?: number;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  nextReconnectDelay: number;
  isOnline: boolean;
  networkType?: string;
}

export interface MessageRetryState {
  id: string;
  type: string;
  data: any;
  conversationId?: string;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  nextRetryAt: number;
  lastError?: ChatError;
}

export class ChatErrorHandler {
  private errorListeners: Set<(error: ChatError) => void> = new Set();
  private connectionStateListeners: Set<(state: ConnectionState) => void> = new Set();
  private retryQueue: Map<string, MessageRetryState> = new Map();
  private retryTimer: NodeJS.Timeout | null = null;
  private connectionState: ConnectionState;
  private defaultRetryConfig: RetryConfig;

  constructor(config?: Partial<RetryConfig>) {
    this.defaultRetryConfig = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2,
      jitter: true,
      ...config
    };

    this.connectionState = {
      status: 'disconnected',
      reconnectAttempts: 0,
      maxReconnectAttempts: 10,
      nextReconnectDelay: 1000,
      isOnline: navigator.onLine
    };

    this.setupNetworkMonitoring();
    this.startRetryProcessor();
  }

  /**
   * Set up network connectivity monitoring
   */
  private setupNetworkMonitoring(): void {
    const updateOnlineStatus = () => {
      const wasOnline = this.connectionState.isOnline;
      this.connectionState.isOnline = navigator.onLine;
      
      if (!wasOnline && navigator.onLine) {
        this.handleNetworkReconnected();
      } else if (wasOnline && !navigator.onLine) {
        this.handleNetworkDisconnected();
      }
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // Detect network type if available
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      this.connectionState.networkType = connection.effectiveType;
      
      connection.addEventListener('change', () => {
        this.connectionState.networkType = connection.effectiveType;
        this.notifyConnectionStateChange();
      });
    }
  }

  /**
   * Handle network reconnection
   */
  private handleNetworkReconnected(): void {
    console.log('Network reconnected');
    this.createError({
      type: 'network_error',
      message: 'Network connection restored',
      retryable: false,
      timestamp: Date.now()
    });
    
    // Reset connection attempts when network comes back
    this.connectionState.reconnectAttempts = 0;
    this.notifyConnectionStateChange();
  }

  /**
   * Handle network disconnection
   */
  private handleNetworkDisconnected(): void {
    console.log('Network disconnected');
    this.createError({
      type: 'network_error',
      message: 'Network connection lost',
      retryable: true,
      timestamp: Date.now()
    });
    
    this.updateConnectionState({ status: 'disconnected' });
  }

  /**
   * Create and emit an error
   */
  createError(errorData: Omit<ChatError, 'timestamp'> & { timestamp?: number }): ChatError {
    const error: ChatError = {
      timestamp: Date.now(),
      ...errorData
    };

    console.error('Chat Error:', error);
    this.notifyErrorListeners(error);
    
    return error;
  }

  /**
   * Handle WebSocket connection errors
   */
  handleConnectionError(event: Event | CloseEvent, context?: Record<string, any>): ChatError {
    let message = 'Connection failed';
    let code: string | number | undefined;
    let retryable = true;

    if (event instanceof CloseEvent) {
      code = event.code;
      message = event.reason || `Connection closed (${event.code})`;
      
      // Determine if error is retryable based on close code
      retryable = this.isRetryableCloseCode(event.code);
    }

    const error = this.createError({
      type: 'connection',
      message,
      code,
      retryable,
      context
    });

    this.updateConnectionState({ 
      status: retryable ? 'reconnecting' : 'failed'
    });

    return error;
  }

  /**
   * Handle message send failures
   */
  handleMessageSendError(
    messageId: string,
    type: string,
    data: any,
    error: any,
    conversationId?: string
  ): ChatError {
    const chatError = this.createError({
      type: 'send_failed',
      message: `Failed to send message: ${error.message || 'Unknown error'}`,
      messageId,
      conversationId,
      retryable: this.isRetryableError(error),
      context: { messageType: type, originalError: error }
    });

    // Add to retry queue if retryable
    if (chatError.retryable) {
      this.addToRetryQueue(messageId, type, data, conversationId);
    }

    return chatError;
  }

  /**
   * Handle API request failures
   */
  handleApiError(
    endpoint: string,
    response: Response | null,
    error: any,
    context?: Record<string, any>
  ): ChatError {
    let message = 'API request failed';
    let code: string | number | undefined;
    let retryable = false;

    if (response) {
      code = response.status;
      message = `API request failed (${response.status})`;
      retryable = this.isRetryableHttpStatus(response.status);
    } else if (error) {
      message = error.message || 'Network error';
      retryable = true; // Network errors are usually retryable
    }

    return this.createError({
      type: error?.name === 'TypeError' ? 'network_error' : 'server_error',
      message,
      code,
      retryable,
      context: { endpoint, ...context }
    });
  }

  /**
   * Add message to retry queue
   */
  addToRetryQueue(
    messageId: string,
    type: string,
    data: any,
    conversationId?: string,
    config?: Partial<RetryConfig>
  ): void {
    const retryConfig = { ...this.defaultRetryConfig, ...config };
    
    const retryState: MessageRetryState = {
      id: messageId,
      type,
      data,
      conversationId,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: retryConfig.maxRetries,
      nextRetryAt: Date.now() + retryConfig.baseDelay
    };

    this.retryQueue.set(messageId, retryState);
    console.log(`Added message to retry queue: ${messageId}`);
  }

  /**
   * Remove message from retry queue
   */
  removeFromRetryQueue(messageId: string): boolean {
    return this.retryQueue.delete(messageId);
  }

  /**
   * Process retry queue
   */
  private startRetryProcessor(): void {
    this.retryTimer = setInterval(() => {
      this.processRetryQueue();
    }, 1000);
  }

  /**
   * Process messages in retry queue
   */
  private async processRetryQueue(): Promise<void> {
    const now = Date.now();
    const messagesToRetry: MessageRetryState[] = [];

    // Find messages ready for retry
    for (const [messageId, retryState] of Array.from(this.retryQueue.entries())) {
      if (retryState.nextRetryAt <= now) {
        if (retryState.retryCount >= retryState.maxRetries) {
          // Max retries exceeded
          this.createError({
            type: 'send_failed',
            message: `Message retry failed after ${retryState.maxRetries} attempts`,
            messageId: retryState.id,
            conversationId: retryState.conversationId,
            retryable: false
          });
          
          this.retryQueue.delete(messageId);
        } else {
          messagesToRetry.push(retryState);
        }
      }
    }

    // Process retries
    for (const retryState of messagesToRetry) {
      await this.retryMessage(retryState);
    }
  }

  /**
   * Retry a specific message
   */
  private async retryMessage(retryState: MessageRetryState): Promise<void> {
    retryState.retryCount++;
    
    try {
      // Emit retry event for external handling
      this.notifyRetryAttempt(retryState);
      
      // Calculate next retry delay with exponential backoff
      const delay = Math.min(
        this.defaultRetryConfig.baseDelay * Math.pow(this.defaultRetryConfig.backoffMultiplier, retryState.retryCount - 1),
        this.defaultRetryConfig.maxDelay
      );
      
      // Add jitter if enabled
      const jitter = this.defaultRetryConfig.jitter ? Math.random() * 0.1 * delay : 0;
      retryState.nextRetryAt = Date.now() + delay + jitter;
      
    } catch (error) {
      retryState.lastError = this.createError({
        type: 'send_failed',
        message: `Retry attempt ${retryState.retryCount} failed: ${error}`,
        messageId: retryState.id,
        conversationId: retryState.conversationId,
        retryable: retryState.retryCount < retryState.maxRetries
      });
    }
  }

  /**
   * Update connection state
   */
  updateConnectionState(updates: Partial<ConnectionState>): void {
    const previousState = { ...this.connectionState };
    
    Object.assign(this.connectionState, updates);
    
    // Update timestamps
    if (updates.status === 'connected') {
      this.connectionState.lastConnected = Date.now();
      this.connectionState.reconnectAttempts = 0;
    } else if (updates.status === 'reconnecting') {
      this.connectionState.reconnectAttempts++;
    }

    // Calculate next reconnect delay with exponential backoff
    if (this.connectionState.status === 'reconnecting') {
      this.connectionState.nextReconnectDelay = Math.min(
        1000 * Math.pow(2, this.connectionState.reconnectAttempts - 1),
        30000
      );
    }

    this.notifyConnectionStateChange();
  }

  /**
   * Check if close code is retryable
   */
  private isRetryableCloseCode(code: number): boolean {
    // WebSocket close codes that should trigger reconnection
    const retryableCodes = [
      1006, // Abnormal closure
      1011, // Server error
      1012, // Service restart
      1013, // Try again later
      1014  // Bad gateway
    ];
    
    return retryableCodes.includes(code) || (code >= 1000 && code < 1004);
  }

  /**
   * Check if HTTP status is retryable
   */
  private isRetryableHttpStatus(status: number): boolean {
    // HTTP status codes that should be retried
    return status >= 500 || status === 408 || status === 429;
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    if (!error) return false;
    
    // Network errors are usually retryable
    if (error.name === 'TypeError' || error.name === 'NetworkError') {
      return true;
    }
    
    // Timeout errors are retryable
    if (error.name === 'TimeoutError' || error.message?.includes('timeout')) {
      return true;
    }
    
    return false;
  }

  /**
   * Notify error listeners
   */
  private notifyErrorListeners(error: ChatError): void {
    this.errorListeners.forEach(listener => {
      try {
        listener(error);
      } catch (err) {
        console.error('Error in error listener:', err);
      }
    });
  }

  /**
   * Notify connection state listeners
   */
  private notifyConnectionStateChange(): void {
    this.connectionStateListeners.forEach(listener => {
      try {
        listener({ ...this.connectionState });
      } catch (err) {
        console.error('Error in connection state listener:', err);
      }
    });
  }

  /**
   * Notify retry attempt
   */
  private notifyRetryAttempt(retryState: MessageRetryState): void {
    // This could be extended to emit events for UI updates
    console.log(`Retrying message ${retryState.id} (attempt ${retryState.retryCount}/${retryState.maxRetries})`);
  }

  /**
   * Add error listener
   */
  onError(listener: (error: ChatError) => void): () => void {
    this.errorListeners.add(listener);
    return () => this.errorListeners.delete(listener);
  }

  /**
   * Add connection state listener
   */
  onConnectionStateChange(listener: (state: ConnectionState) => void): () => void {
    this.connectionStateListeners.add(listener);
    return () => this.connectionStateListeners.delete(listener);
  }

  /**
   * Get current connection state
   */
  getConnectionState(): ConnectionState {
    return { ...this.connectionState };
  }

  /**
   * Get retry queue status
   */
  getRetryQueueStatus(): {
    totalMessages: number;
    messagesByConversation: Record<string, number>;
    oldestMessage?: MessageRetryState;
  } {
    const messages = Array.from(this.retryQueue.values());
    const messagesByConversation: Record<string, number> = {};
    
    messages.forEach(msg => {
      if (msg.conversationId) {
        messagesByConversation[msg.conversationId] = (messagesByConversation[msg.conversationId] || 0) + 1;
      }
    });

    const oldestMessage = messages.sort((a, b) => a.timestamp - b.timestamp)[0];

    return {
      totalMessages: messages.length,
      messagesByConversation,
      oldestMessage
    };
  }

  /**
   * Clear retry queue
   */
  clearRetryQueue(): void {
    const clearedCount = this.retryQueue.size;
    this.retryQueue.clear();
    console.log(`Cleared ${clearedCount} messages from retry queue`);
  }

  /**
   * Destroy error handler
   */
  destroy(): void {
    if (this.retryTimer) {
      clearInterval(this.retryTimer);
      this.retryTimer = null;
    }
    
    this.errorListeners.clear();
    this.connectionStateListeners.clear();
    this.retryQueue.clear();
    
    window.removeEventListener('online', this.handleNetworkReconnected);
    window.removeEventListener('offline', this.handleNetworkDisconnected);
  }
}

// Singleton instance
let chatErrorHandler: ChatErrorHandler | null = null;

export function getChatErrorHandler(): ChatErrorHandler {
  if (!chatErrorHandler) {
    chatErrorHandler = new ChatErrorHandler();
  }
  return chatErrorHandler;
}

export function destroyChatErrorHandler(): void {
  if (chatErrorHandler) {
    chatErrorHandler.destroy();
    chatErrorHandler = null;
  }
}
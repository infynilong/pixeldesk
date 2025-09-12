'use client'

import { useState, useEffect, useCallback } from 'react'
import { getChatWebSocketClient, ChatWebSocketClient } from '../lib/websocketClient'

export function useWebSocket(token?: string) {
  const [client, setClient] = useState<ChatWebSocketClient | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)

  useEffect(() => {
    if (!token) return

    const wsClient = getChatWebSocketClient(token)
    if (!wsClient) {
      console.error('Failed to get WebSocket client')
      return
    }

    setClient(wsClient)

    // Set up event listeners
    const handleConnected = () => {
      setIsConnected(true)
      setIsConnecting(false)
    }

    const handleDisconnected = () => {
      setIsConnected(false)
      setIsConnecting(false)
    }

    const handleReconnecting = () => {
      setIsConnecting(true)
    }

    wsClient.on('connected', handleConnected)
    wsClient.on('disconnected', handleDisconnected)
    wsClient.on('reconnecting', handleReconnecting)

    // Connect if not already connected
    if (!wsClient.isConnected && !isConnecting) {
      setIsConnecting(true)
      wsClient.connect().catch(error => {
        console.error('WebSocket connection failed:', error)
        setIsConnecting(false)
      })
    }

    return () => {
      wsClient.off('connected', handleConnected)
      wsClient.off('disconnected', handleDisconnected)
      wsClient.off('reconnecting', handleReconnecting)
    }
  }, [token])

  const sendMessage = useCallback((conversationId: string, content: string, type: string = 'text') => {
    if (!client) {
      console.error('WebSocket client not available')
      return false
    }
    return client.sendMessage(conversationId, content, type)
  }, [client])

  const startTyping = useCallback((conversationId: string) => {
    if (!client) return false
    return client.startTyping(conversationId)
  }, [client])

  const stopTyping = useCallback((conversationId: string) => {
    if (!client) return false
    return client.stopTyping(conversationId)
  }, [client])

  return {
    client,
    isConnected,
    isConnecting,
    sendMessage,
    startTyping,
    stopTyping
  }
}
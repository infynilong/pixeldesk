'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import PlayerInteractionPanel from '@/components/PlayerInteractionPanel'
import { useChatWebSocket } from '@/lib/hooks/useChatWebSocket'
import { chatEventBridge } from '@/lib/chatEventBridge'

interface PlayerInteractionTabProps {
  collisionPlayer?: any
  isActive?: boolean
  isMobile?: boolean
  isTablet?: boolean
}

export default function PlayerInteractionTab({ 
  collisionPlayer,
  isActive = false,
  isMobile = false,
  isTablet = false
}: PlayerInteractionTabProps) {
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [conversationId, setConversationId] = useState<string>('')
  
  // Only initialize WebSocket if component is active to prevent unnecessary connections
  const { client, sendMessage, isConnected } = useChatWebSocket({
    userId: currentUserId,
    autoConnect: isActive && !!currentUserId, // Only connect when tab is active
    onChatError: useCallback((error: any) => {
      if (error.message !== 'Manual disconnect') {
        console.error('Chat Error:', error);
      }
    }, []),
    onDisconnected: useCallback((data: any) => {
      console.log('WebSocket disconnected:', data);
    }, [])
  })
  
  // Get current user ID from localStorage or session - initialize once to avoid unnecessary re-connections
  useEffect(() => {
    // Try to get user ID from various sources
    const storedUserId = localStorage.getItem('currentUserId') || 
                        sessionStorage.getItem('currentUserId') ||
                        '1754869526878' // Use real user ID from database
    
    setCurrentUserId(storedUserId);
  }, [])

  // Join conversation room when collision player is detected and WebSocket is connected
  useEffect(() => {
    const joinConversationRoom = async () => {
      if (!isActive || !collisionPlayer || !client || !currentUserId || !isConnected) {
        return;
      }

      try {
        // Find or create conversation
        const conversationResponse = await fetch(`/api/chat/conversations?userId=${currentUserId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            participantIds: [collisionPlayer.id],
            type: 'direct'
          })
        })

        if (conversationResponse.ok) {
          const conversationData = await conversationResponse.json()
          const newConversationId = conversationData.data.id
          
          if (newConversationId && newConversationId !== conversationId) {
            setConversationId(newConversationId)
            
            // Only join room if we have a valid conversation ID and the client is still connected
            if (client.isConnected) {
              client.joinRoom(newConversationId)
              console.log('Joined conversation room:', newConversationId)
            }
          }
        } else {
          console.warn('Failed to create/find conversation:', conversationResponse.status);
        }
      } catch (error) {
        console.error('Failed to join conversation room:', error)
      }
    }

    // Only attempt if tab is active and we have all required data
    if (isActive && isConnected && collisionPlayer && currentUserId) {
      joinConversationRoom();
    }
  }, [isActive, collisionPlayer?.id, isConnected, currentUserId, conversationId]) // Remove client from dependencies

  // Transform collisionPlayer data to match PlayerData interface - memoized to prevent unnecessary re-renders
  const playerData = useMemo(() => {
    if (!collisionPlayer) return null;
    
    const data = {
      id: collisionPlayer.id || 'unknown',
      name: collisionPlayer.name || '未知玩家',
      avatar: collisionPlayer.avatar,
      currentStatus: collisionPlayer.currentStatus || {
        type: 'online',
        status: '在线',
        emoji: '🟢',
        message: collisionPlayer.name ? `${collisionPlayer.name} 正在线上` : '用户在线',
        timestamp: new Date().toISOString()
      },
      isOnline: collisionPlayer.isOnline !== false, // Default to true if not specified
      lastSeen: collisionPlayer.lastSeen || new Date().toISOString()
    }
    
    console.log('🎯 [PlayerInteractionTab] 创建新的玩家数据对象:', {
      playerId: data.id,
      playerName: data.name,
      isOnline: data.isOnline
    })
    
    return data;
  }, [
    collisionPlayer?.id,
    collisionPlayer?.name,
    collisionPlayer?.avatar,
    collisionPlayer?.isOnline,
    collisionPlayer?.lastSeen,
    collisionPlayer?.currentStatus?.type,
    collisionPlayer?.currentStatus?.status,
    collisionPlayer?.currentStatus?.emoji,
    collisionPlayer?.currentStatus?.message
  ])

  const handleSendMessage = useCallback(async (message: string) => {
    if (!playerData) return;
    try {
      console.log('💬 [Chat] Starting message send process:', {
        currentUserId,
        playerData: {
          id: playerData.id,
          name: playerData.name
        },
        message: message.substring(0, 50) + '...'
      });
      
      if (!currentUserId) {
        throw new Error('Current user ID is not set. Please refresh the page.');
      }
      
      // Check if this is a collision player from the game (not a real user)
      // Collision players typically have IDs that don't match our user ID pattern
      const isRealUser = playerData.id && playerData.id.length > 5 && /^\d+$/.test(playerData.id)
      
      console.log('🤖 [Chat] Real user check:', { isRealUser, playerId: playerData.id, playerIdLength: playerData.id?.length });
      
      if (!isRealUser) {
        throw new Error(`"${playerData.name}" is a game character and cannot receive real messages`)
      }

      // Look up the actual user ID from the player name
      let targetUserId = playerData.id
      
      // If the ID doesn't look like a database ID (digits), try to find user by name
      if (!/^\d+$/.test(targetUserId) || targetUserId.length < 10) {
        try {
          // Try to find user by name in our known users
          const knownUsers: Record<string, string> = {
            'housesig': '1755013917436',
            'guest': '1754869526878',
            'test 1': '1754870881518',
            'test': '1754923183173',
            'test 12': '1754923191969'
          }
          
          const playerName = String(playerData.name || '')
          if (knownUsers[playerName]) {
            targetUserId = knownUsers[playerName]
          } else {
            // Fallback: assume the ID is correct if we can't map it
            console.warn(`Unknown player name: ${playerData.name}, using ID: ${playerData.id}`)
          }
        } catch (error) {
          console.warn('Error mapping player name to user ID:', error)
        }
      }
      
      // Check if the target user exists by trying to get their conversations
      console.log('🔍 [Chat] Checking if user exists:', { playerName: playerData.name, targetUserId });
      
      const userCheckResponse = await fetch(`/api/chat/conversations?userId=${targetUserId}`)
      console.log('📡 [Chat] User check response status:', userCheckResponse.status, userCheckResponse.ok);
      
      const userCheckData = await userCheckResponse.json()
      console.log('📋 [Chat] User check data:', userCheckData);
      
      if (!userCheckResponse.ok || !userCheckData.success) {
        console.error('❌ [Chat] User check failed:', { 
          responseOk: userCheckResponse.ok, 
          dataSuccess: userCheckData.success,
          error: userCheckData.error 
        });
        throw new Error(`Player "${playerData.name}" is not available for chatting: ${userCheckData.error || 'Unknown error'}`)
      }
      
      console.log('✅ [Chat] User exists and is available for chatting');

      // Find or create a conversation with this player
      console.log('💬 [Chat] Creating/finding conversation:', {
        currentUserId,
        targetUserId,
        participantIds: [targetUserId, currentUserId]
      });
      
      const conversationResponse = await fetch(`/api/chat/conversations?userId=${currentUserId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          participantIds: [targetUserId, currentUserId], // Include current user as well
          type: 'direct'
        })
      })

      console.log('📡 [Chat] Conversation response status:', conversationResponse.status, conversationResponse.ok);

      if (!conversationResponse.ok) {
        const errorData = await conversationResponse.json()
        console.error('❌ [Chat] Conversation creation failed:', errorData)
        
        // Handle specific conversation exists error
        if (errorData.code === 'CONVERSATION_EXISTS') {
          console.log('♻️ [Chat] Using existing conversation:', errorData.data.existingConversationId);
          // Use existing conversation
          const conversationId = errorData.data.existingConversationId
          return await sendMessageToConversation(conversationId, message)
        }
        
        throw new Error(errorData.error || 'Failed to create/find conversation')
      }

      const conversationData = await conversationResponse.json()
      console.log('✅ [Chat] Conversation created/found:', conversationData);
      
      const conversationId = conversationData.data.id
      setConversationId(conversationId)
      
      console.log('📨 [Chat] Sending message to conversation:', conversationId);
      return await sendMessageToConversation(conversationId, message)
      
    } catch (error) {
      console.error('Error sending message:', error)
      if (error instanceof Error) {
        throw new Error(`Failed to send message: ${error.message}`)
      }
      throw error
    }
  }, [currentUserId, playerData, client, sendMessage])

  // Helper function to send message to an existing conversation
  const sendMessageToConversation = async (conversationId: string, message: string) => {
    // Try to use WebSocket first if available
    if (client && sendMessage) {
      // Join the conversation room via WebSocket
      client.joinRoom(conversationId)
      
      // Send message via WebSocket
      const success = sendMessage(conversationId, message, 'text')
      
      if (success) {
        console.log('Message sent successfully to', playerData?.name || 'unknown player', 'via WebSocket')
        return
      }
      console.warn('WebSocket send failed, falling back to HTTP API')
    }

    // Fallback: Send message via HTTP API
    const messageResponse = await fetch(`/api/chat/conversations/${conversationId}/messages?userId=${currentUserId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: message,
        type: 'text'
      })
    })

    if (!messageResponse.ok) {
      const errorData = await messageResponse.json()
      console.error('Message sending failed:', errorData)
      
      // Handle specific access denied error
      if (errorData.code === 'CONVERSATION_NOT_FOUND') {
        throw new Error('Conversation no longer exists. Please try starting a new chat.')
      }
      
      throw new Error(errorData.error || 'Failed to send message via HTTP API')
    }

    console.log('Message sent successfully to', playerData?.name || 'unknown player', 'via HTTP API')
  }

  const handleFollow = useCallback((playerId: string) => {
    // TODO: Implement follow functionality
    console.log('Following player:', playerId)
    // This would typically make an API call to follow the player
  }, [])

  const handleViewProfile = useCallback((playerId: string) => {
    // TODO: Implement profile viewing
    console.log('Viewing profile of player:', playerId)
    // This would typically navigate to the player's profile or open a modal
  }, [])

  // Handle empty state - render this if no collision player
  if (!collisionPlayer) {
    // Responsive empty state layout
    const emptyStateClasses = isMobile 
      ? "h-full flex flex-col items-center justify-center p-4 text-center relative"
      : "h-full flex flex-col items-center justify-center p-6 text-center relative"
    
    const iconSize = isMobile ? "w-12 h-12" : "w-16 h-16"
    const iconInnerSize = isMobile ? "w-6 h-6" : "w-8 h-8"
    const titleSize = isMobile ? "text-sm" : "text-base"
    const textSize = isMobile ? "text-xs" : "text-sm"
    const hintPadding = isMobile ? "p-2" : "p-3"
    
    return (
      <div className={emptyStateClasses}>
        {/* Animated background */}
        <div className="absolute inset-0 bg-gradient-to-br from-retro-purple/5 to-retro-pink/5 animate-pulse"></div>
        
        <div className="relative z-10">
          <div className={`${iconSize} bg-gradient-to-r from-retro-purple/20 to-retro-pink/20 rounded-full flex items-center justify-center mb-4 animate-pulse-glow`}>
            <svg className={`${iconInnerSize} text-retro-purple animate-bounce`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
          </div>
          
          <h3 className={`text-white font-medium mb-2 animate-pulse ${titleSize}`}>等待玩家交互</h3>
          <p className={`text-retro-textMuted leading-relaxed mb-4 ${textSize}`}>
            {isMobile ? "靠近其他玩家开始交互" : "靠近其他玩家时\n这里将显示交互选项"}
          </p>
          
          {/* Animated dots */}
          <div className="flex items-center justify-center space-x-2">
            <div className="w-2 h-2 bg-retro-purple rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-retro-pink rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-retro-blue rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
          
          {/* Hint text - Responsive */}
          {!isMobile && (
            <div className={`mt-6 ${hintPadding} bg-retro-border/20 rounded-lg border border-retro-border/30`}>
              <p className={`text-retro-textMuted ${textSize}`}>
                💡 提示：在游戏中移动角色靠近其他玩家即可开始交互
              </p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Render based on playerData availability
  return playerData ? (
    <PlayerInteractionPanel
      player={playerData}
      onSendMessage={handleSendMessage}
      onFollow={handleFollow}
      onViewProfile={handleViewProfile}
      className="h-full"
      isMobile={isMobile}
      isTablet={isTablet}
    />
  ) : null
}

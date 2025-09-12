import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import ChatManager from '../ChatManager'
import { ChatConversation } from '../../types/chat'

// Mock the useChatEvents hook
jest.mock('../../lib/hooks/useChatEvents', () => ({
  useChatEvents: jest.fn(() => ({
    emitConversationOpened: jest.fn(),
    isConnected: true,
  })),
}))

// Mock the useNotifications hook
jest.mock('../../lib/hooks/useNotifications', () => ({
  useNotifications: jest.fn(() => ({
    notifications: [],
    addNotification: jest.fn(),
    removeNotification: jest.fn(),
    clearNotifications: jest.fn(),
  })),
}))

// Mock the useNotificationKeyboard hook
jest.mock('../../lib/hooks/useNotificationKeyboard', () => ({
  useNotificationKeyboard: jest.fn(() => ({
    handleKeyDown: jest.fn(),
  })),
}))

// Mock the ConversationWindow component
jest.mock('../ConversationWindow', () => {
  return function MockConversationWindow(props: any) {
    return (
      <div data-testid="conversation-window">
        <div>{props.conversation.name}</div>
        <button onClick={props.onClose}>Close</button>
        <button onClick={props.onMinimize}>Minimize</button>
      </div>
    )
  }
})

// Mock fetch
global.fetch = jest.fn()

const mockConversations: ChatConversation[] = [
  {
    id: 'conv-1',
    type: 'private',
    name: 'Test Conversation 1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastMessage: null,
    unreadCount: 0,
    participants: [
      {
        userId: 'user-1',
        userName: 'Current User',
        userAvatar: null,
        joinedAt: new Date().toISOString(),
      },
      {
        userId: 'user-2',
        userName: 'Other User 1',
        userAvatar: null,
        joinedAt: new Date().toISOString(),
      }
    ]
  },
  {
    id: 'conv-2',
    type: 'private',
    name: 'Test Conversation 2',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastMessage: null,
    unreadCount: 3,
    participants: [
      {
        userId: 'user-1',
        userName: 'Current User',
        userAvatar: null,
        joinedAt: new Date().toISOString(),
      },
      {
        userId: 'user-3',
        userName: 'Other User 2',
        userAvatar: null,
        joinedAt: new Date().toISOString(),
      }
    ]
  }
]

describe('ChatManager', () => {
  const defaultProps = {
    currentUserId: 'user-1',
    isVisible: true,
    onToggle: jest.fn(),
    className: '',
    isMobile: false,
    isTablet: false,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    // Mock fetch to return successful response with conversations
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ conversations: mockConversations }),
    })
  })

  it('renders chat manager and loads conversations', async () => {
    render(<ChatManager {...defaultProps} />)
    
    // Should show loading state initially
    expect(screen.getByText('加载中...')).toBeInTheDocument()
    
    // Wait for conversations to load
    await waitFor(() => {
      expect(screen.queryByText('加载中...')).not.toBeInTheDocument()
    })
    
    // Should show conversation list
    expect(screen.getByText('Test Conversation 1')).toBeInTheDocument()
    expect(screen.getByText('Test Conversation 2')).toBeInTheDocument()
  })

  it('shows unread count badges', async () => {
    render(<ChatManager {...defaultProps} />)
    
    // Wait for conversations to load
    await waitFor(() => {
      expect(screen.getByText('Test Conversation 2')).toBeInTheDocument()
    })
    
    // Should show unread count badge
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('handles opening conversations', async () => {
    render(<ChatManager {...defaultProps} />)
    
    // Wait for conversations to load
    await waitFor(() => {
      expect(screen.getByText('Test Conversation 1')).toBeInTheDocument()
    })
    
    // Click on a conversation to open it
    const conversation = screen.getByText('Test Conversation 1')
    fireEvent.click(conversation)
    
    // Should open conversation window
    await waitFor(() => {
      expect(screen.getAllByTestId('conversation-window')).toHaveLength(1)
    })
  })

  it('handles closing conversation windows', async () => {
    render(<ChatManager {...defaultProps} />)
    
    // Wait for conversations to load
    await waitFor(() => {
      expect(screen.getByText('Test Conversation 1')).toBeInTheDocument()
    })
    
    // Open a conversation
    const conversation = screen.getByText('Test Conversation 1')
    fireEvent.click(conversation)
    
    // Wait for window to open
    await waitFor(() => {
      expect(screen.getByTestId('conversation-window')).toBeInTheDocument()
    })
    
    // Close the window
    const closeButton = screen.getByText('Close')
    fireEvent.click(closeButton)
    
    // Window should be closed
    await waitFor(() => {
      expect(screen.queryByTestId('conversation-window')).not.toBeInTheDocument()
    })
  })

  it('handles minimizing conversation windows', async () => {
    render(<ChatManager {...defaultProps} />)
    
    // Wait for conversations to load
    await waitFor(() => {
      expect(screen.getByText('Test Conversation 1')).toBeInTheDocument()
    })
    
    // Open a conversation
    const conversation = screen.getByText('Test Conversation 1')
    fireEvent.click(conversation)
    
    // Wait for window to open
    await waitFor(() => {
      expect(screen.getByTestId('conversation-window')).toBeInTheDocument()
    })
    
    // Minimize the window
    const minimizeButton = screen.getByText('Minimize')
    fireEvent.click(minimizeButton)
    
    // Window should still be there but minimized
    expect(screen.getByTestId('conversation-window')).toBeInTheDocument()
  })

  it('handles toggle visibility', async () => {
    render(<ChatManager {...defaultProps} isVisible={false} />)
    
    // Should not show content when not visible
    expect(screen.queryByText('Test Conversation 1')).not.toBeInTheDocument()
    
    // When made visible, should load conversations
    render(<ChatManager {...defaultProps} isVisible={true} />, { container: document.body })
    
    await waitFor(() => {
      expect(screen.getByText('Test Conversation 1')).toBeInTheDocument()
    })
  })

  it('handles fetch errors gracefully', async () => {
    // Mock fetch failure
    ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))
    
    render(<ChatManager {...defaultProps} />)
    
    // Should handle error and not crash
    await waitFor(() => {
      expect(screen.queryByText('加载中...')).not.toBeInTheDocument()
    })
    
    // Should show empty state or error message
    expect(screen.getByText('没有对话')).toBeInTheDocument()
  })
})
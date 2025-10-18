import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import TabManager, { TabType } from '../TabManager'

// Mock components for testing
const MockStatusTab = ({ isActive }: { isActive?: boolean }) => (
  <div data-testid="status-tab">Status Tab Content {isActive ? '(Active)' : ''}</div>
)

const MockPlayerTab = ({ collisionPlayer, isActive }: { collisionPlayer?: any, isActive?: boolean }) => (
  <div data-testid="player-tab">
    Player Tab Content {isActive ? '(Active)' : ''}
    {collisionPlayer && <span data-testid="collision-player">{collisionPlayer.name}</span>}
  </div>
)

const mockTabs: TabType[] = [
  {
    id: 'status-info',
    label: '状态信息',
    icon: '📊',
    component: MockStatusTab,
    priority: 1
  },
  {
    id: 'player-interaction',
    label: '玩家交互',
    icon: '👥',
    component: MockPlayerTab,
    autoSwitch: true,
    priority: 2
  }
]

describe('TabManager', () => {
  it('should render tabs correctly', () => {
    render(<TabManager tabs={mockTabs} />)
    
    expect(screen.getByText('状态信息')).toBeInTheDocument()
    expect(screen.getByText('玩家交互')).toBeInTheDocument()
    expect(screen.getByText('📊')).toBeInTheDocument()
    expect(screen.getByText('👥')).toBeInTheDocument()
  })

  it('should show first tab as active by default', () => {
    render(<TabManager tabs={mockTabs} />)
    
    expect(screen.getByTestId('status-tab')).toBeInTheDocument()
    expect(screen.queryByTestId('player-tab')).not.toBeInTheDocument()
  })

  it('should switch tabs when clicked', async () => {
    render(<TabManager tabs={mockTabs} />)
    
    // Initially status tab should be active
    expect(screen.getByTestId('status-tab')).toBeInTheDocument()
    
    // Click on player interaction tab
    fireEvent.click(screen.getByText('玩家交互'))
    
    // Wait for animation and tab switch
    await waitFor(() => {
      expect(screen.getByTestId('player-tab')).toBeInTheDocument()
    }, { timeout: 500 })
  })

  it('should auto-switch to player interaction when collision occurs', async () => {
    const mockPlayer = { name: 'TestPlayer', id: '123' }
    render(<TabManager tabs={mockTabs} />)

    // Initially status tab should be active
    expect(screen.getByTestId('status-tab')).toBeInTheDocument()

    // Simulate collision by emitting EventBus event
    const { EventBus } = require('@/lib/eventBus')
    EventBus.emit('player:collision:start', {
      type: 'collision_start',
      targetPlayer: mockPlayer,
      timestamp: Date.now()
    })

    // Should auto-switch to player interaction tab
    await waitFor(() => {
      expect(screen.getByTestId('player-tab')).toBeInTheDocument()
    }, { timeout: 500 })
  })

  it('should switch back to status tab when collision ends', async () => {
    const mockPlayer = { name: 'TestPlayer', id: '123' }
    render(<TabManager tabs={mockTabs} />)

    // Simulate collision start
    const { EventBus } = require('@/lib/eventBus')
    EventBus.emit('player:collision:start', {
      type: 'collision_start',
      targetPlayer: mockPlayer,
      timestamp: Date.now()
    })

    // Should start with player interaction tab due to collision
    await waitFor(() => {
      expect(screen.getByTestId('player-tab')).toBeInTheDocument()
    })

    // Simulate collision end
    EventBus.emit('player:collision:end', {
      type: 'collision_end',
      targetPlayer: mockPlayer,
      timestamp: Date.now()
    })

    // Should switch back to status tab
    await waitFor(() => {
      expect(screen.getByTestId('status-tab')).toBeInTheDocument()
    }, { timeout: 500 })
  })

  it('should show collision indicator when player interaction tab is highlighted', async () => {
    const mockPlayer = { name: 'TestPlayer', id: '123' }
    render(<TabManager tabs={mockTabs} />)

    // Simulate collision
    const { EventBus } = require('@/lib/eventBus')
    EventBus.emit('player:collision:start', {
      type: 'collision_start',
      targetPlayer: mockPlayer,
      timestamp: Date.now()
    })

    await waitFor(() => {
      const playerTab = screen.getByText('玩家交互').closest('button')
      expect(playerTab).toBeInTheDocument()
    })
  })

  it('should call onTabChange callback when tab switches', async () => {
    const mockOnTabChange = jest.fn()
    render(<TabManager tabs={mockTabs} onTabChange={mockOnTabChange} />)
    
    fireEvent.click(screen.getByText('玩家交互'))
    
    await waitFor(() => {
      expect(mockOnTabChange).toHaveBeenCalledWith('player-interaction')
    })
  })

  it('should show badge when tab has badge count', () => {
    const tabsWithBadge: TabType[] = [
      {
        ...mockTabs[0],
        badge: 5
      },
      mockTabs[1]
    ]
    
    render(<TabManager tabs={tabsWithBadge} />)
    
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('should show 99+ for badges over 99', () => {
    const tabsWithLargeBadge: TabType[] = [
      {
        ...mockTabs[0],
        badge: 150
      },
      mockTabs[1]
    ]
    
    render(<TabManager tabs={tabsWithLargeBadge} />)
    
    expect(screen.getByText('99+')).toBeInTheDocument()
  })
})
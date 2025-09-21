/**
 * Event Bus System for Phaser-React Communication
 * 
 * This module provides a centralized event system for communication between
 * Phaser game components and React UI components. It handles collision events,
 * tab switching, and other game-related events.
 * 
 * @module EventBus
 */

/**
 * Base interface for all events
 */
export interface BaseEvent {
  type: string
  timestamp: number
}

/**
 * Player data interface used across events
 */
export interface PlayerData {
  id: string
  name: string
  avatar?: string
  currentStatus: StatusData
  isOnline: boolean
  lastSeen?: string
}

/**
 * Player status information
 */
export interface StatusData {
  type: string
  status: string
  emoji: string
  message: string
  timestamp: string
}

/**
 * Collision event interface
 */
export interface CollisionEvent extends BaseEvent {
  type: 'collision_start' | 'collision_end'
  mainPlayer: PlayerData
  targetPlayer: PlayerData
  position: { x: number; y: number }
  duration?: number
}

/**
 * Tab switch event interface
 */
export interface TabSwitchEvent extends BaseEvent {
  type: 'tab_switch'
  fromTab: string
  toTab: string
  trigger: 'collision' | 'manual' | 'auto'
}


/**
 * Player click event interface
 */
export interface PlayerClickEvent extends BaseEvent {
  type: 'player_click'
  targetPlayer: PlayerData
  position: { x: number; y: number }
  trigger: 'click'
}

/**
 * Player info update event interface
 */
export interface PlayerInfoUpdateEvent extends BaseEvent {
  type: 'player_info_update'
  playerId: string
  updateData: Partial<PlayerData>
}

/**
 * Error event interface for event bus errors
 */
export interface EventBusErrorEvent extends BaseEvent {
  type: 'eventbus_error'
  error: Error
  context: string
  eventType?: string
}

/**
 * Complete game events interface mapping event names to their types
 */
export interface GameEvents {
  'player:collision:start': CollisionEvent
  'player:collision:end': CollisionEvent
  'player:click': PlayerClickEvent
  'player:info:updated': PlayerInfoUpdateEvent
  'tab:switch': TabSwitchEvent
  'eventbus:error': EventBusErrorEvent
}

/**
 * Event callback function type
 */
type EventCallback<T = any> = (data: T) => void

/**
 * Event bus configuration interface
 */
interface EventBusConfig {
  debugMode: boolean
  maxListeners: number
  errorThreshold: number
  enableMetrics: boolean
}

/**
 * Event bus metrics interface
 */
interface EventBusMetrics {
  totalEvents: number
  totalErrors: number
  eventCounts: Map<string, number>
  errorCounts: Map<string, number>
  lastEventTime: number
}

/**
 * EventBus class for managing game events
 * 
 * Provides a centralized event system with debugging, error handling,
 * and performance monitoring capabilities.
 */
class EventBusClass {
  private listeners: Map<string, Set<EventCallback>> = new Map()
  private config: EventBusConfig
  private metrics: EventBusMetrics
  private errorCallbacks: Set<EventCallback<EventBusErrorEvent>> = new Set()

  constructor(config: Partial<EventBusConfig> = {}) {
    // Initialize configuration with defaults
    this.config = {
      debugMode: process.env.NODE_ENV === 'development',
      maxListeners: 50,
      errorThreshold: 10,
      enableMetrics: true,
      ...config
    }

    // Initialize metrics
    this.metrics = {
      totalEvents: 0,
      totalErrors: 0,
      eventCounts: new Map(),
      errorCounts: new Map(),
      lastEventTime: 0
    }

    // Set up error handling
    this.setupErrorHandling()
  }

  /**
   * Set up global error handling for the event bus
   */
  private setupErrorHandling(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        if (event.error && event.error.message?.includes('EventBus')) {
          this.handleInternalError(event.error, 'window_error')
        }
      })
    }
  }

  /**
   * Subscribe to an event
   * 
   * @param event - Event name to subscribe to
   * @param callback - Callback function to execute when event is emitted
   */
  on<K extends keyof GameEvents>(event: K, callback: EventCallback<GameEvents[K]>): void
  on(event: string, callback: EventCallback): void
  on(event: string, callback: EventCallback): void {
    try {
      // Validate inputs
      if (!event || typeof event !== 'string') {
        throw new Error('Event name must be a non-empty string')
      }
      if (!callback || typeof callback !== 'function') {
        throw new Error('Callback must be a function')
      }

      // Check listener limits
      const currentListeners = this.listeners.get(event)
      if (currentListeners && currentListeners.size >= this.config.maxListeners) {
        console.warn(`[EventBus] Maximum listeners (${this.config.maxListeners}) reached for event: ${event}`)
        return
      }

      // Initialize event listeners set if needed
      if (!this.listeners.has(event)) {
        this.listeners.set(event, new Set())
      }
      
      // Add callback to listeners
      this.listeners.get(event)!.add(callback)
      
      if (this.config.debugMode) {
        console.log(`[EventBus] Subscribed to event: ${event} (${this.listeners.get(event)!.size} listeners)`)
      }
    } catch (error) {
      this.handleInternalError(error as Error, 'on', event)
    }
  }

  /**
   * Unsubscribe from an event
   */
  off<K extends keyof GameEvents>(event: K, callback: EventCallback<GameEvents[K]>): void
  off(event: string, callback: EventCallback): void
  off(event: string, callback: EventCallback): void {
    const eventListeners = this.listeners.get(event)
    if (eventListeners) {
      eventListeners.delete(callback)
      
      // Clean up empty event sets
      if (eventListeners.size === 0) {
        this.listeners.delete(event)
      }
      
      if (this.config.debugMode) {
        console.log(`[EventBus] Unsubscribed from event: ${event}`)
      }
    }
  }

  /**
   * Emit an event to all registered listeners
   * 
   * @param event - Event name to emit
   * @param data - Event data to pass to listeners
   */
  emit<K extends keyof GameEvents>(event: K, data: GameEvents[K]): void
  emit(event: string, data: any): void
  emit(event: string, data: any): void {
    try {
      // Validate inputs
      if (!event || typeof event !== 'string') {
        throw new Error('Event name must be a non-empty string')
      }

      // Update metrics
      if (this.config.enableMetrics) {
        this.updateMetrics(event)
      }

      const eventListeners = this.listeners.get(event)
      
      if (eventListeners && eventListeners.size > 0) {
        if (this.config.debugMode) {
          console.log(`[EventBus] Emitting event: ${event} to ${eventListeners.size} listeners`, data)
        }
        
        // Create a copy of listeners to avoid issues if listeners are modified during emission
        const listenersArray = Array.from(eventListeners)
        
        // Execute callbacks with error handling
        listenersArray.forEach((callback, index) => {
          try {
            callback(data)
          } catch (error) {
            this.handleListenerError(error as Error, event, index)
          }
        })
      } else if (this.config.debugMode) {
        console.log(`[EventBus] No listeners for event: ${event}`)
      }
    } catch (error) {
      this.handleInternalError(error as Error, 'emit', event)
    }
  }

  /**
   * Subscribe to an event only once
   */
  once<K extends keyof GameEvents>(event: K, callback: EventCallback<GameEvents[K]>): void
  once(event: string, callback: EventCallback): void
  once(event: string, callback: EventCallback): void {
    const onceCallback = (data: any) => {
      callback(data)
      this.off(event, onceCallback)
    }
    
    this.on(event, onceCallback)
  }

  /**
   * Remove all listeners for a specific event
   */
  removeAllListeners(event?: string): void {
    if (event) {
      this.listeners.delete(event)
      if (this.config.debugMode) {
        console.log(`[EventBus] Removed all listeners for event: ${event}`)
      }
    } else {
      this.listeners.clear()
      if (this.config.debugMode) {
        console.log(`[EventBus] Removed all event listeners`)
      }
    }
  }

  /**
   * Get the number of listeners for an event
   */
  listenerCount(event: string): number {
    return this.listeners.get(event)?.size || 0
  }

  /**
   * Get all registered event names
   */
  eventNames(): string[] {
    return Array.from(this.listeners.keys())
  }

  /**
   * Handle errors that occur in event listeners
   */
  private handleListenerError(error: Error, eventName: string, listenerIndex: number): void {
    this.metrics.totalErrors++
    
    const errorCount = this.metrics.errorCounts.get(eventName) || 0
    this.metrics.errorCounts.set(eventName, errorCount + 1)

    console.error(`[EventBus] Error in listener ${listenerIndex} for event ${eventName}:`, error)

    // Emit error event if we have error listeners
    if (this.errorCallbacks.size > 0) {
      const errorEvent: EventBusErrorEvent = {
        type: 'eventbus_error',
        timestamp: Date.now(),
        error,
        context: 'listener_execution',
        eventType: eventName
      }

      this.errorCallbacks.forEach(callback => {
        try {
          callback(errorEvent)
        } catch (err) {
          console.error('[EventBus] Error in error callback:', err)
        }
      })
    }
  }

  /**
   * Handle internal EventBus errors
   */
  private handleInternalError(error: Error, context: string, eventName?: string): void {
    this.metrics.totalErrors++
    
    console.error(`[EventBus] Internal error in ${context}:`, error, { eventName })

    // Emit error event if we have error listeners
    if (this.errorCallbacks.size > 0) {
      const errorEvent: EventBusErrorEvent = {
        type: 'eventbus_error',
        timestamp: Date.now(),
        error,
        context,
        eventType: eventName
      }

      this.errorCallbacks.forEach(callback => {
        try {
          callback(errorEvent)
        } catch (err) {
          console.error('[EventBus] Error in error callback:', err)
        }
      })
    }
  }

  /**
   * Update event metrics
   */
  private updateMetrics(eventName: string): void {
    this.metrics.totalEvents++
    this.metrics.lastEventTime = Date.now()
    
    const eventCount = this.metrics.eventCounts.get(eventName) || 0
    this.metrics.eventCounts.set(eventName, eventCount + 1)
  }

  /**
   * Subscribe to EventBus error events
   */
  onError(callback: EventCallback<EventBusErrorEvent>): void {
    this.errorCallbacks.add(callback)
  }

  /**
   * Unsubscribe from EventBus error events
   */
  offError(callback: EventCallback<EventBusErrorEvent>): void {
    this.errorCallbacks.delete(callback)
  }

  /**
   * Get EventBus metrics
   */
  getMetrics(): EventBusMetrics {
    return {
      ...this.metrics,
      eventCounts: new Map(this.metrics.eventCounts),
      errorCounts: new Map(this.metrics.errorCounts)
    }
  }

  /**
   * Reset EventBus metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalEvents: 0,
      totalErrors: 0,
      eventCounts: new Map(),
      errorCounts: new Map(),
      lastEventTime: 0
    }
  }

  /**
   * Enable or disable debug mode
   */
  setDebugMode(enabled: boolean): void {
    this.config.debugMode = enabled
    console.log(`[EventBus] Debug mode ${enabled ? 'enabled' : 'disabled'}`)
  }

  /**
   * Update EventBus configuration
   */
  updateConfig(newConfig: Partial<EventBusConfig>): void {
    this.config = { ...this.config, ...newConfig }
    console.log('[EventBus] Configuration updated:', this.config)
  }
}

// Create singleton instance
export const EventBus = new EventBusClass()

// Global window interface for Phaser integration
declare global {
  interface Window {
    gameEventBus: EventBusClass
    onPlayerCollisionStart?: (event: CollisionEvent) => void
    onPlayerCollisionEnd?: (event: CollisionEvent) => void
  }
}

// Make EventBus available globally for Phaser
if (typeof window !== 'undefined') {
  window.gameEventBus = EventBus
}

export default EventBus
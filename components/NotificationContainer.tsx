'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChatNotification } from '../types/chat'
import NotificationToast from './NotificationToast'

interface NotificationContainerProps {
  notifications: ChatNotification[]
  onNotificationClick?: (notification: ChatNotification) => void
  maxToasts?: number
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
  enableSound?: boolean
  toastDuration?: number
}

interface ActiveToast {
  id: string
  notification: ChatNotification
  timestamp: number
}

export default function NotificationContainer({
  notifications,
  onNotificationClick,
  maxToasts = 5,
  position = 'top-right',
  enableSound = true,
  toastDuration = 5000
}: NotificationContainerProps) {
  const [activeToasts, setActiveToasts] = useState<ActiveToast[]>([])
  const [processedNotifications, setProcessedNotifications] = useState<Set<string>>(new Set())

  // Process new notifications
  useEffect(() => {
    const newNotifications = notifications.filter(
      notification => !processedNotifications.has(notification.id) && !notification.isRead
    )

    if (newNotifications.length > 0) {
      const now = Date.now()
      const newToasts: ActiveToast[] = newNotifications.map(notification => ({
        id: `toast_${notification.id}_${now}`,
        notification,
        timestamp: now
      }))

      setActiveToasts(prev => {
        // Add new toasts and limit to maxToasts
        const updated = [...prev, ...newToasts]
        return updated.slice(-maxToasts)
      })

      // Mark as processed
      setProcessedNotifications(prev => {
        const updated = new Set(prev)
        newNotifications.forEach(notification => updated.add(notification.id))
        return updated
      })
    }
  }, [notifications, processedNotifications, maxToasts])

  // Clean up old processed notifications to prevent memory leaks
  useEffect(() => {
    const cleanup = () => {
      const currentNotificationIds = new Set(notifications.map(n => n.id))
      setProcessedNotifications(prev => {
        const updated = new Set<string>()
        prev.forEach(id => {
          if (currentNotificationIds.has(id)) {
            updated.add(id)
          }
        })
        return updated
      })
    }

    const interval = setInterval(cleanup, 60000) // Clean up every minute
    return () => clearInterval(interval)
  }, [notifications])

  const handleToastClose = useCallback((toastId: string) => {
    setActiveToasts(prev => prev.filter(toast => toast.id !== toastId))
  }, [])

  const handleToastClick = useCallback((notification: ChatNotification) => {
    if (onNotificationClick) {
      onNotificationClick(notification)
    }
  }, [onNotificationClick])

  if (activeToasts.length === 0) {
    return null
  }

  return (
    <div className="fixed inset-0 pointer-events-none z-[100]">
      {activeToasts.map((toast, index) => (
        <NotificationToast
          key={toast.id}
          notification={toast.notification}
          onClose={() => handleToastClose(toast.id)}
          onClick={() => handleToastClick(toast.notification)}
          duration={toastDuration}
          position={position}
          index={index}
          playSound={enableSound && index === activeToasts.length - 1} // Only play sound for the newest toast
        />
      ))}
    </div>
  )
}
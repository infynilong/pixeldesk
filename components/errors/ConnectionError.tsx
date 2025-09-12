'use client'

import { useState } from 'react'
import ErrorDisplay from './ErrorDisplay'

interface ConnectionErrorProps {
  status: 'connected' | 'connecting' | 'disconnected' | 'reconnecting' | 'failed'
  error?: string
  onRetry?: () => void
  className?: string
}

export default function ConnectionError({
  status,
  error,
  onRetry,
  className = ''
}: ConnectionErrorProps) {
  const [isRetrying, setIsRetrying] = useState(false)

  const handleRetry = async () => {
    if (onRetry) {
      setIsRetrying(true)
      try {
        await onRetry()
      } finally {
        setIsRetrying(false)
      }
    }
  }

  const getConnectionStatus = () => {
    switch (status) {
      case 'connected':
        return {
          title: '已连接',
          message: '连接正常',
          severity: 'info' as const,
          icon: '✅',
          retryable: false
        }
      case 'connecting':
        return {
          title: '连接中...',
          message: '正在建立连接',
          severity: 'info' as const,
          icon: '🔄',
          retryable: false
        }
      case 'reconnecting':
        return {
          title: '重新连接中...',
          message: '正在尝试重新连接',
          severity: 'warning' as const,
          icon: '🔄',
          retryable: false
        }
      case 'disconnected':
        return {
          title: '已断开连接',
          message: '连接已断开',
          severity: 'warning' as const,
          icon: '🔌',
          retryable: true
        }
      case 'failed':
        return {
          title: '连接失败',
          message: error || '无法建立连接',
          severity: 'error' as const,
          icon: '❌',
          retryable: true
        }
      default:
        return {
          title: '未知状态',
          message: '连接状态未知',
          severity: 'warning' as const,
          icon: '❓',
          retryable: false
        }
    }
  }

  const statusInfo = getConnectionStatus()

  return (
    <ErrorDisplay
      title={statusInfo.title}
      message={statusInfo.message}
      severity={statusInfo.severity}
      icon={statusInfo.icon}
      retryable={statusInfo.retryable && !isRetrying}
      onRetry={handleRetry}
      className={className}
    />
  )
}
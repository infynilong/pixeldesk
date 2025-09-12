'use client'

import { useState } from 'react'
import ErrorDisplay from './ErrorDisplay'

interface MessageErrorProps {
  message: string
  code?: string
  onRetry?: () => Promise<void>
  className?: string
}

export default function MessageError({
  message,
  code,
  onRetry,
  className = ''
}: MessageErrorProps) {
  const [isRetrying, setIsRetrying] = useState(false)

  const handleRetry = async () => {
    if (onRetry) {
      setIsRetrying(true)
      try {
        await onRetry()
      } catch (error) {
        console.error('Failed to retry message:', error)
      } finally {
        setIsRetrying(false)
      }
    }
  }

  const getErrorDetails = () => {
    if (code) {
      switch (code) {
        case 'MESSAGE_TOO_LONG':
          return {
            title: '消息过长',
            message: '消息内容不能超过5000个字符',
            severity: 'warning' as const,
            retryable: false
          }
        case 'EMPTY_MESSAGE':
          return {
            title: '空消息',
            message: '消息内容不能为空',
            severity: 'warning' as const,
            retryable: false
          }
        case 'RATE_LIMIT_EXCEEDED':
          return {
            title: '发送频率过高',
            message: '请稍后再试',
            severity: 'warning' as const,
            retryable: true
          }
        case 'NETWORK_ERROR':
          return {
            title: '网络错误',
            message: '网络连接出现问题',
            severity: 'error' as const,
            retryable: true
          }
        case 'DATABASE_ERROR':
          return {
            title: '服务器错误',
            message: '服务器暂时不可用',
            severity: 'error' as const,
            retryable: true
          }
        default:
          return {
            title: '发送失败',
            message: message || '消息发送失败',
            severity: 'error' as const,
            retryable: true
          }
      }
    }

    return {
      title: '发送失败',
      message: message || '消息发送失败',
      severity: 'error' as const,
      retryable: true
    }
  }

  const errorInfo = getErrorDetails()

  return (
    <ErrorDisplay
      title={errorInfo.title}
      message={errorInfo.message}
      code={code}
      severity={errorInfo.severity}
      retryable={errorInfo.retryable && !isRetrying}
      onRetry={handleRetry}
      className={className}
    />
  )
}
'use client'

import { ReactNode } from 'react'

interface ErrorDisplayProps {
  title?: string
  message: string
  code?: string
  retryable?: boolean
  onRetry?: () => void
  severity?: 'error' | 'warning' | 'info'
  icon?: ReactNode
  className?: string
}

export default function ErrorDisplay({
  title,
  message,
  code,
  retryable = false,
  onRetry,
  severity = 'error',
  icon,
  className = ''
}: ErrorDisplayProps) {
  const getSeverityStyles = () => {
    switch (severity) {
      case 'warning':
        return 'bg-retro-orange/10 border-retro-orange/20 text-retro-orange'
      case 'info':
        return 'bg-retro-blue/10 border-retro-blue/20 text-retro-blue'
      case 'error':
      default:
        return 'bg-retro-red/10 border-retro-red/20 text-retro-red'
    }
  }

  const getSeverityIcon = () => {
    if (icon) return icon
    
    switch (severity) {
      case 'warning':
        return '⚠️'
      case 'info':
        return 'ℹ️'
      case 'error':
      default:
        return '❌'
    }
  }

  return (
    <div className={`${getSeverityStyles()} border rounded-lg p-4 ${className}`}>
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 text-lg">
          {getSeverityIcon()}
        </div>
        
        <div className="flex-1 min-w-0">
          {title && (
            <h3 className="font-medium text-sm mb-1">
              {title}
            </h3>
          )}
          
          <p className="text-sm">
            {message}
          </p>
          
          {code && (
            <p className="text-xs opacity-70 mt-1">
              错误代码: {code}
            </p>
          )}
        </div>
      </div>
      
      {retryable && onRetry && (
        <div className="mt-3">
          <button
            onClick={onRetry}
            className="bg-retro-border/30 hover:bg-retro-border/50 text-retro-text text-xs px-3 py-1 rounded transition-colors border border-retro-border/50 hover:border-retro-border"
          >
            重试
          </button>
        </div>
      )}
    </div>
  )
}
'use client'

import { Component, ErrorInfo, ReactNode } from 'react'
import ErrorDisplay from './ErrorDisplay'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error?: Error
}

export default class ChatErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Chat Error Boundary caught an error:', error, errorInfo)
    
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <ErrorDisplay
          title="聊天组件错误"
          message={this.state.error?.message || '聊天功能出现异常'}
          severity="error"
          retryable={true}
          onRetry={() => {
            this.setState({ hasError: false, error: undefined })
            window.location.reload()
          }}
          className="m-4"
        />
      )
    }

    return this.props.children
  }
}
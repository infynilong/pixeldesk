'use client'

import { useState, useEffect } from 'react'
import LoginForm from './LoginForm'
import RegisterForm from './RegisterForm'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  initialMode?: 'login' | 'register'
}

export default function AuthModal({ isOpen, onClose, initialMode = 'login' }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode)

  // 核心修复：当模态框打开时，强制同步到期望的模式（登录或注册）
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode)
    }
  }, [isOpen, initialMode])

  if (!isOpen) return null

  const handleLoginSuccess = () => {
    onClose()
  }

  const handleRegisterSuccess = () => {
    onClose()
  }

  const handleSwitchToLogin = () => {
    setMode('login')
  }

  const handleSwitchToRegister = () => {
    setMode('register')
  }

  const handleClose = () => {
    onClose()
    // Reset to initial mode when closing
    setMode(initialMode)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="relative">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute -top-2 -right-2 z-10 bg-retro-bg-darker border border-retro-border rounded-full w-8 h-8 flex items-center justify-center text-retro-textMuted hover:text-white hover:bg-retro-border/30 "
        >
          ×
        </button>

        {mode === 'login' ? (
          <LoginForm
            onSuccess={handleLoginSuccess}
            onSwitchToRegister={handleSwitchToRegister}
          />
        ) : (
          <RegisterForm
            onSuccess={handleRegisterSuccess}
            onSwitchToLogin={handleSwitchToLogin}
          />
        )}
      </div>
    </div>
  )
}
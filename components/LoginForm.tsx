'use client'

import { useState } from 'react'
import { useUser } from '../contexts/UserContext'
import GameCompatibleInput from './GameCompatibleInput'
import { useTranslation } from '@/lib/hooks/useTranslation'
import { useBrandConfig } from '@/lib/hooks/useBrandConfig'

interface LoginFormProps {
  onSuccess?: () => void
  onSwitchToRegister?: () => void
}

export default function LoginForm({ onSuccess, onSwitchToRegister }: LoginFormProps) {
  const { login, isLoading } = useUser()
  const { t } = useTranslation()
  const { config } = useBrandConfig()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const success = await login(email, password)
    if (success) {
      onSuccess?.()
    } else {
      setError(t.auth.login_failed)
    }
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center z-50 p-4">
      {/* 背景装饰 */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(0,0,0,0.8)_100%)]"></div>

      <div className="relative bg-gradient-to-br from-retro-bg-darker via-gray-900 to-retro-bg-darker border-2 border-retro-purple/30 rounded-xl p-8 w-full max-w-md shadow-2xl">
        {/* 顶部装饰线 */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-20 h-1 bg-gradient-to-r from-retro-purple to-retro-pink"></div>

        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-r from-retro-purple to-retro-pink rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🚀</span>
          </div>
          <h2 className="text-white text-xl font-bold">{t.auth.welcome_back.replace('{appName}', config?.app_name || 'Tembo PX Workshop')}</h2>
          <p className="text-retro-textMuted text-sm mt-1">{t.auth.login_subtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <GameCompatibleInput
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            label={t.auth.email}
            placeholder={t.auth.email_placeholder}
            error={error && error.includes(t.auth.email) ? error : undefined}
            required
          />

          <GameCompatibleInput
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            label={t.auth.password}
            placeholder={t.auth.password_placeholder}
            error={error && !error.includes(t.auth.email) ? error : undefined}
            required
          />

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-retro-purple to-retro-pink hover:from-retro-purple/90 hover:to-retro-pink/90 text-white font-bold py-3 px-6 rounded-lg  disabled:opacity-50 shadow-lg hover:shadow-purple-500/25"
          >
            {isLoading ? (
              <span className="flex items-center justify-center space-x-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full "></div>
                <span>{t.auth.logging_in}</span>
              </span>
            ) : (
              t.auth.login_btn
            )}
          </button>
        </form>

        {onSwitchToRegister && (
          <div className="mt-6 text-center">
            <p className="text-retro-textMuted text-sm">
              {t.auth.no_account}
              <button
                onClick={onSwitchToRegister}
                className="ml-1 text-retro-purple hover:text-retro-pink  font-medium"
              >
                {t.auth.go_register}
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
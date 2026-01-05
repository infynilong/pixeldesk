'use client'

import { useState } from 'react'
import { useUser } from '../contexts/UserContext'
import GameCompatibleInput from './GameCompatibleInput'

interface LoginFormProps {
  onSuccess?: () => void
  onSwitchToRegister?: () => void
}

export default function LoginForm({ onSuccess, onSwitchToRegister }: LoginFormProps) {
  const { login, isLoading } = useUser()
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
      setError('登录失败，请检查邮箱和密码')
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
          <h2 className="text-white text-xl font-bold">欢迎回到 象素工坊</h2>
          <p className="text-retro-textMuted text-sm mt-1">登录您的账户继续游戏</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <GameCompatibleInput
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            label="邮箱地址"
            placeholder="请输入您的邮箱"
            error={error && error.includes('邮箱') ? error : undefined}
            required
          />

          <GameCompatibleInput
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            label="密码"
            placeholder="请输入您的密码"
            error={error && !error.includes('邮箱') ? error : undefined}
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
                <span>登录中...</span>
              </span>
            ) : (
              '登录账户'
            )}
          </button>
        </form>

        {onSwitchToRegister && (
          <div className="mt-6 text-center">
            <p className="text-retro-textMuted text-sm">
              还没有账户？
              <button
                onClick={onSwitchToRegister}
                className="ml-1 text-retro-purple hover:text-retro-pink  font-medium"
              >
                立即注册
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
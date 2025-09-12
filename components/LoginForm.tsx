'use client'

import { useState } from 'react'
import { useUser } from '../contexts/UserContext'

export default function LoginForm() {
  const { login, isLoading } = useUser()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const success = await login(email, password)
    if (!success) {
      setError('登录失败，请检查邮箱和密码')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-retro-bg-darker border border-retro-border rounded-lg p-6 w-80">
        <h2 className="text-white text-lg font-bold mb-4 text-center">登录 PixelDesk</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-retro-textMuted text-sm mb-2">
              邮箱
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-retro-border/30 border border-retro-border rounded-lg text-white placeholder-retro-textMuted focus:outline-none focus:ring-2 focus:ring-retro-purple"
              placeholder="请输入邮箱"
              required
            />
          </div>

          <div>
            <label className="block text-retro-textMuted text-sm mb-2">
              密码
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-retro-border/30 border border-retro-border rounded-lg text-white placeholder-retro-textMuted focus:outline-none focus:ring-2 focus:ring-retro-purple"
              placeholder="请输入密码"
              required
            />
          </div>

          {error && (
            <div className="text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-retro-purple to-retro-pink hover:from-retro-purple/90 hover:to-retro-pink/90 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 disabled:opacity-50"
          >
            {isLoading ? '登录中...' : '登录'}
          </button>
        </form>

        <div className="mt-4 text-center text-retro-textMuted text-sm">
          <p>演示账号：任意邮箱和密码均可登录</p>
        </div>
      </div>
    </div>
  )
}
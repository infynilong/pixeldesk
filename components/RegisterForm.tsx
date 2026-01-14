'use client'

import { useState } from 'react'
import { useUser } from '../contexts/UserContext'
import GameCompatibleInput from './GameCompatibleInput'
import { useTranslation } from '@/lib/hooks/useTranslation'
import { useBrandConfig } from '@/lib/hooks/useBrandConfig'

interface RegisterFormProps {
  onSuccess?: () => void
  onSwitchToLogin?: () => void
}

export default function RegisterForm({ onSuccess, onSwitchToLogin }: RegisterFormProps) {
  const { register, isLoading } = useUser()
  const { t } = useTranslation()
  const { config } = useBrandConfig()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    inviteCode: ''
  })
  const [errors, setErrors] = useState<string[]>([])

  const validateForm = () => {
    const newErrors = []

    if (!formData.name.trim()) {
      newErrors.push(t.auth.err_username_empty)
    }

    if (!formData.email.trim()) {
      newErrors.push(t.auth.err_email_empty)
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.push(t.auth.err_email_invalid)
    }

    if (!formData.password) {
      newErrors.push(t.auth.err_password_empty)
    } else if (formData.password.length < 6) {
      newErrors.push(t.auth.err_password_short)
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.push(t.auth.err_password_mismatch)
    }

    setErrors(newErrors)
    return newErrors.length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors([])

    if (!validateForm()) {
      return
    }

    try {
      const result = await register(
        formData.name.trim(),
        formData.email.trim(),
        formData.password,
        formData.inviteCode?.trim()
      )

      if (result.success) {
        // 注册成功，用户已自动登录 - 主页面将处理角色创建
        onSuccess?.()
      } else {
        setErrors([result.error || t.auth.register_failed])
      }
    } catch (error) {
      console.error('Registration error:', error)
      setErrors([t.auth.network_error])
    }
  }

  const handleInputChange = (field: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }))
    // 清除错误当用户开始输入时
    if (errors.length > 0) {
      setErrors([])
    }
  }


  return (
    <div className="fixed inset-0 bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center z-50 p-4">
      {/* 背景装饰 */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(0,0,0,0.8)_100%)]"></div>

      <div className="relative bg-gradient-to-br from-retro-bg-darker via-gray-900 to-retro-bg-darker border-2 border-retro-purple/30 rounded-xl p-8 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* 顶部装饰线 */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-20 h-1 bg-gradient-to-r from-retro-purple to-retro-pink"></div>

        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-r from-retro-purple to-retro-pink rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">✨</span>
          </div>
          <h2 className="text-white text-xl font-bold">{t.auth.join_us.replace('{appName}', config?.app_name || 'Tembo PX Workshop')}</h2>
          <p className="text-retro-textMuted text-sm mt-1">{t.auth.registering}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <GameCompatibleInput
            type="text"
            value={formData.name}
            onChange={handleInputChange('name')}
            label={t.auth.username}
            placeholder={t.auth.username_placeholder}
            helperText={t.auth.username_helper}
            error={errors.find(err => err.includes(t.auth.username) || err.includes(t.auth.err_username_empty))}
            required
          />

          <GameCompatibleInput
            type="email"
            value={formData.email}
            onChange={handleInputChange('email')}
            label={t.auth.email}
            placeholder={t.auth.email_placeholder}
            helperText={t.auth.email_helper}
            error={errors.find(err => err.includes(t.auth.email) || err.includes(t.auth.err_email_empty) || err.includes(t.auth.err_email_invalid))}
            required
          />

          <GameCompatibleInput
            type="password"
            value={formData.password}
            onChange={handleInputChange('password')}
            label={t.auth.password}
            placeholder={t.auth.password_placeholder}
            helperText={t.auth.password_helper}
            error={errors.find(err => (err.includes(t.auth.password) || err.includes(t.auth.err_password_empty) || err.includes(t.auth.err_password_short)) && !err.includes(t.auth.confirm_password))}
            required
          />

          <GameCompatibleInput
            type="password"
            value={formData.confirmPassword}
            onChange={handleInputChange('confirmPassword')}
            label={t.auth.confirm_password}
            placeholder={t.auth.confirm_password_placeholder}
            error={errors.find(err => err.includes(t.auth.confirm_password) || err.includes(t.auth.err_password_mismatch))}
            required
          />

          <GameCompatibleInput
            type="text"
            value={formData.inviteCode}
            onChange={handleInputChange('inviteCode')}
            label={`${(t.auth as any).invite_code || '邀请码'} (${(t.auth as any).optional || '可选'})`}
            placeholder={(t.auth as any).invite_code_placeholder || '请输入邀请码'}
            required={false}
          />

          {/* 显示其他错误 */}
          {errors.filter(err =>
            !err.includes(t.auth.username) &&
            !err.includes(t.auth.email) &&
            !err.includes(t.auth.password) &&
            !err.includes(t.auth.confirm_password) &&
            !err.includes(t.auth.err_password_mismatch)
          ).map((error, index) => (
            <div key={index} className="text-red-400 text-sm flex items-center space-x-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          ))}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-retro-purple to-retro-pink hover:from-retro-purple/90 hover:to-retro-pink/90 text-white font-bold py-3 px-6 rounded-lg  disabled:opacity-50 shadow-lg hover:shadow-purple-500/25"
          >
            {isLoading ? (
              <span className="flex items-center justify-center space-x-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full "></div>
                <span>{t.auth.registering}</span>
              </span>
            ) : (
              t.auth.create_account
            )}
          </button>
        </form>

        {onSwitchToLogin && (
          <div className="mt-6 text-center">
            <p className="text-retro-textMuted text-sm">
              {t.auth.has_account}
              <button
                onClick={onSwitchToLogin}
                className="ml-1 text-retro-purple hover:text-retro-pink  font-medium"
              >
                {t.auth.go_login}
              </button>
            </p>
          </div>
        )}
      </div>

    </div>
  )
}
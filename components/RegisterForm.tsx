'use client'

import { useState } from 'react'
import { useUser } from '../contexts/UserContext'
import GameCompatibleInput from './GameCompatibleInput'

interface RegisterFormProps {
  onSuccess?: () => void
  onSwitchToLogin?: () => void
}

export default function RegisterForm({ onSuccess, onSwitchToLogin }: RegisterFormProps) {
  const { register, isLoading } = useUser()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [errors, setErrors] = useState<string[]>([])

  const validateForm = () => {
    const newErrors = []
    
    if (!formData.name.trim()) {
      newErrors.push('用户名不能为空')
    }
    
    if (!formData.email.trim()) {
      newErrors.push('邮箱不能为空')
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.push('邮箱格式不正确')
    }
    
    if (!formData.password) {
      newErrors.push('密码不能为空')
    } else if (formData.password.length < 6) {
      newErrors.push('密码至少需要6位字符')
    }
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.push('两次输入的密码不一致')
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
        formData.password
      )

      if (result.success) {
        // 注册成功，用户已自动登录 - 主页面将处理角色创建
        onSuccess?.()
      } else {
        setErrors([result.error || '注册失败，请重试'])
      }
    } catch (error) {
      console.error('Registration error:', error)
      setErrors(['网络错误，请重试'])
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
          <h2 className="text-white text-xl font-bold">加入 象素工坊</h2>
          <p className="text-retro-textMuted text-sm mt-1">创建您的游戏账户，开始精彩旅程</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <GameCompatibleInput
            type="text"
            value={formData.name}
            onChange={handleInputChange('name')}
            label="用户名"
            placeholder="请输入用户名"
            helperText="支持中文、英文、数字和下划线"
            error={errors.find(err => err.includes('用户名'))}
            required
          />

          <GameCompatibleInput
            type="email"
            value={formData.email}
            onChange={handleInputChange('email')}
            label="邮箱地址"
            placeholder="请输入邮箱地址"
            helperText="用于登录和找回密码"
            error={errors.find(err => err.includes('邮箱'))}
            required
          />

          <GameCompatibleInput
            type="password"
            value={formData.password}
            onChange={handleInputChange('password')}
            label="密码"
            placeholder="请输入密码（至少6位）"
            helperText="建议使用字母和数字组合"
            error={errors.find(err => err.includes('密码') && !err.includes('确认'))}
            required
          />

          <GameCompatibleInput
            type="password"
            value={formData.confirmPassword}
            onChange={handleInputChange('confirmPassword')}
            label="确认密码"
            placeholder="请再次输入密码"
            error={errors.find(err => err.includes('确认') || err.includes('一致'))}
            required
          />

          {/* 显示其他错误 */}
          {errors.filter(err => 
            !err.includes('用户名') && 
            !err.includes('邮箱') && 
            !err.includes('密码') && 
            !err.includes('确认') && 
            !err.includes('一致')
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
                <span>注册中...</span>
              </span>
            ) : (
              '创建账户'
            )}
          </button>
        </form>

        {onSwitchToLogin && (
          <div className="mt-6 text-center">
            <p className="text-retro-textMuted text-sm">
              已有账户？
              <button
                onClick={onSwitchToLogin}
                className="ml-1 text-retro-purple hover:text-retro-pink  font-medium"
              >
                立即登录
              </button>
            </p>
          </div>
        )}
      </div>

    </div>
  )
}
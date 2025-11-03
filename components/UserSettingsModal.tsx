'use client'

import { useState, useRef, useEffect } from 'react'
import { useUser } from '../contexts/UserContext'
import GameCompatibleInput from './GameCompatibleInput'

interface UserSettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function UserSettingsModal({ isOpen, onClose }: UserSettingsModalProps) {
  const { user, refreshUser, logout } = useUser()
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'avatar'>('profile')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  
  // Profile form state
  const [profileForm, setProfileForm] = useState({
    name: ''
  })
  
  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  
  // Avatar state
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || ''
      })
    }
  }, [user])

  useEffect(() => {
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile)
      setPreviewUrl(url)
      return () => URL.revokeObjectURL(url)
    } else {
      setPreviewUrl(null)
    }
  }, [selectedFile])

  if (!isOpen || !user) return null

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      const response = await fetch('/api/auth/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: profileForm.name.trim()
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        showMessage('success', '个人资料更新成功')
        await refreshUser()
      } else {
        showMessage('error', data.error || '更新失败')
      }
    } catch (error) {
      console.error('Profile update error:', error)
      showMessage('error', '网络错误，请重试')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showMessage('error', '新密码两次输入不一致')
      return
    }
    
    if (passwordForm.newPassword.length < 6) {
      showMessage('error', '新密码至少需要6位字符')
      return
    }

    setIsLoading(true)
    
    try {
      const response = await fetch('/api/auth/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        showMessage('success', '密码修改成功')
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        })
      } else {
        showMessage('error', data.error || '密码修改失败')
      }
    } catch (error) {
      console.error('Password update error:', error)
      showMessage('error', '网络错误，请重试')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAvatarUpload = async () => {
    if (!selectedFile) {
      showMessage('error', '请选择文件')
      return
    }

    setIsLoading(true)
    
    try {
      const formData = new FormData()
      formData.append('avatar', selectedFile)

      const response = await fetch('/api/auth/avatar', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })

      const data = await response.json()

      if (response.ok && data.success) {
        showMessage('success', '头像上传成功')
        setSelectedFile(null)
        await refreshUser()
      } else {
        showMessage('error', data.error || '头像上传失败')
      }
    } catch (error) {
      console.error('Avatar upload error:', error)
      showMessage('error', '网络错误，请重试')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAvatarDelete = async () => {
    setIsLoading(true)
    
    try {
      const response = await fetch('/api/auth/avatar', {
        method: 'DELETE',
        credentials: 'include',
      })

      const data = await response.json()

      if (response.ok && data.success) {
        showMessage('success', '头像删除成功')
        await refreshUser()
      } else {
        showMessage('error', data.error || '头像删除失败')
      }
    } catch (error) {
      console.error('Avatar delete error:', error)
      showMessage('error', '网络错误，请重试')
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        showMessage('error', '请选择图片文件')
        return
      }
      
      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        showMessage('error', '文件大小不能超过5MB')
        return
      }
      
      setSelectedFile(file)
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
      onClose()
    } catch (error) {
      console.error('Logout error:', error)
      showMessage('error', '登出失败')
    }
  }

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
      <div className="bg-retro-bg-darker border border-retro-border rounded-lg w-[500px] max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-retro-border">
          <h2 className="text-white text-lg font-bold">用户设置</h2>
          <button
            onClick={onClose}
            className="text-retro-textMuted hover:text-white "
          >
            ×
          </button>
        </div>

        {/* Message */}
        {message && (
          <div className={`p-3 border-b border-retro-border ${
            message.type === 'success' ? 'bg-green-900/30 text-green-300' : 'bg-red-900/30 text-red-300'
          }`}>
            {message.text}
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-retro-border">
          {[
            { key: 'profile', label: '个人资料' },
            { key: 'password', label: '修改密码' },
            { key: 'avatar', label: '头像管理' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-4 py-2 text-sm  ${
                activeTab === tab.key
                  ? 'text-white border-b-2 border-retro-purple'
                  : 'text-retro-textMuted hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-4 max-h-[400px] overflow-y-auto">
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-retro-textMuted text-sm">
                  <span className="font-medium">邮箱:</span> {user.email}
                </p>
                <p className="text-retro-textMuted text-sm">
                  <span className="font-medium">积分:</span> {user.points || 0}
                </p>
              </div>
              
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <GameCompatibleInput
                  type="text"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ name: e.target.value })}
                  label="用户名"
                  placeholder="请输入用户名"
                  required
                />

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-retro-purple to-retro-pink hover:from-retro-purple/90 hover:to-retro-pink/90 text-white font-medium py-2 px-4 rounded-lg  disabled:opacity-50"
                >
                  {isLoading ? '更新中...' : '更新资料'}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'password' && (
            <form onSubmit={handlePasswordUpdate} className="space-y-4">
              <GameCompatibleInput
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                label="当前密码"
                placeholder="请输入当前密码"
                required
              />

              <GameCompatibleInput
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                label="新密码"
                placeholder="请输入新密码（至少6位）"
                helperText="建议使用字母和数字组合"
                required
              />

              <GameCompatibleInput
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                label="确认新密码"
                placeholder="请再次输入新密码"
                required
              />

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-retro-purple to-retro-pink hover:from-retro-purple/90 hover:to-retro-pink/90 text-white font-medium py-2 px-4 rounded-lg  disabled:opacity-50"
              >
                {isLoading ? '修改中...' : '修改密码'}
              </button>
            </form>
          )}

          {activeTab === 'avatar' && (
            <div className="space-y-4">
              {/* Current Avatar */}
              <div className="text-center">
                <div className="w-24 h-24 mx-auto mb-2 rounded-full overflow-hidden bg-retro-border/30 flex items-center justify-center">
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt="Current Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-retro-textMuted text-2xl">👤</span>
                  )}
                </div>
                <p className="text-retro-textMuted text-sm">当前头像</p>
              </div>

              {/* File Upload */}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                
                {previewUrl && (
                  <div className="text-center mb-4">
                    <div className="w-24 h-24 mx-auto mb-2 rounded-full overflow-hidden">
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className="text-retro-textMuted text-sm">预览</p>
                  </div>
                )}

                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full bg-retro-border/30 hover:bg-retro-border/50 text-white py-2 px-4 rounded-lg border border-retro-border "
                  >
                    选择图片
                  </button>

                  {selectedFile && (
                    <button
                      type="button"
                      onClick={handleAvatarUpload}
                      disabled={isLoading}
                      className="w-full bg-gradient-to-r from-retro-purple to-retro-pink hover:from-retro-purple/90 hover:to-retro-pink/90 text-white font-medium py-2 px-4 rounded-lg  disabled:opacity-50"
                    >
                      {isLoading ? '上传中...' : '上传头像'}
                    </button>
                  )}

                  {user.avatar && (
                    <button
                      type="button"
                      onClick={handleAvatarDelete}
                      disabled={isLoading}
                      className="w-full bg-red-600/20 hover:bg-red-600/30 text-red-400 hover:text-red-300 py-2 px-4 rounded-lg border border-red-600/30  disabled:opacity-50"
                    >
                      {isLoading ? '删除中...' : '删除头像'}
                    </button>
                  )}
                </div>

                <p className="text-retro-textMuted text-xs mt-2">
                  支持 JPEG、PNG、GIF、WebP 格式，最大 5MB
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-retro-border">
          <button
            onClick={handleLogout}
            className="text-red-400 hover:text-red-300 text-sm "
          >
            登出账号
          </button>
          
          <button
            onClick={onClose}
            className="bg-retro-border/30 hover:bg-retro-border/50 text-white py-2 px-4 rounded-lg "
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  )
}
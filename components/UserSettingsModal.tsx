'use client'

import { useState, useRef, useEffect } from 'react'
import { useUser } from '../contexts/UserContext'
import { useTranslation } from '@/lib/hooks/useTranslation'
import GameCompatibleInput from './GameCompatibleInput'

interface UserSettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function UserSettingsModal({ isOpen, onClose }: UserSettingsModalProps) {
  const { user, refreshUser, logout } = useUser()
  const { t } = useTranslation()
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

  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!isOpen || !user || !mounted) return null

  const { createPortal } = require('react-dom')

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
        showMessage('success', t.settings.update_success)
        await refreshUser()
      } else {
        showMessage('error', data.error || t.settings.update_failed)
      }
    } catch (error) {
      console.error('Profile update error:', error)
      showMessage('error', t.auth.network_error)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault()

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showMessage('error', t.auth.err_password_mismatch)
      return
    }

    if (passwordForm.newPassword.length < 6) {
      showMessage('error', t.auth.err_password_short)
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
        showMessage('success', t.settings.password_success)
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        })
      } else {
        showMessage('error', data.error || t.settings.password_failed)
      }
    } catch (error) {
      console.error('Password update error:', error)
      showMessage('error', t.auth.network_error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAvatarUpload = async () => {
    if (!selectedFile) {
      showMessage('error', t.settings.err_select_file)
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
        showMessage('success', t.settings.upload_success)
        setSelectedFile(null)
        await refreshUser()
      } else {
        showMessage('error', data.error || t.settings.upload_failed)
      }
    } catch (error) {
      console.error('Avatar upload error:', error)
      showMessage('error', t.auth.network_error)
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
        showMessage('success', t.settings.delete_success)
        await refreshUser()
      } else {
        showMessage('error', data.error || t.settings.delete_failed)
      }
    } catch (error) {
      console.error('Avatar delete error:', error)
      showMessage('error', t.auth.network_error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        showMessage('error', t.settings.err_select_image)
        return
      }

      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        showMessage('error', t.settings.err_size_limit)
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
      showMessage('error', t.settings.logout_failed)
    }
  }

  return createPortal(
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(0,0,0,0.8)_100%)] pointer-events-none"></div>

      <div className="relative bg-gradient-to-br from-retro-bg-darker via-gray-900 to-retro-bg-darker border-2 border-retro-purple/30 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Top decoration line */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-retro-purple to-retro-pink"></div>

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-retro-purple/20 to-retro-pink/20 rounded-lg flex items-center justify-center border border-white/10">
              <span className="text-xl">⚙️</span>
            </div>
            <h2 className="text-white text-xl font-bold tracking-wide">{t.settings.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Message */}
        {message && (
          <div className={`px-6 py-3 flex items-center gap-2 ${message.type === 'success' ? 'bg-green-500/10 text-green-400 border-b border-green-500/20' : 'bg-red-500/10 text-red-400 border-b border-red-500/20'
            }`}>
            <span>{message.type === 'success' ? '✅' : '⚠️'}</span>
            <span className="text-sm font-medium">{message.text}</span>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-white/10 px-6">
          {[
            { key: 'profile', label: t.settings.profile, icon: '👤' },
            { key: 'password', label: t.settings.password, icon: '🔒' },
            { key: 'avatar', label: t.settings.avatar, icon: '🖼️' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-6 py-4 text-sm font-medium flex items-center gap-2 transition-all relative ${activeTab === tab.key
                ? 'text-white'
                : 'text-gray-400 hover:text-gray-200'
                }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
              {activeTab === tab.key && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-retro-purple to-retro-pink"></div>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto max-h-[calc(90vh-200px)]">
          {activeTab === 'profile' && (
            <div className="space-y-8">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t.settings.email}</label>
                  <div className="bg-black/20 p-3 rounded-lg border border-white/5 text-gray-300 font-mono text-sm break-all">
                    {user.email}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t.settings.points}</label>
                  <div className="bg-black/20 p-3 rounded-lg border border-white/5 text-yellow-400 font-mono text-sm font-bold flex items-center gap-2">
                    <span>🪙</span> {user.points || 0}
                  </div>
                </div>
              </div>

              {/* Invite Code Section */}
              <div className="bg-gradient-to-br from-retro-purple/5 to-retro-pink/5 border border-retro-purple/20 rounded-xl p-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <svg className="w-24 h-24 text-retro-purple" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                  </svg>
                </div>

                <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                  <span className="text-retro-pink">🎟️</span> {(t.auth as any).invite_code || '邀请码'}
                </h3>

                <div className="relative z-10">
                  {user.inviteCode ? (
                    <div className="flex flex-col gap-3">
                      <p className="text-gray-400 text-sm">分享您的邀请码，邀请朋友加入可获得 <span className="text-yellow-400 font-bold">100</span> 象素币奖励！</p>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-black/40 border border-retro-purple/30 rounded-lg px-4 py-3 text-cyan-400 font-mono text-xl font-bold tracking-widest text-center shadow-inner">
                          {user.inviteCode}
                        </div>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(user.inviteCode!)
                            showMessage('success', '已复制到剪贴板')
                          }}
                          className="px-6 py-3 bg-retro-purple/20 hover:bg-retro-purple/40 border border-retro-purple/50 text-retro-purple hover:text-white rounded-lg transition-all font-medium flex items-center gap-2 group/btn"
                        >
                          <svg className="w-5 h-5 group-hover/btn:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                          </svg>
                          复制
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      <p className="text-gray-400 text-sm">还没有邀请码？生成一个专属邀请码，开始邀请好友！</p>
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.preventDefault()
                          setIsLoading(true)
                          try {
                            const response = await fetch('/api/auth/settings/invite-code', {
                              method: 'POST'
                            })
                            const data = await response.json()
                            if (data.success) {
                              showMessage('success', '邀请码生成成功')
                              await refreshUser(true)
                            } else {
                              showMessage('error', data.error || '生成失败')
                            }
                          } catch (e) {
                            showMessage('error', '网络错误')
                          } finally {
                            setIsLoading(false)
                          }
                        }}
                        disabled={isLoading}
                        className="w-full py-3 bg-gradient-to-r from-retro-purple to-retro-pink hover:from-retro-purple/90 hover:to-retro-pink/90 text-white font-bold rounded-lg shadow-lg shadow-purple-900/20 border border-white/10 disabled:opacity-50 transition-all active:scale-[0.98]"
                      >
                        {isLoading ? '生成中...' : '✨ 生成我的邀请码'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <form onSubmit={handleProfileUpdate} className="space-y-6 pt-4 border-t border-white/10">
                <GameCompatibleInput
                  type="text"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ name: e.target.value })}
                  label={t.settings.username}
                  placeholder={t.settings.username_placeholder}
                  required
                />

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="bg-white/10 hover:bg-white/20 text-white font-medium py-2.5 px-6 rounded-lg border border-white/10 transition-colors disabled:opacity-50"
                  >
                    {isLoading ? t.settings.updating : t.settings.update_profile}
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'password' && (
            <form onSubmit={handlePasswordUpdate} className="space-y-6 max-w-md mx-auto py-4">
              <GameCompatibleInput
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                label={t.settings.current_password}
                placeholder={t.settings.current_password_placeholder}
                required
              />

              <div className="space-y-4">
                <GameCompatibleInput
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                  label={t.settings.new_password}
                  placeholder={t.settings.new_password_placeholder}
                  helperText={t.auth.password_helper}
                  required
                />

                <GameCompatibleInput
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  label={t.settings.confirm_new_password}
                  placeholder={t.settings.confirm_new_password_placeholder}
                  required
                />
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-retro-purple to-retro-pink hover:from-retro-purple/90 hover:to-retro-pink/90 text-white font-bold py-3 px-6 rounded-lg shadow-lg shadow-purple-900/20 disabled:opacity-50 transition-all active:scale-[0.98]"
                >
                  {isLoading ? t.settings.modifying : t.settings.password}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'avatar' && (
            <div className="space-y-8 max-w-md mx-auto py-4">
              {/* Current Avatar */}
              <div className="text-center space-y-4">
                <div className="relative w-32 h-32 mx-auto">
                  <div className="absolute inset-0 bg-gradient-to-br from-retro-purple to-retro-pink rounded-full blur-lg opacity-50 animate-pulse"></div>
                  <div className="relative w-full h-full rounded-full overflow-hidden bg-black/40 border-4 border-white/10 flex items-center justify-center">
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={t.settings.current_avatar}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-5xl">👤</span>
                    )}
                  </div>
                </div>
                <p className="text-gray-400 font-medium">{t.settings.current_avatar}</p>
              </div>

              {/* File Upload */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-6">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {previewUrl && (
                  <div className="text-center bg-black/20 rounded-lg p-4 border border-white/5">
                    <p className="text-gray-400 text-xs uppercase tracking-wider mb-3">{t.settings.preview}</p>
                    <div className="w-24 h-24 mx-auto rounded-full overflow-hidden border-2 border-retro-purple/50">
                      <img
                        src={previewUrl}
                        alt={t.settings.preview}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full bg-white/5 hover:bg-white/10 text-white py-3 px-4 rounded-lg border border-white/10 border-dashed hover:border-white/30 transition-all"
                  >
                    {t.settings.select_image}
                  </button>

                  {selectedFile && (
                    <button
                      type="button"
                      onClick={handleAvatarUpload}
                      disabled={isLoading}
                      className="w-full bg-gradient-to-r from-retro-purple to-retro-pink hover:from-retro-purple/90 hover:to-retro-pink/90 text-white font-bold py-3 px-4 rounded-lg shadow-lg disabled:opacity-50 transition-all"
                    >
                      {isLoading ? t.settings.uploading : t.settings.upload_avatar}
                    </button>
                  )}

                  {user.avatar && (
                    <button
                      type="button"
                      onClick={handleAvatarDelete}
                      disabled={isLoading}
                      className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 py-3 px-4 rounded-lg border border-red-500/20 transition-all disabled:opacity-50"
                    >
                      {isLoading ? t.settings.deleting : t.settings.delete_avatar}
                    </button>
                  )}
                </div>

                <p className="text-gray-500 text-xs text-center">
                  {t.settings.upload_hint}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-white/10 bg-black/20">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-red-400 hover:text-red-300 text-sm font-medium px-4 py-2 hover:bg-red-500/10 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {t.settings.logout}
          </button>

          <button
            onClick={onClose}
            className="bg-white/10 hover:bg-white/20 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
          >
            {t.common.close}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
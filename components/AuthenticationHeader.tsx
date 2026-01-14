'use client'

import { useState } from 'react'
import { useUser } from '../contexts/UserContext'
import AuthModal from './AuthModal'
import UserSettingsModal from './UserSettingsModal'
import { useTranslation } from '../lib/hooks/useTranslation'

export default function AuthenticationHeader() {
  const { user, isLoading } = useUser()
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login')
  const [settingsModalOpen, setSettingsModalOpen] = useState(false)
  const { t } = useTranslation()

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2">
        <div className="w-4 h-4 bg-gray-500 rounded animate-pulse"></div>
        <span className="text-gray-400 text-sm font-mono">{t.common.loading}</span>
      </div>
    )
  }

  if (!user) {
    // User not authenticated - show login/register buttons
    return (
      <>
        <div className="bg-gray-800/80 border border-gray-700/50 rounded-xl p-4">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-6 h-6 bg-gray-700 border border-gray-600 rounded flex items-center justify-center">
              <svg className="w-3 h-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <h3 className="text-gray-200 text-sm font-medium">{t.auth_header.account_auth}</h3>
              <p className="text-gray-500 text-xs font-mono">{t.auth_header.account_access}</p>
            </div>
          </div>

          <div className="space-y-2">
            <button
              onClick={() => {
                setAuthModalMode('login')
                setAuthModalOpen(true)
              }}
              className="w-full px-3 py-2 text-sm bg-gray-700/50 hover:bg-gray-700 text-gray-200 rounded-lg border border-gray-600/50  font-mono"
            >
              {t.auth.login.toUpperCase()}
            </button>
            <button
              onClick={() => {
                setAuthModalMode('register')
                setAuthModalOpen(true)
              }}
              className="w-full px-3 py-2 text-sm bg-gradient-to-r from-blue-600/80 to-purple-600/80 hover:from-blue-600 hover:to-purple-600 text-white rounded-lg  font-mono"
            >
              {t.auth.register.toUpperCase()}
            </button>
          </div>
        </div >

        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          initialMode={authModalMode}
        />
      </>
    )
  }

  // User authenticated - show user info and controls
  return (
    <>
      <div className="bg-gray-800/80 border border-gray-700/50 rounded-xl p-4">
        <div className="flex items-center space-x-3 mb-3">
          <div className="w-6 h-6 bg-gray-700 border border-gray-600 rounded flex items-center justify-center">
            <svg className="w-3 h-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-gray-200 text-sm font-medium">{t.auth_header.authenticated}</h3>
            <p className="text-gray-500 text-xs font-mono">{t.auth_header.authenticated_sub}</p>
          </div>
          <button
            onClick={() => setSettingsModalOpen(true)}
            className="p-1.5 hover:bg-gray-700/50 rounded-lg "
            title={t.auth_header.user_settings}
          >
            <svg
              className="w-4 h-4 text-gray-400 hover:text-gray-200"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>
        </div>

        <div className="flex items-center space-x-3">
          {/* User Avatar */}
          <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-700/50 border border-gray-600/50 flex items-center justify-center">
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-gray-400 text-lg">👤</span>
            )}
          </div>

          {/* User Info */}
          <div className="flex-1 min-w-0">
            <h4 className="text-gray-200 text-sm font-medium font-mono truncate">{user.name}</h4>
            <div className="flex items-center space-x-2 text-xs">
              <span className="text-gray-400 font-mono">
                P:{user.points || 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      <UserSettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
      />
    </>
  )
}
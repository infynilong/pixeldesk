'use client'

import { memo } from 'react'
import { tc } from '@/lib/i18n/currency'

interface CharacterPurchaseConfirmModalProps {
  isVisible: boolean
  character: {
    id: string
    displayName: string
    description: string | null
    imageUrl: string | null
    price: number
    creator?: {
      name: string
    } | null
  } | null
  userPoints: number
  onConfirm: () => void
  onCancel: () => void
}

const CharacterPurchaseConfirmModal = memo(({
  isVisible,
  character,
  userPoints,
  onConfirm,
  onCancel
}: CharacterPurchaseConfirmModalProps) => {
  if (!isVisible || !character) {
    return null
  }

  const canAfford = userPoints >= character.price

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-black/60"
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
    >
      {/* 蒙层 */}
      <div
        className="absolute inset-0 cursor-default"
        onClick={onCancel}
      />

      {/* 模态框容器 */}
      <div
        className="relative bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300"
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
      >
        {/* 顶部环境光效 */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-purple-500 to-pink-500 shadow-[0_0_20px_rgba(168,85,247,0.5)]"></div>

        {/* 背景装饰渐变 */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-pink-500/5 pointer-events-none"></div>

        {/* 内容区域 */}
        <div className="relative p-7 md:p-8">
          {/* 关闭按钮 */}
          <button
            onClick={onCancel}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-gray-500 hover:text-white hover:bg-gray-800 rounded-full transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* 标题区域 */}
          <div className="flex items-center gap-5 mb-8">
            <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/20 transform rotate-3 hover:rotate-0 transition-transform duration-300">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <div>
              <h2 className="text-white text-2xl font-bold tracking-tight">
                购买确认
              </h2>
              <p className="text-purple-400/80 text-xs font-mono tracking-widest uppercase mt-0.5">
                Purchase Confirmation
              </p>
            </div>
          </div>

          {/* 角色预览 */}
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-5 mb-6 hover:border-purple-500/30 transition-colors">
            <div className="flex items-center gap-4">
              {/* 角色图片 */}
              <div className="w-24 h-24 bg-gray-950 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                {character.imageUrl ? (
                  <img
                    src={character.imageUrl}
                    alt={character.displayName}
                    className="w-full h-full object-contain pixelated"
                    style={{ imageRendering: 'pixelated' }}
                  />
                ) : (
                  <svg className="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                )}
              </div>

              {/* 角色信息 */}
              <div className="flex-1 min-w-0">
                <h3 className="text-white text-lg font-bold mb-1 truncate">{character.displayName}</h3>
                {character.description && (
                  <p className="text-gray-400 text-xs line-clamp-2 mb-2">{character.description}</p>
                )}
                {character.creator && (
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span>创作者: {character.creator.name}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 费用信息 */}
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-5 mb-6 hover:border-yellow-500/30 transition-colors">
            <div className="flex items-center gap-2 mb-3 text-gray-400">
              <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs font-bold uppercase tracking-wider">购买价格</span>
            </div>
            <div className="flex items-center justify-center bg-gray-900/50 rounded-lg p-4 border border-gray-800">
              <div className="flex items-center gap-2">
                <svg className="w-6 h-6 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                </svg>
                <span className="text-yellow-400 font-bold text-3xl">{character.price}</span>
                <span className="text-gray-500 text-sm">{tc('currencyName')}</span>
              </div>
            </div>
          </div>

          {/* 余额状态 */}
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-5 mb-6 hover:border-cyan-500/30 transition-colors">
            <div className="flex items-center gap-2 mb-3 text-gray-400">
              <svg className="w-4 h-4 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V5a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-xs font-bold uppercase tracking-wider">账户余额</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-500 uppercase tracking-tighter">当前{tc('currencyName')}</span>
                <span className={`text-lg font-bold mt-0.5 ${canAfford ? 'text-gray-100' : 'text-red-400'}`}>
                  {userPoints} <span className="text-[10px] font-normal text-gray-500">{tc('currencyName')}</span>
                </span>
              </div>
              <div className="flex flex-col text-right">
                <span className="text-[10px] text-gray-500 uppercase tracking-tighter">购买后</span>
                <span className="text-emerald-400 text-lg font-bold mt-0.5">
                  {Math.max(0, userPoints - character.price)} <span className="text-[10px] font-normal text-gray-500">{tc('currencyName')}</span>
                </span>
              </div>
            </div>

            {!canAfford && (
              <div className="mt-4 p-3 bg-red-900/20 border border-red-900/30 rounded-lg flex items-center gap-3 animate-pulse">
                <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center shrink-0">
                  <span className="text-white text-xs font-bold">!</span>
                </div>
                <p className="text-red-400 text-xs font-medium">
                  {tc('currencyName')}不足！需要 {character.price} {tc('currencyName')}，您当前有 {userPoints} {tc('currencyName')}
                </p>
              </div>
            )}
          </div>

          {/* 提示信息 */}
          <div className="bg-blue-900/20 border border-blue-800/50 rounded-lg p-4 mb-6">
            <p className="text-blue-300 text-sm flex items-start gap-2">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>购买后该角色将立即添加到您的角色库，您可以在"我的角色"中查看和使用。</span>
            </p>
          </div>

          {/* 按钮组 */}
          <div className="flex gap-4">
            <button
              onClick={onCancel}
              className="flex-1 px-6 py-4 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white rounded-xl transition-all font-bold active:scale-95"
            >
              取消
            </button>
            <button
              onClick={onConfirm}
              disabled={!canAfford}
              className="flex-1 px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl transition-all font-bold shadow-lg shadow-purple-500/20 active:scale-95 disabled:from-gray-700 disabled:to-gray-800 disabled:text-gray-500 disabled:shadow-none disabled:cursor-not-allowed"
            >
              确认购买
            </button>
          </div>
        </div>
      </div>
    </div>
  )
})

CharacterPurchaseConfirmModal.displayName = 'CharacterPurchaseConfirmModal'

export default CharacterPurchaseConfirmModal

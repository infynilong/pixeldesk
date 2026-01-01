'use client'

import { useState, useCallback, memo, useEffect, useMemo } from 'react'

interface WorkstationBindingModalProps {
  isVisible: boolean
  workstation: any
  user: any
  onConfirm: () => Promise<any>
  onCancel: () => void
  onClose: () => void
}

// i18n 翻译
const translations = {
  'zh-CN': {
    title: '工位绑定',
    subtitle: '租赁确认',
    stationInfo: '工位信息',
    stationId: '工位 ID',
    position: '位置',
    type: '类型',
    rentalCost: '租赁费用',
    bindingFee: '绑定费用',
    duration: '30 天',
    points: '积分',
    yourBalance: '您的账户余额',
    currentPoints: '当前积分',
    afterRental: '租赁后',
    insufficientPoints: '积分不足',
    insufficientPointsMsg: '您需要至少 {cost} 积分来绑定此工位',
    confirm: '确认绑定',
    cancel: '取消',
    processing: '处理中...',
    success: '绑定成功！',
    failed: '绑定失败，请重试',
  },
  'en': {
    title: 'Workstation Binding',
    subtitle: 'Rental Confirmation',
    stationInfo: 'Station Info',
    stationId: 'Station ID',
    position: 'Position',
    type: 'Type',
    rentalCost: 'Rental Cost',
    bindingFee: 'Binding Fee',
    duration: '30 Days',
    points: 'Points',
    yourBalance: 'Your Balance',
    currentPoints: 'Current Points',
    afterRental: 'After Rental',
    insufficientPoints: 'Insufficient Points',
    insufficientPointsMsg: 'Need at least {cost} points to bind workstation',
    confirm: 'Confirm Binding',
    cancel: 'Cancel',
    processing: 'Processing...',
    success: 'Binding Successful!',
    failed: 'Binding failed, please retry',
  }
}

const WorkstationBindingModal = memo(({
  isVisible,
  workstation,
  user,
  onConfirm,
  onCancel,
  onClose
}: WorkstationBindingModalProps) => {
  const [isProcessing, setIsProcessing] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [messageType, setMessageType] = useState<'info' | 'success' | 'error'>('info')
  const [bindCost, setBindCost] = useState(10)
  const [language, setLanguage] = useState<'zh-CN' | 'en'>('zh-CN')

  // 获取翻译
  const t = useCallback((key: keyof typeof translations['zh-CN']) => {
    return translations[language][key] || key
  }, [language])

  // 加载语言设置
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLang = localStorage.getItem('pixeldesk-language') as 'zh-CN' | 'en'
      if (savedLang && (savedLang === 'zh-CN' || savedLang === 'en')) {
        setLanguage(savedLang)
      }
    }
  }, [isVisible])

  // 加载积分配置
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const response = await fetch('/api/points-config?key=bind_workstation_cost')
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.data) {
            setBindCost(data.data.value)
          }
        }
      } catch (error) {
        console.error('Failed to load points config:', error)
      }
    }

    if (isVisible) {
      loadConfig()
    }
  }, [isVisible])

  // 重置状态
  const resetState = useCallback(() => {
    setIsProcessing(false)
    setMessage(null)
    setMessageType('info')
  }, [])

  // 处理确认绑定
  const handleConfirm = useCallback(async () => {
    if (isProcessing) return

    setIsProcessing(true)
    setMessage(null)

    try {
      const result = await onConfirm()

      if (result.success) {
        setMessageType('success')
        setMessage(t('success'))

        setTimeout(() => {
          onClose()
          resetState()
        }, 1500)
      } else {
        setMessageType('error')
        setMessage(result.error || t('failed'))
      }
    } catch (error) {
      setMessageType('error')
      setMessage(t('failed'))
      console.error('Binding failed:', error)
    } finally {
      setIsProcessing(false)
    }
  }, [onConfirm, onClose, resetState, isProcessing, t])

  // 处理取消
  const handleCancel = useCallback(() => {
    if (isProcessing) return
    onCancel()
    onClose()
    resetState()
  }, [onCancel, onClose, resetState, isProcessing])

  // 处理关闭
  const handleClose = useCallback(() => {
    if (isProcessing) return
    onClose()
    resetState()
  }, [onClose, resetState, isProcessing])

  // 如果弹窗不可见，返回null
  if (!isVisible || !workstation || !user) {
    return null
  }

  const userPoints = user.points || 0
  const canAfford = userPoints >= bindCost

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-black/40"
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* 蒙层 */}
      <div
        className="absolute inset-0 cursor-default"
        onClick={handleClose}
      />

      {/* 模态框容器 */}
      <div
        className="relative bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300"
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 顶部环境光效 */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-cyan-500 to-teal-500 shadow-[0_0_20px_rgba(6,182,212,0.5)]"></div>

        {/* 背景装饰渐变 */}
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-teal-500/5 pointer-events-none"></div>

        {/* 内容区域 */}
        <div className="relative p-7 md:p-8">
          {/* 关闭按钮 */}
          <button
            onClick={handleClose}
            disabled={isProcessing}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-gray-500 hover:text-white hover:bg-gray-800 rounded-full transition-colors disabled:opacity-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* 标题区域 */}
          <div className="flex items-center gap-5 mb-8">
            <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg shadow-cyan-500/20 transform rotate-3 hover:rotate-0 transition-transform duration-300">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <div>
              <h2 className="text-white text-2xl font-bold tracking-tight">
                {t('title')}
              </h2>
              <p className="text-cyan-400/80 text-xs font-mono tracking-widest uppercase mt-0.5">
                {t('subtitle')}
              </p>
            </div>
          </div>

          {/* 信息面板 */}
          <div className="space-y-4 mb-8">
            {/* 工位基本信息 */}
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-5 hover:border-cyan-500/30 transition-colors group">
              <div className="flex items-center gap-2 mb-3 text-gray-400">
                <svg className="w-4 h-4 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <span className="text-xs font-bold uppercase tracking-wider">{t('stationInfo')}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-800">
                  <p className="text-[10px] text-gray-500 uppercase tracking-tighter mb-1">{t('stationId')}</p>
                  <p className="text-white font-mono font-bold">#{workstation.id}</p>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-800">
                  <p className="text-[10px] text-gray-500 uppercase tracking-tighter mb-1">{t('position')}</p>
                  <p className="text-white font-mono">({Math.floor(workstation.position.x)}, {Math.floor(workstation.position.y)})</p>
                </div>
              </div>
            </div>

            {/* 费用信息 */}
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-5 hover:border-emerald-500/30 transition-colors group">
              <div className="flex items-center gap-2 mb-3 text-gray-400">
                <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-xs font-bold uppercase tracking-wider">{t('rentalCost')}</span>
              </div>
              <div className="flex items-center justify-between bg-gray-900/50 rounded-lg p-4 border border-gray-800">
                <div className="flex flex-col">
                  <span className="text-[10px] text-gray-500 uppercase tracking-tighter">{t('bindingFee')}</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-emerald-400 font-bold text-xl">{bindCost}</span>
                    <span className="text-gray-500 text-xs">{t('points')}</span>
                  </div>
                </div>
                <div className="h-10 w-[1px] bg-gray-800"></div>
                <div className="flex flex-col text-right">
                  <span className="text-[10px] text-gray-500 uppercase tracking-tighter">{t('duration')}</span>
                  <span className="text-white font-bold mt-0.5">30 DAYS</span>
                </div>
              </div>
            </div>

            {/* 余额状态 */}
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-5 hover:border-cyan-500/30 transition-colors group">
              <div className="flex items-center gap-2 mb-3 text-gray-400">
                <svg className="w-4 h-4 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V5a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-xs font-bold uppercase tracking-wider">{t('yourBalance')}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <span className="text-[10px] text-gray-500 uppercase tracking-tighter">{t('currentPoints')}</span>
                  <span className={`text-lg font-bold mt-0.5 ${canAfford ? 'text-gray-100' : 'text-red-400'}`}>
                    {userPoints} <span className="text-[10px] font-normal text-gray-500">{t('points')}</span>
                  </span>
                </div>
                <div className="flex flex-col text-right">
                  <span className="text-[10px] text-gray-500 uppercase tracking-tighter">{t('afterRental')}</span>
                  <span className="text-emerald-400 text-lg font-bold mt-0.5">
                    {Math.max(0, userPoints - bindCost)} <span className="text-[10px] font-normal text-gray-500">{t('points')}</span>
                  </span>
                </div>
              </div>

              {!canAfford && (
                <div className="mt-4 p-3 bg-red-900/20 border border-red-900/30 rounded-lg flex items-center gap-3 animate-pulse">
                  <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-white text-xs font-bold">!</span>
                  </div>
                  <p className="text-red-400 text-xs font-medium">
                    {t('insufficientPointsMsg').replace('{cost}', bindCost.toString())}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 操作反馈消息 */}
          {message && (
            <div className={`mb-6 p-4 rounded-xl border flex items-center gap-3 ${messageType === 'success'
                ? 'bg-emerald-900/20 border-emerald-500/30 text-emerald-400'
                : 'bg-red-900/20 border-red-500/30 text-red-400'
              }`}>
              <div className={`w-2 h-2 rounded-full ${messageType === 'success' ? 'bg-emerald-400' : 'bg-red-400'} animate-ping`}></div>
              <p className="text-sm font-medium">{message}</p>
            </div>
          )}

          {/* 按钮组 */}
          <div className="flex gap-4">
            <button
              onClick={handleCancel}
              disabled={isProcessing}
              className="flex-1 px-6 py-4 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white rounded-xl transition-all font-bold active:scale-95 disabled:opacity-50"
            >
              {t('cancel')}
            </button>
            <button
              onClick={handleConfirm}
              disabled={isProcessing || !canAfford}
              className="flex-1 px-6 py-4 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white rounded-xl transition-all font-bold shadow-lg shadow-cyan-500/20 active:scale-95 disabled:from-gray-700 disabled:to-gray-800 disabled:text-gray-500 disabled:shadow-none flex items-center justify-center"
            >
              {isProcessing ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>{t('processing')}</span>
                </div>
              ) : t('confirm')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
})

WorkstationBindingModal.displayName = 'WorkstationBindingModal'

export default WorkstationBindingModal
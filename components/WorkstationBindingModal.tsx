'use client'

import { useState, useCallback, memo, useEffect, useMemo } from 'react'

interface WorkstationBindingModalProps {
  isVisible: boolean
  workstation: any
  user: any
  onConfirm: () => Promise<any>
  onCancel: () => void
  onClose: () => void
  mode?: 'bind' | 'unbind'
}

// i18n 翻译
const translations = {
  'zh-CN': {
    title: '工位入驻协议',
    subtitle: 'PIXEL DESK LEASE AGREEMENT',
    stationInfo: '标的物信息 (Station Info)',
    stationId: '工位编号',
    position: '具体坐标',
    type: '类型',
    rentalCost: '协议资费',
    bindingFee: '入驻保证金',
    duration: '30 天 (合约期)',
    points: '象素币',
    yourBalance: '合约账户',
    currentPoints: '当前余额',
    afterRental: '签约后余额',
    insufficientPoints: '保证金不足',
    insufficientPointsMsg: '签约此协议需要至少 {cost} 象素币保证金',
    confirm: '签约入驻',
    cancel: '考虑一下',
    processing: '签约中...',
    success: '协议签署成功！欢迎开启协作之旅。',
    failed: '签约失败，请重新检查协议',
    terms: '入驻条款 (Terms)',
    term1: '1. 活跃续期：每次登录将自动延长租期至 7 天后；',
    term2: '2. 预警机制：连续 5 天未登录将触发邮件预警；',
    term3: '3. 自动解约：连续 7 天未登录，协议将自动收回资源并按比例退费。',
    unbindTitle: '工位解约协议',
    unbindSubtitle: 'WORKSTATION TERMINATION AGREEMENT',
    unbindTerms: '解约条款 (Termination Terms)',
    unbindTerm1: '1. 主动解约：承租方可随时发起主动解约申请；',
    unbindTerm2: '2. 租金结算：主动解约视为违约，剩余租期内的保证金将不予退还；',
    unbindTerm3: '3. 资源释放：解约成功后，工位将立即进入公示期供他人抢占；',
    unbindConfirm: '确认解约',
    unbindSuccess: '工位已成功释放，欢迎下次再次入驻。',
  },
  'en': {
    title: 'Lease Agreement',
    subtitle: 'PIXEL DESK LEASE AGREEMENT',
    stationInfo: 'Station Info',
    stationId: 'Station ID',
    position: 'Position',
    type: 'Type',
    rentalCost: 'Agreement Fee',
    bindingFee: 'Lease Deposit',
    duration: '30 Days',
    points: 'PixelCoins',
    yourBalance: 'Account Balance',
    currentPoints: 'Current Balance',
    afterRental: 'Balance After',
    insufficientPoints: 'Insufficient Funds',
    insufficientPointsMsg: 'Need at least {cost} PX to fulfill the agreement',
    confirm: 'Sign Contract',
    cancel: 'Decline',
    processing: 'Signing...',
    success: 'Contract signed! Welcome aboard.',
    failed: 'Failed to sign the agreement',
    terms: 'Terms & Conditions',
    term1: '1. Activity: Each login extends lease to 7 days from now;',
    term2: '2. Warning: Email alarm after 5 days of inactivity;',
    term3: '3. Termination: Auto-reclaim after 7 days inactive with refund.',
    unbindTitle: 'Termination Agreement',
    unbindSubtitle: 'WORKSTATION TERMINATION AGREEMENT',
    unbindTerms: 'Termination Terms',
    unbindTerm1: '1. Voluntary: Tenant can initiate termination at any time;',
    unbindTerm2: '2. No Refund: Voluntary termination results in forfeit of all remaining fees;',
    unbindTerm3: '3. Release: Workstation will be immediately available for others after release;',
    unbindConfirm: 'Terminate Contract',
    unbindSuccess: 'Station released successfully. Hope to see you back.',
  }
}

const WorkstationBindingModal = memo(({
  isVisible,
  workstation,
  user,
  onConfirm,
  onCancel,
  onClose,
  mode = 'bind'
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

  // 加载象素币(PixelCoin)配置 - 使用全局 ConfigStore 避免重复调用
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const { configStore } = await import('@/lib/stores/ConfigStore')
        const config = await configStore.getPointsConfig()
        setBindCost(config.bind_workstation_cost || 10)
      } catch (error) {
        console.error('Failed to load PixelCoin config:', error)
        setBindCost(10) // 默认值
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
        setMessage(mode === 'bind' ? t('success') : t('unbindSuccess'))

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

  // 处理键盘事件（ESC 关闭）
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 阻止事件冒泡到 Phaser
      e.stopPropagation()

      if (e.key === 'Escape' && !isProcessing) {
        e.preventDefault()
        handleClose()
      }
    }

    if (isVisible) {
      // 使用 capture 阶段监听，优先级高于 Phaser
      window.addEventListener('keydown', handleKeyDown, true)
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [isVisible, isProcessing, handleClose])

  // 如果弹窗不可见，返回null
  if (!isVisible || !workstation || !user) {
    return null
  }

  const userPoints = user.points || 0
  const canAfford = userPoints >= bindCost

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-black/60"
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* 蒙层 */}
      <div
        className="absolute inset-0 cursor-default"
        onClick={handleClose}
      />

      {/* 模态框容器 - 纸张样式 */}
      <div
        className="relative bg-[#fdfaf2] border-4 border-[#d4c5a9] rounded-sm w-full max-w-lg shadow-[0_20px_50px_rgba(0,0,0,0.5),0_0_0_2px_#8b7355] overflow-hidden animate-in fade-in zoom-in duration-300"
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundImage: 'radial-gradient(#e8e0cc 1px, transparent 0)',
          backgroundSize: '20px 20px'
        }}
      >
        {/* 纸张纹理叠加 */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')]"></div>

        {/* 装饰边角 */}
        <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-[#8b7355] -ml-1 -mt-1 opacity-40"></div>
        <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-[#8b7355] -mr-1 -mt-1 opacity-40"></div>
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-[#8b7355] -ml-1 -mb-1 opacity-40"></div>
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-[#8b7355] -mr-1 -mb-1 opacity-40"></div>

        {/* 内容区域 */}
        <div className="relative p-8 md:p-10 text-[#4a3f35]">
          {/* 关闭按钮 */}
          <button
            onClick={handleClose}
            disabled={isProcessing}
            className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center text-[#8b7355] hover:text-[#4a3f35] hover:bg-[#d4c5a9]/20 rounded-full transition-colors disabled:opacity-0 z-10 cursor-pointer"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* 合同抬头 */}
          <div className="text-center mb-8 border-b-2 border-[#d4c5a9] pb-6">
            <h1 className="text-3xl font-black tracking-widest font-serif text-[#2d241e] uppercase">
              {mode === 'bind' ? t('title') : t('unbindTitle')}
            </h1>
            <p className={`text-[10px] font-mono tracking-[0.2em] mt-2 opacity-80 ${mode === 'bind' ? 'text-[#8b7355]' : 'text-red-700/60'}`}>
              {mode === 'bind' ? t('subtitle') : t('unbindSubtitle')}
            </p>
          </div>

          {/* 合同正文 */}
          <div className="space-y-6 mb-10 font-serif leading-relaxed">
            {/* 双方信息 */}
            <div className="grid grid-cols-1 gap-4 text-sm">
              <div className="flex gap-2">
                <span className="font-bold shrink-0">{mode === 'bind' ? '承租方 (Tenant):' : '解约方 (Petitioner):'}</span>
                <span className="border-b border-[#d4c5a9] flex-1 px-2 font-mono text-[#2d241e] font-bold">
                  {user.name}
                </span>
              </div>
              <div className="flex gap-2">
                <span className="font-bold shrink-0">标的物 (Subject):</span>
                <span className="border-b border-[#d4c5a9] flex-1 px-2 font-mono">
                  #{workstation.id} ({Math.floor(workstation.position.x)}, {Math.floor(workstation.position.y)})
                </span>
              </div>
            </div>

            {/* 条款详情 */}
            <div className="bg-[#f0ece2]/50 p-5 border border-[#d4c5a9] rounded-sm relative group">
              <h4 className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2 border-b border-[#d4c5a9] pb-2">
                <span className="w-1.5 h-1.5 bg-[#8b7355] rotate-45"></span>
                {t('terms')}
              </h4>
              <div className="space-y-2.5 text-[13px] text-[#5e5449]">
                {mode === 'bind' ? (
                  <>
                    <p className="flex gap-2">
                      <span className="opacity-50 font-mono">01.</span>
                      {t('term1')}
                    </p>
                    <p className="flex gap-2">
                      <span className="opacity-50 font-mono">02.</span>
                      {t('term2')}
                    </p>
                    <p className="flex gap-2">
                      <span className="opacity-50 font-mono">03.</span>
                      {t('term3')}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="flex gap-2 text-red-900/80">
                      <span className="opacity-50 font-mono">01.</span>
                      {t('unbindTerm1')}
                    </p>
                    <p className="flex gap-2 text-red-900/80">
                      <span className="opacity-50 font-mono">02.</span>
                      {t('unbindTerm2')}
                    </p>
                    <p className="flex gap-2 text-red-900/80">
                      <span className="opacity-50 font-mono">03.</span>
                      {t('unbindTerm3')}
                    </p>
                  </>
                )}
              </div>

              {/* 背景中的红印章效果 */}
              <div className="absolute -bottom-4 -right-2 transform -rotate-12 opacity-80 select-none pointer-events-none group-hover:scale-110 transition-transform duration-500">
                <div className={`w-24 h-24 border-4 rounded-full flex items-center justify-center relative overflow-hidden ${mode === 'bind' ? 'border-red-600/60' : 'border-gray-500/40'}`}>
                  <div className={`absolute inset-0 flex items-center justify-center font-black text-center leading-none tracking-tighter uppercase whitespace-normal px-2 ${mode === 'bind' ? 'text-red-600/60' : 'text-gray-500/40'}`} style={{ fontSize: '10px' }}>
                    {language === 'zh-CN' ? (
                      <div className="flex flex-col items-center">
                        <span style={{ transform: 'scale(1.5)' }}>{mode === 'bind' ? '象素工坊' : '协议作废'}</span>
                        <span className="text-[6px] mt-1">{mode === 'bind' ? 'PIXEL WORKSHOP' : 'TERMINATED'}</span>
                        <span className="mt-1" style={{ transform: 'scale(1.2)' }}>{mode === 'bind' ? '★ 专用章 ★' : '★ CONSENT ★'}</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <span className="text-[12px]">{mode === 'bind' ? 'OFFICIAL' : 'VOID'}</span>
                        <span className="text-[14px]">PIXEL</span>
                        <span className="text-[10px]">{mode === 'bind' ? 'STAMP' : 'CONTRACT'}</span>
                      </div>
                    )}
                  </div>
                  {/* 印章斑驳感纹理 */}
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/worn-dots.png')] opacity-40"></div>
                </div>
              </div>
            </div>

            {/* 资费详情 */}
            <div className="flex flex-wrap gap-x-8 gap-y-4 py-4 border-y border-dashed border-[#d4c5a9] text-sm">
              <div className="flex flex-col">
                <span className="text-[10px] text-[#8b7355] uppercase tracking-tighter mb-1">{mode === 'bind' ? t('rentalCost') : '结算费用 (Fee)'}</span>
                <span className="text-xl font-black font-mono text-[#2d241e]">
                  {mode === 'bind' ? bindCost : 0} <span className="text-xs font-normal opacity-60">{t('points')}</span>
                </span>
              </div>
              <div className="flex flex-col border-l-2 border-[#d4c5a9] pl-6">
                <span className="text-[10px] text-[#8b7355] uppercase tracking-tighter mb-1">{mode === 'bind' ? t('duration') : '剩余工期 (Left)'}</span>
                <span className="text-lg font-black font-mono text-[#2d241e]">{mode === 'bind' ? '30 DAYS' : '< 30 DAYS'}</span>
              </div>
              <div className="flex flex-col ml-auto">
                <span className="text-[10px] text-[#8b7355] uppercase tracking-tighter mb-1">{t('yourBalance')}</span>
                <span className={`text-lg font-bold font-mono ${canAfford || mode === 'unbind' ? 'text-[#2d241e]' : 'text-red-600'}`}>
                  {userPoints} <span className="text-xs font-normal opacity-40">/ {mode === 'bind' ? `-${bindCost}` : '-0'}</span>
                </span>
              </div>
            </div>
          </div>

          {/* 操作反馈消息 */}
          {message && (
            <div className={`mb-6 p-4 border-2 flex items-center gap-3 animate-in slide-in-from-top-2 duration-300 ${messageType === 'success'
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-red-50 border-red-200 text-red-700'
              }`}>
              <div className={`w-2 h-2 rounded-full ${messageType === 'success' ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></div>
              <p className="text-sm font-bold">{message}</p>
            </div>
          )}

          {/* 按钮组 - 模拟签名区 */}
          <div className="flex items-end justify-between mt-12 gap-8">
            <button
              onClick={handleCancel}
              disabled={isProcessing}
              className="text-[#8b7355] hover:text-[#4a3f35] text-sm font-bold border-b-2 border-transparent hover:border-[#4a3f35] transition-all pb-1 disabled:opacity-0 cursor-pointer"
            >
              « {t('cancel')}
            </button>

            <div className="flex-1 max-w-[240px] relative">
              {!canAfford && (
                <div className="absolute -top-8 left-0 right-0 text-center animate-bounce">
                  <span className="bg-red-600 text-white text-[10px] px-2 py-1 rounded-sm uppercase font-bold shadow-lg">
                    {t('insufficientPoints')}
                  </span>
                </div>
              )}

              <button
                onClick={handleConfirm}
                disabled={isProcessing || !canAfford}
                className={`w-full group relative overflow-hidden py-4 px-6 rounded-sm border-2 transition-all active:scale-95 disabled:grayscale disabled:opacity-40 cursor-cell
                        ${canAfford
                    ? 'bg-[#2d241e] border-[#2d241e] text-[#fdfaf2] hover:bg-[#4a3f35] hover:shadow-xl'
                    : 'bg-gray-200 border-gray-300 text-gray-500'
                  }`}
              >
                {isProcessing ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-[#fdfaf2]/30 border-t-[#fdfaf2] rounded-full animate-spin"></div>
                    <span className="font-bold tracking-widest">{t('processing')}</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <span className="text-xs opacity-60 mb-1 font-mono uppercase tracking-widest">— {mode === 'bind' ? 'SIGN HERE' : 'REVOKE HERE'} —</span>
                    <span className="text-xl font-black tracking-[0.2em]">{mode === 'bind' ? t('confirm') : t('unbindConfirm')}</span>
                  </div>
                )}

                {/* 按钮内部笔触装饰 */}
                <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-white/20"></div>
                <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-white/20"></div>
              </button>
            </div>
          </div>

          {/*页码装饰*/}
          <div className="mt-8 text-center">
            <span className="text-[10px] text-[#d4c5a9] font-mono tracking-widest">— Page 1 of 1 —</span>
          </div>
        </div>
      </div>
    </div>
  )
})

WorkstationBindingModal.displayName = 'WorkstationBindingModal'

export default WorkstationBindingModal

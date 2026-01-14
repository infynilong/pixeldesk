'use client'

import { useState, useCallback, memo, useEffect } from 'react'
import { useTranslation } from '@/lib/hooks/useTranslation'

interface WorkstationInfoModalProps {
  isVisible: boolean
  workstationId: number | null
  userId: string | null
  onClose: () => void
}

interface BindingInfo {
  id: number
  userId: string
  workstationId: number
  cost: number
  boundAt: string
  expiresAt?: string
  remainingDays?: number
  isExpiringSoon?: boolean
  adText?: string | null
  adImage?: string | null
  adUpdatedAt?: string | null
}

interface UserInfo {
  id: string
  name: string
  email?: string
  avatar?: string
  points: number
  createdAt: string
  updatedAt: string
}

const WorkstationInfoModal = memo(({
  isVisible,
  workstationId,
  userId,
  onClose
}: WorkstationInfoModalProps) => {
  const { t, locale } = useTranslation()
  const [bindingInfo, setBindingInfo] = useState<BindingInfo | null>(null)
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 计算时间信息
  const calculateTimeInfo = useCallback((binding: BindingInfo) => {
    const boundDate = new Date(binding.boundAt)
    const now = new Date()

    // 租赁开始时间
    const rentalStart = boundDate.toLocaleString(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })

    // 使用API返回的到期时间，如果没有则默认30天
    const rentalEnd = binding.expiresAt
      ? new Date(binding.expiresAt)
      : new Date(boundDate.getTime() + 30 * 24 * 60 * 60 * 1000)

    const rentalEndStr = rentalEnd.toLocaleString(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })

    // 已使用时间
    const timeUsed = now.getTime() - boundDate.getTime()
    const daysUsed = Math.floor(timeUsed / (1000 * 60 * 60 * 24))
    const hoursUsed = Math.floor((timeUsed % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutesUsed = Math.floor((timeUsed % (1000 * 60 * 60)) / (1000 * 60))

    // 剩余时间
    const timeRemaining = rentalEnd.getTime() - now.getTime()
    const daysRemaining = Math.max(0, Math.floor(timeRemaining / (1000 * 60 * 60 * 24)))
    const hoursRemaining = Math.max(0, Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)))

    // 是否已过期
    const isExpired = timeRemaining <= 0

    // 是否即将过期（1天内）
    const isExpiringSoon = binding.isExpiringSoon || (!isExpired && timeRemaining <= (24 * 60 * 60 * 1000))

    // 总天数（根据实际租期计算）
    const totalTime = rentalEnd.getTime() - boundDate.getTime()
    const totalDays = Math.ceil(totalTime / (1000 * 60 * 60 * 24))

    // 使用进度百分比
    const usagePercentage = Math.min(100, Math.max(0, (timeUsed / totalTime) * 100))

    return {
      rentalStart,
      rentalEnd: rentalEndStr,
      timeUsed: `${daysUsed}${t.workstation.days} ${hoursUsed}${t.workstation.hours} ${minutesUsed}${t.workstation.minutes}`,
      timeRemaining: isExpired ? t.workstation.expired : `${daysRemaining}${t.workstation.days} ${hoursRemaining}${t.workstation.hours}`,
      daysRemaining: binding.remainingDays || daysRemaining,
      isExpired,
      isExpiringSoon,
      totalDays,
      usagePercentage
    }
  }, [locale, t.workstation.days, t.workstation.hours, t.workstation.minutes, t.workstation.expired])

  // 获取绑定信息
  const fetchBindingInfo = useCallback(async () => {
    if (!isVisible || !userId || !workstationId) return

    setLoading(true)
    setError(null)

    try {
      // 并行获取绑定信息和用户信息
      const [bindingResponse, userResponse] = await Promise.all([
        fetch(`/api/workstations/user-bindings?userId=${userId}`),
        fetch(`/api/users?userId=${userId}`)
      ])

      const bindingResult = await bindingResponse.json()
      const userResult = await userResponse.json()

      if (bindingResult.success) {
        // 查找指定工位的绑定信息
        const binding = bindingResult.data.find((b: BindingInfo) => b.workstationId === workstationId)
        if (binding) {
          setBindingInfo(binding)
        } else {
          setError(t.workstation.err_not_found)
        }
      } else {
        setError(bindingResult.error || t.workstation.err_fetch_binding)
      }

      if (userResult.success) {
        setUserInfo(userResult.data)
      } else {
        console.warn('获取用户信息失败:', userResult.error)
        // 用户信息获取失败不影响主要功能
      }
    } catch (error) {
      console.error('获取信息失败:', error)
      setError(t.auth.network_error)
    } finally {
      setLoading(false)
    }
  }, [isVisible, userId, workstationId, t.workstation.err_not_found, t.workstation.err_fetch_binding, t.auth.network_error])

  // 处理关闭
  const handleClose = useCallback(() => {
    onClose()
  }, [onClose])

  // 当弹窗显示时获取数据
  useEffect(() => {
    if (isVisible) {
      fetchBindingInfo()
    }
  }, [isVisible, fetchBindingInfo])

  // 如果弹窗不可见，返回null
  if (!isVisible || !userId || !workstationId) {
    return null
  }

  const timeInfo = bindingInfo ? calculateTimeInfo(bindingInfo) : null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* 深色背景蒙板 */}
      <div
        className="absolute inset-0 bg-black/80 "
        onClick={handleClose}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
      />

      {/* 模态框容器 - 现代像素艺术设计 */}
      <div
        className="relative bg-retro-bg-darker border-2 border-retro-border rounded-2xl p-6 w-full max-w-md shadow-2xl shadow-retro-green/20 "
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 装饰性光效 */}
        <div className="absolute inset-0 bg-gradient-to-br from-retro-green/5 via-retro-cyan/8 to-retro-blue/5 rounded-2xl "></div>
        <div className="absolute inset-0 border border-retro-green/20 rounded-2xl "></div>

        {/* 关闭按钮 - 像素化设计 */}
        <button
          onClick={(e) => {
            console.log('右上角关闭按钮被点击')
            e.stopPropagation()
            handleClose()
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onMouseUp={(e) => e.stopPropagation()}
          className="absolute top-4 right-4 w-8 h-8 bg-gradient-to-br from-retro-red/20 to-retro-orange/20 hover:from-retro-red/30 hover:to-retro-orange/30 text-white/80 hover:text-white rounded-lg border-2 border-retro-red/30 hover:border-retro-red/50  flex items-center justify-center shadow-lg group z-10"
          style={{ pointerEvents: 'auto' }}
        >
          <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100  rounded-lg pointer-events-none"></div>
          <span className="relative font-bold pointer-events-none">✕</span>
        </button>

        {/* 标题区域 - 现代像素艺术风格 */}
        <div className="relative mb-6">
          <div className="flex items-center gap-4 mb-4">
            {/* 工位图标 */}
            <div className="w-12 h-12 bg-gradient-to-br from-retro-green via-retro-cyan to-retro-blue rounded-xl flex items-center justify-center shadow-xl border-2 border-white/20">
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-white/5 rounded-xl"></div>
              <span className="relative text-2xl drop-shadow-lg">🏢</span>
            </div>

            {/* 标题文本 */}
            <div className="flex-1">
              <h2 className="text-white text-xl font-bold font-pixel tracking-wide drop-shadow-sm">
                {t.workstation.info_title}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-2 h-2 bg-retro-green rounded-full "></div>
                <span className="text-retro-textMuted text-xs font-retro tracking-wide">{t.workstation.rental_details}</span>
              </div>
            </div>
          </div>

          {/* 装饰性分割线 */}
          <div className="w-16 h-2 bg-gradient-to-r from-retro-green via-retro-cyan to-retro-blue rounded-full shadow-lg"></div>
        </div>

        {/* 加载状态 - 像素化加载器 */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-retro-green/20 to-retro-cyan/20 rounded-xl flex items-center justify-center border-2 border-retro-green/30 ">
                <div className="w-6 h-6 border-2 border-retro-green border-t-transparent rounded-full "></div>
              </div>
              <div className="absolute inset-0 border-2 border-retro-green/20 rounded-xl "></div>
            </div>
            <div className="text-center space-y-2">
              <div className="text-white font-bold font-pixel text-sm tracking-wide">{t.common.loading.toUpperCase()}</div>
              <div className="text-retro-textMuted text-xs font-retro">{t.workstation.loading_data}</div>
            </div>
          </div>
        )}

        {/* 错误状态 - 像素化错误显示 */}
        {error && (
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-retro-red/10 to-retro-orange/10 rounded-xl opacity-60 pointer-events-none"></div>
            <div className="relative bg-gradient-to-br from-retro-red/15 to-retro-orange/15 backdrop-blur-sm border-2 border-retro-red/30 rounded-xl p-4 shadow-lg">
              <div className="absolute inset-0 bg-retro-red/5 rounded-xl "></div>
              <div className="relative flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-retro-red to-retro-orange rounded-lg flex items-center justify-center shadow-lg">
                  <span className="text-sm">⚠️</span>
                </div>
                <div>
                  <div className="text-retro-red font-bold text-sm font-pixel tracking-wide">ERROR</div>
                  <p className="text-retro-red/80 text-xs font-retro">{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 绑定信息 - 现代像素风格 */}
        {bindingInfo && timeInfo && (
          <div className="relative space-y-5 max-h-[60vh] overflow-y-auto pr-2 scrollbar-hide">
            {/* 背景装饰 */}
            <div className="absolute inset-0 bg-gradient-to-br from-retro-green/2 via-retro-cyan/4 to-retro-blue/2 rounded-xl opacity-60 pointer-events-none"></div>

            {/* 用户信息 - 像素艺术卡片 */}
            {userInfo && (
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-retro-purple/5 to-retro-pink/5 rounded-xl opacity-0 group-hover:opacity-100 "></div>
                <div className="relative bg-gradient-to-br from-retro-bg-dark/50 to-retro-bg-darker/50 backdrop-blur-sm border-2 border-retro-border/50 rounded-xl p-4 shadow-lg hover:border-retro-purple/40 ">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-6 h-6 bg-gradient-to-br from-retro-purple/30 to-retro-pink/30 rounded-lg flex items-center justify-center shadow-lg">
                      <span className="text-sm">👤</span>
                    </div>
                    <h3 className="text-white font-bold text-sm font-pixel tracking-wide">{t.workstation.bound_user}</h3>
                  </div>
                  <div className="flex items-center space-x-4">
                    {userInfo.avatar ? (
                      <div className="relative">
                        <img
                          src={userInfo.avatar}
                          alt={userInfo.name}
                          className="w-12 h-12 rounded-xl object-cover flex-shrink-0 border-2 border-white/20 shadow-lg"
                        />
                        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-white/5 rounded-xl"></div>
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-retro-purple to-retro-pink flex items-center justify-center flex-shrink-0 border-2 border-white/20 shadow-lg">
                        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-white/5 rounded-xl"></div>
                        <span className="relative text-white font-bold text-base font-pixel drop-shadow-lg">
                          {userInfo.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="text-white text-base font-bold font-pixel tracking-wide truncate">{userInfo.name}</div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-gradient-to-br from-retro-yellow/30 to-retro-orange/30 rounded flex items-center justify-center">
                            <span className="text-xs">💎</span>
                          </div>
                          <span className="text-retro-yellow text-sm font-bold font-pixel">{userInfo.points}</span>
                        </div>
                        <span className="text-retro-textMuted text-xs font-retro tracking-wide">{userInfo.id.slice(0, 8)}...</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 工位广告 - 像素艺术广告卡片 */}
            {bindingInfo && (bindingInfo.adText || bindingInfo.adImage) && (
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-retro-yellow/5 to-retro-orange/5 rounded-xl opacity-0 group-hover:opacity-100 "></div>
                <div className="relative bg-gradient-to-br from-retro-bg-dark/50 to-retro-bg-darker/50 backdrop-blur-sm border-2 border-retro-border/50 rounded-xl p-4 shadow-lg hover:border-retro-yellow/40 ">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-6 h-6 bg-gradient-to-br from-retro-yellow/30 to-retro-orange/30 rounded-lg flex items-center justify-center shadow-lg">
                      <span className="text-sm">📢</span>
                    </div>
                    <h3 className="text-white font-bold text-sm font-pixel tracking-wide">{t.workstation.ad}</h3>
                  </div>

                  {/* 广告图片 */}
                  {bindingInfo.adImage && (
                    <div className="relative mb-4 rounded-lg overflow-hidden border-2 border-retro-border/30 shadow-lg">
                      <img
                        src={bindingInfo.adImage}
                        alt={t.workstation.ad}
                        className="w-full h-auto object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.style.display = 'none'
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/0 pointer-events-none"></div>
                    </div>
                  )}

                  {/* 广告文案 */}
                  {bindingInfo.adText && (
                    <div className="bg-gradient-to-r from-retro-bg-darker/30 to-retro-bg-dark/30 rounded-lg p-3 border border-retro-border/30 mb-3">
                      <p className="text-white text-sm font-retro leading-relaxed whitespace-pre-wrap break-words">
                        {bindingInfo.adText}
                      </p>
                    </div>
                  )}

                  {/* 更新时间 */}
                  {bindingInfo.adUpdatedAt && (
                    <div className="flex items-center justify-end gap-2 text-retro-textMuted text-xs font-retro">
                      <span>⏰</span>
                      <span>Update: {new Date(bindingInfo.adUpdatedAt).toLocaleString(locale, {
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 工位基本信息 - 像素化信息卡片 */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-retro-cyan/5 to-retro-blue/5 rounded-xl opacity-0 group-hover:opacity-100 "></div>
              <div className="relative bg-gradient-to-br from-retro-bg-dark/50 to-retro-bg-darker/50 backdrop-blur-sm border-2 border-retro-border/50 rounded-xl p-4 shadow-lg hover:border-retro-cyan/40 ">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-6 h-6 bg-gradient-to-br from-retro-cyan/30 to-retro-blue/30 rounded-lg flex items-center justify-center shadow-lg">
                    <span className="text-sm">🏢</span>
                  </div>
                  <h3 className="text-white font-bold text-sm font-pixel tracking-wide">{t.common.beta || 'WORKSTATION'}</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="text-xs text-retro-textMuted font-pixel tracking-wide">ID</div>
                    <div className="text-white text-base font-bold font-retro">{workstationId}</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-xs text-retro-textMuted font-pixel tracking-wide">{t.workstation.cost}</div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-gradient-to-br from-retro-yellow/30 to-retro-orange/30 rounded flex items-center justify-center">
                        <span className="text-xs">💰</span>
                      </div>
                      <span className="text-retro-yellow text-sm font-bold font-pixel">{bindingInfo.cost}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 时间信息 - 像素化时间卡片 */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-retro-green/5 to-retro-cyan/5 rounded-xl opacity-0 group-hover:opacity-100 "></div>
              <div className="relative bg-gradient-to-br from-retro-bg-dark/50 to-retro-bg-darker/50 backdrop-blur-sm border-2 border-retro-border/50 rounded-xl p-4 shadow-lg hover:border-retro-green/40 ">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-6 h-6 bg-gradient-to-br from-retro-green/30 to-retro-cyan/30 rounded-lg flex items-center justify-center shadow-lg">
                    <span className="text-sm">⏰</span>
                  </div>
                  <h3 className="text-white font-bold text-sm font-pixel tracking-wide">{t.workstation.rental_time}</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-gradient-to-r from-retro-bg-darker/30 to-retro-bg-dark/30 rounded-lg p-2 border border-retro-border/30">
                    <span className="text-retro-textMuted text-xs font-pixel tracking-wide">{t.workstation.start}</span>
                    <span className="text-white text-xs font-retro">{timeInfo.rentalStart}</span>
                  </div>
                  <div className="flex items-center justify-between bg-gradient-to-r from-retro-bg-darker/30 to-retro-bg-dark/30 rounded-lg p-2 border border-retro-border/30">
                    <span className="text-retro-textMuted text-xs font-pixel tracking-wide">{t.workstation.expires}</span>
                    <span className={`text-xs font-bold font-retro ${timeInfo.isExpired ? 'text-retro-red' : 'text-retro-green'}`}>
                      {timeInfo.rentalEnd}
                    </span>
                  </div>
                  <div className="flex items-center justify-between bg-gradient-to-r from-retro-bg-darker/30 to-retro-bg-dark/30 rounded-lg p-2 border border-retro-border/30">
                    <span className="text-retro-textMuted text-xs font-pixel tracking-wide">{t.workstation.duration}</span>
                    <span className="text-white text-xs font-retro">{timeInfo.totalDays} {t.workstation.days}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 到期警告横幅 - 像素化警告横幅 */}
            {timeInfo.isExpiringSoon && !timeInfo.isExpired && (
              <div className="relative ">
                <div className="absolute inset-0 bg-gradient-to-r from-retro-orange/10 to-retro-red/10 rounded-xl opacity-60 pointer-events-none"></div>
                <div className="relative bg-gradient-to-br from-retro-orange/20 to-retro-red/20 backdrop-blur-sm border-2 border-retro-orange/50 rounded-xl p-4 shadow-lg ">
                  <div className="absolute inset-0 bg-retro-orange/5 rounded-xl"></div>
                  <div className="relative flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-retro-orange to-retro-red rounded-lg flex items-center justify-center shadow-lg ">
                      <span className="text-xl">⚠️</span>
                    </div>
                    <div className="flex-1">
                      <div className="text-retro-orange font-bold text-base font-pixel tracking-wide">{t.workstation.expiring_soon_title}</div>
                      <p className="text-retro-orange/90 text-sm font-retro mt-1">
                        {t.workstation.expiring_soon_msg.replace('{days}', timeInfo.daysRemaining.toString())}
                      </p>
                    </div>
                    <div className="w-6 h-6 bg-retro-red/30 rounded-full flex items-center justify-center">
                      <div className="w-3 h-3 bg-retro-red rounded-full "></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 使用情况和进度 - 像素化进度卡片 */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-retro-blue/5 to-retro-purple/5 rounded-xl opacity-0 group-hover:opacity-100 "></div>
              <div className="relative bg-gradient-to-br from-retro-bg-dark/50 to-retro-bg-darker/50 backdrop-blur-sm border-2 border-retro-border/50 rounded-xl p-4 shadow-lg hover:border-retro-blue/40 ">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-6 h-6 bg-gradient-to-br from-retro-blue/30 to-retro-purple/30 rounded-lg flex items-center justify-center shadow-lg">
                    <span className="text-sm">📈</span>
                  </div>
                  <h3 className="text-white font-bold text-sm font-pixel tracking-wide">{t.workstation.usage_status}</h3>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gradient-to-r from-retro-bg-darker/30 to-retro-bg-dark/30 rounded-lg p-3 border border-retro-border/30">
                      <div className="text-xs text-retro-textMuted font-pixel tracking-wide mb-1">{t.workstation.used}</div>
                      <div className="text-retro-blue text-sm font-bold font-retro">{timeInfo.timeUsed}</div>
                    </div>
                    <div className="bg-gradient-to-r from-retro-bg-darker/30 to-retro-bg-dark/30 rounded-lg p-3 border border-retro-border/30">
                      <div className="text-xs text-retro-textMuted font-pixel tracking-wide mb-1">{t.workstation.remaining}</div>
                      <div className={`text-sm font-bold font-retro ${timeInfo.isExpired
                          ? 'text-retro-red'
                          : timeInfo.isExpiringSoon
                            ? 'text-retro-orange '
                            : 'text-retro-green'
                        }`}>
                        {timeInfo.timeRemaining}
                      </div>
                      {timeInfo.isExpiringSoon && !timeInfo.isExpired && (
                        <div className="text-xs text-retro-orange font-pixel tracking-wide mt-1">
                          {t.workstation.expiring_soon}
                        </div>
                      )}
                    </div>
                  </div>
                  {/* 像素化进度条 */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-retro-textMuted font-pixel tracking-wide">{t.workstation.progress}</span>
                      <span className="text-xs text-white font-bold font-pixel">{Math.round(timeInfo.usagePercentage)}%</span>
                    </div>
                    <div className="relative w-full bg-gradient-to-r from-retro-bg-darker to-retro-bg-dark rounded-full h-3 border border-retro-border/30 shadow-inner">
                      <div
                        className={`h-full rounded-full  shadow-lg ${timeInfo.isExpired
                            ? 'bg-gradient-to-r from-retro-red to-retro-orange'
                            : 'bg-gradient-to-r from-retro-green via-retro-cyan to-retro-blue'
                          }`}
                        style={{
                          width: `${Math.min(100, timeInfo.usagePercentage)}%`
                        }}
                      >
                        <div className="absolute inset-0 bg-white/20 rounded-full "></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 状态指示器 - 像素化状态卡片 */}
            <div className={`relative group bg-gradient-to-br backdrop-blur-sm rounded-xl p-4 border-2 shadow-lg  ${timeInfo.isExpired
                ? 'from-retro-red/15 to-retro-orange/15 border-retro-red/30 hover:border-retro-red/50'
                : timeInfo.isExpiringSoon
                  ? 'from-retro-orange/15 to-retro-red/15 border-retro-orange/30 hover:border-retro-orange/50'
                  : 'from-retro-green/15 to-retro-cyan/15 border-retro-green/30 hover:border-retro-green/50'
              }`}>
              <div className={`absolute inset-0 rounded-xl opacity-50 ${timeInfo.isExpired
                  ? 'bg-retro-red/5'
                  : timeInfo.isExpiringSoon
                    ? 'bg-retro-orange/5'
                    : 'bg-retro-green/5'
                }`}></div>
              <div className="relative flex items-center justify-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-lg border border-white/20 ${timeInfo.isExpired
                    ? 'bg-gradient-to-br from-retro-red/30 to-retro-orange/30'
                    : timeInfo.isExpiringSoon
                      ? 'bg-gradient-to-br from-retro-orange/30 to-retro-red/30'
                      : 'bg-gradient-to-br from-retro-green/30 to-retro-cyan/30'
                  } ${timeInfo.isExpiringSoon && !timeInfo.isExpired ? '' : ''}`}>
                  <span className="text-lg">
                    {timeInfo.isExpired
                      ? '🛑'
                      : timeInfo.isExpiringSoon
                        ? '⏰'
                        : '✅'
                    }
                  </span>
                </div>
                <div className="text-center">
                  <div className={`text-sm font-bold font-pixel tracking-wide ${timeInfo.isExpired
                      ? 'text-retro-red'
                      : timeInfo.isExpiringSoon
                        ? 'text-retro-orange'
                        : 'text-retro-green'
                    }`}>
                    {timeInfo.isExpired
                      ? t.workstation.expired.toUpperCase()
                      : timeInfo.isExpiringSoon
                        ? t.workstation.expiring_soon.toUpperCase()
                        : t.workstation.active.toUpperCase()
                    }
                  </div>
                  <div className="text-xs text-retro-textMuted font-retro">
                    {timeInfo.isExpired
                      ? t.workstation.rental_ended
                      : timeInfo.isExpiringSoon
                        ? t.workstation.expiring_soon_msg.replace('{days}', timeInfo.daysRemaining.toString())
                        : t.workstation.rental_in_progress
                    }
                  </div>
                </div>
                <div className={`w-3 h-3 rounded-full shadow-lg ${timeInfo.isExpired
                    ? 'bg-retro-red'
                    : timeInfo.isExpiringSoon
                      ? 'bg-retro-orange '
                      : 'bg-retro-green'
                  }`}></div>
              </div>
            </div>
          </div>
        )}

        {/* 底部按钮 - 现代像素风格 */}
        <div className="relative flex gap-3 mt-6 pt-6 border-t-2 border-retro-border/50">
          {/* 背景装饰 */}
          <div className="absolute inset-0 bg-gradient-to-r from-retro-green/3 via-retro-cyan/5 to-retro-blue/3 opacity-60 pointer-events-none rounded-xl"></div>

          {/* 关闭按钮 */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleClose()
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
            className="relative flex-1 group overflow-hidden bg-gradient-to-r from-retro-bg-dark/80 to-retro-bg-darker/80 hover:from-retro-border/60 hover:to-retro-border/80 text-white font-medium py-3 px-4 rounded-xl border-2 border-retro-border hover:border-retro-cyan/60  shadow-lg hover:shadow-xl backdrop-blur-sm "
          >
            {/* 按钮光效 */}
            <div className="absolute inset-0 bg-gradient-to-r from-retro-cyan/5 to-retro-blue/5 opacity-0 group-hover:opacity-100 "></div>

            {/* 按钮内容 */}
            <div className="relative flex items-center justify-center gap-2">
              <div className="w-5 h-5 bg-retro-cyan/20 rounded-lg flex items-center justify-center group-hover:bg-retro-cyan/30 ">
                <span className="text-sm">✅</span>
              </div>
              <span className="font-pixel text-sm tracking-wide">{t.common.close.toUpperCase()}</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
})

export default WorkstationInfoModal
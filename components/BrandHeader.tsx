'use client'

import { useBrandConfig } from '@/lib/hooks/useBrandConfig'

interface BrandHeaderProps {
  showLogo?: boolean
  showSlogan?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
  locale?: string
}

/**
 * 统一的品牌头部组件
 * 自动从配置中获取品牌名称、标语和Logo
 *
 * 使用示例:
 * <BrandHeader showLogo showSlogan size="md" />
 */
export default function BrandHeader({
  showLogo = true,
  showSlogan = true,
  size = 'md',
  className = '',
  locale = 'zh-CN'
}: BrandHeaderProps) {
  const { config, isLoading } = useBrandConfig(locale)

  // 根据尺寸设置样式
  const sizeStyles = {
    sm: {
      logo: 'w-6 h-6',
      title: 'text-sm',
      slogan: 'text-xs'
    },
    md: {
      logo: 'w-8 h-8',
      title: 'text-base',
      slogan: 'text-xs'
    },
    lg: {
      logo: 'w-10 h-10',
      title: 'text-xl',
      slogan: 'text-sm'
    }
  }

  const styles = sizeStyles[size]

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className={`${styles.logo} bg-gray-700 rounded-lg animate-pulse`}></div>
        <div className="flex flex-col gap-1">
          <div className="h-4 w-24 bg-gray-700 rounded animate-pulse"></div>
          {showSlogan && <div className="h-3 w-32 bg-gray-700 rounded animate-pulse"></div>}
        </div>
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showLogo && config.app_logo && (
        <img
          src={config.app_logo}
          alt={config.app_name}
          className={`${styles.logo} rounded-lg object-cover`}
          onError={(e) => {
            // 图片加载失败时显示默认图标
            e.currentTarget.style.display = 'none'
          }}
        />
      )}
      <div className="flex flex-col">
        <h1 className={`${styles.title} font-bold text-white`}>
          {config.app_name}
        </h1>
        {showSlogan && (
          <p className={`${styles.slogan} text-gray-400 font-mono`}>
            {config.app_slogan}
          </p>
        )}
      </div>
    </div>
  )
}

/**
 * 仅显示品牌名称的简化版本
 */
export function BrandName({ locale = 'zh-CN', className = '' }: { locale?: string; className?: string }) {
  const { config, isLoading } = useBrandConfig(locale)

  if (isLoading) {
    return <span className={`text-white ${className}`}>Loading...</span>
  }

  return <span className={`text-white ${className}`}>{config.app_name}</span>
}

/**
 * 仅显示品牌Logo的版本
 */
export function BrandLogo({
  locale = 'zh-CN',
  size = 'md',
  className = ''
}: {
  locale?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const { config, isLoading } = useBrandConfig(locale)

  const sizeClass = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  }[size]

  if (isLoading) {
    return <div className={`${sizeClass} bg-gray-700 rounded-lg animate-pulse ${className}`}></div>
  }

  return (
    <img
      src={config.app_logo}
      alt={config.app_name}
      className={`${sizeClass} rounded-lg object-cover ${className}`}
      onError={(e) => {
        e.currentTarget.style.display = 'none'
      }}
    />
  )
}

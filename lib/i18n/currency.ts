/**
 * 象素币(PixelCoin)国际化配置
 * 用于虚拟货币系统的多语言支持
 */

export const currencyI18n = {
  'zh-CN': {
    // 货币名称
    currencyName: '象素币',
    currencyNameShort: 'PXC',
    currencySymbol: 'Ⓟ',

    // 显示文本
    balance: '象素币余额',
    yourBalance: '您的象素币',
    current: '当前象素币',
    earn: '获得象素币',
    spend: '消费象素币',
    insufficient: '象素币不足',

    // 历史记录
    history: '象素币历史',
    transactionHistory: '交易记录',

    // 操作
    transfer: '转账',
    withdraw: '提取',
    deposit: '充值',

    // 交易类型
    postCreated: '发帖奖励',
    postLiked: '获赞奖励',
    replyCreated: '回复奖励',
    workstationBinding: '工位绑定',
    characterPurchase: '角色购买',
    dailyReward: '每日签到',
    achievement: '成就奖励',

    // 数量单位
    units: {
      one: '个象素币',
      other: '个象素币'
    }
  },
  'en': {
    // 货币名称
    currencyName: 'PixelCoin',
    currencyNameShort: 'PXC',
    currencySymbol: 'Ⓟ',

    // 显示文本
    balance: 'PixelCoin Balance',
    yourBalance: 'Your PixelCoins',
    current: 'Current PixelCoins',
    earn: 'Earn PixelCoins',
    spend: 'Spend PixelCoins',
    insufficient: 'Insufficient PixelCoins',

    // 历史记录
    history: 'PixelCoin History',
    transactionHistory: 'Transaction History',

    // 操作
    transfer: 'Transfer',
    withdraw: 'Withdraw',
    deposit: 'Deposit',

    // 交易类型
    postCreated: 'Post Reward',
    postLiked: 'Like Reward',
    replyCreated: 'Reply Reward',
    workstationBinding: 'Workstation Binding',
    characterPurchase: 'Character Purchase',
    dailyReward: 'Daily Check-in',
    achievement: 'Achievement Reward',

    // 数量单位
    units: {
      one: 'PixelCoin',
      other: 'PixelCoins'
    }
  }
}

// 获取当前语言,默认中文
export function getCurrentLanguage(): string {
  if (typeof window === 'undefined') return 'zh-CN'
  return localStorage.getItem('pixeldesk-language') || 'zh-CN'
}

// 获取货币翻译文本
export function tc(key: string): string {
  const lang = getCurrentLanguage()
  const keys = key.split('.')
  let value: any = currencyI18n[lang as keyof typeof currencyI18n]

  for (const k of keys) {
    if (value && typeof value === 'object') {
      value = value[k]
    } else {
      break
    }
  }

  return typeof value === 'string' ? value : key
}

// 设置语言
export function setLanguage(lang: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('pixeldesk-language', lang)
  }
}

// 格式化象素币数量显示
export function formatPixelCoin(amount: number, showSymbol = true): string {
  const lang = getCurrentLanguage()
  const symbol = showSymbol ? tc('currencySymbol') : ''

  if (lang === 'zh-CN') {
    return `${symbol}${amount.toLocaleString('zh-CN')}`
  } else {
    return `${symbol}${amount.toLocaleString('en-US')}`
  }
}

// 导出 hook 供 React 组件使用
export function useCurrencyI18n() {
  return {
    tc,
    formatPixelCoin,
    getCurrentLanguage,
    setLanguage
  }
}

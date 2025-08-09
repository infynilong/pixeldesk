// 社交游戏平台的工具函数

// 生成随机玩家ID
export function generatePlayerId() {
  return `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// 格式化时间戳
export function formatTimestamp(timestamp) {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  if (diff < 60000) { // 1分钟内
    return '刚刚'
  } else if (diff < 3600000) { // 1小时内
    return `${Math.floor(diff / 60000)}分钟前`
  } else if (diff < 86400000) { // 1天内
    return `${Math.floor(diff / 3600000)}小时前`
  } else {
    return date.toLocaleDateString()
  }
}

// 获取状态对应的颜色类
export function getStatusColor(type) {
  const colors = {
    working: 'bg-blue-100 text-blue-800',
    break: 'bg-green-100 text-green-800',
    reading: 'bg-purple-100 text-purple-800',
    restroom: 'bg-yellow-100 text-yellow-800',
    meeting: 'bg-red-100 text-red-800',
    lunch: 'bg-orange-100 text-orange-800'
  }
  return colors[type] || 'bg-gray-100 text-gray-800'
}

// 状态选项
export const statusOptions = [
  { id: 'working', label: '工作中', emoji: '💼', color: 'bg-blue-100 text-blue-800' },
  { id: 'break', label: '休息中', emoji: '☕', color: 'bg-green-100 text-green-800' },
  { id: 'reading', label: '阅读中', emoji: '📚', color: 'bg-purple-100 text-purple-800' },
  { id: 'restroom', label: '洗手间', emoji: '🚻', color: 'bg-yellow-100 text-yellow-800' },
  { id: 'meeting', label: '会议中', emoji: '👥', color: 'bg-red-100 text-red-800' },
  { id: 'lunch', label: '午餐时间', emoji: '🍽️', color: 'bg-orange-100 text-orange-800' }
]

// 示例玩家数据
export const samplePlayers = [
  {
    id: 'player_1',
    name: '小明',
    character: 'Premade_Character_48x48_01',
    currentStatus: {
      type: 'working',
      status: '工作中',
      emoji: '💼',
      message: '正在写代码...',
      timestamp: new Date().toISOString()
    },
    statuses: [
      {
        id: 1,
        status: '正在工作中...',
        type: 'working',
        timestamp: '2分钟前',
        content: '正在处理一个重要的项目，专注模式开启！'
      },
      {
        id: 2,
        status: '休息时间',
        type: 'break',
        timestamp: '15分钟前',
        content: '刚喝完咖啡，准备继续加油！'
      }
    ]
  },
  {
    id: 'player_2',
    name: '小红',
    character: 'Premade_Character_48x48_02',
    currentStatus: {
      type: 'break',
      status: '休息中',
      emoji: '☕',
      message: '喝杯咖啡放松一下',
      timestamp: new Date().toISOString()
    },
    statuses: [
      {
        id: 1,
        status: '休息中',
        type: 'break',
        timestamp: '5分钟前',
        content: '今天的代码写得有点累，休息一下脑子。'
      }
    ]
  },
  {
    id: 'player_3',
    name: '小李',
    character: 'Premade_Character_48x48_03',
    currentStatus: {
      type: 'reading',
      status: '阅读中',
      emoji: '📚',
      message: '在读《JavaScript高级程序设计》',
      timestamp: new Date().toISOString()
    },
    statuses: [
      {
        id: 1,
        status: '阅读中',
        type: 'reading',
        timestamp: '30分钟前',
        content: '在读《JavaScript高级程序设计》，受益匪浅！'
      }
    ]
  }
]
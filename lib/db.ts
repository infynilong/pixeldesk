import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// 🔧 优化后的 Prisma 实例化逻辑
// 1. 使用单例模式防止在 Next.js 热重载时产生过多连接
// 2. 增加连接池配置（如果环境变量中没有指定，可以在这里补充默认值）
const dbUrl = process.env.DATABASE_URL
const urlWithPool = dbUrl?.includes('connection_limit')
  ? dbUrl
  : `${dbUrl}${dbUrl?.includes('?') ? '&' : '?'}connection_limit=10&pool_timeout=30`

// 强制刷新逻辑：如果当前实例缺少新定义的模型，则清理它
if (globalForPrisma.prisma) {
  const p = globalForPrisma.prisma as any
  if (!p.player_steps || !p.post_nodes || !p.user_postcards) {
    console.log('🔄 Prisma 实例过旧 (缺少 player_steps, post_nodes 或 user_postcards)，正在重新启动客户端...')
    p.$disconnect().catch(() => { })
    globalForPrisma.prisma = undefined
  }
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: urlWithPool,
      },
    },
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// 默认导出以便兼容不同导入方式
export default prisma

// 优雅关闭数据库连接 (仅在服务器端非热重载环境下)
if (process.env.NODE_ENV === 'production' && typeof window === 'undefined') {
  process.on('beforeExit', async () => {
    await prisma.$disconnect()
  })
}
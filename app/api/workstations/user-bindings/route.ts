import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')
  const cleanup = searchParams.get('cleanup') === 'true'

  if (!userId) {
    return NextResponse.json({ error: 'User ID required' }, { status: 400 })
  }

  // 重试机制来处理数据库连接问题
  let retries = 3
  let lastError = null

  while (retries > 0) {
    try {
      // 移除频繁日志输出以优化性能

      // 获取用户的所有工位绑定
      const userWorkstations = await prisma.user_workstations.findMany({
        where: { userId },
        orderBy: { boundAt: 'desc' }
      })

      // 获取成功，移除日志输出以减少CPU消耗

      // 如果请求清理多重绑定，只保留最新的一个
      if (cleanup && userWorkstations.length > 1) {
        // 清理多重绑定

        // 保留最新的绑定
        const latestBinding = userWorkstations[0]
        const oldBindings = userWorkstations.slice(1)

        // 删除旧的绑定
        await prisma.user_workstations.deleteMany({
          where: {
            userId,
            id: {
              in: oldBindings.map(b => b.id)
            }
          }
        })

        // 清理完成

        return NextResponse.json({
          success: true,
          data: [latestBinding],
          cleaned: oldBindings.length,
          message: `已清理 ${oldBindings.length} 个重复绑定`
        })
      }

      return NextResponse.json({ success: true, data: userWorkstations })

    } catch (error: any) {
      lastError = error
      retries--

      // 数据库连接失败，仅在开发环境记录错误
      if (process.env.NODE_ENV === 'development') {
        console.error(`❌ [user-bindings] 数据库连接失败 (剩余重试: ${retries}):`, error.message)
      }

      if (retries > 0) {
        // 等待后重试
        await new Promise(resolve => setTimeout(resolve, 1000))
        continue
      }

      // 所有重试都失败了
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ [user-bindings] 所有重试都失败，返回错误')
      }

      // 根据错误类型返回更具体的错误信息
      if (error.code === 'P1001') {
        return NextResponse.json({
          success: false,
          error: 'Database connection failed',
          code: 'DB_CONNECTION_ERROR',
          data: [] // 返回空数组而不是错误，让前端可以继续工作
        }, { status: 200 }) // 使用200状态码，让前端知道这是预期的错误处理
      }

      if (error.code === 'P2024') {
        return NextResponse.json({
          success: false,
          error: 'Database timeout',
          code: 'DB_TIMEOUT_ERROR',
          data: [] // 返回空数组
        }, { status: 200 })
      }

      return NextResponse.json({
        success: false,
        error: 'Database error',
        code: 'DB_ERROR',
        data: []
      }, { status: 200 })
    }
  }
}
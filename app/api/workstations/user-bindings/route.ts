import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')

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

      // 如果有多个绑定，只返回最新的一个，这在逻辑上解决了多重绑定的问题，
      // 且避免了在 GET 请求中进行具有破坏性的删除操作。
      // 数据处理层面只关注最新的有效绑定。
      if (userWorkstations.length > 1) {
        return NextResponse.json({
          success: true,
          data: [userWorkstations[0]],
          info: `Found ${userWorkstations.length} bindings, returning latest.`
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
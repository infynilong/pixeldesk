import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const now = new Date()

    // 注意：已移除每请求执行的 deleteMany 逻辑，以优化高并发下的查询性能。
    // 过期清理应由专门的后台任务（如 cleanup-expired/route.ts）处理。

    // 获取所有有效的工位绑定信息
    const allBindings = await prisma.user_workstations.findMany({
      where: {
        OR: [
          { expiresAt: null }, // 兼容旧数据
          { expiresAt: { gte: now } } // 未过期的绑定
        ]
      },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            points: true,
            players: {
              select: {
                characterSprite: true
              }
            },
            // 获取最新的一条状态历史作为当前状态
            status_history: {
              orderBy: {
                timestamp: 'desc'
              },
              take: 1
            }
          }
        }
      },
      orderBy: {
        boundAt: 'desc'
      }
    })

    // 计算剩余天数和即将过期状态
    const bindingsWithDays = allBindings.map(binding => {
      const remainingDays = binding.expiresAt
        ? Math.max(0, Math.ceil((binding.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
        : 30 // 默认值，兼容旧数据

      const isExpiringSoon = binding.expiresAt
        ? (binding.expiresAt.getTime() - now.getTime()) <= (3 * 24 * 60 * 60 * 1000) // 3天内过期
        : false

      // 提取最新状态
      const users: any = binding.users;
      if (users && users.status_history && users.status_history.length > 0) {
        users.current_status = users.status_history[0];
        // 清理掉不需要直接返回的数组
        delete users.status_history;
      }

      return {
        ...binding,
        users,
        remainingDays,
        isExpiringSoon
      }
    })

    return NextResponse.json({ success: true, data: bindingsWithDays })
  } catch (error) {
    console.error('Error fetching all workstation bindings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
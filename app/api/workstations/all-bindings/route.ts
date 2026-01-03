import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const now = new Date()

    // 先清理过期的工位绑定
    await prisma.user_workstations.deleteMany({
      where: {
        expiresAt: {
          lt: now
        }
      }
    })

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

      return {
        ...binding,
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
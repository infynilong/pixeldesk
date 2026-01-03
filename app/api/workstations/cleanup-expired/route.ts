import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST() {
  try {
    const now = new Date()

    // 查找所有过期的工位绑定
    const expiredBindings = await prisma.user_workstations.findMany({
      where: {
        expiresAt: {
          lt: now
        }
      },
      include: {
        users: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    if (expiredBindings.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No expired workstations found',
        cleanedCount: 0
      })
    }

    // 删除过期的工位绑定
    const result = await prisma.user_workstations.deleteMany({
      where: {
        expiresAt: {
          lt: now
        }
      }
    })

    console.log(`Cleaned up ${result.count} expired workstation bindings:`,
      expiredBindings.map(b => ({
        workstationId: b.workstationId,
        userId: b.userId,
        userName: b.user.name,
        expiredAt: b.expiresAt
      }))
    )

    return NextResponse.json({
      success: true,
      message: `Successfully cleaned up ${result.count} expired workstation bindings`,
      cleanedCount: result.count,
      cleanedBindings: expiredBindings.map(b => ({
        workstationId: b.workstationId,
        userId: b.userId,
        userName: b.user.name,
        expiredAt: b.expiresAt
      }))
    })
  } catch (error) {
    console.error('Error cleaning up expired workstation bindings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const now = new Date()

    // 查找即将过期的工位绑定（3天内过期）
    const soonToExpire = await prisma.user_workstations.findMany({
      where: {
        expiresAt: {
          gte: now,
          lt: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000) // 3天内
        }
      },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        expiresAt: 'asc'
      }
    })

    // 计算剩余时间
    const bindingsWithRemaining = soonToExpire.map(binding => ({
      ...binding,
      remainingDays: binding.expiresAt
        ? Math.max(0, Math.ceil((binding.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
        : 0,
      remainingHours: binding.expiresAt
        ? Math.max(0, Math.ceil((binding.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60)))
        : 0
    }))

    return NextResponse.json({
      success: true,
      data: bindingsWithRemaining,
      count: soonToExpire.length
    })
  } catch (error) {
    console.error('Error fetching soon-to-expire workstation bindings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
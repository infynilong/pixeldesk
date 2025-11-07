import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/permissions'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    // 验证管理员权限
    await requireAdmin()

    // 并行查询所有统计数据
    const [
      totalPlayers,
      activePlayers,
      totalCharacters,
      totalWorkstations,
      occupiedWorkstations,
    ] = await Promise.all([
      // 总玩家数
      prisma.player.count(),

      // 活跃玩家数（最近7天活跃）
      prisma.player.count({
        where: {
          lastActiveAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7天前
          },
        },
      }),

      // 总角色形象数
      prisma.character.count({
        where: { isActive: true },
      }),

      // 总工位数（从配置表获取）
      prisma.workstationConfig.findFirst({
        select: { totalWorkstations: true },
      }),

      // 已占用工位数
      prisma.userWorkstation.count({
        where: {
          OR: [
            { expiresAt: null }, // 永久绑定
            { expiresAt: { gte: new Date() } }, // 未过期
          ],
        },
      }),
    ])

    // 计算占用率
    const totalWorkstationCount = totalWorkstations?.totalWorkstations || 1000
    const occupancyRate = totalWorkstationCount > 0
      ? Math.round((occupiedWorkstations / totalWorkstationCount) * 100)
      : 0

    return NextResponse.json({
      success: true,
      data: {
        totalPlayers,
        activePlayers,
        totalCharacters,
        totalWorkstations: totalWorkstationCount,
        occupiedWorkstations,
        occupancyRate,
      },
    })
  } catch (error) {
    console.error('Failed to get dashboard stats:', error)
    return NextResponse.json(
      { error: '获取统计数据失败' },
      { status: 500 }
    )
  }
}

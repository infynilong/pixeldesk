import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/admin/permissions'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // 验证权限
    await requirePermission('players.view')

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')
    const search = searchParams.get('search') || ''
    const isActive = searchParams.get('isActive')
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    // 构建查询条件
    const where: any = {}

    if (search) {
      where.OR = [
        { playerName: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
      ]
    }

    // 查询数据
    const [players, total] = await Promise.all([
      prisma.player.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              points: true,
              isActive: true,
              createdAt: true,
              lastLogin: true,
            },
          },
        },
        orderBy: sortBy === 'points'
          ? { user: { points: sortOrder as 'asc' | 'desc' } }
          : { [sortBy]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.player.count({ where }),
    ])

    // 格式化数据
    const formattedPlayers = players.map((player) => {
      // 计算游戏时长（如果有 totalPlayTime）
      const totalHours = Math.floor(player.totalPlayTime / 60)
      const totalMinutes = player.totalPlayTime % 60

      // 计算最后活跃时间（相对时间）
      const lastActiveDate = new Date(player.lastActiveAt)
      const now = new Date()
      const diffMs = now.getTime() - lastActiveDate.getTime()
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

      let lastActiveText = ''
      if (diffDays === 0) {
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
        if (diffHours === 0) {
          const diffMinutes = Math.floor(diffMs / (1000 * 60))
          lastActiveText = diffMinutes <= 1 ? '刚刚' : `${diffMinutes}分钟前`
        } else {
          lastActiveText = `${diffHours}小时前`
        }
      } else if (diffDays === 1) {
        lastActiveText = '昨天'
      } else if (diffDays < 7) {
        lastActiveText = `${diffDays}天前`
      } else {
        lastActiveText = lastActiveDate.toLocaleDateString('zh-CN')
      }

      return {
        id: player.id,
        userId: player.userId,
        playerName: player.playerName,
        characterSprite: player.characterSprite,
        userName: player.user.name,
        email: player.user.email,
        points: player.user.points,
        totalPlayTime: player.totalPlayTime,
        totalPlayTimeText: totalHours > 0
          ? `${totalHours}小时${totalMinutes}分钟`
          : `${totalMinutes}分钟`,
        lastActiveAt: player.lastActiveAt,
        lastActiveText,
        createdAt: player.createdAt,
        isActive: player.user.isActive,
      }
    })

    return NextResponse.json({
      success: true,
      data: formattedPlayers,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    })
  } catch (error) {
    console.error('Failed to get players:', error)
    return NextResponse.json(
      { error: '获取玩家列表失败' },
      { status: 500 }
    )
  }
}

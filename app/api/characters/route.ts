import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

/**
 * 公开的角色列表 API
 * 用于前端获取可用的角色形象列表
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '100')
    const priceMax = searchParams.get('priceMax')

    // 构建查询条件
    const where: any = {
      isActive: true, // 只返回启用的角色
    }

    // 如果指定了最大价格（用于根据用户积分筛选）
    if (priceMax) {
      where.price = { lte: parseInt(priceMax) }
    }

    // 查询数据
    const [characters, total] = await Promise.all([
      prisma.characters.findMany({
        where,
        orderBy: { sortOrder: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          name: true,
          displayName: true,
          description: true,
          imageUrl: true,
          frameWidth: true,
          frameHeight: true,
          totalFrames: true,
          isCompactFormat: true,
          price: true,
          isDefault: true,
          sortOrder: true,
        },
      }),
      prisma.characters.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: characters,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    })
  } catch (error) {
    console.error('Failed to get characters:', error)
    return NextResponse.json(
      { error: '获取角色列表失败' },
      { status: 500 }
    )
  }
}

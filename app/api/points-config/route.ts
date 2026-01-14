import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * GET /api/points-config
 * 获取所有积分配置或单个配置
 *
 * 查询参数:
 * - key: 可选，获取特定配置项
 * - category: 可选，按分类筛选 (REWARD/COST)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key')
    const category = searchParams.get('category')

    // 获取单个配置
    if (key) {
      const config = await prisma.points_config.findUnique({
        where: {
          key,
          isActive: true
        }
      })

      if (!config) {
        return NextResponse.json(
          { success: false, error: 'Configuration not found' },
          { status: 404 }
        )
      }

      return NextResponse.json({
        success: true,
        data: config
      })
    }

    // 获取所有配置或按分类筛选
    const where: any = { isActive: true }
    if (category) {
      where.category = category
    }

    const configs = await prisma.points_config.findMany({
      where,
      orderBy: { key: 'asc' }
    })

    // 转换为键值对格式，方便前端使用
    const configMap = configs.reduce((acc, config) => {
      acc[config.key] = config.value
      return acc
    }, {} as Record<string, number>)

    return NextResponse.json({
      success: true,
      data: configMap,
      details: configs // 同时返回详细信息
    })
  } catch (error) {
    console.error('Error fetching points config:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/points-config
 * 创建或更新积分配置（管理员功能）
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { key, value, description, category } = body

    if (!key || value === undefined || !description || !category) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // 使用 upsert 创建或更新
    const config = await prisma.points_config.upsert({
      where: { key },
      update: {
        value,
        description,
        category,
        updatedAt: new Date()
      },
      create: {
        id: crypto.randomUUID(),
        key,
        value,
        description,
        category,
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      data: config
    })
  } catch (error) {
    console.error('Error creating/updating points config:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

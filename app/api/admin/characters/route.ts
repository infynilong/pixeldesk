import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/admin/permissions'
import prisma from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export async function GET(request: NextRequest) {
  try {
    // 验证权限
    await requirePermission('characters.view')

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')
    const search = searchParams.get('search') || ''
    const isActive = searchParams.get('isActive')
    const isCompactFormat = searchParams.get('isCompactFormat')
    const priceMin = searchParams.get('priceMin')
    const priceMax = searchParams.get('priceMax')
    const sortBy = searchParams.get('sortBy') || 'sortOrder'
    const sortOrder = searchParams.get('sortOrder') || 'asc'

    // 构建查询条件
    const where: any = {}

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { displayName: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (isActive !== null && isActive !== undefined && isActive !== '') {
      where.isActive = isActive === 'true'
    }

    if (isCompactFormat !== null && isCompactFormat !== undefined && isCompactFormat !== '') {
      where.isCompactFormat = isCompactFormat === 'true'
    }

    if (priceMin !== null && priceMin !== undefined && priceMin !== '') {
      where.price = { ...where.price, gte: parseInt(priceMin) }
    }

    if (priceMax !== null && priceMax !== undefined && priceMax !== '') {
      where.price = { ...where.price, lte: parseInt(priceMax) }
    }

    // 查询数据
    const [characters, total] = await Promise.all([
      prisma.character.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          _count: {
            select: {
              purchases: true,
            },
          },
        },
      }),
      prisma.character.count({ where }),
    ])

    // 计算每个角色的使用人数（从Player表中统计）
    const charactersWithUsage = await Promise.all(
      characters.map(async (char) => {
        const userCount = await prisma.player.count({
          where: { characterSprite: char.name },
        })

        return {
          ...char,
          userCount,
          purchaseCount: char._count.purchases,
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: charactersWithUsage,
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

export async function POST(request: NextRequest) {
  try {
    // 验证权限
    await requirePermission('characters.create')

    // 解析FormData
    const formData = await request.formData()
    const image = formData.get('image') as File
    const name = formData.get('name') as string
    const displayName = formData.get('displayName') as string
    const description = formData.get('description') as string
    const price = parseInt(formData.get('price') as string) || 0
    const isCompactFormat = formData.get('isCompactFormat') === 'true'
    const frameWidth = parseInt(formData.get('frameWidth') as string) || 48
    const frameHeight = parseInt(formData.get('frameHeight') as string) || 48
    const totalFrames = parseInt(formData.get('totalFrames') as string) || 8
    const isDefault = formData.get('isDefault') === 'true'
    const isActive = formData.get('isActive') === 'true'
    const sortOrder = parseInt(formData.get('sortOrder') as string) || 0

    // 验证必填字段
    if (!image || !name || !displayName) {
      return NextResponse.json(
        { error: '缺少必填字段' },
        { status: 400 }
      )
    }

    // 验证文件类型
    if (!image.type.startsWith('image/')) {
      return NextResponse.json(
        { error: '只能上传图片文件' },
        { status: 400 }
      )
    }

    // 验证文件大小 (5MB)
    if (image.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: '图片大小不能超过 5MB' },
        { status: 400 }
      )
    }

    // 检查角色名称是否已存在
    const existing = await prisma.character.findFirst({
      where: { name }
    })

    if (existing) {
      return NextResponse.json(
        { error: '角色标识已存在' },
        { status: 400 }
      )
    }

    // 保存文件
    const bytes = await image.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // 获取文件扩展名
    const ext = image.name.split('.').pop() || 'png'
    const filename = `${name}.${ext}`

    // 确保目录存在
    const uploadDir = join(process.cwd(), 'public', 'assets', 'characters')
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // 保存文件
    const filepath = join(uploadDir, filename)
    await writeFile(filepath, buffer)

    // 创建数据库记录
    const character = await prisma.character.create({
      data: {
        name,
        displayName,
        description: description || null,
        imageUrl: `/assets/characters/${filename}`,
        price,
        isCompactFormat,
        frameWidth,
        frameHeight,
        totalFrames,
        isDefault,
        isActive,
        sortOrder,
      },
    })

    return NextResponse.json({
      success: true,
      data: character,
    }, { status: 201 })

  } catch (error: any) {
    console.error('Failed to create character:', error)
    return NextResponse.json(
      { error: error.message || '创建角色失败' },
      { status: 500 }
    )
  }
}

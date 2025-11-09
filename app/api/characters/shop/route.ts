import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { getCharacterImageUrl } from '@/lib/characterUtils'

/**
 * GET /api/characters/shop
 * 获取商店角色列表，标记用户已拥有的角色
 * 支持查询参数：
 * - priceFilter: 'all' | 'free' | 'paid' (筛选免费/收费)
 * - sourceFilter: 'all' | 'official' | 'user' (筛选官方/用户生成)
 */
export async function GET(request: NextRequest) {
  try {
    // 获取查询参数
    const { searchParams } = new URL(request.url)
    const priceFilter = searchParams.get('priceFilter') || 'all'
    const sourceFilter = searchParams.get('sourceFilter') || 'all'

    // 获取用户信息（可选，未登录也可以查看商店）
    let user = null
    let token: string | null = null

    // 优先从cookie读取
    token = request.cookies.get('auth-token')?.value || null

    // 如果cookie中没有，尝试从Authorization header读取
    if (!token) {
      const authHeader = request.headers.get('Authorization')
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7)
      }
    }

    // 如果有token，验证并获取用户信息
    if (token) {
      const payload = verifyToken(token)
      if (payload) {
        user = await prisma.user.findUnique({
          where: { id: payload.userId },
          select: { id: true, points: true }
        })
      }
    }

    // 构建where条件
    const whereCondition: any = {
      isActive: true
    }

    // 价格筛选
    if (priceFilter === 'free') {
      whereCondition.price = 0
    } else if (priceFilter === 'paid') {
      whereCondition.price = { gt: 0 }
    }

    // 来源筛选
    if (sourceFilter === 'official') {
      whereCondition.isUserGenerated = false
    } else if (sourceFilter === 'user') {
      whereCondition.isUserGenerated = true
    }

    // 获取所有激活的角色
    const characters = await prisma.character.findMany({
      where: whereCondition,
      orderBy: [
        { sortOrder: 'asc' },
        { createdAt: 'desc' }
      ],
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
        isUserGenerated: true,
        salesCount: true,
        sortOrder: true,
        creator: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    // 如果用户已登录，查询用户已拥有的角色
    let ownedCharacterIds: string[] = []
    if (user) {
      const purchases = await prisma.characterPurchase.findMany({
        where: {
          userId: user.id
        },
        select: {
          characterId: true
        }
      })
      ownedCharacterIds = purchases.map(p => p.characterId)
    }

    // 组装响应数据
    const shopCharacters = characters.map(character => ({
      id: character.id,
      name: character.name,
      displayName: character.displayName,
      description: character.description,
      imageUrl: getCharacterImageUrl(character.name),
      frameWidth: character.frameWidth,
      frameHeight: character.frameHeight,
      totalFrames: character.totalFrames,
      isCompactFormat: character.isCompactFormat,
      price: character.price,
      isDefault: character.isDefault,
      isUserGenerated: character.isUserGenerated,
      salesCount: character.salesCount,
      creator: character.creator,
      isOwned: ownedCharacterIds.includes(character.id) || character.isDefault, // 默认角色视为已拥有
      canPurchase: user ? !ownedCharacterIds.includes(character.id) && !character.isDefault : false
    }))

    return NextResponse.json({
      success: true,
      data: shopCharacters,
      userPoints: user?.points || 0,
      isAuthenticated: !!user
    })
  } catch (error) {
    console.error('获取商店角色列表失败:', error)
    return NextResponse.json(
      { success: false, error: '获取角色列表失败' },
      { status: 500 }
    )
  }
}

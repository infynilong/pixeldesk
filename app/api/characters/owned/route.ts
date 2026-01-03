import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { getCharacterImageUrl } from '@/lib/characterUtils'

/**
 * GET /api/characters/owned
 * 获取用户已拥有的角色列表
 */
export async function GET(request: NextRequest) {
  try {
    // 验证用户身份 - 支持从cookie或Authorization header读取token
    let token: string | null = null

    // 优先从cookie读取（主要认证方式）
    token = request.cookies.get('auth-token')?.value || null

    // 如果cookie中没有，尝试从Authorization header读取（向后兼容）
    if (!token) {
      const authHeader = request.headers.get('Authorization')
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7)
      }
    }

    if (!token) {
      return NextResponse.json(
        { success: false, error: '请先登录' },
        { status: 401 }
      )
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json(
        { success: false, error: '无效的认证令牌' },
        { status: 401 }
      )
    }

    const user = await prisma.users.findUnique({
      where: { id: payload.userId },
      select: { id: true, avatar: true }
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: '用户不存在' },
        { status: 404 }
      )
    }

    // 查询用户购买的角色
    const purchases = await prisma.character_purchases.findMany({
      where: {
        userId: user.id
      },
      include: {
        character: {
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
            isDefault: true
          }
        }
      },
      orderBy: {
        purchasedAt: 'desc'
      }
    })

    // 查询所有默认角色（免费角色）
    const defaultCharacters = await prisma.characters.findMany({
      where: {
        isDefault: true,
        isActive: true
      },
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
        isDefault: true
      }
    })

    // 获取用户当前使用的角色
    const currentUser = await prisma.users.findUnique({
      where: { id: user.id },
      select: { avatar: true }
    })

    // 合并已购买的角色和默认角色
    const ownedCharacters = [
      ...defaultCharacters.map(character => ({
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
        isCurrent: currentUser?.avatar === character.name,
        purchasedAt: null // 默认角色没有购买时间
      })),
      ...purchases.map(purchase => ({
        id: purchase.character.id,
        name: purchase.character.name,
        displayName: purchase.character.displayName,
        description: purchase.character.description,
        imageUrl: getCharacterImageUrl(purchase.character.name),
        frameWidth: purchase.character.frameWidth,
        frameHeight: purchase.character.frameHeight,
        totalFrames: purchase.character.totalFrames,
        isCompactFormat: purchase.character.isCompactFormat,
        price: purchase.price,
        isDefault: purchase.character.isDefault,
        isCurrent: currentUser?.avatar === purchase.character.name,
        purchasedAt: purchase.purchasedAt
      }))
    ]

    // 去重（如果默认角色也被购买了）
    const uniqueCharacters = Array.from(
      new Map(ownedCharacters.map(char => [char.id, char])).values()
    )

    return NextResponse.json({
      success: true,
      data: uniqueCharacters,
      currentCharacter: currentUser?.avatar || null
    })
  } catch (error) {
    console.error('获取已拥有角色列表失败:', error)
    return NextResponse.json(
      { success: false, error: '获取角色列表失败' },
      { status: 500 }
    )
  }
}

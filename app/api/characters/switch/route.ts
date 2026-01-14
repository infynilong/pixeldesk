import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

/**
 * POST /api/characters/switch
 * 切换当前使用的角色形象
 */
export async function POST(request: NextRequest) {
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
      select: { id: true }
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: '用户不存在' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { characterId } = body

    if (!characterId) {
      return NextResponse.json(
        { success: false, error: '缺少角色ID' },
        { status: 400 }
      )
    }

    // 查询角色信息
    const character = await prisma.characters.findUnique({
      where: { id: characterId, isActive: true }
    })

    if (!character) {
      return NextResponse.json(
        { success: false, error: '角色不存在或已下架' },
        { status: 404 }
      )
    }

    // 检查用户是否拥有此角色（默认角色或已购买）
    const isDefault = character.isDefault
    const hasPurchased = await prisma.character_purchases.findUnique({
      where: {
        userId_characterId: {
          userId: user.id,
          characterId: characterId
        }
      }
    })

    if (!isDefault && !hasPurchased) {
      return NextResponse.json(
        { success: false, error: '您尚未拥有此角色，请先购买' },
        { status: 403 }
      )
    }

    // 使用事务更新用户和玩家的角色
    await prisma.$transaction(async (tx) => {
      // 更新 User 表的 avatar 字段
      await tx.users.update({
        where: { id: user.id },
        data: {
          avatar: character.name // 存储角色 key
        }
      })

      // 更新 Player 表的 characterSprite 字段（如果存在）
      const player = await tx.players.findUnique({
        where: { userId: user.id }
      })

      if (player) {
        await tx.players.update({
          where: { userId: user.id },
          data: {
            characterSprite: character.name
          }
        })
      }
    })

    return NextResponse.json({
      success: true,
      message: `成功切换到角色「${character.displayName}」！`,
      data: {
        characterKey: character.name,
        characterName: character.displayName
      }
    })
  } catch (error) {
    console.error('切换角色失败:', error)
    return NextResponse.json(
      { success: false, error: '切换失败，请重试' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

/**
 * POST /api/characters/purchase
 * 购买角色形象
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

    const user = await prisma.user.findUnique({
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

    // 查询角色信息（包含创建者信息用于分成）
    const character = await prisma.character.findUnique({
      where: { id: characterId, isActive: true },
      include: {
        creator: {
          select: { id: true, name: true }
        }
      }
    })

    if (!character) {
      return NextResponse.json(
        { success: false, error: '角色不存在或已下架' },
        { status: 404 }
      )
    }

    // 检查是否已拥有
    const existingPurchase = await prisma.characterPurchase.findUnique({
      where: {
        userId_characterId: {
          userId: user.id,
          characterId: characterId
        }
      }
    })

    if (existingPurchase) {
      return NextResponse.json(
        { success: false, error: '您已拥有此角色' },
        { status: 400 }
      )
    }

    // 检查积分是否足够
    const currentUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { points: true }
    })

    if (!currentUser || currentUser.points < character.price) {
      return NextResponse.json(
        {
          success: false,
          error: '积分不足',
          required: character.price,
          current: currentUser?.points || 0
        },
        { status: 400 }
      )
    }

    // 使用事务完成购买
    const result = await prisma.$transaction(async (tx) => {
      // 扣除积分
      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: {
          points: {
            decrement: character.price
          }
        }
      })

      // 创建购买记录
      const purchase = await tx.characterPurchase.create({
        data: {
          userId: user.id,
          characterId: character.id,
          price: character.price
        }
      })

      // 如果是用户生成的角色，给创建者分成积分
      let creatorEarned = 0
      if (character.isUserGenerated && character.creatorId && character.price > 0) {
        // 给创建者100%的收入
        await tx.user.update({
          where: { id: character.creatorId },
          data: {
            points: {
              increment: character.price
            }
          }
        })
        creatorEarned = character.price

        // 更新角色销量
        await tx.character.update({
          where: { id: character.id },
          data: {
            salesCount: {
              increment: 1
            }
          }
        })
      }

      return {
        purchase,
        remainingPoints: updatedUser.points,
        creatorEarned,
        creatorName: character.creator?.name
      }
    })

    // 发送积分更新事件（客户端监听）
    // 这里可以通过 Server-Sent Events 或 WebSocket 推送，简化起见返回即可

    // 根据是否有创建者分成生成不同的消息
    let message = `成功购买角色「${character.displayName}」！`
    if (result.creatorEarned > 0 && result.creatorName) {
      message += ` 创作者「${result.creatorName}」获得 ${result.creatorEarned} 积分`
    }

    return NextResponse.json({
      success: true,
      message,
      data: {
        character: {
          id: character.id,
          name: character.name,
          displayName: character.displayName,
          isUserGenerated: character.isUserGenerated
        },
        pricePaid: character.price,
        remainingPoints: result.remainingPoints,
        purchasedAt: result.purchase.purchasedAt,
        creatorEarned: result.creatorEarned,
        creatorName: result.creatorName
      }
    })
  } catch (error) {
    console.error('购买角色失败:', error)
    return NextResponse.json(
      { success: false, error: '购买失败，请重试' },
      { status: 500 }
    )
  }
}

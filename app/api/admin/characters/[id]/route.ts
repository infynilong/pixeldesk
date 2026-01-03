import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/admin/permissions'
import { prisma } from '@/lib/db'
import { unlink } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

/**
 * DELETE /api/admin/characters/[id]
 * 删除角色
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requirePermission('characters.delete')

    const { id } = params

    // 查询角色信息
    const character = await prisma.characters.findUnique({
      where: { id }
    })

    if (!character) {
      return NextResponse.json(
        { success: false, error: '角色不存在' },
        { status: 404 }
      )
    }

    // 检查是否有用户正在使用此角色
    const usersUsingCharacter = await prisma.players.count({
      where: { characterSprite: character.name }
    })

    if (usersUsingCharacter > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `无法删除：当前有 ${usersUsingCharacter} 位玩家正在使用此角色`,
          usersCount: usersUsingCharacter
        },
        { status: 400 }
      )
    }

    // 检查销售记录（通过 salesCount 字段）
    if (character.salesCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `无法删除：此角色已被购买 ${character.salesCount} 次`,
          purchaseCount: character.salesCount
        },
        { status: 400 }
      )
    }

    // 删除数据库记录
    await prisma.characters.delete({
      where: { id }
    })

    // 尝试删除图片文件（如果存在）
    try {
      // 从imageUrl中提取文件名
      const filename = character.imageUrl.split('/').pop()
      if (filename) {
        const filepath = join(process.cwd(), 'public', 'assets', 'characters', filename)
        if (existsSync(filepath)) {
          await unlink(filepath)
          console.log(`已删除角色图片文件: ${filepath}`)
        }
      }
    } catch (fileError) {
      // 文件删除失败不影响数据库删除结果
      console.warn('删除角色图片文件失败:', fileError)
    }

    return NextResponse.json({
      success: true,
      message: `角色「${character.displayName}」已删除`
    })
  } catch (error) {
    console.error('删除角色失败:', error)
    return NextResponse.json(
      { success: false, error: '删除角色失败' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/admin/characters/[id]
 * 更新角色信息并记录日志
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await requirePermission('characters.edit')

    const { id } = params
    const body = await request.json()
    const { displayName, price, isDefault } = body

    // 获取原始角色信息
    const originalCharacter = await prisma.characters.findUnique({
      where: { id }
    })

    if (!originalCharacter) {
      return NextResponse.json(
        { success: false, error: '角色不存在' },
        { status: 404 }
      )
    }

    // 记录变更内容
    const changes: any = {}

    if (displayName !== undefined && displayName !== originalCharacter.displayName) {
      changes.displayName = {
        from: originalCharacter.displayName,
        to: displayName
      }
    }

    if (price !== undefined && price !== originalCharacter.price) {
      changes.price = {
        from: originalCharacter.price,
        to: price
      }
    }

    if (isDefault !== undefined && isDefault !== originalCharacter.isDefault) {
      changes.isDefault = {
        from: originalCharacter.isDefault,
        to: isDefault
      }
    }

    // 如果没有变更，直接返回
    if (Object.keys(changes).length === 0) {
      return NextResponse.json({
        success: true,
        message: '没有需要更新的内容',
        data: originalCharacter
      })
    }

    // 使用事务更新角色信息并记录日志
    const result = await prisma.$transaction(async (tx) => {
      // 更新角色信息
      const updatedCharacter = await tx.characters.update({
        where: { id },
        data: {
          ...(displayName !== undefined && { displayName }),
          ...(price !== undefined && { price }),
          ...(isDefault !== undefined && { isDefault })
        }
      })

      // 创建日志记录
      const log = await tx.character_logs.create({
        data: {
          id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          characterId: id,
          adminId: admin.id,
          action: 'UPDATE',
          changes,
          ipAddress: request.headers.get('x-forwarded-for') ||
                     request.headers.get('x-real-ip') ||
                     'unknown',
          userAgent: request.headers.get('user-agent') || undefined
        }
      })

      return { character: updatedCharacter, log }
    })

    return NextResponse.json({
      success: true,
      message: '角色信息已更新',
      data: result.character,
      changes
    })
  } catch (error) {
    console.error('更新角色失败:', error)
    return NextResponse.json(
      { success: false, error: '更新角色失败' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/admin/characters/[id]
 * 获取角色详情
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requirePermission('characters.view')

    const { id } = params

    const character = await prisma.characters.findUnique({
      where: { id }
    })

    if (!character) {
      return NextResponse.json(
        { success: false, error: '角色不存在' },
        { status: 404 }
      )
    }

    // 统计使用人数
    const userCount = await prisma.players.count({
      where: { characterSprite: character.name }
    })

    return NextResponse.json({
      success: true,
      data: {
        ...character,
        userCount,
        purchaseCount: character.salesCount
      }
    })
  } catch (error) {
    console.error('获取角色详情失败:', error)
    return NextResponse.json(
      { success: false, error: '获取角色详情失败' },
      { status: 500 }
    )
  }
}

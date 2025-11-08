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
    const character = await prisma.character.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            purchases: true
          }
        }
      }
    })

    if (!character) {
      return NextResponse.json(
        { success: false, error: '角色不存在' },
        { status: 404 }
      )
    }

    // 检查是否有用户正在使用此角色
    const usersUsingCharacter = await prisma.player.count({
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

    // 检查是否有购买记录
    if (character._count.purchases > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `无法删除：此角色已被购买 ${character._count.purchases} 次`,
          purchaseCount: character._count.purchases
        },
        { status: 400 }
      )
    }

    // 删除数据库记录
    await prisma.character.delete({
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

    const character = await prisma.character.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            purchases: true
          }
        }
      }
    })

    if (!character) {
      return NextResponse.json(
        { success: false, error: '角色不存在' },
        { status: 404 }
      )
    }

    // 统计使用人数
    const userCount = await prisma.player.count({
      where: { characterSprite: character.name }
    })

    return NextResponse.json({
      success: true,
      data: {
        ...character,
        userCount,
        purchaseCount: character._count.purchases
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

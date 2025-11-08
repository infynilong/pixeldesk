import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/admin/permissions'
import { prisma } from '@/lib/db'
import { unlink } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export const runtime = 'nodejs'

/**
 * POST /api/admin/characters/batch-delete
 * 批量删除角色
 */
export async function POST(request: NextRequest) {
  try {
    await requirePermission('characters.delete')

    const body = await request.json()
    const { ids } = body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: '缺少角色ID列表' },
        { status: 400 }
      )
    }

    // 查询所有要删除的角色
    const characters = await prisma.character.findMany({
      where: {
        id: { in: ids }
      },
      include: {
        _count: {
          select: {
            purchases: true
          }
        }
      }
    })

    const deleted: string[] = []
    const skipped: Array<{ id: string; name: string; reason: string }> = []
    const errors: Array<{ id: string; error: string }> = []

    // 逐个处理删除
    for (const character of characters) {
      try {
        // 检查是否有用户正在使用
        const usersUsingCharacter = await prisma.player.count({
          where: { characterSprite: character.name }
        })

        if (usersUsingCharacter > 0) {
          skipped.push({
            id: character.id,
            name: character.displayName,
            reason: `${usersUsingCharacter} 位玩家正在使用`
          })
          continue
        }

        // 检查是否有购买记录
        if (character._count.purchases > 0) {
          skipped.push({
            id: character.id,
            name: character.displayName,
            reason: `已被购买 ${character._count.purchases} 次`
          })
          continue
        }

        // 删除数据库记录
        await prisma.character.delete({
          where: { id: character.id }
        })

        // 尝试删除图片文件
        try {
          const filename = character.imageUrl.split('/').pop()
          if (filename) {
            const filepath = join(process.cwd(), 'public', 'assets', 'characters', filename)
            if (existsSync(filepath)) {
              await unlink(filepath)
            }
          }
        } catch (fileError) {
          console.warn(`删除角色图片失败 ${character.name}:`, fileError)
        }

        deleted.push(character.displayName)
      } catch (error) {
        console.error(`删除角色 ${character.id} 失败:`, error)
        errors.push({
          id: character.id,
          error: error instanceof Error ? error.message : '未知错误'
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `批量删除完成！成功: ${deleted.length}, 跳过: ${skipped.length}, 失败: ${errors.length}`,
      data: {
        deleted,
        skipped,
        errors,
        summary: {
          total: ids.length,
          deleted: deleted.length,
          skipped: skipped.length,
          failed: errors.length
        }
      }
    })
  } catch (error) {
    console.error('批量删除失败:', error)
    return NextResponse.json(
      { success: false, error: '批量删除失败' },
      { status: 500 }
    )
  }
}

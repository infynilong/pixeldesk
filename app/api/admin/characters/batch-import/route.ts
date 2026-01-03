import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requirePermission } from '@/lib/admin/permissions'
import { readdirSync, statSync } from 'fs'
import { join } from 'path'

export const runtime = 'nodejs'

/**
 * POST /api/admin/characters/batch-import
 * 批量导入角色 - 扫描 /public/assets/characters 目录
 */
export async function POST(request: NextRequest) {
  try {
    await requirePermission('characters.create')

    const charactersDir = join(process.cwd(), 'public', 'assets', 'characters')

    // 检查目录是否存在
    try {
      statSync(charactersDir)
    } catch (error) {
      return NextResponse.json(
        { success: false, error: '角色目录不存在' },
        { status: 404 }
      )
    }

    // 读取目录中的所有文件
    const files = readdirSync(charactersDir)

    // 过滤出图片文件
    const imageFiles = files.filter(file =>
      /\.(png|jpg|jpeg|webp|gif)$/i.test(file)
    )

    if (imageFiles.length === 0) {
      return NextResponse.json(
        { success: false, error: '目录中没有找到图片文件' },
        { status: 400 }
      )
    }

    // 获取已存在的角色名称
    const existingCharacters = await prisma.characters.findMany({
      select: { name: true }
    })
    const existingNames = new Set(existingCharacters.map(c => c.name))

    const imported: string[] = []
    const skipped: string[] = []
    const errors: { file: string; error: string }[] = []

    // 批量创建角色
    for (const file of imageFiles) {
      try {
        // 从文件名提取角色名称（去除扩展名）
        const name = file.replace(/\.(png|jpg|jpeg|webp|gif)$/i, '')

        // 如果已存在，跳过
        if (existingNames.has(name)) {
          skipped.push(file)
          continue
        }

        // 生成显示名称（将下划线替换为空格，首字母大写）
        const displayName = name
          .split(/[_-]/)
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')

        // 判断是否为紧凑格式（文件名包含特定标识）
        const isCompactFormat = name.toLowerCase().includes('compact') ||
                               name.toLowerCase().includes('2row')

        // 默认价格（免费角色命名规则：以default、free或premade开头）
        const isFree = /^(default|free|premade)/i.test(name)
        const price = isFree ? 0 : 100 // 默认100积分

        // 创建角色记录
        await prisma.characters.create({
          data: {
            id: `char_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name,
            displayName,
            description: `自动导入的角色形象 - ${displayName}`,
            imageUrl: `/assets/characters/${file}`,
            price,
            isDefault: isFree,
            isActive: true,
            isCompactFormat,
            frameWidth: 48,
            frameHeight: 48,
            totalFrames: isCompactFormat ? 8 : 64,
            sortOrder: 0,
            updatedAt: new Date()
          }
        })

        imported.push(file)
      } catch (error) {
        console.error(`导入 ${file} 失败:`, error)
        errors.push({
          file,
          error: error instanceof Error ? error.message : '未知错误'
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `批量导入完成！成功: ${imported.length}, 跳过: ${skipped.length}, 失败: ${errors.length}`,
      data: {
        imported,
        skipped,
        errors,
        summary: {
          total: imageFiles.length,
          imported: imported.length,
          skipped: skipped.length,
          failed: errors.length
        }
      }
    })
  } catch (error) {
    console.error('批量导入失败:', error)
    return NextResponse.json(
      { success: false, error: '批量导入失败' },
      { status: 500 }
    )
  }
}

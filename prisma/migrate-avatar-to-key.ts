/**
 * 数据迁移脚本：将User.avatar从URL格式转换为key格式
 *
 * 使用方法：
 * npx tsx prisma/migrate-avatar-to-key.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * 从URL提取角色key
 */
function extractCharacterKeyFromUrl(imageUrl: string | null): string | null {
  if (!imageUrl) return null

  // 如果已经是key格式（没有路径，没有扩展名或只有.png），直接返回
  if (!imageUrl.includes('/') && !imageUrl.includes('.')) {
    return imageUrl
  }

  // 匹配 /assets/characters/xxx.png 格式
  const match = imageUrl.match(/\/characters\/([^/]+)\.(png|jpg|jpeg|webp|gif)$/i)
  if (match) {
    return match[1]
  }

  // 匹配纯文件名 xxx.png
  const filenameMatch = imageUrl.match(/^([^/]+)\.(png|jpg|jpeg|webp|gif)$/i)
  if (filenameMatch) {
    return filenameMatch[1]
  }

  // 如果是完整路径但不是characters目录，可能是外部URL，保持原样
  if (imageUrl.startsWith('http')) {
    console.warn(`External URL found, keeping as-is: ${imageUrl}`)
    return imageUrl
  }

  // 无法识别的格式，返回null
  console.warn(`Unknown avatar format: ${imageUrl}`)
  return null
}

async function migrateAvatars() {
  console.log('🔄 开始迁移User.avatar字段...\n')

  try {
    // 1. 获取所有有avatar的用户
    const usersWithAvatar = await prisma.user.findMany({
      where: {
        avatar: {
          not: null
        }
      },
      select: {
        id: true,
        name: true,
        avatar: true
      }
    })

    console.log(`📊 找到 ${usersWithAvatar.length} 个用户有avatar字段\n`)

    if (usersWithAvatar.length === 0) {
      console.log('✅ 没有需要迁移的数据')
      return
    }

    // 2. 分析和转换
    const migrations: Array<{ userId: string; oldValue: string; newValue: string | null }> = []
    const skipped: Array<{ userId: string; userName: string; avatar: string; reason: string }> = []

    for (const user of usersWithAvatar) {
      const oldAvatar = user.avatar!
      const newKey = extractCharacterKeyFromUrl(oldAvatar)

      if (newKey) {
        // 验证这个key在Character表中是否存在
        const characterExists = await prisma.character.findFirst({
          where: { name: newKey }
        })

        if (characterExists) {
          migrations.push({
            userId: user.id,
            oldValue: oldAvatar,
            newValue: newKey
          })
        } else {
          skipped.push({
            userId: user.id,
            userName: user.name,
            avatar: oldAvatar,
            reason: `Character key '${newKey}' not found in database`
          })
        }
      } else {
        skipped.push({
          userId: user.id,
          userName: user.name,
          avatar: oldAvatar,
          reason: 'Could not extract key from avatar URL'
        })
      }
    }

    // 3. 显示迁移计划
    console.log('📋 迁移计划：')
    console.log(`  ✅ 将要迁移: ${migrations.length} 个`)
    console.log(`  ⚠️  将要跳过: ${skipped.length} 个\n`)

    if (migrations.length > 0) {
      console.log('✅ 将要迁移的用户：')
      migrations.slice(0, 10).forEach((m, i) => {
        console.log(`  ${i + 1}. ${m.oldValue} → ${m.newValue}`)
      })
      if (migrations.length > 10) {
        console.log(`  ... 还有 ${migrations.length - 10} 个\n`)
      } else {
        console.log('')
      }
    }

    if (skipped.length > 0) {
      console.log('⚠️  将要跳过的用户：')
      skipped.forEach((s, i) => {
        console.log(`  ${i + 1}. [${s.userName}] ${s.avatar}`)
        console.log(`     原因: ${s.reason}`)
      })
      console.log('')
    }

    // 4. 执行迁移
    if (migrations.length > 0) {
      console.log('🚀 开始执行迁移...\n')

      let successCount = 0
      let errorCount = 0

      for (const migration of migrations) {
        try {
          await prisma.user.update({
            where: { id: migration.userId },
            data: { avatar: migration.newValue }
          })
          successCount++
        } catch (error) {
          console.error(`❌ 迁移失败 (${migration.userId}):`, error)
          errorCount++
        }
      }

      console.log('\n📊 迁移结果：')
      console.log(`  ✅ 成功: ${successCount} 个`)
      console.log(`  ❌ 失败: ${errorCount} 个`)
      console.log(`  ⚠️  跳过: ${skipped.length} 个`)
    }

    // 5. 保存跳过的记录到文件
    if (skipped.length > 0) {
      const fs = require('fs')
      const path = require('path')
      const logFile = path.join(__dirname, 'avatar-migration-skipped.json')

      fs.writeFileSync(logFile, JSON.stringify(skipped, null, 2))
      console.log(`\n📝 跳过的记录已保存到: ${logFile}`)
    }

    console.log('\n✅ 迁移完成!')

  } catch (error) {
    console.error('❌ 迁移过程出错:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// 执行迁移
migrateAvatars()
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })

/**
 * 修复所有角色为紧凑格式
 * 所有角色图片都是 192×96 像素（2行4列，8帧）
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔧 开始修复角色格式配置...')

  // 更新所有角色为紧凑格式
  const result = await prisma.characters.updateMany({
    where: {
      // 更新所有角色
    },
    data: {
      isCompactFormat: true,
      totalFrames: 8,
      frameWidth: 48,
      frameHeight: 48,
      updatedAt: new Date(),
    },
  })

  console.log(`✅ 已更新 ${result.count} 个角色配置`)

  // 验证更新结果
  const characters = await prisma.characters.findMany({
    select: {
      name: true,
      isCompactFormat: true,
      totalFrames: true,
      frameWidth: true,
      frameHeight: true,
    },
  })

  console.log('\n📋 当前角色配置：')
  characters.forEach(char => {
    console.log(`  - ${char.name}: ${char.frameWidth}×${char.frameHeight}, ${char.totalFrames}帧, 紧凑格式: ${char.isCompactFormat}`)
  })
}

main()
  .catch((e) => {
    console.error('❌ 更新失败:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

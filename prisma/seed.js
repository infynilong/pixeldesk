const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('开始初始化数据库...')

  // 清理现有数据（可选）
  await prisma.userWorkstation.deleteMany()
  await prisma.workstation.deleteMany()
  await prisma.user.deleteMany()

  // 创建示例工位数据 - 使用与 Tiled 地图匹配的 ID
  const workstations = [
    { id: 218, name: 'desk_long_right', xPosition: 720, yPosition: 581 },
    { id: 219, name: 'desk_long_left', xPosition: 800, yPosition: 581 },
    { id: 220, name: 'single_desk', xPosition: 900, yPosition: 581 },
    { id: 221, name: 'library_bookcase_normal', xPosition: 1000, yPosition: 581 },
    { id: 222, name: 'library_bookcase_tall', xPosition: 1100, yPosition: 581 },
    { id: 223, name: 'sofa-left-1', xPosition: 1200, yPosition: 581 },
    { id: 224, name: 'sofa-right-1', xPosition: 1300, yPosition: 581 },
    { id: 225, name: 'desk-big-manager-left-1', xPosition: 1400, yPosition: 581 },
    { id: 226, name: 'desk-big-manager-center-1', xPosition: 1500, yPosition: 581 },
    { id: 227, name: 'desk-big-manager-right-1', xPosition: 1600, yPosition: 581 },
    { id: 228, name: 'desk-big-manager-center-2', xPosition: 1700, yPosition: 581 },
    { id: 229, name: 'flower', xPosition: 5280, yPosition: 3120 },
    { id: 230, name: 'flower', xPosition: 5280, yPosition: 3072 },
    { id: 231, name: 'flower', xPosition: 5280, yPosition: 3024 },
    { id: 232, name: 'flower', xPosition: 5280, yPosition: 2976 },
  ]

  for (const ws of workstations) {
    await prisma.workstation.create({
      data: ws
    })
  }

  console.log('已创建', workstations.length, '个工位')
  console.log('数据库初始化完成！')
}

main()
  .catch((e) => {
    console.error('数据库初始化失败:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
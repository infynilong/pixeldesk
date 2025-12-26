import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding admin users...')

  // 创建超级管理员
  const superAdminPassword = await bcrypt.hash('admin123', 10)
  const superAdmin = await prisma.admin.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@pixeldesk.com',
      password: superAdminPassword,
      role: 'SUPER_ADMIN',
    },
  })
  console.log('✅ Super admin created:', superAdmin.username)

  // 创建默认工位配置
  const workstationConfig = await prisma.workstationConfig.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      totalWorkstations: 1000,
      bindingCost: 10,
      renewalCost: 5,
      unbindingRefund: 5,
      teleportCost: 2,
      defaultDuration: 24,
      maxBindingsPerUser: 1,
    },
  })
  console.log('✅ Workstation config created')

  // 导入现有角色形象数据
  const existingCharacters = [
    {
      name: 'hangli',
      displayName: '寒黎',
      description: '自定义角色形象',
      imageUrl: '/assets/characters/hangli.png',
      frameWidth: 48,
      frameHeight: 48,
      totalFrames: 8,
      isCompactFormat: true,
      price: 0,
      isDefault: true,
      sortOrder: 0,
    },
  ]

  // 添加 Premade 角色
  for (let i = 1; i <= 20; i++) {
    const num = String(i).padStart(2, '0')
    existingCharacters.push({
      name: `Premade_Character_48x48_${num}`,
      displayName: `角色 ${num}`,
      description: `预设角色形象 ${num}`,
      imageUrl: `/assets/characters/Premade_Character_48x48_${num}.png`,
      frameWidth: 48,
      frameHeight: 48,
      totalFrames: 8, // 紧凑格式（2行4列）
      isCompactFormat: true, // 所有角色都使用紧凑格式
      price: 0,
      isDefault: i === 1, // 第一个作为默认之一
      sortOrder: i,
    })
  }

  console.log(`🎨 Importing ${existingCharacters.length} characters...`)
  for (const char of existingCharacters) {
    await prisma.character.upsert({
      where: { name: char.name },
      update: {},
      create: char,
    })
  }
  console.log(`✅ ${existingCharacters.length} characters imported`)

  console.log('🎉 Seeding completed!')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

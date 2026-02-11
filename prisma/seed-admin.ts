import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding admin users...')

  // 1. 获取配置
  const adminUsername = process.env.ADMIN_USERNAME || 'admin'
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@yourdomain.com'
  let adminPasswordRaw = process.env.ADMIN_PASSWORD

  // 如果没有提供密码，且是生产环境，则报错
  if (!adminPasswordRaw && process.env.NODE_ENV === 'production') {
    throw new Error('❌ 在生产环境中必须通过环境变量 ADMIN_PASSWORD 设置管理员密码')
  }

  // 如果没有提供密码且是非生产环境，使用默认密码但发出警告
  if (!adminPasswordRaw) {
    console.warn('⚠️ 未检测到 ADMIN_PASSWORD 环境变量，使用默认密码: "admin123"')
    console.warn('⚠️ 请尽快在 .env 文件中配置强密码！')
    adminPasswordRaw = 'admin123'
  }

  // 创建超级管理员
  const hashedPassword = await bcrypt.hash(adminPasswordRaw, 10)

  const superAdmin = await prisma.admins.upsert({
    where: { username: adminUsername },
    update: {
      password: hashedPassword, // 允许通过重新运行 seed 更新密码
      email: adminEmail,
      updatedAt: new Date()
    },
    create: {
      id: randomUUID(),
      username: adminUsername,
      email: adminEmail,
      password: hashedPassword,
      role: 'SUPER_ADMIN',
      updatedAt: new Date()
    },
  })

  console.log('✅ Super admin ensured:', superAdmin.username)
  if (!process.env.ADMIN_PASSWORD) {
    console.log('🔑 Login Password:', adminPasswordRaw)
  } else {
    console.log('🔑 Login Password: [HIDDEN] (Set via env)')
  }

  // 创建默认工位配置
  const workstationConfig = await prisma.workstation_config.upsert({
    where: { id: 'default' },
    update: { updatedAt: new Date() },
    create: {
      id: 'default',
      totalWorkstations: 1000,
      bindingCost: 10,
      renewalCost: 5,
      unbindingRefund: 5,
      teleportCost: 2,
      defaultDuration: 24,
      maxBindingsPerUser: 1,
      updatedAt: new Date()
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
    await prisma.characters.upsert({
      where: { name: char.name },
      update: { updatedAt: new Date() },
      create: {
        ...char,
        id: randomUUID(),
        updatedAt: new Date()
      },
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

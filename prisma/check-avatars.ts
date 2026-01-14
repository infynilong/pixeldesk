import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkAvatars() {
  console.log('📊 检查User表avatar字段状态\n')

  // 统计所有用户
  const totalUsers = await prisma.users.count()
  console.log(`总用户数: ${totalUsers}`)

  // 有avatar的用户
  const usersWithAvatar = await prisma.users.count({
    where: { avatar: { not: null } }
  })
  console.log(`有avatar的用户: ${usersWithAvatar}`)

  // 无avatar的用户
  const usersWithoutAvatar = totalUsers - usersWithAvatar
  console.log(`无avatar的用户: ${usersWithoutAvatar}\n`)

  // 查看示例数据
  console.log('📋 Avatar示例：')
  const samples = await prisma.users.findMany({
    where: { avatar: { not: null } },
    select: { id: true, name: true, avatar: true },
    take: 10
  })

  let index = 1
  for (const user of samples) {
    console.log(`  ${index}. [${user.name}] ${user.avatar}`)
    index++
  }

  // 检查Player表
  console.log('\n📋 Player表characterSprite示例：')
  const players = await prisma.players.findMany({
    select: { id: true, playerName: true, characterSprite: true },
    take: 10
  })

  let pindex = 1
  for (const player of players) {
    console.log(`  ${pindex}. [${player.playerName}] ${player.characterSprite}`)
    pindex++
  }

  await prisma.$disconnect()
}

checkAvatars().catch(console.error)

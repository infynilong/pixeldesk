// 数据合并脚本：将所有积分数据统一到User.points
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function mergePointsData() {
  console.log('🔍 开始数据合并...\n')

  try {
    // 步骤1：查看当前数据状态
    console.log('📊 步骤1：查看当前数据状态')
    const users = await prisma.user.findMany({
      select: { id: true, name: true, points: true, gold: true },
      take: 5
    })
    console.log('前5个用户的当前积分状态:')
    users.forEach(u => {
      console.log(`  - ${u.name}: points=${u.points}, gold=${u.gold}`)
    })

    const players = await prisma.player.findMany({
      select: { userId: true, playerName: true, gamePoints: true, gameGold: true },
      take: 5
    })
    console.log('\n前5个玩家的当前积分状态:')
    players.forEach(p => {
      console.log(`  - ${p.playerName}: gamePoints=${p.gamePoints}, gameGold=${p.gameGold}`)
    })

    // 步骤2：合并gold到points（使用较大值）
    console.log('\n📊 步骤2：合并User.gold到User.points（使用较大值）')
    const result1 = await prisma.$executeRaw`
      UPDATE users
      SET points = GREATEST(points, gold)
      WHERE points != gold
    `
    console.log(`✅ 更新了 ${result1} 个用户的积分\n`)

    // 步骤3：合并Player.gameGold到User.points（只合并非默认值）
    console.log('📊 步骤3：合并Player.gameGold到User.points')
    const playersToMerge = await prisma.player.findMany({
      where: {
        OR: [
          { gameGold: { not: 50 } },
          { gamePoints: { not: 50 } }
        ]
      },
      select: {
        userId: true,
        playerName: true,
        gameGold: true,
        gamePoints: true
      }
    })

    console.log(`发现 ${playersToMerge.length} 个玩家有非默认的game积分`)

    for (const player of playersToMerge) {
      const user = await prisma.user.findUnique({
        where: { id: player.userId },
        select: { points: true, name: true }
      })

      // 计算要合并的积分（使用gameGold，因为这是实际在用的）
      const goldToMerge = player.gameGold - 50 // 减去默认值50

      if (goldToMerge !== 0) {
        await prisma.user.update({
          where: { id: player.userId },
          data: { points: { increment: goldToMerge } }
        })
        console.log(`  ✅ ${user.name}: 合并了 ${goldToMerge} 金币，新积分: ${user.points + goldToMerge}`)
      }
    }

    // 步骤4：验证最终状态
    console.log('\n📊 步骤4：验证最终状态')
    const finalUsers = await prisma.user.findMany({
      select: { id: true, name: true, points: true, gold: true },
      take: 5
    })
    console.log('前5个用户的最终积分状态:')
    finalUsers.forEach(u => {
      console.log(`  - ${u.name}: points=${u.points}, gold=${u.gold}`)
    })

    console.log('\n✅ 数据合并完成！现在可以安全删除冗余字段了。')
    console.log('执行: npx prisma db push --accept-data-loss\n')

  } catch (error) {
    console.error('❌ 数据合并失败:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

mergePointsData()

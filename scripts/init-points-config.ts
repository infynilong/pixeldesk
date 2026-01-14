/**
 * 初始化积分配置数据
 * 运行方法: npx ts-node scripts/init-points-config.ts
 */
import { PrismaClient } from '@prisma/client'
import { randomUUID } from 'crypto'

const prisma = new PrismaClient()

async function main() {
  console.log('🎯 开始初始化积分配置...')

  // 积分配置列表
  const configs = [
    {
      key: 'reply_post_reward',
      value: 1,
      description: '回复帖子/博客的积分奖励',
      category: 'REWARD' as const
    },
    {
      key: 'create_blog_reward',
      value: 5,
      description: '发布博客的积分奖励',
      category: 'REWARD' as const
    },
    {
      key: 'create_post_reward',
      value: 2,
      description: '发布普通帖子的积分奖励',
      category: 'REWARD' as const
    },
    {
      key: 'bind_workstation_cost',
      value: 10,
      description: '绑定工位需要的积分',
      category: 'COST' as const
    },
    {
      key: 'teleport_workstation_cost',
      value: 3,
      description: '传送到工位需要的积分',
      category: 'COST' as const
    }
  ]

  let createdCount = 0
  let updatedCount = 0

  for (const config of configs) {
    try {
      const existing = await prisma.points_config.findUnique({
        where: { key: config.key }
      })

      if (existing) {
        // 如果已存在，更新配置
        await prisma.points_config.update({
          where: { key: config.key },
          data: {
            value: config.value,
            description: config.description,
            category: config.category,
            updatedAt: new Date()
          }
        })
        console.log(`✅ 更新配置: ${config.key} = ${config.value}`)
        updatedCount++
      } else {
        // 如果不存在，创建新配置
        await prisma.points_config.create({
          data: {
            ...config,
            id: randomUUID(),
            updatedAt: new Date()
          }
        })
        console.log(`✨ 创建配置: ${config.key} = ${config.value}`)
        createdCount++
      }
    } catch (error) {
      console.error(`❌ 配置失败: ${config.key}`, error)
    }
  }

  console.log('\n📊 初始化完成！')
  console.log(`   新增: ${createdCount} 个配置`)
  console.log(`   更新: ${updatedCount} 个配置`)
}

main()
  .catch((e) => {
    console.error('❌ 初始化失败:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

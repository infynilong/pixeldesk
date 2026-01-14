import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sendInactivityWarningEmail, sendReclamationEmail } from '@/lib/email'
import { randomUUID } from 'crypto'

/**
 * 定时任务接口：处理工位自动回收与预警
 * 逻辑：
 * 1. 扫描所有活跃绑定。
 * 2. 检查最后登录时间 (lastLogin)。
 * 3. 超过 5 天未登录 -> 发送预警邮件。
 * 4. 超过 7 天未登录 -> 回收工位，按比例退费。
 */
export async function POST() {
  try {
    const now = new Date()
    const dayInMs = 24 * 60 * 60 * 1000
    const fiveDayThreshold = new Date(now.getTime() - 5 * dayInMs)
    const sevenDayThreshold = new Date(now.getTime() - 7 * dayInMs)

    // 1. 获取所有工位绑定及其用户信息
    const allBindings = await prisma.user_workstations.findMany({
      include: {
        users: true
      }
    })

    let warnedCount = 0
    let reclaimedCount = 0
    const results = []

    for (const binding of allBindings) {
      const user = binding.users
      const lastLogin = user.lastLogin || user.createdAt // 如果没有登录记录，以创建时间为准

      // A. 处理回收 (7天未登录 或 租期自然到期)
      // 注意：租期expiresAt原本是30天，但登录会续期到7天。
      // 这里我们以 lastLogin 超过 7 天作为“强制回收”的判定，以此来驱动活跃度。
      if (lastLogin < sevenDayThreshold || (binding.expiresAt && binding.expiresAt < now)) {

        // 计算退费：原本是30天租期，如果用户在第8天被回收
        // 剩余天数 = (expiresAt - now) / 1天
        const remainingTime = binding.expiresAt ? binding.expiresAt.getTime() - now.getTime() : 0
        const remainingDays = Math.max(0, Math.floor(remainingTime / dayInMs))

        // 这里的逻辑稍微调整：如果租期还没到但因为不活跃被踢，按比例退。
        // 如果租期已经到了，不退。
        let refundAmount = 0
        if (binding.expiresAt && binding.expiresAt > now) {
          refundAmount = Math.floor((binding.cost || 10) * (remainingDays / 30))
        }

        await prisma.$transaction(async (tx) => {
          // 1. 删除绑定
          await tx.user_workstations.delete({
            where: { id: binding.id }
          })

          // 2. 如果有退费
          if (refundAmount > 0) {
            const updatedUser = await tx.users.update({
              where: { id: user.id },
              data: {
                points: { increment: refundAmount }
              }
            })

            // 3. 记录积分历史
            await tx.points_history.create({
              data: {
                id: randomUUID(),
                userId: user.id,
                amount: refundAmount,
                reason: '工位不活跃自动解约退费',
                type: 'REFUND',
                balance: updatedUser.points
              }
            })
          }
        })

        // 发送回收邮件
        if (user.email) {
          await sendReclamationEmail(user.email, user.name, refundAmount, 'zh-CN')
        }

        reclaimedCount++
        results.push({ userId: user.id, action: 'reclaim', refund: refundAmount })
        continue // 处理完回收就不再处理警告
      }

      // B. 处理预警 (5天未登录)
      if (lastLogin < fiveDayThreshold) {
        // 检查是否在24小时内已经发过警告，避免邮件轰炸
        const lastWarned = binding.lastInactivityWarningAt
        const canWarn = !lastWarned || (now.getTime() - lastWarned.getTime() > dayInMs)

        if (canWarn && user.email) {
          await sendInactivityWarningEmail(user.email, user.name, 'zh-CN')

          await prisma.user_workstations.update({
            where: { id: binding.id },
            data: {
              lastInactivityWarningAt: now
            }
          })

          warnedCount++
          results.push({ userId: user.id, action: 'warn' })
        }
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        totalChecked: allBindings.length,
        warned: warnedCount,
        reclaimed: reclaimedCount
      },
      details: results
    })

  } catch (error: any) {
    console.error('Error in cleanup job:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * 查看当前即将过期的状态 (用于管理后台展示)
 */
export async function GET() {
  try {
    const now = new Date()
    const dayInMs = 24 * 60 * 60 * 1000
    const fiveDayThreshold = new Date(now.getTime() - 5 * dayInMs)
    const sevenDayThreshold = new Date(now.getTime() - 7 * dayInMs)

    const riskyBindings = await prisma.user_workstations.findMany({
      where: {
        users: {
          lastLogin: {
            lt: fiveDayThreshold
          }
        }
      },
      include: {
        users: true
      }
    })

    return NextResponse.json({
      success: true,
      count: riskyBindings.length,
      thresholds: {
        warning: fiveDayThreshold,
        reclaim: sevenDayThreshold
      },
      data: riskyBindings.map(b => ({
        id: b.id,
        userId: b.userId,
        userName: b.users.name,
        lastLogin: b.users.lastLogin,
        expiresAt: b.expiresAt,
        isWarned: !!b.lastInactivityWarningAt
      }))
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
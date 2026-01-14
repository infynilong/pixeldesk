import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    // 从后台配置获取总工位数
    const config = await prisma.workstation_config.findFirst()
    const totalWorkstations = config?.totalWorkstations || 1000 // 默认1000个工位

    // 获取已绑定工位数
    const boundWorkstations = await prisma.user_workstations.count({
      where: {
        // 只计算有效的绑定（可以根据需要添加更多条件）
        // 比如绑定时间在某个范围内，或者其他业务逻辑
      }
    })

    // 获取所有工位绑定信息（用于详细统计）
    const allBindings = await prisma.user_workstations.findMany({
      include: {
        users: {
          select: {
            id: true,
            name: true,
            points: true
          }
        }
      }
    })
    
    // 计算一些统计信息
    const uniqueUsers = new Set(allBindings.map(binding => binding.userId)).size
    const totalCost = allBindings.reduce((sum, binding) => sum + binding.cost, 0)

    // 计算占用率
    const occupancyRate = totalWorkstations > 0
      ? `${((boundWorkstations / totalWorkstations) * 100).toFixed(1)}%`
      : '0%'

    return NextResponse.json({
      success: true,
      data: {
        totalWorkstations,
        boundWorkstations,
        availableWorkstations: totalWorkstations - boundWorkstations,
        occupancyRate,
        uniqueUsers,
        totalCost,
        bindings: allBindings
      }
    })
  } catch (error) {
    console.error('Error fetching workstation stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
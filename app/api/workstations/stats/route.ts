import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    // 首先尝试从Phaser游戏获取工位总数
    let totalWorkstations = 0
    
    // 如果在浏览器环境中，尝试从全局Phaser游戏实例获取工位总数
    if (typeof window !== 'undefined') {
      try {
        // 通过全局函数获取Phaser游戏的工位总数
        if (window.getGameWorkstationCount) {
          totalWorkstations = window.getGameWorkstationCount()
        }
      } catch (error) {
        console.warn('Failed to get workstation count from game:', error)
      }
    }
    
    // 如果无法从游戏获取，则从数据库获取作为备用
    if (totalWorkstations === 0) {
      totalWorkstations = await prisma.workstation.count()
      console.log('Using database workstation count as fallback:', totalWorkstations)
    } else {
      console.log('Using game workstation count:', totalWorkstations)
    }
    
    // 获取已绑定工位数
    const boundWorkstations = await prisma.userWorkstation.count({
      where: {
        // 只计算有效的绑定（可以根据需要添加更多条件）
        // 比如绑定时间在某个范围内，或者其他业务逻辑
      }
    })
    
    // 获取所有工位绑定信息（用于详细统计）
    const allBindings = await prisma.userWorkstation.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            points: true,
            gold: true
          }
        }
      }
    })
    
    // 计算一些统计信息
    const uniqueUsers = new Set(allBindings.map(binding => binding.userId)).size
    const totalCost = allBindings.reduce((sum, binding) => sum + binding.cost, 0)
    
    return NextResponse.json({ 
      success: true, 
      data: {
        totalWorkstations,
        boundWorkstations,
        availableWorkstations: totalWorkstations - boundWorkstations,
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
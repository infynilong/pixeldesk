import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { workstationIds, viewport } = body
    
    // 输入验证
    if (!Array.isArray(workstationIds)) {
      return NextResponse.json({ 
        success: false, 
        error: '无效的工位ID列表' 
      }, { status: 400 })
    }

    // 限制查询数量，防止恶意请求
    const maxIds = 1000
    const limitedIds = workstationIds.slice(0, maxIds)
    
    if (limitedIds.length === 0) {
      return NextResponse.json({ 
        success: true, 
        data: [],
        stats: {
          requested: 0,
          found: 0,
          fromCache: 0
        }
      })
    }

    console.log(`[API] 可视范围查询: 请求 ${limitedIds.length} 个工位 ${viewport ? `(视口: ${viewport.width}x${viewport.height})` : ''}`)

    // 执行批量查询
    const startTime = Date.now()
    const visibleBindings = await prisma.userWorkstation.findMany({
      where: {
        workstationId: {
          in: limitedIds
        }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
            points: true
          }
        }
      },
      orderBy: {
        boundAt: 'desc'
      }
    })
    
    const queryTime = Date.now() - startTime

    // 统计信息
    const stats = {
      requested: limitedIds.length,
      found: visibleBindings.length,
      queryTime: queryTime,
      efficiency: ((visibleBindings.length / limitedIds.length) * 100).toFixed(1) + '%'
    }

    console.log(`[API] 查询完成: ${stats.found}/${stats.requested} 个工位有绑定，用时 ${queryTime}ms`)

    return NextResponse.json({ 
      success: true, 
      data: visibleBindings,
      stats: stats,
      timestamp: Date.now()
    })

  } catch (error) {
    console.error('[API] 获取可视工位绑定失败:', error)
    return NextResponse.json({ 
      success: false, 
      error: '服务器内部错误',
      timestamp: Date.now()
    }, { status: 500 })
  }
}

// 健康检查端点
export async function GET() {
  return NextResponse.json({ 
    status: 'healthy',
    service: 'visible-workstation-bindings',
    timestamp: Date.now()
  })
}
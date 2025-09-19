import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const cleanup = searchParams.get('cleanup') === 'true'

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    // 获取用户的所有工位绑定
    const userWorkstations = await prisma.userWorkstation.findMany({
      where: { userId },
      orderBy: { boundAt: 'desc' }
    })

    // 如果请求清理多重绑定，只保留最新的一个
    if (cleanup && userWorkstations.length > 1) {
      console.log(`🧹 清理用户 ${userId} 的多重绑定，当前有 ${userWorkstations.length} 个绑定`)

      // 保留最新的绑定
      const latestBinding = userWorkstations[0]
      const oldBindings = userWorkstations.slice(1)

      // 删除旧的绑定
      await prisma.userWorkstation.deleteMany({
        where: {
          userId,
          id: {
            in: oldBindings.map(b => b.id)
          }
        }
      })

      console.log(`✅ 已清理 ${oldBindings.length} 个旧绑定，保留工位 ${latestBinding.workstationId}`)

      return NextResponse.json({
        success: true,
        data: [latestBinding],
        cleaned: oldBindings.length,
        message: `已清理 ${oldBindings.length} 个重复绑定`
      })
    }

    return NextResponse.json({ success: true, data: userWorkstations })
  } catch (error) {
    console.error('Error fetching user workstation bindings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
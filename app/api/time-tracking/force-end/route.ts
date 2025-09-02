import { NextRequest, NextResponse } from 'next/server'
import { TimeTrackingManager } from '../../../../lib/timeTracking'
import { prisma } from '../../../../lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json(
        { error: '用户ID是必需的' },
        { status: 400 }
      )
    }

    const timeTrackingManager = new TimeTrackingManager(prisma)
    const endedCount = await timeTrackingManager.forceEndAllActivities(userId)

    return NextResponse.json({
      success: true,
      data: {
        endedCount,
        message: `成功结束了 ${endedCount} 个未完成的活动`
      }
    })

  } catch (error) {
    console.error('强制结束活动API错误:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}
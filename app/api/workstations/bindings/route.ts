import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    // 获取用户的工位绑定
    const userWorkstations = await prisma.userWorkstation.findMany({
      where: { userId }
    })

    return NextResponse.json({ success: true, data: userWorkstations })
  } catch (error) {
    console.error('Error fetching user workstations:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, workstationId, cost } = await request.json()
    
    if (!userId || !workstationId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // 确保 workstationId 是数字类型
    const workstationIdNum = parseInt(workstationId, 10)
    if (isNaN(workstationIdNum)) {
      return NextResponse.json({ error: 'Invalid workstation ID' }, { status: 400 })
    }

    // 检查用户积分
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user || (user.points < cost)) {
      return NextResponse.json({ error: 'Insufficient points' }, { status: 400 })
    }

    // 检查工位是否已被绑定
    const existingBinding = await prisma.userWorkstation.findFirst({
      where: { workstationId: workstationIdNum }
    })

    if (existingBinding) {
      return NextResponse.json({ error: 'Workstation already bound' }, { status: 400 })
    }

    // 执行绑定
    const result = await prisma.$transaction(async (tx) => {
      // 扣除用户积分
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          points: { decrement: cost },
          gold: { decrement: cost },
          updatedAt: new Date()
        }
      })

      // 创建工位绑定
      const userWorkstation = await tx.userWorkstation.create({
        data: {
          userId,
          workstationId: workstationIdNum,
          cost,
          boundAt: new Date()
        },
        })

      return { user: updatedUser, binding: userWorkstation }
    })

    // 更新Redis缓存（如果Redis可用）
    try {
      const redis = require('@/lib/redis').redis
      await redis.setJSON(`user:${userId}`, result.user, 3600)
    } catch (redisError) {
      console.warn('Redis缓存更新失败，但绑定操作已成功:', redisError)
    }

    return NextResponse.json({ 
      success: true, 
      data: { 
        binding: result.binding, 
        remainingPoints: result.user.points 
      } 
    })
  } catch (error) {
    console.error('Error binding workstation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const workstationId = searchParams.get('workstationId')
    
    if (!userId || !workstationId) {
      return NextResponse.json({ error: 'User ID and Workstation ID required' }, { status: 400 })
    }

    // 确保 workstationId 是数字类型
    const workstationIdNum = parseInt(workstationId, 10)
    if (isNaN(workstationIdNum)) {
      return NextResponse.json({ error: 'Invalid workstation ID' }, { status: 400 })
    }

    // 解除绑定
    await prisma.userWorkstation.delete({
      where: {
        userId_workstationId: {
          userId,
          workstationId: workstationIdNum
        }
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error unbinding workstation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
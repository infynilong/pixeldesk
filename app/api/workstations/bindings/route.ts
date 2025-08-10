import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    // 获取用户的工位绑定
    const userWorkstations = await prisma.userWorkstation.findMany({
      where: { userId },
      include: {
        workstation: true
      }
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

    // 检查用户积分
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user || (user.points < cost)) {
      return NextResponse.json({ error: 'Insufficient points' }, { status: 400 })
    }

    // 检查工位是否已被绑定
    const existingBinding = await prisma.userWorkstation.findFirst({
      where: { workstationId }
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
          workstationId,
          cost,
          boundAt: new Date()
        },
        include: {
          workstation: true
        }
      })

      return { user: updatedUser, binding: userWorkstation }
    })

    // 更新Redis缓存
    const redis = require('../../../../lib/redis').redis
    await redis.setJSON(`user:${userId}`, result.user, 3600)

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

    // 解除绑定
    await prisma.userWorkstation.delete({
      where: {
        userId_workstationId: {
          userId,
          workstationId
        }
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error unbinding workstation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
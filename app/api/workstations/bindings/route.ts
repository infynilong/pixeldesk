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

    // 检查用户是否已经绑定了其他工位（一个用户只能绑定一个工位）
    const userExistingBinding = await prisma.userWorkstation.findFirst({
      where: { userId }
    })

    if (userExistingBinding) {
      return NextResponse.json({
        error: 'User already has a workstation binding',
        currentWorkstationId: userExistingBinding.workstationId
      }, { status: 400 })
    }

    // 检查工位是否已被其他用户绑定
    const workstationExistingBinding = await prisma.userWorkstation.findFirst({
      where: { workstationId: workstationIdNum }
    })

    if (workstationExistingBinding) {
      return NextResponse.json({ error: 'Workstation already bound by another user' }, { status: 400 })
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

      // 计算30天后的到期时间
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 30)

      // 创建工位绑定
      const userWorkstation = await tx.userWorkstation.create({
        data: {
          userId,
          workstationId: workstationIdNum,
          cost,
          boundAt: new Date(),
          expiresAt
        },
        })

      return { user: updatedUser, binding: userWorkstation }
    })

    // Redis缓存已永久禁用，避免缓存导致的数据不一致问题
    // 不再使用Redis缓存

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
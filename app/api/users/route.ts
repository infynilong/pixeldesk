import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    // 获取用户信息
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        workstations: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: user })
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { id, name, email, avatar, points } = await request.json()
    
    if (!id || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // 准备更新数据（只包含提供的字段）
    const updateData: any = {
      name,
      points: points || 0,
      updatedAt: new Date()
    }

    // 只有当email被明确提供时才更新
    if (email !== undefined) {
      updateData.email = email
    }

    // 只有当avatar被明确提供且是有效路径时才更新（避免角色名称覆盖真实头像）
    if (avatar !== undefined && avatar !== null && avatar !== '') {
      // 检查是否是真实的头像路径（包含/avatars/或以http开头）或者是创建新用户时的角色名称
      if (avatar.startsWith('/avatars/') || avatar.startsWith('http') || !avatar.startsWith('Premade_Character')) {
        updateData.avatar = avatar
      }
      // 如果是角色名称（Premade_Character），则不更新avatar字段，保留用户原有头像
    }

    // 创建或更新用户
    const user = await prisma.user.upsert({
      where: { id },
      update: updateData,
      create: {
        id,
        name,
        email,
        avatar: avatar || null, // 创建时允许设置角色名称作为默认头像
        points: points || 0
      }
    })

    return NextResponse.json({ success: true, data: user })
  } catch (error) {
    console.error('Error creating/updating user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId, points } = await request.json()

    console.log('🔴 [API /api/users PUT] 收到请求:', { userId, points })

    if (!userId) {
      console.error('❌ [API /api/users PUT] 缺少userId')
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    // 先查询当前积分
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { points: true }
    })

    console.log('🔴 [API /api/users PUT] 当前用户积分:', currentUser)

    // 更新用户积分
    console.log('🔴 [API /api/users PUT] 开始更新数据库...')
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        points: { increment: points || 0 },
        updatedAt: new Date()
      }
    })

    console.log('✅ [API /api/users PUT] 数据库更新成功！', {
      userId: user.id,
      旧积分: currentUser?.points,
      增量: points,
      新积分: user.points,
      差值: user.points - (currentUser?.points || 0)
    })

    // Redis已禁用，跳过缓存操作

    return NextResponse.json({ success: true, data: user })
  } catch (error) {
    console.error('❌ [API /api/users PUT] 更新失败:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
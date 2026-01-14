import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyAuthFromRequest } from '@/lib/serverAuth'
import { getCharacterImageUrl } from '@/lib/characterUtils'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    // 获取用户信息
    const user = await prisma.users.findUnique({
      where: { id: userId },
      include: {
        user_workstations: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // 转换avatar key为URL
    const userWithUrl = {
      ...user,
      avatar: getCharacterImageUrl(user.avatar),
      characterKey: user.avatar  // 保留原始key
    }

    return NextResponse.json({ success: true, data: userWithUrl })
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // 强制进行身份验证，防止匿名创建/覆盖用户
    const authResult = await verifyAuthFromRequest(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id, name, email, avatar, points } = await request.json()

    // 只能管理自己的账户信息
    if (id !== authResult.user.id) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    if (!id || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // 准备更新数据（只包含提供的字段）
    const updateData: any = {
      name,
      // points: points || 0, // 移除points更新，防止前端陈旧数据覆盖数据库
      updatedAt: new Date()
    }

    // 只有当email被明确提供时才更新
    if (email !== undefined) {
      updateData.email = email
    }

    // avatar现在存储的是角色key，不是URL
    if (avatar !== undefined && avatar !== null && avatar !== '') {
      updateData.avatar = avatar  // 直接存储key
    }

    // 创建或更新用户
    const user = await prisma.users.upsert({
      where: { id },
      update: updateData,
      create: {
        id,
        name,
        email,
        avatar: avatar || null, // 存储角色key
        points: points || 0,
        updatedAt: new Date()
      }
    })

    // 返回时转换avatar为URL
    const userWithUrl = {
      ...user,
      avatar: getCharacterImageUrl(user.avatar),
      characterKey: user.avatar
    }

    return NextResponse.json({ success: true, data: userWithUrl })
  } catch (error) {
    console.error('Error creating/updating user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = await verifyAuthFromRequest(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { userId, points } = await request.json()

    // 只能管理自己的积分
    if (userId !== authResult.user.id) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    console.log('🔴 [API /api/users PUT] 收到请求:', { userId, points })

    if (!userId) {
      console.error('❌ [API /api/users PUT] 缺少userId')
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    // 先查询当前积分
    const currentUser = await prisma.users.findUnique({
      where: { id: userId },
      select: { points: true }
    })

    console.log('🔴 [API /api/users PUT] 当前用户积分:', currentUser)

    // 更新用户积分
    console.log('🔴 [API /api/users PUT] 开始更新数据库...')
    const user = await prisma.users.update({
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
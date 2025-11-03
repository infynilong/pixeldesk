import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
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
      // 检查是否是真实的头像路径（包含/avatars/或以http开头）
      if (avatar.startsWith('/avatars/') || avatar.startsWith('http') || !avatar.startsWith('Premade_Character')) {
        updateData.avatar = avatar
      }
      // 如果是角色名称（Premade_Character），则不更新avatar字段，保留用户原有头像
    }

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
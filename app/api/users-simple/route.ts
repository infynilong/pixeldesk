import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../lib/db'
import { getCharacterImageUrl } from '@/lib/characterUtils'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    const user = await prisma.users.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // 转换avatar key为URL
    const userWithUrl = {
      ...user,
      avatar: getCharacterImageUrl(user.avatar),
      characterKey: user.avatar
    }

    return NextResponse.json({ success: true, data: userWithUrl })
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

    // avatar现在存储的是角色key
    if (avatar !== undefined && avatar !== null && avatar !== '') {
      updateData.avatar = avatar
    }

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
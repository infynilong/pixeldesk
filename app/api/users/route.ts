import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../lib/db'

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
        workstations: {
          include: {
            workstation: true
          }
        }
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
    const { id, name, email, avatar, points, gold } = await request.json()
    
    if (!id || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // 创建或更新用户
    const user = await prisma.user.upsert({
      where: { id },
      update: {
        name,
        email,
        avatar,
        points: points || 0,
        gold: gold || 0,
        updatedAt: new Date()
      },
      create: {
        id,
        name,
        email,
        avatar,
        points: points || 0,
        gold: gold || 0
      }
    })

    // 缓存到Redis
    const redis = require('../../../lib/redis').redis
    await redis.setJSON(`user:${id}`, user, 3600)

    return NextResponse.json({ success: true, data: user })
  } catch (error) {
    console.error('Error creating/updating user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId, points, gold } = await request.json()
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    // 更新用户积分
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        points: { increment: points || 0 },
        gold: { increment: gold || 0 },
        updatedAt: new Date()
      }
    })

    // 更新Redis缓存
    const redis = require('../../../lib/redis').redis
    await redis.setJSON(`user:${userId}`, user, 3600)

    return NextResponse.json({ success: true, data: user })
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
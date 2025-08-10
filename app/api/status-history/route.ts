import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../lib/db'
import { StatusHistoryManagerImpl } from '../../../lib/statusHistory'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    // 从数据库获取状态历史
    const history = await prisma.statusHistory.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: 50
    })

    return NextResponse.json({ success: true, data: history })
  } catch (error) {
    console.error('Error fetching status history:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, status, type, emoji, message } = await request.json()
    
    if (!userId || !status || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // 创建状态历史记录
    const historyItem = await prisma.statusHistory.create({
      data: {
        userId,
        status,
        type,
        emoji: emoji || '',
        message: message || '',
        timestamp: new Date()
      }
    })

    // 缓存到Redis
    const redis = require('../../../lib/redis').redis
    await redis.setJSON(`status:${userId}:${historyItem.id}`, historyItem, 3600)

    return NextResponse.json({ success: true, data: historyItem })
  } catch (error) {
    console.error('Error creating status history:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    // 删除用户的状态历史
    await prisma.statusHistory.deleteMany({
      where: { userId }
    })

    // 清除Redis缓存
    const redis = require('../../../lib/redis').redis
    const keys = await redis.keys(`status:${userId}:*`)
    if (keys.length > 0) {
      await redis.del(...keys)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error clearing status history:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
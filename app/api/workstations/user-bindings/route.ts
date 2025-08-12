import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    // 获取用户的所有工位绑定
    const userWorkstations = await prisma.userWorkstation.findMany({
      where: { userId },
      orderBy: { boundAt: 'desc' }
    })

    return NextResponse.json({ success: true, data: userWorkstations })
  } catch (error) {
    console.error('Error fetching user workstation bindings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
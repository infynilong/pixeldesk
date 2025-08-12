import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    // 获取所有工位绑定信息
    const allBindings = await prisma.userWorkstation.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        boundAt: 'desc'
      }
    })

    return NextResponse.json({ success: true, data: allBindings })
  } catch (error) {
    console.error('Error fetching all workstation bindings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    // 获取所有工位
    const workstations = await prisma.workstations.findMany()

    return NextResponse.json({ success: true, data: workstations })
  } catch (error) {
    console.error('Error fetching workstations:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { id, name, xPosition, yPosition } = await request.json()

    if (!id || !name || xPosition === undefined || yPosition === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // 创建或更新工位
    const workstation = await prisma.workstations.upsert({
      where: { id },
      update: {
        name,
        xPosition,
        yPosition
      },
      create: {
        id,
        name,
        xPosition,
        yPosition
      }
    })

    return NextResponse.json({ success: true, data: workstation })
  } catch (error) {
    console.error('Error creating/updating workstation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
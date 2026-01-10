import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
    try {
        const config = await prisma.workstation_config.findFirst({
            select: {
                billboardPromotionCost: true
            }
        })

        return NextResponse.json({
            success: true,
            cost: (config as any)?.billboardPromotionCost ?? 50
        })
    } catch (error) {
        console.error('Failed to fetch billboard cost:', error)
        return NextResponse.json({ success: false, cost: 50 }, { status: 500 })
    }
}

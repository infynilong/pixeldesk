import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
    try {
        const nodes = await prisma.post_nodes.findMany({
            orderBy: {
                name: 'asc'
            }
        })

        return NextResponse.json({
            success: true,
            data: nodes
        })
    } catch (error) {
        console.error('Error fetching nodes:', error)
        return NextResponse.json(
            { error: 'Failed to fetch nodes' },
            { status: 500 }
        )
    }
}

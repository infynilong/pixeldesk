
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams
        const userId = searchParams.get('userId')
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '20')

        if (!userId) {
            return NextResponse.json({ error: 'User ID required' }, { status: 400 })
        }

        const skip = (page - 1) * limit

        const [total, history] = await Promise.all([
            prisma.points_history.count({
                where: { userId }
            }),
            prisma.points_history.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip
            })
        ])

        return NextResponse.json({
            success: true,
            data: {
                history,
                pagination: {
                    total,
                    page,
                    totalPages: Math.ceil(total / limit),
                    hasMore: skip + history.length < total
                }
            }
        })

    } catch (error) {
        console.error('Error fetching points history:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

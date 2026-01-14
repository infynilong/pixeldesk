import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getBasicUserFromRequest } from '@/lib/serverAuth'

// GET /api/books/my - Get current user's books (All statuses)
export async function GET(request: NextRequest) {
    try {
        const authResult = await getBasicUserFromRequest(request)
        if (!authResult.success || !authResult.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        const user = authResult.user

        const books = await prisma.books.findMany({
            where: {
                userId: user.id
            },
            orderBy: {
                updatedAt: 'desc'
            },
            include: {
                _count: {
                    select: { chapters: true }
                }
            }
        })

        return NextResponse.json({ success: true, data: books })
    } catch (error) {
        console.error('Error fetching my books:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to fetch user books' },
            { status: 500 }
        )
    }
}

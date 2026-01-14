import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getBasicUserFromRequest } from '@/lib/serverAuth'

// GET /api/books - Get public books (Published only)
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const sort = searchParams.get('sort') || 'newest' // newest, hot
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '12')
        const skip = (page - 1) * limit

        let orderBy: any = { publishedAt: 'desc' }
        if (sort === 'hot') {
            orderBy = { viewCount: 'desc' }
        } else if (sort === 'oldest') {
            orderBy = { publishedAt: 'asc' }
        }

        // Default to published books only for the public list
        const where = {
            status: 'PUBLISHED'
        } as const

        const [books, total] = await prisma.$transaction([
            prisma.books.findMany({
                where,
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            avatar: true
                        }
                    },
                    _count: {
                        select: { chapters: true }
                    }
                },
                orderBy,
                take: limit,
                skip
            }),
            prisma.books.count({ where })
        ])

        return NextResponse.json({
            success: true,
            data: books,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit)
            }
        })
    } catch (error) {
        console.error('Error fetching books:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to fetch books' },
            { status: 500 }
        )
    }
}

// POST /api/books - Create a new book
export async function POST(request: NextRequest) {
    try {
        const authResult = await getBasicUserFromRequest(request)
        if (!authResult.success || !authResult.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        const user = authResult.user

        const body = await request.json()
        const { title, description, coverUrl, category } = body

        if (!title) {
            return NextResponse.json(
                { error: 'Title is required' },
                { status: 400 }
            )
        }

        const newBook = await prisma.books.create({
            data: {
                userId: user.id,
                title,
                description,
                coverUrl,
                category,
                status: 'DRAFT' // Always start as draft
            },
            include: {
                _count: {
                    select: { chapters: true }
                }
            }
        })

        return NextResponse.json({ success: true, data: newBook })
    } catch (error) {
        console.error('Error creating book:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to create book' },
            { status: 500 }
        )
    }
}

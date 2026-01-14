import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getBasicUserFromRequest } from '@/lib/serverAuth'

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const authResult = await getBasicUserFromRequest(request)
        if (!authResult.success || !authResult.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        const user = authResult.user

        const book = await prisma.books.findUnique({
            where: { id: params.id },
            select: { userId: true }
        })

        if (!book || book.userId !== user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const count = await prisma.book_chapters.count({
            where: { bookId: params.id }
        })

        const body = await request.json()
        const { title, type, content, linkUrl, postId } = body

        const chapter = await prisma.book_chapters.create({
            data: {
                bookId: params.id,
                title,
                type: type || 'TEXT',
                content,
                linkUrl,
                postId,
                order: count + 1
            }
        })

        return NextResponse.json({ success: true, data: chapter })
    } catch (error) {
        return NextResponse.json(
            { success: false, error: 'Failed to create chapter' },
            { status: 500 }
        )
    }
}

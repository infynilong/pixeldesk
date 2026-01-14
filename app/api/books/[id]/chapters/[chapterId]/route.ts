import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getBasicUserFromRequest } from '@/lib/serverAuth'

export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string; chapterId: string } }
) {
    try {
        const authResult = await getBasicUserFromRequest(request)
        if (!authResult.success || !authResult.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        const user = authResult.user

        const chapter = await prisma.book_chapters.findUnique({
            where: { id: params.chapterId },
            include: { book: true }
        })

        if (!chapter || chapter.book.userId !== user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const body = await request.json()
        const { title, type, content, linkUrl, postId, order } = body

        const updatedChapter = await prisma.book_chapters.update({
            where: { id: params.chapterId },
            data: {
                title,
                type,
                content,
                linkUrl,
                postId,
                order
            }
        })

        return NextResponse.json({ success: true, data: updatedChapter })
    } catch (error) {
        return NextResponse.json(
            { success: false, error: 'Failed to update chapter' },
            { status: 500 }
        )
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string; chapterId: string } }
) {
    try {
        const authResult = await getBasicUserFromRequest(request)
        if (!authResult.success || !authResult.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        const user = authResult.user

        const chapter = await prisma.book_chapters.findUnique({
            where: { id: params.chapterId },
            include: { book: true }
        })

        if (!chapter || chapter.book.userId !== user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        await prisma.book_chapters.delete({
            where: { id: params.chapterId }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json(
            { success: false, error: 'Failed to delete chapter' },
            { status: 500 }
        )
    }
}

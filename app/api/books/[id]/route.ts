import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getBasicUserFromRequest } from '@/lib/serverAuth'

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const book = await prisma.books.findUnique({
            where: { id: params.id },
            include: {
                user: {
                    select: { id: true, name: true, avatar: true }
                },
                chapters: {
                    orderBy: { order: 'asc' }
                }
            }
        })

        if (!book) {
            return NextResponse.json({ error: 'Book not found' }, { status: 404 })
        }

        return NextResponse.json({ success: true, data: book })
    } catch (error) {
        return NextResponse.json(
            { success: false, error: 'Failed to fetch book' },
            { status: 500 }
        )
    }
}

export async function PATCH(
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

        const body = await request.json()
        const { title, description, coverUrl, category, status } = body

        const updatedBook = await prisma.books.update({
            where: { id: params.id },
            data: {
                title,
                description,
                coverUrl,
                category,
                status // Allow draft/published toggling for now
            }
        })

        return NextResponse.json({ success: true, data: updatedBook })
    } catch (error) {
        return NextResponse.json(
            { success: false, error: 'Failed to update book' },
            { status: 500 }
        )
    }
}

export async function DELETE(
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

        await prisma.books.delete({
            where: { id: params.id }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json(
            { success: false, error: 'Failed to delete book' },
            { status: 500 }
        )
    }
}


import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getBasicUserFromRequest } from '@/lib/serverAuth'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const bookcaseId = searchParams.get('bookcaseId')

        let whereClause: any = {}
        if (bookcaseId) {
            // Get books for this specific bookcase OR public books (null bookcaseId)
            whereClause = {
                OR: [
                    { bookcaseId: bookcaseId },
                    { bookcaseId: null }
                ]
            }
        }
        // If no bookcaseId specified, return all books

        const books = await prisma.library_books.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json({ success: true, data: books })
    } catch (error) {
        console.error('Error fetching library books:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to fetch books' },
            { status: 500 }
        )
    }
}

export async function POST(request: Request) {
    try {
        const user = await getBasicUserFromRequest(request)
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // TODO: Verify admin status if strictly needed, for now allowing authorized users (or admins)

        const body = await request.json()
        const { title, author, description, coverUrl, content, bookcaseId } = body

        if (!title || !author) {
            return NextResponse.json(
                { error: 'Title and Author are required' },
                { status: 400 }
            )
        }

        const newBook = await prisma.library_books.create({
            data: {
                title,
                author,
                description,
                coverUrl,
                content,
                bookcaseId
            }
        })

        return NextResponse.json({ success: true, data: newBook })
    } catch (error) {
        console.error('Error creating library book:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to create book' },
            { status: 500 }
        )
    }
}

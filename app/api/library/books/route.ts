
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getBasicUserFromRequest } from '@/lib/serverAuth'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const bookcaseId = searchParams.get('bookcaseId')

        // Build where clause for the NEW books schema
        let whereClause: any = {
            status: 'PUBLISHED' // Only show published books
        }

        if (bookcaseId) {
            whereClause.bookcaseId = bookcaseId
        }

        // Fetch from the new 'books' table
        const books = await prisma.books.findMany({
            where: whereClause,
            include: {
                user: {
                    select: { name: true }
                }
            },
            orderBy: { publishedAt: 'desc' }
        })

        // Map to format expected by frontend
        const mappedBooks = books.map((book: any) => ({
            id: book.id,
            title: book.title,
            author: book.user.name,
            description: book.description,
            coverUrl: book.coverUrl,
            // We don't load full content here for performance, 
            // and the new reader handles chapters separately.
            content: ""
        }))

        return NextResponse.json({ success: true, data: mappedBooks })
    } catch (error) {
        console.error('Error fetching library books:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to fetch books' },
            { status: 500 }
        )
    }
}

// Handler to PLACE a book on a shelf
export async function POST(request: NextRequest) {
    try {
        const authResult = await getBasicUserFromRequest(request)
        if (!authResult.success || !authResult.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        const user = authResult.user

        const body = await request.json()
        const { bookId, bookcaseId } = body

        if (!bookId || !bookcaseId) {
            return NextResponse.json(
                { error: 'bookId and bookcaseId are required' },
                { status: 400 }
            )
        }

        // Verify ownership and status
        const book = await prisma.books.findUnique({
            where: { id: bookId }
        })

        if (!book) {
            return NextResponse.json({ error: 'Book not found' }, { status: 404 })
        }

        if (book.userId !== user.id) {
            return NextResponse.json({ error: 'You can only place your own books' }, { status: 403 })
        }

        if (book.status !== 'PUBLISHED') {
            return NextResponse.json({ error: 'Book must be published first' }, { status: 400 })
        }

        // Update the book's location
        const updatedBook = await prisma.books.update({
            where: { id: bookId },
            data: { bookcaseId: String(bookcaseId) }
        })

        return NextResponse.json({ success: true, data: updatedBook })
    } catch (error) {
        console.error('Error placing book on shelf:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to place book on shelf' },
            { status: 500 }
        )
    }
}

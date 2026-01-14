import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const id = params.id
        const body = await request.json()
        const { name, role, personality, knowledge, greeting, isActive, x, y, isFixed } = body

        const updated = await prisma.ai_npcs.update({
            where: { id },
            data: {
                name,
                role,
                personality,
                knowledge,
                greeting,
                isActive,
                isFixed: isFixed !== undefined ? Boolean(isFixed) : undefined,
                x: x !== undefined ? Number(x) : undefined,
                y: y !== undefined ? Number(y) : undefined,
                updatedAt: new Date()
            }
        })

        return NextResponse.json({ success: true, data: updated })
    } catch (error) {
        console.error('Update NPC error:', error)
        return NextResponse.json({ error: 'Failed to update NPC' }, { status: 500 })
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        await prisma.ai_npcs.delete({
            where: { id: params.id }
        })
        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json({ error: 'Failed' }, { status: 500 })
    }
}

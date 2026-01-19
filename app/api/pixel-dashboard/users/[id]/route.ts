import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/pixel-dashboard/permissions'
import prisma from '@/lib/db'

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await requirePermission('users.view')

        const user = await prisma.users.findUnique({
            where: { id: params.id },
            include: {
                players: true,
                _count: {
                    select: {
                        characters: true,
                        posts: true,
                        post_replies: true,
                        user_workstations: true,
                    }
                }
            },
        })

        if (!user) {
            return NextResponse.json({ error: '用户未找到' }, { status: 404 })
        }

        return NextResponse.json({
            success: true,
            data: user,
        })
    } catch (error) {
        console.error('Failed to get user:', error)
        return NextResponse.json(
            { error: '获取用户详情失败' },
            { status: 500 }
        )
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    // ... DELETE logic here (already correct) ...
    try {
        await requirePermission('users.delete')

        const user = await prisma.users.findUnique({
            where: { id: params.id },
        })

        if (!user) {
            return NextResponse.json({ error: '用户未找到' }, { status: 404 })
        }

        // 删除用户（级联删除 Player 和其他关联记录）
        await prisma.users.delete({
            where: { id: params.id }
        })

        return NextResponse.json({
            success: true,
            message: '用户已成功删除',
        })
    } catch (error) {
        console.error('Failed to delete user:', error)
        return NextResponse.json(
            { error: '删除用户失败' },
            { status: 500 }
        )
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await requirePermission('users.edit')

        const body = await request.json()
        const { isAdmin, isActive } = body

        const user = await prisma.users.findUnique({
            where: { id: params.id },
        })

        if (!user) {
            return NextResponse.json({ error: '用户未找到' }, { status: 404 })
        }

        const updatedUser = await prisma.users.update({
            where: { id: params.id },
            data: {
                ...(isAdmin !== undefined && { isAdmin }),
                ...(isActive !== undefined && { isActive }),
            },
        })

        return NextResponse.json({
            success: true,
            data: updatedUser,
        })
    } catch (error) {
        console.error('Failed to update user:', error)
        return NextResponse.json(
            { error: '更新用户失败' },
            { status: 500 }
        )
    }
}

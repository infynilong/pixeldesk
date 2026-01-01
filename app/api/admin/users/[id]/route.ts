import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/admin/permissions'
import prisma from '@/lib/prisma'

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await requirePermission('users.view')

        const user = await prisma.user.findUnique({
            where: { id: params.id },
            include: {
                player: true,
                _count: {
                    select: {
                        ownedCharacters: true,
                        posts: true,
                        postReplies: true,
                        workstations: true,
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
    try {
        await requirePermission('users.delete')

        const user = await prisma.user.findUnique({
            where: { id: params.id },
        })

        if (!user) {
            return NextResponse.json({ error: '用户未找到' }, { status: 404 })
        }

        // 删除用户（级联删除 Player 和其他关联记录）
        await prisma.user.delete({
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

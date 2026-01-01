import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/admin/permissions'
import prisma from '@/lib/prisma'

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await requirePermission('players.view')

        const player = await prisma.player.findUnique({
            where: { id: params.id },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        points: true,
                        isActive: true,
                        createdAt: true,
                        lastLogin: true,
                    },
                },
            },
        })

        if (!player) {
            return NextResponse.json({ error: '玩家未找到' }, { status: 404 })
        }

        // 格式化输出
        const totalHours = Math.floor(player.totalPlayTime / 60)
        const totalMinutes = player.totalPlayTime % 60

        const formattedPlayer = {
            ...player,
            userName: player.user.name,
            email: player.user.email,
            points: player.user.points,
            isActive: player.user.isActive,
            totalPlayTimeText: totalHours > 0
                ? `${totalHours}小时${totalMinutes}分钟`
                : `${totalMinutes}分钟`,
        }

        return NextResponse.json({
            success: true,
            data: formattedPlayer,
        })
    } catch (error) {
        console.error('Failed to get player:', error)
        return NextResponse.json(
            { error: '获取玩家详情失败' },
            { status: 500 }
        )
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await requirePermission('players.delete')

        // 查找玩家以获取 userId
        const player = await prisma.player.findUnique({
            where: { id: params.id },
            select: { userId: true }
        })

        if (!player) {
            return NextResponse.json({ error: '玩家未找到' }, { status: 404 })
        }

        // 删除用户（级联删除 Player 记录）
        await prisma.user.delete({
            where: { id: player.userId }
        })

        return NextResponse.json({
            success: true,
            message: '玩家已成功删除',
        })
    } catch (error) {
        console.error('Failed to delete player:', error)
        return NextResponse.json(
            { error: '删除玩家失败' },
            { status: 500 }
        )
    }
}

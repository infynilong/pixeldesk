import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/admin/permissions'
import prisma from '@/lib/db'

export async function GET(request: NextRequest) {
    try {
        // 验证权限
        await requirePermission('users.view')

        const { searchParams } = new URL(request.url)
        const page = parseInt(searchParams.get('page') || '1')
        const pageSize = parseInt(searchParams.get('pageSize') || '20')
        const search = searchParams.get('search') || ''
        const sortBy = searchParams.get('sortBy') || 'createdAt'
        const sortOrder = searchParams.get('sortOrder') || 'desc'

        // 构建查询条件
        const where: any = {}

        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
            ]
        }

        // 查询数据
        const [users, total] = await Promise.all([
            prisma.users.findMany({
                where,
                include: {
                    players: {
                        select: {
                            id: true,
                            playerName: true,
                            characterSprite: true,
                        }
                    }
                },
                orderBy: { [sortBy]: sortOrder },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            prisma.users.count({ where }),
        ])

        return NextResponse.json({
            success: true,
            data: users,
            pagination: {
                page,
                pageSize,
                total,
                totalPages: Math.ceil(total / pageSize),
            },
        })
    } catch (error) {
        console.error('Failed to get users:', error)
        return NextResponse.json(
            { error: '获取用户列表失败' },
            { status: 500 }
        )
    }
}

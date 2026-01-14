import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

/**
 * GET /api/postcards/templates
 * 获取商店中的名信片模板列表
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const category = searchParams.get('category') || 'all'

        const templates = await prisma.postcard_templates.findMany({
            where: {
                isActive: true,
            },
            include: {
                creator: {
                    select: {
                        id: true,
                        name: true,
                        avatar: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        return NextResponse.json({
            success: true,
            data: templates
        })

    } catch (error: any) {
        console.error('Fetch templates error:', error)
        return NextResponse.json({ success: false, error: '获取模板列表失败' }, { status: 500 })
    }
}

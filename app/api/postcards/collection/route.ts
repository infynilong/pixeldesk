import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { verifyToken } from '@/lib/auth'

/**
 * GET /api/postcards/collection
 * 获取指定用户或当前用户收到的名信片列表 (集邮册)
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const queryUserId = searchParams.get('userId')

        const token = request.cookies.get('auth-token')?.value || null
        let sessionUserId = null
        if (token) {
            const payload = verifyToken(token)
            sessionUserId = payload?.userId
        }

        const targetUserId = queryUserId || sessionUserId
        if (!targetUserId) {
            return NextResponse.json({ success: false, error: '请先登录或提供用户ID' }, { status: 401 })
        }

        const collection = await prisma.user_postcard_collection.findMany({
            where: { userId: targetUserId },
            include: {
                owner: { select: { id: true, name: true, avatar: true } },
                template: true
            },
            orderBy: { receivedAt: 'desc' }
        })

        return NextResponse.json({ success: true, data: collection })
    } catch (error) {
        console.error('Fetch collection error:', error)
        return NextResponse.json({ success: false, error: '获取集邮册失败' }, { status: 500 })
    }
}

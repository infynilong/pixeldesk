import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyAuthFromRequest } from '@/lib/serverAuth'

export async function GET(request: NextRequest) {
    try {
        // 验证用户身份
        const authResult = await verifyAuthFromRequest(request)
        if (!authResult.success || !authResult.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const userId = authResult.user.id
        const { searchParams } = new URL(request.url)
        const npcId = searchParams.get('npcId')

        if (!npcId) {
            return NextResponse.json({ error: 'NPC ID缺失' }, { status: 400 })
        }

        // 获取最近100条聊天历史
        const history = await prisma.aiChatHistory.findMany({
            where: { userId, npcId },
            orderBy: { createdAt: 'asc' }, // 按时间正序
            take: 100
        })

        return NextResponse.json({
            success: true,
            messages: history.map(h => ({
                role: h.role,
                content: h.content,
                timestamp: h.createdAt
            }))
        })

    } catch (error) {
        console.error('Get chat history error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

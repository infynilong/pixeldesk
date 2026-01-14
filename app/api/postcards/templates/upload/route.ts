import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { randomUUID } from 'crypto'

/**
 * POST /api/postcards/templates/upload
 * 将当前名信片设计上传为公共模板并获得奖励
 */
export async function POST(request: NextRequest) {
    try {
        const token = request.cookies.get('auth-token')?.value || null
        if (!token) {
            return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 })
        }

        const payload = verifyToken(token)
        if (!payload?.userId) {
            return NextResponse.json({ success: false, error: '无效令牌' }, { status: 401 })
        }

        const { price = 10 } = await request.json().catch(() => ({}));

        // 1. 获取当前设计
        const userPostcard = await prisma.user_postcards.findUnique({
            where: { userId: payload.userId }
        })

        if (!userPostcard || (!userPostcard.bgUrl && !userPostcard.logoUrl)) {
            return NextResponse.json({ success: false, error: '请先设计并完善你的名信片' }, { status: 400 })
        }

        // 2. 获取奖励配置
        const config = await prisma.workstation_config.findFirst()
        const rewardAmount = config?.postcardTemplateReward ?? 50

        // 3. 执行事务: 创建模板 + 发放奖励
        const result = await prisma.$transaction(async (tx) => {
            // 创建模板
            const template = await tx.postcard_templates.create({
                data: {
                    creatorId: payload.userId,
                    name: userPostcard.name || '玩家创意模板',
                    description: userPostcard.content || '由玩家设计的精美模板',
                    bgUrl: userPostcard.bgUrl,
                    price: parseInt(price as string) || 10,
                    config: {
                        logoUrl: userPostcard.logoUrl,
                        cardName: userPostcard.name,
                        content: userPostcard.content
                    }
                }
            })

            // 奖励积分
            const updatedUser = await tx.users.update({
                where: { id: payload.userId },
                data: { points: { increment: rewardAmount } }
            })

            // 记录积分历史
            await tx.points_history.create({
                data: {
                    id: randomUUID(),
                    userId: payload.userId,
                    amount: rewardAmount,
                    reason: '上传名信片模板奖励',
                    type: 'EARN',
                    balance: updatedUser.points
                }
            })

            return template
        })

        return NextResponse.json({
            success: true,
            data: result,
            message: `模板上传成功！你获得了 ${rewardAmount} 积分奖励`
        })

    } catch (error: any) {
        console.error('Template upload error:', error)
        return NextResponse.json({ success: false, error: '上传至商店失败', details: error.message }, { status: 500 })
    }
}

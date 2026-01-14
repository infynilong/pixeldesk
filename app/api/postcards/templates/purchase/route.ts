import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { randomUUID } from 'crypto'

/**
 * POST /api/postcards/templates/purchase
 * 购买名信片模板
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

        const { templateId } = await request.json()
        if (!templateId) {
            return NextResponse.json({ success: false, error: '请选择要购买的模板' }, { status: 400 })
        }

        // 1. 获取模板信息
        const template = await prisma.postcard_templates.findUnique({
            where: { id: templateId },
            include: { creator: true }
        })

        if (!template) {
            return NextResponse.json({ success: false, error: '模板不存在' }, { status: 404 })
        }

        // 2. 检查买家积分
        const buyerArr = await prisma.users.findUnique({
            where: { id: payload.userId },
            select: { points: true }
        })

        if (!buyerArr || buyerArr.points < template.price) {
            return NextResponse.json({ success: false, error: '积分不足' }, { status: 400 })
        }

        // 3. 执行购买事务
        const result = await prisma.$transaction(async (tx) => {
            // 扣除买家积分
            const updatedBuyer = await tx.users.update({
                where: { id: payload.userId },
                data: { points: { decrement: template.price } }
            })

            // 增加买家积分历史
            await tx.points_history.create({
                data: {
                    id: randomUUID(),
                    userId: payload.userId,
                    amount: -template.price,
                    reason: `购买名信片模板: ${template.name}`,
                    type: 'SPEND',
                    balance: updatedBuyer.points
                }
            })

            // 如果有创作者且不是买家自己，增加创作者积分
            if (template.creatorId && template.creatorId !== payload.userId) {
                const updatedCreator = await tx.users.update({
                    where: { id: template.creatorId },
                    data: { points: { increment: template.price } }
                })

                // 增加创作者积分历史
                await tx.points_history.create({
                    data: {
                        id: randomUUID(),
                        userId: template.creatorId,
                        amount: template.price,
                        reason: `卖出名信片模板: ${template.name}`,
                        type: 'EARN',
                        balance: updatedCreator.points
                    }
                })
            }

            // 增加模板销量
            await tx.postcard_templates.update({
                where: { id: templateId },
                data: { salesCount: { increment: 1 } }
            })

            // 更新买家的名信片设计模板
            await tx.user_postcards.upsert({
                where: { userId: payload.userId },
                update: { templateId: templateId },
                create: { userId: payload.userId, templateId: templateId }
            })

            return updatedBuyer
        })

        return NextResponse.json({
            success: true,
            message: '模板购买并应用成功！',
            data: {
                points: result.points
            }
        })

    } catch (error: any) {
        console.error('Template purchase error:', error)
        return NextResponse.json({ success: false, error: '购买失败', details: error.message }, { status: 500 })
    }
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import cuid from 'cuid'

/**
 * POST /api/posts/[id]/promote
 * 将帖子推上大屏
 */
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const postId = params.id

        // 验证用户身份
        let token = request.cookies.get('auth-token')?.value || null
        if (!token) {
            const authHeader = request.headers.get('Authorization')
            if (authHeader && authHeader.startsWith('Bearer ')) {
                token = authHeader.substring(7)
            }
        }

        if (!token) {
            return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 })
        }

        const payload = verifyToken(token)
        if (!payload) {
            return NextResponse.json({ success: false, error: '无效的认证令牌' }, { status: 401 })
        }

        const userId = payload.userId

        // 获取配置 (从 workstation_config 读取)
        const wsConfig = await prisma.workstation_config.findFirst()
        const cost = wsConfig?.billboardPromotionCost ?? 50
        const durationHours = 24 // 默认持续 24 小时

        // 检查帖子是否存在且已发布
        const post = await prisma.posts.findUnique({
            where: { id: postId },
            select: { id: true, title: true, isDraft: true, moderationStatus: true, authorId: true }
        })

        if (!post || post.isDraft) {
            return NextResponse.json({ success: false, error: '帖子不存在或尚未发布' }, { status: 404 })
        }

        // 禁止自己推销自己的帖子
        if (post.authorId === userId) {
            return NextResponse.json({ success: false, error: '您不能推流自己的文章' }, { status: 403 })
        }

        if (post.moderationStatus !== 'approved' && post.moderationStatus !== 'pending') {
            return NextResponse.json({ success: false, error: '帖子内容违规，无法推流' }, { status: 403 })
        }

        // 检查余额
        const user = await prisma.users.findUnique({
            where: { id: userId },
            select: { points: true }
        })

        if (!user || user.points < cost) {
            return NextResponse.json({
                success: false,
                error: '象素币不足',
                required: cost,
                current: user?.points || 0
            }, { status: 400 })
        }

        // 计算过期时间
        // 如果该帖子已有还没过期的促销，则在过期时间基础上累加
        const now = new Date()
        const billboardModel = (prisma as any).billboard_promotions || (prisma as any).billboardPromotions;

        if (!billboardModel) {
            throw new Error('Billboard model not found');
        }

        const latestPromotion = await billboardModel.findFirst({
            where: {
                postId: postId,
                expiresAt: { gt: now }
            },
            orderBy: { expiresAt: 'desc' }
        })

        let expiresAt = new Date(now.getTime() + durationHours * 60 * 60 * 1000)
        if (latestPromotion) {
            expiresAt = new Date(latestPromotion.expiresAt.getTime() + durationHours * 60 * 60 * 1000)
        }

        // 事务处理
        const result = await prisma.$transaction(async (tx) => {
            // 1. 扣费
            const updatedUser = await tx.users.update({
                where: { id: userId },
                data: { points: { decrement: cost } }
            })

            // 2. 记录积分历史
            await tx.points_history.create({
                data: {
                    id: cuid(),
                    userId: userId,
                    amount: -cost,
                    reason: `大屏推流: ${post.title || '无标题文章'}`,
                    type: 'billboard_promotion',
                    balance: updatedUser.points
                }
            })

            // 3. 创建推流记录
            // 使用动态查找模型名以兼容可能的 Prisma 模型命名差异
            const modelName = Object.keys(tx).find(k => k.toLowerCase() === 'billboard_promotions' || k.toLowerCase() === 'billboardpromotions') || 'billboard_promotions';
            await (tx as any)[modelName].create({
                data: {
                    id: cuid(),
                    postId: postId,
                    userId: userId,
                    amount: cost,
                    duration: durationHours,
                    expiresAt: expiresAt
                }
            })

            // 4. 更新帖子的推流计数
            await tx.posts.update({
                where: { id: postId },
                data: { promotionCount: { increment: 1 } }
            })

            return { remainingPoints: updatedUser.points, expiresAt }
        })

        return NextResponse.json({
            success: true,
            message: '成功推上大屏！',
            data: {
                remainingPoints: result.remainingPoints,
                expiresAt: result.expiresAt
            }
        })

    } catch (error) {
        console.error('推流失败:', error)
        return NextResponse.json({ success: false, error: '推流失败，请重试' }, { status: 500 })
    }
}

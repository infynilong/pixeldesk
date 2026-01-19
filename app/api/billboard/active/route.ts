import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * GET /api/billboard/active
 * 获取当前大屏展示内容
 */
export async function GET(request: NextRequest) {
    try {
        const now = new Date()

        // 查找所有关联了未过期推流记录的帖子
        // 注意：Prisma Client 可能会将 snake_case 模型名映射为 camelCase (billboardPromotions) 
        // 或保留原样 (billboard_promotions)
        const billboardModel = (prisma as any).billboard_promotions || (prisma as any).billboardPromotions;

        if (!billboardModel) {
            console.error('Prisma billboard_promotions model not found in client');
            return NextResponse.json({ success: false, error: 'Database model missing' }, { status: 500 });
        }

        const activePromotions = await billboardModel.findMany({
            where: {
                expiresAt: { gt: now }
            },
            include: {
                posts: {
                    include: {
                        users: {
                            select: {
                                id: true,
                                name: true,
                                avatar: true,
                                customAvatar: true,
                                isAdmin: true
                            }
                        }
                    }
                },
                users: {
                    select: {
                        name: true
                    }
                }
            },
            orderBy: {
                expiresAt: 'desc'
            },
            take: 10 // 获取最新的10条记录
        })

        // 去重并合并热度（如果同一帖子有多条推流）
        const postMap = new Map()
        const promos: any[] = activePromotions;

        promos.forEach((promo: any) => {
            if (!promo.posts) return

            const existing = postMap.get(promo.postId)
            if (existing) {
                existing.amount += promo.amount
                if (promo.expiresAt > existing.expiresAt) {
                    existing.expiresAt = promo.expiresAt
                }
                // 记录推流人（如果有多个记录推流人）
                if (!existing.promoters.includes(promo.users.name)) {
                    existing.promoters.push(promo.users.name)
                }
            } else {
                postMap.set(promo.postId, {
                    id: promo.posts.id,
                    title: promo.posts.title,
                    summary: promo.posts.summary,
                    coverImage: promo.posts.coverImage,
                    author: promo.posts.users,
                    amount: promo.amount,
                    expiresAt: promo.expiresAt,
                    promoters: [promo.users.name],
                    createdAt: promo.posts.createdAt
                })
            }
        })

        const results = Array.from(postMap.values())
            .sort((a, b) => (b as any).expiresAt.getTime() - (a as any).expiresAt.getTime()) // 按过期时间排序
            .slice(0, 5) // 只取前 5

        return NextResponse.json({
            success: true,
            data: results
        })

    } catch (error) {
        console.error('获取大屏内容失败:', error)
        return NextResponse.json({ success: false, error: '获取内容失败' }, { status: 500 })
    }
}

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { NotificationType } from '@prisma/client'

/**
 * GET/POST/PUT /api/postcards/exchange
 * 管理名信片交换请求
 */

// 获取收到的或发出的交换请求
export async function GET(request: NextRequest) {
    try {
        const token = request.cookies.get('auth-token')?.value || null
        if (!token) return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 })

        const payload = verifyToken(token)
        if (!payload?.userId) return NextResponse.json({ success: false, error: '无效令牌' }, { status: 401 })

        const exchanges = await prisma.postcard_exchanges.findMany({
            where: {
                OR: [
                    { senderId: payload.userId },
                    { receiverId: payload.userId }
                ]
            },
            include: {
                sender: { select: { id: true, name: true, avatar: true } },
                receiver: { select: { id: true, name: true, avatar: true } }
            },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json({ success: true, data: exchanges })
    } catch (error) {
        return NextResponse.json({ success: false, error: '获取交换记录失败' }, { status: 500 })
    }
}

// 发起交换请求
export async function POST(request: NextRequest) {
    try {
        const token = request.cookies.get('auth-token')?.value || null
        if (!token) return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 })

        const payload = verifyToken(token)
        if (!payload?.userId) return NextResponse.json({ success: false, error: '无效令牌' }, { status: 401 })

        const { receiverId } = await request.json()
        if (!receiverId || receiverId === payload.userId) {
            return NextResponse.json({ success: false, error: '无效的接收者' }, { status: 400 })
        }



        // 使用事务确保原子性
        const { exchange } = await prisma.$transaction(async (tx) => {
            // Check for existing within the transaction to avoid race conditions
            const existing = await tx.postcard_exchanges.findFirst({
                where: {
                    OR: [
                        { senderId: payload.userId, receiverId, status: 'PENDING' },
                        { senderId: receiverId, receiverId: payload.userId, status: 'PENDING' }
                    ]
                }
            })

            if (existing) {
                throw new Error('已有待处理的交换请求')
            }

            // 创建交换请求
            const newExchange = await tx.postcard_exchanges.create({
                data: {
                    senderId: payload.userId,
                    receiverId,
                    status: 'PENDING'
                }
            })

            // 发送系统通知
            await tx.notifications.create({
                data: {
                    id: crypto.randomUUID(),
                    userId: receiverId,
                    type: NotificationType.POSTCARD_EXCHANGE_REQUEST,
                    title: '收到名信片交换请求',
                    message: `${payload.name || '有玩家'} 想和你交换名信片，去“青鸟集”看看吧！`,
                    relatedUserId: payload.userId,
                    relatedExchangeId: newExchange.id,
                    updatedAt: new Date()
                }
            })

            return { exchange: newExchange }
        })

        return NextResponse.json({ success: true, data: exchange, message: '请求已发送' })

    } catch (error: any) {
        console.error('Initiate exchange error:', error)
        return NextResponse.json({ success: false, error: '发起交换失败' }, { status: 500 })
    }
}

// 接受或拒绝请求
export async function PUT(request: NextRequest) {
    try {
        const token = request.cookies.get('auth-token')?.value || null
        if (!token) return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 })

        const payload = verifyToken(token)
        if (!payload?.userId) return NextResponse.json({ success: false, error: '无效令牌' }, { status: 401 })

        const { exchangeId, action } = await request.json() // action: 'ACCEPT' | 'REJECT'

        const exchange = await prisma.postcard_exchanges.findUnique({
            where: { id: exchangeId }
        })

        if (!exchange || exchange.receiverId !== payload.userId || exchange.status !== 'PENDING') {
            return NextResponse.json({ success: false, error: '无效的请求或权限不足' }, { status: 400 })
        }

        if (action === 'REJECT') {
            await prisma.postcard_exchanges.update({
                where: { id: exchangeId },
                data: { status: 'REJECTED' }
            })
            return NextResponse.json({ success: true, message: '已拒绝交换' })
        }

        if (action === 'ACCEPT') {
            // 执行交换事务
            await prisma.$transaction(async (tx) => {
                // 1. 获取双方信息和设计 (Fetch users with designs)
                const sender = await tx.users.findUnique({
                    where: { id: exchange.senderId },
                    include: { user_postcards: true }
                })
                const receiver = await tx.users.findUnique({
                    where: { id: exchange.receiverId },
                    include: { user_postcards: true }
                })

                if (!sender || !receiver) {
                    throw new Error('用户不存在')
                }

                // Helper to get design or default
                const getDesignOrDefault = (user: typeof sender) => {
                    const design = user!.user_postcards
                    if (design) return design

                    return {
                        name: user!.name,
                        content: 'Nice to meet you! 像素世界，幸会！',
                        logoUrl: user!.avatar,
                        bgUrl: null,
                        templateId: null
                    }
                }

                const senderDesign = getDesignOrDefault(sender)
                const receiverDesign = getDesignOrDefault(receiver)

                // 2. 互相存入集邮册 (Snapshot)
                // 2. 互相存入集邮册 (Snapshot) - Ensure uniqueness per owner

                // Helper to upsert collection item
                const upsertCollectionItem = async (targetUserId: string, ownerId: string, design: any) => {
                    const existing = await (tx as any).user_postcard_collection.findFirst({
                        where: {
                            userId: targetUserId,
                            postcardOwnerId: ownerId
                        }
                    });

                    if (existing) {
                        // Update existing snapshot
                        await (tx as any).user_postcard_collection.update({
                            where: { id: existing.id },
                            data: {
                                name: design.name,
                                content: design.content,
                                logoUrl: design.logoUrl,
                                bgUrl: design.bgUrl,
                                templateId: design.templateId,
                                receivedAt: new Date() // Update received time
                            }
                        });
                    } else {
                        // Create new
                        await (tx as any).user_postcard_collection.create({
                            data: {
                                userId: targetUserId,
                                postcardOwnerId: ownerId,
                                name: design.name,
                                content: design.content,
                                logoUrl: design.logoUrl,
                                bgUrl: design.bgUrl,
                                templateId: design.templateId
                            }
                        });
                    }
                };

                // 存入接收者集邮册 (Sender's card -> Receiver's collection)
                await upsertCollectionItem(exchange.receiverId, exchange.senderId, senderDesign);

                // 存入发送者集邮册 (Receiver's card -> Sender's collection)
                await upsertCollectionItem(exchange.senderId, exchange.receiverId, receiverDesign);

                // 3. 更新状态
                await tx.postcard_exchanges.update({
                    where: { id: exchangeId },
                    data: { status: 'ACCEPTED' }
                })

                // 4. 发送通知给发送者
                await tx.notifications.create({
                    data: {
                        id: crypto.randomUUID(),
                        userId: exchange.senderId,
                        type: NotificationType.POSTCARD_EXCHANGE_ACCEPT,
                        title: '名信片交换成功',
                        message: `对方接受了你的交换请求，新的名信片已存入“青鸟集”。`,
                        relatedUserId: exchange.receiverId,
                        relatedExchangeId: exchangeId,
                        updatedAt: new Date()
                    }
                })
            })

            return NextResponse.json({ success: true, message: '交换成功！已存入青鸟集' })
        }

        return NextResponse.json({ success: false, error: '无效的操作' }, { status: 400 })

    } catch (error: any) {
        console.error('Update exchange error:', error)
        return NextResponse.json({ success: false, error: error.message || '操作失败' }, { status: 500 })
    }
}

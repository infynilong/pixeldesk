import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthFromRequest } from '@/lib/serverAuth'
import prisma from '@/lib/db'

/**
 * GET - 获取今日步数排行榜
 */
export async function GET(request: NextRequest) {
    try {
        const authResult = await verifyAuthFromRequest(request)
        if (!authResult.success || !authResult.user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }
        const user = authResult.user
        const today = new Date().toISOString().split('T')[0]

        // 1. 获取今日排名前 10 的玩家
        const topPlayers = await (prisma as any).player_steps.findMany({
            where: { date: today },
            orderBy: { steps: 'desc' },
            take: 10,
            include: {
                users: {
                    select: {
                        name: true,
                        avatar: true
                    }
                }
            }
        })

        // 2. 获取当前玩家的排名
        // 注意：在大数据量下应使用原生 SQL ROW_NUMBER()，
        // 这里为了简单，先用查询方式
        const allStepsToday = await (prisma as any).player_steps.findMany({
            where: { date: today },
            orderBy: { steps: 'desc' },
            select: { userId: true }
        })

        const myIndex = allStepsToday.findIndex((s: any) => s.userId === user.id)
        const myRank = myIndex !== -1 ? myIndex + 1 : 0

        const mySteps = await (prisma as any).player_steps.findUnique({
            where: {
                userId_date: {
                    userId: user.id,
                    date: today
                }
            }
        })

        // 3. 获取过去 7 天的历史数据（用于展示趋势）
        const history = await (prisma as any).player_steps.findMany({
            where: {
                userId: user.id
            },
            orderBy: { date: 'desc' },
            take: 7
        })

        return NextResponse.json({
            success: true,
            data: {
                today: topPlayers.map((p: any, index: number) => ({
                    rank: index + 1,
                    userId: p.userId,
                    name: p.users.name,
                    avatar: p.users.avatar,
                    steps: p.steps
                })),
                myStatus: {
                    rank: myRank,
                    steps: mySteps?.steps || 0,
                    distance: mySteps?.distance || 0
                },
                history: history.map((h: any) => ({
                    date: h.date,
                    steps: h.steps
                })).reverse()
            }
        })
    } catch (error) {
        console.error('Fetch steps leaderboard error:', error)
        return NextResponse.json({
            success: false,
            error: 'Internal server error'
        }, { status: 500 })
    }
}

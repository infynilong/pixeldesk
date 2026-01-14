import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
    try {
        // 获取最近 14 天的统计数据
        const stats = await prisma.ai_usage.findMany({
            orderBy: { date: 'desc' },
            take: 14,
            include: {
                users: {
                    select: {
                        name: true,
                    }
                }
            }
        })

        // 按日期分组汇总
        const dailySummary = stats.reduce((acc: any, curr: any) => {
            const date = curr.date
            if (!acc[date]) {
                acc[date] = {
                    date,
                    totalCount: 0,
                    totalTokens: 0,
                    promptTokens: 0,
                    completionTokens: 0,
                    userCount: 0,
                    uniqueUsers: new Set()
                }
            }
            acc[date].totalCount += curr.count
            acc[date].totalTokens += (curr.totalTokens || 0)
            acc[date].promptTokens += (curr.promptTokens || 0)
            acc[date].completionTokens += (curr.completionTokens || 0)
            acc[date].uniqueUsers.add(curr.userId)
            acc[date].userCount = acc[date].uniqueUsers.size
            return acc
        }, {})

        const formattedSummary = Object.values(dailySummary).sort((a: any, b: any) =>
            b.date.localeCompare(a.date)
        ).map((item: any) => {
            const { uniqueUsers, ...rest } = item
            return rest
        })

        return NextResponse.json({
            success: true,
            summary: formattedSummary,
            details: stats.slice(0, 50) // 返回最近50条明细
        })
    } catch (error) {
        console.error('Fetch AI Usage Error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

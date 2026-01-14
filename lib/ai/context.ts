import { prisma } from '@/lib/db'

/**
 * 收集系统实时上下文，供 AI 决策使用
 * 只读权限，确保数据安全
 */
export async function getSystemContext() {
    try {
        // 1. 获取在线用户数量和名单 (限制前10个)
        const onlineUsers = await (prisma as any).user_online_status.findMany({
            where: { isOnline: true },
            take: 10,
            include: {
                users: {
                    select: { name: true }
                }
            }
        }) as any[]

        // 2. 获取工位状态概览
        const totalDesks = 1000 // 假设总数
        const occupiedDesks = await prisma.user_workstations.count({
            where: {
                OR: [
                    { expiresAt: null },
                    { expiresAt: { gt: new Date() } }
                ]
            }
        })

        // 3. 获取最近的动态 (可选，限制前5条)
        const latestPosts = await (prisma as any).posts.findMany({
            where: { isPublic: true, isDraft: false },
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: {
                users: { select: { name: true } },
                content: true,
                createdAt: true
            }
        }) as any[]

        // 格式化上下文
        return {
            time: new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
            onlineCount: onlineUsers.length,
            onlineSample: onlineUsers.map((u: any) => u.users.name).join(', '),
            workstationStats: `总计 ${totalDesks} 个工位，当前已占用 ${occupiedDesks} 个`,
            latestBuzz: latestPosts.map((p: any) => `${p.users.name}刚才说: "${p.content.substring(0, 30)}..."`).join('\n')
        }
    } catch (error) {
        console.error('Error gathering system context:', error)
        return null
    }
}

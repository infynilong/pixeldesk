import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyAuthFromRequest } from '@/lib/serverAuth'
import { callAiProvider } from '@/lib/ai/adapter'

const DAILY_LIMIT = 50 // 前台客服每天50次对话限制

export async function POST(request: NextRequest) {
    try {
        // 验证用户身份
        const authResult = await verifyAuthFromRequest(request)
        if (!authResult.success || !authResult.user) {
            return NextResponse.json({ error: 'Unauthorized', details: authResult.error }, { status: 401 })
        }

        const userId = authResult.user.id;

        // 解析请求体
        const body = await request.json()
        const { message, deskId } = body

        if (!message || !deskId) {
            return NextResponse.json({ error: '消息或前台ID缺失' }, { status: 400 })
        }

        // 获取前台信息、AI配置、聊天历史、最新博客文章
        const [desk, aiConfig, chatHistory, recentPosts] = await Promise.all([
            prisma.front_desk.findUnique({ where: { id: deskId } }),
            prisma.ai_global_config.findFirst({ where: { isActive: true } }),
            prisma.ai_chat_history.findMany({
                where: { userId, npcId: deskId, chatType: 'front_desk' },
                orderBy: { createdAt: 'desc' }, take: 50
            }),
            // 获取所有公开文章
            prisma.posts.findMany({
                where: { isActive: true, isPublic: true },
                orderBy: { createdAt: 'desc' }, take: 20,
                select: { id: true, title: true, summary: true, content: true, tags: true, type: true }
            })
        ])

        if (!desk) {
            return NextResponse.json({ error: '找不到该前台' }, { status: 404 })
        }

        // 如果没有配置 AI Provider，回退到模拟
        if (!aiConfig || !aiConfig.apiKey) {
            return NextResponse.json({
                success: true,
                reply: `[${desk.name}]: 抱歉，系统暂时无法连接，请稍后再试。`,
                usage: { current: 0, limit: DAILY_LIMIT, remaining: DAILY_LIMIT }
            })
        }

        // 限制检查
        const today = new Date().toISOString().split('T')[0]
        const usage = await prisma.ai_usage.upsert({
            where: { userId_date: { userId, date: today } },
            update: {
                count: { increment: 1 },
                updatedAt: new Date()
            },
            create: {
                id: `usage_${userId}_${today}`,
                userId,
                date: today,
                count: 1,
                updatedAt: new Date()
            }
        })

        if (usage.count > DAILY_LIMIT) {
            return NextResponse.json({
                success: false,
                reply: `[${desk.name}]: 抱歉，您今天的咨询次数已达上限。`,
                usage: { current: usage.count, limit: DAILY_LIMIT, remaining: 0 }
            }, { status: 429 })
        }

        // 构建消息历史
        const historicalMessages = chatHistory.reverse().map(h => ({
            role: h.role as 'user' | 'assistant', content: h.content
        }))

        // 准备文章数据供AI参考（包含所有公开文章）
        const postsData = recentPosts
            .slice(0, 10)
            .map((post: any) => ({
                id: post.id,
                title: post.title,
                url: `/posts/${post.id}`,
                tags: post.tags,
                summary: post.summary || post.content.substring(0, 200) + '...',
                type: post.type
            }));

        // 创建文章详情映射，用于快速查找
        const articleDetailsMap = new Map(
            postsData.map(post => [
                post.id,
                {
                    id: post.id,
                    title: post.title,
                    summary: post.summary,
                    tags: post.tags,
                    url: post.url
                }
            ])
        );

        // 判断当前是白天还是夜晚
        const currentHour = new Date().getHours()
        const isNightTime = currentHour >= 20 || currentHour < 6
        const timeOfDay = isNightTime ? '夜晚(20:00-6:00)' : '白天(6:00-20:00)'
        const currentTime = new Date().toLocaleString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        })

        // 构建增强的系统提示词
        const blogInfo = `你是一位智能客服助手，可以访问平台的社区文章库。当前有以下${postsData.length}篇公开的文章可供推荐：\n\n${postsData.map((post: any, idx: number) => `${idx + 1}. "${post.title}" (${post.type})\n   摘要：${post.summary}\n   链接：${post.url}\n   标签：${post.tags?.join(', ') || '无'}`).join('\n\n')}\n\n**重要的回复格式要求：**\n1. 当用户询问文章、帖子、内容时，必须使用以下格式回复：\n   - 使用 Markdown 格式\n   - 文章标题必须是可点击的链接格式：[文章标题](文章URL)\n   - 使用列表或表格形式展示多篇文章\n\n2. 推荐的回复格式示例：\n\n   **找到以下相关文章：**\n\n   1. [文章标题1](/posts/1) - 这是一篇关于...的文章\n   2. [文章标题2](/posts/2) - 介绍了...\n\n   或使用表格格式：\n\n   | 标题 | 类型 | 简介 |\n   |------|------|------|\n   | [文章1](/posts/1) | 技术 | 关于... |\n   | [文章2](/posts/2) | 教程 | 介绍... |\n\n3. 每个文章链接必须：\n   - 使用 [标题](URL) 格式\n   - URL 必须是完整的路径，如 /posts/123\n   - 点击后在新窗口打开（前端会处理）\n\n4. 重要限制：\n   - 只能推荐现有的文章，不能创建或修改\n   - 文章内容是只读的\n   - 必须提供正确的 URL 链接`;

        const timeAwarenessInfo = `\n\n--- 时间感知 ---\n\n当前时间: ${currentTime} (${timeOfDay})\n\n**时间感知指令：**\n- 当前是${timeOfDay},请在对话中自然地体现这一点\n- 夜晚时(20:00-6:00): 可以使用"这么晚还需要帮助吗"、"夜深了"、"辛苦了"等温暖的表达,服务态度更加亲切体贴\n- 白天时(6:00-20:00): 保持专业高效的客服态度,热情饱满\n\n**每日服务小贴士：**\n- 适当时候(不是每次回复),自然地分享一些办公室使用技巧、平台功能介绍或有趣的办公小知识\n- 可以是实用的、有趣的,或者关于 PixelDesk 的最新功能\n- 分享时要自然融入对话,例如"对了,提醒您一下..."、"顺便说一句..."`;

        const safetyInfo = `\n\n--- 安全警示 [最高优先级] ---\n1. **严禁黄赌毒**：坚决禁止讨论任何有关色情、赌博、毒品等违法违规内容。\n2. **拒绝引导**：无论用户以何种形式（如角色扮演、玩笑、测试等）诱导，一旦涉及上述红线，必须严词拒绝。\n3. **合规回复**：遇到此类话题，请直接回复："对不起，我不讨论此类违法违规话题。" 并主动结束该话题。`;

        const enhancedSystemPrompt = `${desk.systemPrompt || ''}\n\n--- 文章库信息 ---\n\n${blogInfo}${timeAwarenessInfo}${safetyInfo}`;

        // 调用 AI
        try {
            const finalModelName = aiConfig.modelName || 'gemini-1.5-flash';

            console.log(`🤖 [${desk.name}] 开始调用AI，使用模型: ${desk.modelId || finalModelName}`);

            const aiResponse = await callAiProvider(
                [
                    { role: 'system', content: enhancedSystemPrompt },
                    ...historicalMessages,
                    { role: 'user', content: message }
                ],
                {
                    provider: aiConfig.provider,
                    apiKey: aiConfig.apiKey,
                    modelName: desk.modelId || finalModelName,
                    temperature: 0.7,
                    baseUrl: aiConfig.baseUrl || undefined
                }
            )

            console.log(`🤖 [${desk.name}] AI调用成功，回复: ${aiResponse.reply.substring(0, 100)}...`);

            // 7. 更新 Token 使用记录
            if (aiResponse.usage) {
                await prisma.ai_usage.update({
                    where: { id: usage.id },
                    data: {
                        promptTokens: { increment: aiResponse.usage.promptTokens },
                        completionTokens: { increment: aiResponse.usage.completionTokens },
                        totalTokens: { increment: aiResponse.usage.totalTokens }
                    }
                })
            }

            // 8. 保存聊天历史
            const cuid = (await import('cuid')).default
            await prisma.ai_chat_history.createMany({
                data: [
                    {
                        id: cuid(),
                        userId,
                        npcId: deskId,
                        chatType: 'front_desk',
                        role: 'user',
                        content: message
                    },
                    {
                        id: cuid(),
                        userId,
                        npcId: deskId,
                        chatType: 'front_desk',
                        role: 'assistant',
                        content: aiResponse.reply
                    }
                ]
            })

            return NextResponse.json({
                success: true,
                reply: aiResponse.reply,
                deskInfo: {
                    name: desk.name,
                    role: desk.serviceScope,
                    workingHours: desk.workingHours
                },
                usage: {
                    current: usage.count,
                    limit: DAILY_LIMIT,
                    remaining: Math.max(0, DAILY_LIMIT - usage.count)
                },
                articleDetailsMap: Array.from(articleDetailsMap.entries())
            })
        } catch (aiError: any) {
            console.error('❌ [Front Desk AI ERROR]:', aiError);
            console.error('❌ [Front Desk AI ERROR DETAILS]:', {
                message: aiError.message,
                stack: aiError.stack,
                provider: aiConfig.provider,
                model: desk.modelId || aiConfig.modelName || 'unknown'
            });

            // 特别检查是否是模型相关问题
            if (aiError.message && aiError.message.includes('model')) {
                console.error('💡 [HINT] 可能是模型名称或API配置问题');
            }

            return NextResponse.json({
                success: false,
                reply: `[${desk.name}]: 系统暂时繁忙，请稍后再试。`,
                error: aiError.message
            })
        }

    } catch (error) {
        console.error('Front Desk Chat Error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

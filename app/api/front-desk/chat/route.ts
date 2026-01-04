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

        // 构建增强的系统提示词
        const blogInfo = `你是一位智能客服助手，可以访问平台的社区文章库。当前有以下${postsData.length}篇公开的文章可供推荐：\n\n${postsData.map((post: any, idx: number) => `${idx + 1}. "${post.title}" (${post.type})\n   摘要：${post.summary}\n   链接：${post.url}\n   标签：${post.tags?.join(', ') || '无'}`).join('\n\n')}\n\n当用户询问相关问题、寻求建议或对某些话题感兴趣时，你可以适当推荐相关的文章，并直接提供文章链接（URL）。\n\n重要限制：你只能推荐现有的文章，不能创建或修改。文章内容是只读的。`;

        const enhancedSystemPrompt = `${desk.systemPrompt || ''}\n\n--- 文章库信息 ---\n\n${blogInfo}`;

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
            await prisma.ai_chat_history.createMany({
                data: [
                    {
                        id: `chat_${Date.now()}_user`,
                        userId,
                        npcId: deskId,
                        chatType: 'front_desk',
                        role: 'user',
                        content: message
                    },
                    {
                        id: `chat_${Date.now()}_assistant`,
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

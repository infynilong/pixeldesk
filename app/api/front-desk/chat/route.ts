import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyAuthFromRequest } from '@/lib/serverAuth'
import { callAiProvider } from '@/lib/ai/adapter'

const DAILY_LIMIT = 50 // 前台客服每天50次对话限制

export async function POST(request: NextRequest) {
    try {
        // 1. 验证用户身份
        const authResult = await verifyAuthFromRequest(request)
        if (!authResult.success || !authResult.user) {
            console.warn('⚠️ [Front Desk Chat] 身份验证失败:', authResult.error);
            return NextResponse.json({ error: 'Unauthorized', details: authResult.error }, { status: 401 })
        }

        const userId = authResult.user.id;

        // 2. 解析请求体
        const body = await request.json()
        const { message, deskId } = body

        if (!message || !deskId) {
            return NextResponse.json({ error: '消息或前台ID缺失' }, { status: 400 })
        }

        // 3. 获取前台信息、AI配置、聊天历史
        const [desk, aiConfig, chatHistory] = await Promise.all([
            prisma.front_desk.findUnique({ where: { id: deskId } }),
            prisma.ai_global_config.findFirst({ where: { isActive: true } }),
            // 加载最近50条聊天历史
            prisma.ai_chat_history.findMany({
                where: {
                    userId,
                    npcId: deskId,
                    chatType: 'front_desk'
                },
                orderBy: { createdAt: 'desc' },
                take: 50
            })
        ])

        if (!desk) {
            return NextResponse.json({ error: '找不到该前台' }, { status: 404 })
        }

        // 如果没有配置 AI Provider，回退到模拟
        if (!aiConfig || !aiConfig.apiKey) {
            console.warn('⚠️ [Front Desk Chat] 未配置 AI API Key，回退到模拟模式');
            return NextResponse.json({
                success: true,
                reply: `[${desk.name}]: 抱歉，系统暂时无法连接，请稍后再试。如有紧急问题，请联系管理员。`,
                usage: { current: 0, limit: DAILY_LIMIT, remaining: DAILY_LIMIT }
            })
        }

        // 4. 限制检查
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

        const currentLimit = DAILY_LIMIT;

        if (usage.count > currentLimit) {
            return NextResponse.json({
                success: false,
                reply: `[${desk.name}]: 抱歉，您今天的咨询次数已达上限。请明天再来，或通过其他方式联系我们。`,
                error: 'Limit exceeded',
                usage: {
                    current: usage.count,
                    limit: currentLimit,
                    remaining: 0
                }
            }, { status: 429 })
        }

        // 5. 构建消息历史
        const historicalMessages = chatHistory.reverse().map(h => ({
            role: h.role as 'user' | 'assistant',
            content: h.content
        }))

        console.log(`📞 [${desk.name}] 加载了 ${historicalMessages.length} 条历史消息`)

        // 6. 调用 AI
        try {
            const finalModelName = aiConfig.modelName || (
                aiConfig.provider === 'deepseek' ? 'deepseek-chat' :
                    aiConfig.provider === 'siliconflow' ? 'deepseek-ai/DeepSeek-V3' :
                        'gemini-1.5-flash'
            );

            const messagesToSend = [
                { role: 'system', content: desk.systemPrompt },
                ...historicalMessages,
                { role: 'user', content: message }
            ]

            console.log(`🤖 [${desk.name}] 发送给AI: 系统提示词(1条) + 历史消息(${historicalMessages.length}条) + 新消息(1条) = 共${messagesToSend.length}条`)

            const aiResponse = await callAiProvider(
                messagesToSend,
                {
                    provider: aiConfig.provider,
                    apiKey: aiConfig.apiKey,
                    modelName: desk.modelId || finalModelName, // 优先使用前台配置的modelId
                    temperature: 0.7, // 客服固定温度
                    baseUrl: aiConfig.baseUrl || undefined
                }
            )

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
                    limit: currentLimit,
                    remaining: Math.max(0, currentLimit - usage.count)
                }
            })
        } catch (aiError: any) {
            console.error('❌ [Front Desk AI ERROR]:', aiError);
            return NextResponse.json({
                success: false,
                reply: `[${desk.name}]: 系统暂时繁忙，请稍后再试。给您带来不便，敬请谅解。`,
                error: aiError.message
            })
        }

    } catch (error) {
        console.error('Front Desk Chat Error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

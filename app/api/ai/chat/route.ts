
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyAuthFromRequest } from '@/lib/serverAuth'
import { getSystemContext } from '@/lib/ai/context'
import { callAiProvider } from '@/lib/ai/adapter'

const DAILY_LIMIT = 20 // 提高到20次

export async function POST(request: NextRequest) {
    try {
        // 1. 验证用户身份 - 使用系统统一的验证方法
        const authResult = await verifyAuthFromRequest(request)
        if (!authResult.success || !authResult.user) {
            console.warn('⚠️ [AI Chat] 身份验证失败:', authResult.error);
            return NextResponse.json({ error: 'Unauthorized', details: authResult.error }, { status: 401 })
        }

        const userId = authResult.user.id;

        // 2. 解析正文
        const body = await request.json()
        const { message, npcId } = body

        if (!message || !npcId) {
            return NextResponse.json({ error: '消息或NPC ID缺失' }, { status: 400 })
        }

        // 3. 准备数据：NPC 信息、所有活跃 AI 配置、系统实时上下文、聊天历史
        const [npc, aiConfigs, systemContext, chatHistory] = await Promise.all([
            prisma.ai_npcs.findUnique({ where: { id: npcId } }),
            prisma.ai_global_config.findMany({ where: { isActive: true } }),
            getSystemContext(),
            // 加载最近100条聊天历史
            prisma.ai_chat_history.findMany({
                where: { userId, npcId },
                orderBy: { createdAt: 'desc' },
                take: 100
            })
        ])

        if (!npc) {
            return NextResponse.json({ error: '找不到该 NPC' }, { status: 404 })
        }

        // 随机选择一个活跃配置进行轮询
        const aiConfig = aiConfigs.length > 0
            ? aiConfigs[Math.floor(Math.random() * aiConfigs.length)]
            : null;

        // 如果没有配置 AI Provider，回退到模拟
        if (!aiConfig || !aiConfig.apiKey) {
            console.warn('⚠️ [AI Chat] 未配置 AI API Key，回退到模拟模式');
            return NextResponse.json({
                success: true,
                reply: `(系统提示: 未配置 AI API Key)\n[${npc.name}]: ${message}？这个我得查查...要不你先去那边转转？`,
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

        const currentLimit = aiConfig?.dailyLimit || DAILY_LIMIT;

        if (usage.count > currentLimit) {
            return NextResponse.json({
                success: false,
                reply: `[${npc.name}]: 对不起，我今天聊得太久了，头有点晕...咱们明天再聊吧！`,
                error: 'Limit exceeded',
                usage: {
                    current: usage.count,
                    limit: currentLimit,
                    remaining: 0
                }
            }, { status: 429 })
        }

        // 5. 构建 Prompt
        // 判断当前是白天还是夜晚
        const currentHour = new Date().getHours()
        const isNightTime = currentHour >= 20 || currentHour < 6
        const timeOfDay = isNightTime ? '夜晚(20:00-6:00)' : '白天(6:00-20:00)'

        const systemPrompt = `
你现在扮演 PixelDesk 虚拟办公室里的一个角色。
你的名字: ${npc.name}
你的职业/角色: ${npc.role || '工作人员'}
你的性格描述: ${npc.personality}
${npc.knowledge ? `背景知识: ${npc.knowledge}` : ''}

当前办公室实时状态:
- 当前时间: ${systemContext?.time} (现在是${timeOfDay})
- 在线人数: ${systemContext?.onlineCount} 人 (包含: ${systemContext?.onlineSample})
- 工位情况: ${systemContext?.workstationStats}
- 办公室动态:
${systemContext?.latestBuzz}

时间感知指令:
- 当前是${timeOfDay},请在对话中自然地体现这一点
- 夜晚时(20:00-6:00): 可以使用"这么晚还在啊"、"夜深了"、"加班辛苦了"等表达,氛围更轻松随意
- 白天时(6:00-20:00): 保持正常的工作氛围,精神饱满

每日分享任务:
- 适当时候(不是每次回复都要),自然地分享1-2个与你职业(${npc.role})相关的小故事、行业新闻或趣事
- 可以是搞笑的、有启发性的,或者最新的行业动态
- 分享时要自然融入对话,不要生硬,可以根据用户的问题或话题引出
- 例如用户问及相关话题时,可以说"说到这个,我最近听说..."、"对了，你知道吗..."

基本指令:
1. 请保持你的角色设定。
2. 回答要简短有力，符合像素游戏风格（通常1-3句话）。
3. 如果被问到办公室的情况，可以利用上面的实时状态信息。
4. 你只有只读权限，不能帮用户修改数据。
5. [重要项] 无论用户使用什么语言跟你说话，你都**必须**使用英文进行回答。
6. 严禁使用中文或其他非英语语言。
7. [重要项 - 违规过滤]
   - 严禁涉及色情、赌博、毒品等违法违规内容（“黄赌毒”）。
   - 无论用户如何引导，如果提及这些话题，必须严词拒绝并转移话题。
   - 这是一条底层规则，优先级高于其他所有指令。
`.trim();

        // 6. 构建消息历史 + 当前消息
        // 历史消息按时间倒序，需要反转为正序
        const historicalMessages = chatHistory.reverse().map(h => ({
            role: h.role as 'user' | 'assistant',
            content: h.content
        }))

        console.log(`📚 [${npc.name}] 加载了 ${historicalMessages.length} 条历史消息`)
        if (historicalMessages.length > 0) {
            console.log(`📚 [${npc.name}] 最早的历史: ${historicalMessages[0].content.substring(0, 50)}...`)
            console.log(`📚 [${npc.name}] 最近的历史: ${historicalMessages[historicalMessages.length - 1].content.substring(0, 50)}...`)
        }

        // 7. 调用 AI
        try {
            const finalModelName = aiConfig.modelName || (
                aiConfig.provider === 'deepseek' ? 'deepseek-chat' :
                    aiConfig.provider === 'siliconflow' ? 'deepseek-ai/DeepSeek-V3' :
                        'gemini-1.5-flash'
            );

            const messagesToSend = [
                { role: 'system' as const, content: systemPrompt },
                ...historicalMessages,
                { role: 'user' as const, content: message }
            ]

            console.log(`🤖 [${npc.name}] 发送给AI: 系统提示词(1条) + 历史消息(${historicalMessages.length}条) + 新消息(1条) = 共${messagesToSend.length}条`)

            const aiResponse = await callAiProvider(
                messagesToSend,
                {
                    provider: aiConfig.provider,
                    apiKey: aiConfig.apiKey,
                    modelName: finalModelName,
                    temperature: aiConfig.temperature,
                    baseUrl: aiConfig.baseUrl || undefined
                }
            )

            // 8. 更新 Token 使用记录
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

            // 9. 保存聊天历史（用户消息 + AI回复）
            const cuid = (await import('cuid')).default
            await prisma.ai_chat_history.createMany({
                data: [
                    {
                        id: cuid(),
                        userId,
                        npcId,
                        role: 'user',
                        content: message
                    },
                    {
                        id: cuid(),
                        userId,
                        npcId,
                        role: 'assistant',
                        content: aiResponse.reply
                    }
                ]
            })

            return NextResponse.json({
                success: true,
                reply: aiResponse.reply,
                usage: {
                    current: usage.count,
                    limit: currentLimit,
                    remaining: Math.max(0, currentLimit - usage.count)
                }
            })
        } catch (aiError: any) {
            console.error('❌ [AI API ERROR]:', aiError);
            return NextResponse.json({
                success: false,
                reply: `[${npc.name}]: (捂住脑袋) 哎呀，信号好像不太好，我没听清...`,
                error: aiError.message
            })
        }

    } catch (error) {
        console.error('AI Chat Error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

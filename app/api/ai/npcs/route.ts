import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/ai/npcs - 获取所有活跃的 AI NPC
export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const force = url.searchParams.get('force') === 'true';

        // 🛠️ 协调逻辑：确保特定的核心预设 NPC 存在于数据库中
        const requiredPresets = [
            {
                id: 'npc_sarah',
                name: 'Sarah',
                role: 'Front Desk',
                sprite: 'Female_Conference_woman_idle_48x48',
                x: 1200,
                y: 600,
                isFixed: true,
                personality: 'Warm and professional front desk receptionist for PixelDesk.',
                knowledge: 'Can help with workstation binding and general office navigation.',
                greeting: 'Welcome to PixelDesk! I am Sarah. How can I assist you today?'
            },
            {
                id: 'npc_arthur',
                name: 'Arthur',
                role: 'Financial Analyst',
                sprite: 'Male_Ash_idle_48x48',
                x: 1500,
                y: 800,
                isFixed: false,
                personality: 'A polite but firm British financial analyst. He ONLY speaks English and politely prompts users to speak English.',
                knowledge: 'Expert in market trends and company budgets.',
                greeting: 'Good morning! I am Arthur. Please, let us keep our conversation in English for clarity, shall we?'
            },
            {
                id: 'npc_adam',
                name: 'Adam',
                role: 'IT Support',
                sprite: 'Male_Adam_idle_48x48',
                x: 1000,
                y: 700,
                isFixed: false,
                personality: 'Tech-savvy and helpful, but slightly overwhelmed by ticket requests.',
                knowledge: 'Expert in network configuration and workstation troubleshooting.',
                greeting: 'Have you tried turning it off and on again?'
            },
            {
                id: 'npc_sophia',
                name: 'Sophia',
                role: 'Creative Director',
                sprite: 'Amelia_idle_48x48',
                x: 2000,
                y: 500,
                isFixed: false,
                personality: 'Inspirational and always looking for new design trends. Loves branding.',
                knowledge: 'Expert in visual identity and UI/UX patterns.',
                greeting: 'The lighting here is just perfect for inspiration!'
            }
        ];

        // 检查哪些预设在数据库中缺失
        const existingNpcs = await prisma.ai_npcs.findMany({ where: { isActive: true } });
        const existingIds = new Set(existingNpcs.map(n => n.id));
        const missingPresets = requiredPresets.filter(p => !existingIds.has(p.id));

        if (missingPresets.length > 0) {
            console.log(`✨ [NPC Sync] 发现数据库缺失核心预设，正在补全: ${missingPresets.map(p => p.name).join(', ')}`);
            await Promise.all(
                missingPresets.map(p => prisma.ai_npcs.create({
                    data: {
                        ...p,
                        updatedAt: new Date()
                    }
                }))
            );
            // 重新刷新列表返回给前端
            const allNpcs = await prisma.ai_npcs.findMany({ where: { isActive: true } });
            return NextResponse.json({ success: true, data: allNpcs });
        }

        return NextResponse.json({ success: true, data: existingNpcs });
    } catch (error: any) {
        console.error('Error fetching NPCs:', error)
        return NextResponse.json({
            error: 'Internal server error',
            details: error.message,
            stack: error.stack
        }, { status: 500 })
    }
}

/**
 * 这是一个快捷初始化 AI 全局配置的接口 (仅限开发模式)
 * 供用户配置 Token 和 Provider
 */
export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { provider, apiKey, modelName, baseUrl, dailyLimit, temperature } = body
        console.log('📡 [AI Config Update] Request Body:', { provider, modelName, baseUrl, dailyLimit, temperature });

        if (!provider || !apiKey) {
            return NextResponse.json({ error: 'Missing provider or apiKey' }, { status: 400 })
        }

        // 确保数值类型正确
        const parsedLimit = typeof dailyLimit === 'number' ? dailyLimit : parseInt(dailyLimit) || 20;

        const config = await prisma.ai_global_config.upsert({
            where: { id: 'global_config' },
            update: {
                provider,
                apiKey,
                modelName: modelName || null,
                baseUrl: baseUrl || null,
                dailyLimit: parsedLimit,
                temperature: temperature !== undefined ? parseFloat(temperature) : 0.7,
                isActive: true,
                updatedAt: new Date()
            },
            create: {
                id: 'global_config',
                provider,
                apiKey,
                modelName: modelName || null,
                baseUrl: baseUrl || null,
                dailyLimit: parsedLimit,
                temperature: temperature !== undefined ? parseFloat(temperature) : 0.7,
                isActive: true,
                updatedAt: new Date()
            }
        })

        console.log('✅ [AI Config Update] Success:', config.id);
        return NextResponse.json({ success: true, config })
    } catch (error: any) {
        console.error('❌ [AI NPC Config POST Error]:', error)
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to update config',
            details: error.toString()
        }, { status: 500 })
    }
}

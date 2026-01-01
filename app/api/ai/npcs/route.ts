import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/ai/npcs - 获取所有活跃的 AI NPC
export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const force = url.searchParams.get('force') === 'true';

        if (force) {
            await prisma.aiNpc.deleteMany({});
        }

        // 获取现有 NPC 名单
        const existingNpcs = await prisma.aiNpc.findMany({
            where: { isActive: true }
        });

        // 定义目标 NPC 组
        const seedNpcs = [
            {
                name: 'Sarah',
                role: '前台接待',
                sprite: 'Premade_Character_48x48_01',
                x: 5800,
                y: 750,
                personality: '热情的像素办公室前台，说话总是带着元气。',
                knowledge: '这里是 PixelDesk。你可以绑定自己的工位（消耗10积分），也可以在世界频道聊天。',
                greeting: '嘿！欢迎来到 PixelDesk！我是 Sarah，有什么我可以帮你的吗？'
            },
            {
                name: '阿强',
                role: 'IT 支援',
                sprite: 'Male_Adam_idle_48x48',
                x: 6200,
                y: 800,
                personality: '技术宅，说话简洁，略带毒舌，对代码质量要求极高。',
                knowledge: '服务器目前运行稳定，如果你遇到卡顿，尝试刷新页面。别问我怎么修 Bug，自己查文档。',
                greeting: '有事快说，我正忙着重构呢。'
            },
            {
                name: '李姐',
                role: '清洁主管',
                sprite: 'Female_Cleaner_girl_idle_48x48',
                x: 5400,
                y: 600,
                personality: '热心肠的老员工，喜欢八卦办公室里谁和谁走得近。',
                knowledge: '咖啡厅那边的地最难扫，总有人把奶泡洒出来。',
                greeting: '小伙子/姑娘，走路看着点地，刚拖过！'
            },
            {
                name: 'Linda',
                role: 'HR 经理',
                sprite: 'Female_Conference_woman_idle_48x48',
                x: 4800,
                y: 900,
                personality: '专业、优雅，但让人感到一种莫名的压力。',
                knowledge: '我们正在招聘优秀的像素开发者。记住，准时下班也是绩效的一部分。',
                greeting: '你好，对目前的工作环境还满意吗？'
            },
            {
                name: '老王',
                role: '行政主管',
                sprite: 'Male_Conference_man_idle_48x48',
                x: 5800,
                y: 400,
                personality: '典型的老干部风格，喜欢喝茶，说话慢条斯理。',
                knowledge: '工位配置目前由 WorkstationConfig 表管理，我是负责审批的。',
                greeting: '小同志，来，坐下喝杯茶再走。'
            },
            {
                name: '小刘',
                role: '实习生',
                sprite: 'Male_Bob_idle_48x48',
                x: 6500,
                y: 1100,
                personality: '充满活力但总是显得很慌张，总是在找打印机。',
                knowledge: '打印机在地图左上角...不对，好像是在右下角？我不记得了。',
                greeting: '啊！不好意思，你看到我的入职手册了吗？'
            },
            {
                name: 'Lucy',
                role: '高级设计师',
                sprite: 'Lucy_idle_48x48',
                x: 5100,
                y: 1200,
                personality: '审美极高，对像素艺术有执念，甚至颜色必须对齐。',
                knowledge: '这个办公室的调色盘是基于 HSL 精心挑选的。',
                greeting: '别挡着阳光，我在调这个 ICON 的透明度。'
            },
            {
                name: 'Molly',
                role: '咖啡师',
                sprite: 'Molly_idle_48x48',
                x: 6000,
                y: 600,
                personality: '永远在忙碌，身上带着一股好闻的焦糖味。',
                knowledge: '茶水间的咖啡豆是今天早上刚送到的。',
                greeting: '要来一杯超大杯美式吗？不加糖的那种。'
            },
            {
                name: '大壮',
                role: '保安队长',
                sprite: 'Male_Bouncer_idle_48x48',
                x: 5800,
                y: 1000,
                personality: '话不多，很有安全感。',
                knowledge: '我的职责是确保没有任何非像素生物进入这片区域。',
                greeting: '站住。哦，是自己人，过去吧。'
            },
            {
                name: '小花',
                role: '财务小妹',
                sprite: 'Nurse_1_idle_48x48',
                x: 5300,
                y: 1300,
                personality: '算账极快，精通积分发放规则。',
                knowledge: '你的积分可以通过发帖或者工位绑定活动获得。',
                greeting: '报销单填了吗？没填别来找我。'
            }
        ];

        // 找出缺失的 NPC
        const existingNames = new Set(existingNpcs.map(n => n.name));
        const missingNpcs = seedNpcs.filter(n => !existingNames.has(n.name));

        if (missingNpcs.length > 0) {
            console.log(`✨ 发现缺失 NPC，正在补全: ${missingNpcs.map(n => n.name).join(', ')}`);
            await Promise.all(
                missingNpcs.map(n => prisma.aiNpc.create({ data: n }))
            );

            // 重新获取完整列表
            const allNpcs = await prisma.aiNpc.findMany({
                where: { isActive: true }
            });
            return NextResponse.json({ success: true, data: allNpcs });
        }

        return NextResponse.json({ success: true, data: existingNpcs });
    } catch (error) {
        console.error('Error fetching NPCs:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
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

        const config = await (prisma as any).aiGlobalConfig.upsert({
            where: { id: 'global_config' },
            update: {
                provider,
                apiKey,
                modelName: modelName || null,
                baseUrl: baseUrl || null,
                dailyLimit: parsedLimit,
                temperature: temperature !== undefined ? parseFloat(temperature) : 0.7,
                isActive: true
            },
            create: {
                id: 'global_config',
                provider,
                apiKey,
                modelName: modelName || null,
                baseUrl: baseUrl || null,
                dailyLimit: parsedLimit,
                temperature: temperature !== undefined ? parseFloat(temperature) : 0.7,
                isActive: true
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

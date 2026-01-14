#!/usr/bin/env node

/**
 * 调试前台聊天API
 * 跳过认证直接测试核心逻辑
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugFrontDeskChat() {
  console.log('🔍 开始调试前台聊天API...\n');

  try {
    // 模拟请求数据
    const userId = 'test_user_123';
    const message = '你好，我想咨询账户问题';
    const deskId = 'desk_emily';

    console.log('📋 测试参数:');
    console.log('- userId:', userId);
    console.log('- message:', message);
    console.log('- deskId:', deskId);

    // 步骤1: 获取前台信息
    console.log('\n1️⃣ 获取前台信息...');
    const desk = await prisma.front_desk.findUnique({
      where: { id: deskId }
    });
    console.log('✅ 前台信息:', desk ? `找到 ${desk.name}` : '未找到');

    // 步骤2: 获取AI配置
    console.log('\n2️⃣ 获取AI配置...');
    const aiConfig = await prisma.ai_global_config.findFirst({
      where: { isActive: true }
    });
    console.log('✅ AI配置:', aiConfig ? {
      provider: aiConfig.provider,
      hasApiKey: !!aiConfig.apiKey,
      modelName: aiConfig.modelName
    } : '未配置');

    // 步骤3: 获取历史记录
    console.log('\n3️⃣ 获取历史记录...');
    const chatHistory = await prisma.ai_chat_history.findMany({
      where: {
        userId,
        npcId: deskId,
        chatType: 'front_desk'
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    console.log(`✅ 历史记录: ${chatHistory.length} 条`);

    // 步骤4: 构建消息
    console.log('\n4️⃣ 构建消息...');
    const historicalMessages = chatHistory.reverse().map(h => ({
      role: h.role,
      content: h.content
    }));

    const finalModelName = aiConfig.modelName || (
      aiConfig.provider === 'deepseek' ? 'deepseek-chat' :
        aiConfig.provider === 'siliconflow' ? 'deepseek-ai/DeepSeek-V3' :
          'gemini-1.5-flash'
    );

    const messagesToSend = [
      { role: 'system', content: desk.systemPrompt },
      ...historicalMessages,
      { role: 'user', content: message }
    ];

    console.log(`✅ 准备发送 ${messagesToSend.length} 条消息`);
    console.log('最后一条消息:', messagesToSend[messagesToSend.length - 1]);

    // 步骤5: 调用AI
    console.log('\n5️⃣ 调用AI...');
    const { callAiProvider } = require('/Users/jiangyilong/project/PixelDesk/lib/ai/adapter');

    const aiResponse = await callAiProvider(
      messagesToSend,
      {
        provider: aiConfig.provider,
        apiKey: aiConfig.apiKey,
        modelName: desk.modelId || finalModelName,
        temperature: 0.7,
        baseUrl: aiConfig.baseUrl || undefined
      }
    );

    console.log('✅ AI回复:', aiResponse.reply);
    console.log('Token使用:', aiResponse.usage);

    console.log('\n🎉 调试完成！AI调用成功');

  } catch (error) {
    console.error('❌ 调试失败:', error.message);
    console.error('堆栈:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

debugFrontDeskChat();

#!/usr/bin/env node

/**
 * 直接测试前台聊天API的完整流程
 * 这将帮助我们确定问题的具体位置
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testFullFrontDeskChat() {
  console.log('🧪 开始完整测试前台聊天API...\n');

  try {
    // 步骤1: 获取AI配置
    console.log('1️⃣ 检查AI全局配置...');
    const aiConfig = await prisma.ai_global_config.findFirst({
      where: { isActive: true }
    });

    if (!aiConfig) {
      console.error('❌ 没有找到AI配置');
      return;
    }

    console.log('✅ AI配置:');
    console.log(`   - Provider: ${aiConfig.provider}`);
    console.log(`   - Model: ${aiConfig.modelName}`);
    console.log(`   - API Key: ${!!aiConfig.apiKey ? '已设置' : '未配置'}`);
    console.log(`   - Base URL: ${aiConfig.baseUrl || '默认'}`);

    // 步骤2: 检查前台
    const deskId = 'desk_emily';
    console.log(`\n2️⃣ 检查前台配置 (${deskId})...`);
    const desk = await prisma.front_desk.findUnique({
      where: { id: deskId }
    });

    if (!desk) {
      console.error(`❌ 前台 ${deskId} 不存在`);
      return;
    }

    console.log('✅ 前台信息:');
    console.log(`   - Name: ${desk.name}`);
    console.log(`   - SystemPrompt: ${desk.systemPrompt ? '已设置' : '未设置'}`);
    console.log(`   - ModelId: ${desk.modelId || '未配置'}`);

    // 步骤3: 测试AI调用
    console.log('\n3️⃣ 测试AI调用...');
    const { callAiProvider } = require('/Users/jiangyilong/project/PixelDesk/lib/ai/adapter');

    const messages = [
      { role: 'system', content: desk.systemPrompt },
      { role: 'user', content: '你好，我想咨询账户问题' }
    ];

    const finalModelName = aiConfig.modelName || (
      aiConfig.provider === 'deepseek' ? 'deepseek-chat' :
        aiConfig.provider === 'siliconflow' ? 'deepseek-ai/DeepSeek-V3' :
          'gemini-1.5-flash'
    );

    console.log(`   - 使用模型: ${desk.modelId || finalModelName}`);
    console.log(`   - 消息数量: ${messages.length}`);

    const aiResponse = await callAiProvider(
      messages,
      {
        provider: aiConfig.provider,
        apiKey: aiConfig.apiKey,
        modelName: desk.modelId || finalModelName,
        temperature: 0.7,
        baseUrl: aiConfig.baseUrl || undefined
      }
    );

    console.log('✅ AI调用成功:');
    console.log(`   - 回复: ${aiResponse.reply}`);
    console.log(`   - Tokens: ${aiResponse.usage.totalTokens}`);

    // 步骤4: 检查路由代码
    console.log('\n4️⃣ 检查路由代码...');
    const fs = require('fs');
    const routeCode = fs.readFileSync('./app/api/front-desk/chat/route.ts', 'utf8');

    if (routeCode.includes('抱歉，系统暂时无法连接')) {
      console.log('⚠️  路由包含回退消息（没有配置AI时会返回）');
      const match = routeCode.match(/if \(!aiConfig \|\| !aiConfig\.apiKey\)/);
      if (match) {
        console.log('✅ 找到了AI配置检查逻辑');
      }
    }

    console.log('\n🎉 所有测试完成！如果API仍然返回错误，问题可能在：');
    console.log('   1. 前端认证问题');
    console.log('   2. 网络请求被拦截');
    console.log('   3. 浏览器缓存问题');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error('堆栈:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testFullFrontDeskChat();

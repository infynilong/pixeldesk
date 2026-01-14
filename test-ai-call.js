/**
 * 测试AI调用脚本
 * 用于验证Deepseek API是否能正常调用
 */

async function testAiCall() {
  console.log('🧪 开始测试AI调用...\n');

  // 模拟前台对话
  const messages = [
    { role: 'system', content: '你是专业的客服代表，专注于解决用户的问题并提供优质服务。请记住，你是PixelDesk的客户服务人员，不是技术支持工程师。你的职责是提供友好、专业的服务。' },
    { role: 'user', content: '你好，我想咨询一下账户问题' }
  ];

  const options = {
    provider: 'deepseek',
    apiKey: 'sk-2dd52a9e18f441e88ade28019334d717',
    modelName: 'deepseek-chat',
    temperature: 0.7
  };

  console.log('📋 测试配置:');
  console.log('- Provider:', options.provider);
  console.log('- Model:', options.modelName);
  console.log('- API Key:', options.apiKey ? '✅ 已设置' : '❌ 未设置');
  console.log('- Messages:', JSON.stringify(messages, null, 2));

  try {
    console.log('\n🚀 发起API请求...');

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${options.apiKey}`
      },
      body: JSON.stringify({
        model: options.modelName,
        messages: messages,
        temperature: options.temperature
      })
    });

    console.log('📡 HTTP 响应状态:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API 错误响应:', errorText);
      return;
    }

    const data = await response.json();
    console.log('✅ API 返回数据:', JSON.stringify(data, null, 2));

    if (data.choices && data.choices.length > 0) {
      const reply = data.choices[0].message.content;
      console.log('\n💬 AI 回复:', reply);
      console.log('\n🎉 测试成功！AI调用正常');
    } else {
      console.error('❌ 未找到AI回复内容');
    }

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error('堆栈跟踪:', error.stack);
  }
}

// 执行测试
testAiCall().catch(console.error);

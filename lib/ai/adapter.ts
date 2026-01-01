export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface AiOptions {
    provider: string;
    apiKey: string;
    modelName: string;
    temperature?: number;
    maxTokens?: number;
    baseUrl?: string;
}

export interface AiResponse {
    reply: string;
    usage: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}

/**
 * AI 请求适配器
 * 支持多供应商扩展
 */
export async function callAiProvider(messages: ChatMessage[], options: AiOptions): Promise<AiResponse> {
    const { provider, apiKey, modelName, temperature, baseUrl } = options;

    switch (provider.toLowerCase()) {
        case 'gemini':
            return callGemini(messages, apiKey, modelName, temperature);
        case 'openai':
        case 'deepseek':
        case 'siliconflow':
            const fallbacks: Record<string, string> = {
                'deepseek': 'https://api.deepseek.com',
                'siliconflow': 'https://api.siliconflow.cn/v1',
                'openai': 'https://api.openai.com/v1'
            };
            const finalBaseUrl = baseUrl || fallbacks[provider.toLowerCase()] || 'https://api.openai.com/v1';

            console.log(`📡 [AI Adapter] Calling OpenAI-Compatible: Provider=${provider}, Model=${modelName}, URL=${finalBaseUrl}`);

            return callOpenAiCompatible(messages, apiKey, modelName, temperature, finalBaseUrl);
        default:
            throw new Error(`Unsupported AI provider: ${provider}`);
    }
}

async function callGemini(messages: ChatMessage[], apiKey: string, model: string, temp = 0.7): Promise<AiResponse> {
    const systemMsg = messages.find(m => m.role === 'system')?.content || '';
    const history = messages
        .filter(m => m.role !== 'system')
        .map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }]
        }));

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemMsg }] },
            contents: history,
            generationConfig: {
                temperature: temp,
                maxOutputTokens: 1000,
            }
        })
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(`Gemini API Error: ${JSON.stringify(err)}`);
    }

    const data = await response.json();
    return {
        reply: data.candidates?.[0]?.content?.parts?.[0]?.text || 'AI 没有返回内容',
        usage: {
            promptTokens: data.usageMetadata?.promptTokenCount || 0,
            completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
            totalTokens: data.usageMetadata?.totalTokenCount || 0
        }
    };
}

async function callOpenAiCompatible(messages: ChatMessage[], apiKey: string, model: string, temp = 0.7, baseUrl = 'https://api.openai.com/v1'): Promise<AiResponse> {
    const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: model,
            messages: messages,
            temperature: temp,
        })
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(`OpenAI-Compatible API Error: ${JSON.stringify(err)}`);
    }

    const data = await response.json();
    return {
        reply: data.choices?.[0]?.message?.content || 'AI 没有返回内容',
        usage: {
            promptTokens: data.usage?.prompt_tokens || 0,
            completionTokens: data.usage?.completion_tokens || 0,
            totalTokens: data.usage?.total_tokens || 0
        }
    };
}

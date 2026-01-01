
import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthFromRequest } from '@/lib/serverAuth'
import { callAiProvider } from '@/lib/ai/adapter'

export async function POST(request: NextRequest) {
    try {
        const authResult = await verifyAuthFromRequest(request)
        if (!authResult.success || !authResult.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { provider, apiKey, modelName, baseUrl } = body

        if (!provider || !apiKey) {
            return NextResponse.json({ error: 'Missing provider or apiKey' }, { status: 400 })
        }

        const defaultModel = provider === 'gemini'
            ? 'gemini-1.5-flash'
            : (provider === 'deepseek' ? 'deepseek-chat' : (provider === 'siliconflow' ? 'deepseek-ai/DeepSeek-V3' : 'gpt-4o-mini'))

        const reply = await callAiProvider(
            [
                { role: 'system', content: 'You are a system tester. Reply with a short confirmation message.' },
                { role: 'user', content: 'Hello, are you working?' }
            ],
            {
                provider,
                apiKey,
                modelName: modelName || defaultModel,
                baseUrl: baseUrl || undefined,
                temperature: 0.7
            }
        )

        return NextResponse.json({ success: true, reply })
    } catch (error: any) {
        console.error('AI Test Error:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

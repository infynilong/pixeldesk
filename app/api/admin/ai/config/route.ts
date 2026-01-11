import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
    try {
        const configs = await prisma.ai_global_config.findMany({
            orderBy: { updatedAt: 'desc' }
        })
        return NextResponse.json({ success: true, data: configs })
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { id, provider, apiKey, modelName, baseUrl, dailyLimit, temperature, isActive } = body

        if (!provider || !apiKey) {
            return NextResponse.json({ error: 'Missing provider or apiKey' }, { status: 400 })
        }

        const configId = id || `config_${provider}_${Date.now()}`

        const config = await prisma.ai_global_config.upsert({
            where: { id: configId },
            update: {
                provider,
                apiKey,
                modelName: modelName || null,
                baseUrl: baseUrl || null,
                dailyLimit: dailyLimit || 20,
                temperature: temperature !== undefined ? parseFloat(temperature) : 0.7,
                isActive: isActive !== undefined ? isActive : true,
                updatedAt: new Date()
            },
            create: {
                id: configId,
                provider,
                apiKey,
                modelName: modelName || null,
                baseUrl: baseUrl || null,
                dailyLimit: dailyLimit || 20,
                temperature: temperature !== undefined ? parseFloat(temperature) : 0.7,
                isActive: isActive !== undefined ? isActive : true,
                updatedAt: new Date()
            }
        })

        return NextResponse.json({ success: true, data: config })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function DELETE(request: Request) {
    try {
        const url = new URL(request.url)
        const id = url.searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: 'Missing config ID' }, { status: 400 })
        }

        await prisma.ai_global_config.delete({
            where: { id }
        })

        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

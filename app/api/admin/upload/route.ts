import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/permissions'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export async function POST(request: NextRequest) {
    try {
        // 验证管理员权限
        await requireAdmin()

        const formData = await request.formData()
        const file = formData.get('file') as File
        const folder = (formData.get('folder') as string) || 'others'

        if (!file) {
            return NextResponse.json(
                { error: 'No file uploaded' },
                { status: 400 }
            )
        }

        // 验证文件类型
        if (!file.type.startsWith('image/')) {
            return NextResponse.json(
                { error: 'Only image files are allowed' },
                { status: 400 }
            )
        }

        // 验证文件大小 (10MB)
        if (file.size > 10 * 1024 * 1024) {
            return NextResponse.json(
                { error: 'File size too large (max 10MB)' },
                { status: 400 }
            )
        }

        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        // 生成唯一文件名
        const timestamp = Date.now()
        const random = Math.floor(Math.random() * 1000)
        const ext = file.name.split('.').pop() || 'png'
        const fileName = `${timestamp}-${random}.${ext}`

        // 确保目录存在
        const uploadDir = join(process.cwd(), 'public', 'assets', folder)
        if (!existsSync(uploadDir)) {
            await mkdir(uploadDir, { recursive: true })
        }

        const filePath = join(uploadDir, fileName)
        await writeFile(filePath, buffer)

        return NextResponse.json({
            success: true,
            url: `/assets/${folder}/${fileName}`
        })

    } catch (error: any) {
        console.error('Upload error:', error)
        return NextResponse.json(
            { error: error.message || 'Upload failed' },
            { status: error.message?.includes('Unauthorized') ? 401 : 500 }
        )
    }
}

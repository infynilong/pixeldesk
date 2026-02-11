import { NextRequest, NextResponse } from 'next/server'
import { readdir, stat } from 'fs/promises'
import { join } from 'path'

// Helper to calculate directory size recursively
async function getDirSize(dirPath: string): Promise<{ size: number, files: number }> {
    try {
        const files = await readdir(dirPath)
        let totalSize = 0
        let totalFiles = 0

        for (const file of files) {
            const filePath = join(dirPath, file)
            const stats = await stat(filePath)

            if (stats.isDirectory()) {
                const subDirStats = await getDirSize(filePath)
                totalSize += subDirStats.size
                totalFiles += subDirStats.files
            } else {
                totalSize += stats.size
                totalFiles += 1
            }
        }

        return { size: totalSize, files: totalFiles }
    } catch (error) {
        console.error(`Error calculating size for ${dirPath}:`, error)
        return { size: 0, files: 0 }
    }
}

export async function GET(request: NextRequest) {
    try {
        const uploadsDir = join(process.cwd(), 'public', 'uploads')

        // Check if directory exists
        try {
            await stat(uploadsDir)
        } catch (e) {
            return NextResponse.json({
                totalSize: 0,
                totalFiles: 0,
                userUsage: {}
            })
        }

        const entries = await readdir(uploadsDir)
        const userUsage: Record<string, { size: number, files: number }> = {}
        let grandTotalSize = 0
        let grandTotalFiles = 0

        for (const entry of entries) {
            const entryPath = join(uploadsDir, entry)
            // Skip hidden files/dirs
            if (entry.startsWith('.')) continue;

            const stats = await stat(entryPath)

            if (stats.isDirectory()) {
                const { size, files } = await getDirSize(entryPath)
                userUsage[entry] = { size, files }
                grandTotalSize += size
                grandTotalFiles += files
            } else {
                // Root level files (shouldn't be many, but count them)
                grandTotalSize += stats.size
                grandTotalFiles += 1
                // Add to a "misc" or "root" category if needed, or just strict user folders
                // For now, let's attribute root files to 'system' or just ignore in user breakdown
                if (!userUsage['system']) {
                    userUsage['system'] = { size: 0, files: 0 }
                }
                userUsage['system'].size += stats.size
                userUsage['system'].files += 1
            }
        }

        // Rename 'assets' to 'System/Legacy' for better clarity if it exists
        if (userUsage['assets']) {
            userUsage['System (Legacy)'] = userUsage['assets']
            delete userUsage['assets']
        }

        return NextResponse.json({
            totalSize: grandTotalSize,
            totalFiles: grandTotalFiles,
            userUsage
        })

    } catch (error: any) {
        console.error('Storage stats error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to fetch storage stats' },
            { status: 500 }
        )
    }
}

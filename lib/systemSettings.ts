import prisma from './db'

/**
 * 获取系统配置，优先从数据库获取，否则从环境变量获取
 */
export async function getSystemSetting(key: string, defaultValue?: string): Promise<string> {
    try {
        const setting = await prisma.system_config.findUnique({
            where: { key }
        })

        if (setting) {
            return setting.value
        }

        // 如果数据库没有，尝试从环境变量获取
        const envValue = process.env[key]
        if (envValue) {
            return envValue
        }

        return defaultValue || ''
    } catch (error) {
        console.error(`Error getting system setting ${key}:`, error)
        return process.env[key] || defaultValue || ''
    }
}

/**
 * 设置系统配置
 */
export async function setSystemSetting(key: string, value: string, description?: string, category: string = 'general') {
    return await prisma.system_config.upsert({
        where: { key },
        update: {
            value,
            description,
            category,
            updatedAt: new Date()
        },
        create: {
            id: crypto.randomUUID(),
            key,
            value,
            description,
            category,
            updatedAt: new Date()
        }
    })
}

/**
 * 批量获取分类设置
 */
export async function getSettingsByCategory(category: string) {
    const settings = await prisma.system_config.findMany({
        where: { category }
    })

    return settings.reduce((acc, setting) => {
        acc[setting.key] = setting.value
        return acc
    }, {} as Record<string, string>)
}

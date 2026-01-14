import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/admin/permissions'


// GET - 获取品牌配置
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const locale = searchParams.get('locale') || 'zh-CN'
    const key = searchParams.get('key')

    if (key) {
      // 获取单个配置项
      const config = await prisma.brand_config.findUnique({
        where: {
          key_locale: {
            key,
            locale
          }
        }
      })

      if (!config) {
        // 如果找不到指定语言的配置,尝试获取默认语言
        const fallbackConfig = await prisma.brand_config.findFirst({
          where: { key },
          orderBy: { locale: 'asc' }
        })

        if (!fallbackConfig) {
          return NextResponse.json({
            success: false,
            error: 'Config not found'
          }, { status: 404 })
        }

        return NextResponse.json({
          success: true,
          data: fallbackConfig
        })
      }

      return NextResponse.json({
        success: true,
        data: config
      })
    } else {
      // 获取所有配置
      const configs = await prisma.brand_config.findMany({
        where: { locale },
        orderBy: { key: 'asc' }
      })

      // 转换为对象格式方便使用
      const configMap = configs.reduce((acc, config) => {
        acc[config.key] = {
          value: config.value,
          type: config.type
        }
        return acc
      }, {} as Record<string, { value: string; type: string }>)

      return NextResponse.json({
        success: true,
        data: configMap
      })
    }
  } catch (error) {
    console.error('Error fetching brand config:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch brand config'
    }, { status: 500 })
  }
}

// POST - 更新或创建品牌配置（需要管理员权限）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { key, locale = 'zh-CN', value, type = 'text' } = body

    if (!key || !value) {
      return NextResponse.json({
        success: false,
        error: 'Key and value are required'
      }, { status: 400 })
    }

    // 验证管理员权限
    await requireAdmin()

    // 使用 upsert 创建或更新配置
    const config = await prisma.brand_config.upsert({
      where: {
        key_locale: {
          key: key,
          locale: locale
        }
      },
      update: {
        value: value,
        type: type
      },
      create: {
        id: crypto.randomUUID(),
        key: key,
        locale: locale,
        value: value,
        type: type
      }
    })

    return NextResponse.json({
      success: true,
      data: config
    })
  } catch (error) {
    console.error('Error updating brand config:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to update brand config'
    }, { status: 500 })
  }
}

// PUT - 批量更新配置
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { locale = 'zh-CN', configs } = body

    if (!configs || !Array.isArray(configs)) {
      return NextResponse.json({
        success: false,
        error: 'Configs array is required'
      }, { status: 400 })
    }

    // 验证管理员权限
    await requireAdmin()


    // 批量更新配置
    const results = await Promise.all(
      configs.map((config: { key: string; value: string; type?: string }) =>
        prisma.brand_config.upsert({
          where: {
            key_locale: {
              key: config.key,
              locale: locale
            }
          },
          update: {
            value: config.value,
            type: config.type || 'text'
          },
          create: {
            id: crypto.randomUUID(),
            key: config.key,
            locale: locale,
            value: config.value,
            type: config.type || 'text'
          }
        })
      )
    )

    return NextResponse.json({
      success: true,
      data: results
    })
  } catch (error) {
    console.error('Error batch updating brand config:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to batch update brand config'
    }, { status: 500 })
  }
}

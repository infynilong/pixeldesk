import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthFromRequest } from '@/lib/serverAuth'
import prisma from '@/lib/db'
import { z } from 'zod'
import { enrichPlayerWithCharacterUrl } from '@/lib/characterUtils'
import { randomUUID } from 'crypto'

/**
 * 验证角色名称是否在数据库中存在且可用
 */
async function validateCharacterSprite(characterName: string): Promise<boolean> {
  try {
    const character = await prisma.characters.findFirst({
      where: {
        name: characterName,
        isActive: true
      }
    })
    return character !== null
  } catch (error) {
    console.error('Error validating character:', error)
    return false
  }
}

// 创建角色的验证模式（基础验证）
const createPlayerSchema = z.object({
  playerName: z.string().min(1).max(50),
  characterSprite: z.string().min(1) // 字符串验证，具体角色存在性在函数中验证
})

// 更新角色的验证模式（基础验证）
const updatePlayerSchema = z.object({
  playerName: z.string().min(1).max(50).optional(),
  characterSprite: z.string().min(1).optional(), // 字符串验证，具体角色存在性在函数中验证
  currentX: z.number().int().optional(),
  currentY: z.number().int().optional(),
  currentScene: z.string().optional(),
  playerState: z.any().optional(),
  steps: z.number().int().optional(),
  distance: z.number().optional()
})

// GET - 获取当前用户的角色数据
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuthFromRequest(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    const user = authResult.user

    const player = await prisma.players.findUnique({
      where: { userId: user.id },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            status_history: {
              orderBy: {
                timestamp: 'desc'
              },
              take: 1
            }
          }
        }
      }
    }) as any

    if (!player) {
      return NextResponse.json({
        success: false,
        error: 'Player not found',
        hasPlayer: false
      }, { status: 404 })
    }

    // 添加角色图片URL
    const playerWithUrl = enrichPlayerWithCharacterUrl({
      id: player.id,
      playerName: player.playerName,
      characterSprite: player.characterSprite,
      currentX: player.currentX,
      currentY: player.currentY,
      currentScene: player.currentScene,
      lastActiveAt: player.lastActiveAt,
      playerState: player.playerState,
      createdAt: player.createdAt,
      updatedAt: player.updatedAt
    })

    // 提取最新状态
    const responseUser = player.users;
    if (responseUser && responseUser.status_history && responseUser.status_history.length > 0) {
      responseUser.current_status = responseUser.status_history[0];
      delete responseUser.status_history;
    }

    return NextResponse.json({
      success: true,
      data: {
        player: playerWithUrl,
        user: responseUser
      },
      hasPlayer: true
    })
  } catch (error) {
    console.error('Get player error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// POST - 为当前用户创建新角色
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuthFromRequest(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    const user = authResult.user

    // 检查用户是否已有角色
    const existingPlayer = await prisma.players.findUnique({
      where: { userId: user.id }
    })

    if (existingPlayer) {
      return NextResponse.json({
        success: false,
        error: 'Player already exists'
      }, { status: 400 })
    }

    const body = await request.json()
    const validatedData = createPlayerSchema.parse(body)

    // 验证角色是否存在于数据库中
    const isValidCharacter = await validateCharacterSprite(validatedData.characterSprite)
    if (!isValidCharacter) {
      return NextResponse.json({
        success: false,
        error: 'Invalid character sprite. Character not found or inactive.'
      }, { status: 400 })
    }

    const player = await prisma.players.create({
      data: {
        id: randomUUID(),
        userId: user.id,
        playerName: validatedData.playerName,
        characterSprite: validatedData.characterSprite,
        currentX: 400,
        currentY: 300,
        currentScene: 'Start',
        updatedAt: new Date()
      },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        }
      }
    }) as any

    // 保存用户数据
    const userData = player.users as { id: string; name: string; email: string; avatar: string | null }

    // 添加角色图片URL
    const playerWithUrl = enrichPlayerWithCharacterUrl({
      id: player.id,
      playerName: player.playerName,
      characterSprite: player.characterSprite,
      currentX: player.currentX,
      currentY: player.currentY,
      currentScene: player.currentScene,
      lastActiveAt: player.lastActiveAt,
      playerState: player.playerState,
      createdAt: player.createdAt,
      updatedAt: player.updatedAt
    })

    return NextResponse.json({
      success: true,
      data: {
        player: playerWithUrl,
        user: userData
      }
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid input data',
        details: error.issues
      }, { status: 400 })
    }

    console.error('Create player error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// PUT - 更新当前用户的角色数据
export async function PUT(request: NextRequest) {
  try {
    const authResult = await verifyAuthFromRequest(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    const user = authResult.user

    const existingPlayer = await prisma.players.findUnique({
      where: { userId: user.id }
    })

    if (!existingPlayer) {
      return NextResponse.json({
        success: false,
        error: 'Player not found'
      }, { status: 404 })
    }

    const body = await request.json()

    console.log('🔴 [API /api/player PUT] 收到请求:', { userId: user.id, body })

    const validatedData = updatePlayerSchema.parse(body)

    // 如果更新角色精灵，验证其是否存在
    if (validatedData.characterSprite !== undefined) {
      const isValidCharacter = await validateCharacterSprite(validatedData.characterSprite)
      if (!isValidCharacter) {
        return NextResponse.json({
          success: false,
          error: 'Invalid character sprite. Character not found or inactive.'
        }, { status: 400 })
      }
    }

    // 构建更新数据
    const updateData: any = {
      lastActiveAt: new Date()
    }

    // 直接设置字段（不再有gameGold/gamePoints）
    if (validatedData.playerName !== undefined) updateData.playerName = validatedData.playerName
    if (validatedData.characterSprite !== undefined) updateData.characterSprite = validatedData.characterSprite
    if (validatedData.currentX !== undefined) updateData.currentX = validatedData.currentX
    if (validatedData.currentY !== undefined) updateData.currentY = validatedData.currentY
    if (validatedData.currentScene !== undefined) updateData.currentScene = validatedData.currentScene
    if (validatedData.playerState !== undefined) updateData.playerState = validatedData.playerState

    // 👣 步数与距离更新逻辑
    const stepsToSync = validatedData.steps || 0
    const distanceToSync = validatedData.distance || 0
    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD

    console.log('🔴 [API /api/player PUT] 开始更新数据库...', { steps: stepsToSync, distance: distanceToSync })
    const updatedPlayer = await prisma.$transaction(async (tx: any) => {
      // 1. 更新玩家位置和状态
      const player = await tx.players.update({
        where: { userId: user.id },
        data: updateData,
        include: {
          users: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
              points: true
            }
          }
        }
      })

      // 2. 更新每日步数 (Upsert)
      if (stepsToSync > 0) {
        await tx.player_steps.upsert({
          where: {
            userId_date: {
              userId: user.id,
              date: today
            }
          },
          update: {
            steps: { increment: stepsToSync },
            distance: { increment: distanceToSync }
          },
          create: {
            userId: user.id,
            date: today,
            steps: stepsToSync,
            distance: distanceToSync
          }
        })
      }

      return player
    })

    console.log('✅ [API /api/player PUT] 数据库更新成功！', {
      userId: user.id,
      currentX: updatedPlayer.currentX,
      currentY: updatedPlayer.currentY
    })

    return NextResponse.json({
      success: true,
      data: {
        player: {
          id: updatedPlayer.id,
          playerName: updatedPlayer.playerName,
          characterSprite: updatedPlayer.characterSprite,
          currentX: updatedPlayer.currentX,
          currentY: updatedPlayer.currentY,
          currentScene: updatedPlayer.currentScene,
          lastActiveAt: updatedPlayer.lastActiveAt,
          playerState: updatedPlayer.playerState,
          createdAt: updatedPlayer.createdAt,
          updatedAt: updatedPlayer.updatedAt
        },
        user: updatedPlayer.users  // users对象包含points字段
      }
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid input data',
        details: error.issues
      }, { status: 400 })
    }

    console.error('❌ [API /api/player PUT] 更新失败:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// DELETE - 删除当前用户的角色（重置用）
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await verifyAuthFromRequest(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    const user = authResult.user

    const existingPlayer = await prisma.players.findUnique({
      where: { userId: user.id }
    })

    if (!existingPlayer) {
      return NextResponse.json({
        success: false,
        error: 'Player not found'
      }, { status: 404 })
    }

    await prisma.players.delete({
      where: { userId: user.id }
    })

    return NextResponse.json({
      success: true,
      message: 'Player deleted successfully'
    })
  } catch (error) {
    console.error('Delete player error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
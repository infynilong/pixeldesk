import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthFromRequest } from '@/lib/serverAuth'
import prisma from '@/lib/prisma'
import { z } from 'zod'

// 角色精灵键列表
const validCharacterSprites = [
  'Premade_Character_48x48_01', 'Premade_Character_48x48_02', 'Premade_Character_48x48_03',
  'Premade_Character_48x48_04', 'Premade_Character_48x48_05', 'Premade_Character_48x48_06',
  'Premade_Character_48x48_07', 'Premade_Character_48x48_08', 'Premade_Character_48x48_09',
  'Premade_Character_48x48_10', 'Premade_Character_48x48_11', 'Premade_Character_48x48_12',
  'Premade_Character_48x48_13', 'Premade_Character_48x48_14', 'Premade_Character_48x48_15',
  'Premade_Character_48x48_16', 'Premade_Character_48x48_17', 'Premade_Character_48x48_18',
  'Premade_Character_48x48_19', 'Premade_Character_48x48_20'
]

// 创建角色的验证模式
const createPlayerSchema = z.object({
  playerName: z.string().min(1).max(50),
  characterSprite: z.enum(validCharacterSprites as [string, ...string[]])
})

// 更新角色的验证模式
const updatePlayerSchema = z.object({
  playerName: z.string().min(1).max(50).optional(),
  characterSprite: z.enum(validCharacterSprites as [string, ...string[]]).optional(),
  currentX: z.number().int().optional(),
  currentY: z.number().int().optional(),
  currentScene: z.string().optional(),
  playerState: z.any().optional()
})

// GET - 获取当前用户的角色数据
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuthFromRequest(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    const user = authResult.user

    const player = await prisma.player.findUnique({
      where: { userId: user.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        }
      }
    })

    if (!player) {
      return NextResponse.json({ 
        success: false, 
        error: 'Player not found',
        hasPlayer: false 
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: {
        player: {
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
        },
        user: player.user
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
    const existingPlayer = await prisma.player.findUnique({
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

    const player = await prisma.player.create({
      data: {
        userId: user.id,
        playerName: validatedData.playerName,
        characterSprite: validatedData.characterSprite,
        currentX: 400,
        currentY: 300,
        currentScene: 'Start'
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        player: {
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
        },
        user: player.user
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

    const existingPlayer = await prisma.player.findUnique({
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

    console.log('🔴 [API /api/player PUT] 开始更新数据库...')
    const updatedPlayer = await prisma.player.update({
      where: { userId: user.id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            points: true  // 返回User.points用于前端显示
          }
        }
      }
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
        user: updatedPlayer.user  // user对象包含points字段
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

    const existingPlayer = await prisma.player.findUnique({
      where: { userId: user.id }
    })

    if (!existingPlayer) {
      return NextResponse.json({ 
        success: false, 
        error: 'Player not found' 
      }, { status: 404 })
    }

    await prisma.player.delete({
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
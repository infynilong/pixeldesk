import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { rewardPoints } from '@/lib/pointsManager'

// 获取帖子的回复 - 带重试机制处理数据库连接问题
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id: postId } = params
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '10')

  console.log(`📖 [GET replies] 获取回复列表，postId: ${postId}, page: ${page}, limit: ${limit}`)

  const skip = (page - 1) * limit

  // 重试机制来处理数据库连接问题
  let retries = 3
  let lastError = null

  while (retries > 0) {
    try {
      console.log(`📡 [GET replies] 尝试获取回复，剩余重试次数: ${retries}`)

      // 验证帖子存在
      const post = await prisma.posts.findUnique({
        where: { id: postId },
        select: { id: true }
      })

      if (!post) {
        return NextResponse.json(
          { error: 'Post not found' },
          { status: 404 }
        )
      }

      const [replies, totalCount] = await Promise.all([
        prisma.postReply.findMany({
          where: { postId },
          orderBy: { createdAt: 'asc' },
          skip,
          take: limit,
          include: {
            author: {
              select: {
                id: true,
                name: true,
                avatar: true,
                customAvatar: true
              }
            }
          }
        }),
        prisma.postReply.count({ where: { postId } })
      ])

      const totalPages = Math.ceil(totalCount / limit)

      console.log(`✅ [GET replies] 成功获取回复:`, { count: replies.length, totalCount })

      return NextResponse.json({
        success: true,
        data: {
          replies,
          pagination: {
            page,
            limit,
            totalCount,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1
          }
        }
      })

    } catch (error: any) {
      lastError = error
      retries--

      console.error(`❌ [GET replies] 数据库操作失败 (剩余重试: ${retries}):`, error.message)

      if (retries > 0) {
        // 等待后重试
        await new Promise(resolve => setTimeout(resolve, 1000))
        continue
      }

      // 所有重试都失败了
      console.error('❌ [GET replies] 所有重试都失败，返回错误')

      // 根据错误类型返回更具体的错误信息
      if (error.code === 'P1001') {
        return NextResponse.json({
          success: false,
          error: 'Database connection failed',
          code: 'DB_CONNECTION_ERROR',
          data: { replies: [], pagination: { page, limit, totalCount: 0, totalPages: 0, hasNextPage: false, hasPrevPage: false } }
        }, { status: 200 }) // 返回空数据而不是错误，让前端继续工作
      }

      if (error.code === 'P2024') {
        return NextResponse.json({
          success: false,
          error: 'Database timeout',
          code: 'DB_TIMEOUT_ERROR',
          data: { replies: [], pagination: { page, limit, totalCount: 0, totalPages: 0, hasNextPage: false, hasPrevPage: false } }
        }, { status: 200 })
      }

      return NextResponse.json({
        success: false,
        error: 'Database error',
        code: 'DB_ERROR',
        data: { replies: [], pagination: { page, limit, totalCount: 0, totalPages: 0, hasNextPage: false, hasPrevPage: false } }
      }, { status: 200 })
    }
  }
}

// 创建新回复 - 带重试机制处理数据库连接问题
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id: postId } = params
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')

  console.log(`💬 [POST replies] 开始创建回复，postId: ${postId}, userId: ${userId}`)

  // 验证用户身份
  if (!userId) {
    return NextResponse.json(
      {
        success: false,
        error: 'Unauthorized: User authentication required',
        message: '需要登录才能回复'
      },
      { status: 401 }
    )
  }

  let body
  try {
    body = await request.json()
  } catch (error) {
    console.error('❌ [POST replies] JSON解析失败:', error)
    return NextResponse.json(
      { error: 'Invalid JSON' },
      { status: 400 }
    )
  }

  const { content } = body

  if (!content || content.trim().length === 0) {
    return NextResponse.json(
      { error: 'Content is required' },
      { status: 400 }
    )
  }

  if (content.length > 1000) {
    return NextResponse.json(
      { error: 'Reply too long (max 1000 characters)' },
      { status: 400 }
    )
  }

  // 重试机制来处理数据库连接问题
  let retries = 3
  let lastError = null

  while (retries > 0) {
    try {
      console.log(`📡 [POST replies] 尝试创建回复，剩余重试次数: ${retries}`)

      // 验证帖子存在，并获取作者信息
      const post = await prisma.posts.findUnique({
        where: { id: postId },
        select: {
          id: true,
          authorId: true,
          title: true,
          content: true,
          author: {
            select: {
              id: true,
              name: true
            }
          }
        }
      })

      if (!post) {
        return NextResponse.json(
          { error: 'Post not found' },
          { status: 404 }
        )
      }

      // 验证用户存在
      const user = await prisma.users.findUnique({
        where: { id: userId },
        select: { id: true, name: true, avatar: true }
      })

      if (!user) {
        return NextResponse.json(
          {
            success: false,
            error: 'User not found or invalid',
            message: '用户不存在或无效，请重新登录'
          },
          { status: 401 }
        )
      }

      // 使用事务创建回复并更新帖子的回复计数
      const result = await prisma.$transaction(async (tx) => {
        const reply = await tx.postReply.create({
          data: {
            postId,
            authorId: userId,
            content: content.trim()
          },
          include: {
            author: {
              select: {
                id: true,
                name: true,
                avatar: true,
                customAvatar: true
              }
            }
          }
        })

        // 更新帖子回复计数
        await tx.post.update({
          where: { id: postId },
          data: { replyCount: { increment: 1 } }
        })

        // 创建通知：如果回复者不是帖子作者，为帖子作者创建通知
        if (post.authorId !== userId) {
          await tx.notification.create({
            data: {
              userId: post.authorId, // 帖子作者接收通知
              type: 'POST_REPLY',
              title: '新的回复',
              message: `${user.name} 回复了你的帖子${post.title ? `"${post.title}"` : ''}`,
              relatedPostId: postId,
              relatedReplyId: reply.id,
              relatedUserId: userId // 回复者
            }
          })
          console.log(`✅ [POST replies] 已为用户 ${post.authorId} 创建回复通知`)
        }

        return reply
      })

      console.log(`✅ [POST replies] 回复创建成功:`, { id: result.id, content: result.content.substring(0, 50) })

      // 奖励积分给回复者（不影响回复创建，失败也不抛出错误）
      rewardPoints(userId, 'reply_post_reward', `回复帖子 ${postId}`)
        .then(reward => {
          if (reward.success) {
            console.log(`✨ [POST replies] 用户 ${userId} 获得 ${reward.points} 积分奖励`)
          }
        })
        .catch(err => {
          console.error('❌ [POST replies] 积分奖励失败:', err)
        })

      return NextResponse.json({
        success: true,
        data: result
      })

    } catch (error: any) {
      lastError = error
      retries--

      console.error(`❌ [POST replies] 数据库操作失败 (剩余重试: ${retries}):`, error.message)

      if (retries > 0) {
        // 等待后重试
        await new Promise(resolve => setTimeout(resolve, 1000))
        continue
      }

      // 所有重试都失败了
      console.error('❌ [POST replies] 所有重试都失败，返回错误')

      // 根据错误类型返回更具体的错误信息
      if (error.code === 'P1001') {
        return NextResponse.json({
          success: false,
          error: 'Database connection failed',
          code: 'DB_CONNECTION_ERROR'
        }, { status: 503 }) // Service Unavailable
      }

      if (error.code === 'P2024') {
        return NextResponse.json({
          success: false,
          error: 'Database timeout',
          code: 'DB_TIMEOUT_ERROR'
        }, { status: 503 })
      }

      return NextResponse.json({
        success: false,
        error: 'Database error',
        code: 'DB_ERROR'
      }, { status: 500 })
    }
  }
}
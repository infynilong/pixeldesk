import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// 获取单个帖子详情
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') // 用于检查是否已点赞

    const post = await prisma.posts.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            avatar: true,
            customAvatar: true
          }
        },
        post_replies: {
          orderBy: { createdAt: 'asc' },
          take: 20, // 只返回前20个回复，更多的通过专门的回复API获取
          include: {
            users: {
              select: {
                id: true,
                name: true,
                avatar: true,
                customAvatar: true
              }
            }
          }
        },
        _count: {
          select: {
            post_replies: true,
            post_likes: true
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

    // 增加浏览量
    await prisma.posts.update({
      where: { id },
      data: { viewCount: { increment: 1 } }
    })

    let isLiked = false
    if (userId) {
      const like = await prisma.post_likes.findUnique({
        where: {
          postId_userId: {
            postId: id,
            userId: userId
          }
        }
      })
      isLiked = !!like
    }

    // 转换数据结构：将 users 映射为 author，post_replies 映射为 replies
    const formattedPost = {
      ...post,
      author: post.users,
      replies: post.post_replies?.map((reply: any) => ({
        ...reply,
        author: reply.users,
        users: undefined
      })),
      users: undefined,
      post_replies: undefined,
      isLiked
    }

    return NextResponse.json({
      success: true,
      data: formattedPost
    })

  } catch (error) {
    console.error('Error fetching post:', error)
    return NextResponse.json(
      { error: 'Failed to fetch post' },
      { status: 500 }
    )
  }
}

// 更新帖子（仅作者可更新）- PUT方法
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      )
    }

    // 检查帖子是否存在且用户是否为作者
    const existingPost = await prisma.posts.findUnique({
      where: { id },
      select: { authorId: true }
    })

    if (!existingPost) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      )
    }

    if (existingPost.authorId !== userId) {
      return NextResponse.json(
        { error: 'Only the author can update this post' },
        { status: 403 }
      )
    }

    // 获取更新数据
    const updateData = await request.json()

    // 更新帖子
    const updatedPost = await prisma.posts.update({
      where: { id },
      data: {
        title: updateData.title,
        content: updateData.content,
        type: updateData.type || 'TEXT',
        imageUrl: updateData.imageUrl,
        imageUrls: updateData.imageUrls,
        summary: updateData.summary,
        wordCount: updateData.wordCount,
        readTime: updateData.readTime,
        tags: updateData.tags,
        coverImage: updateData.coverImage,
        isDraft: updateData.isDraft,
        publishedAt: updateData.publishedAt,
        updatedAt: new Date()
      },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            avatar: true,
            customAvatar: true
          }
        }
      }
    })

    // 转换数据结构
    const formattedPost = {
      ...updatedPost,
      author: updatedPost.users,
      users: undefined
    }

    return NextResponse.json({
      success: true,
      data: formattedPost
    })

  } catch (error) {
    console.error('Error updating post:', error)
    return NextResponse.json(
      { error: 'Failed to update post' },
      { status: 500 }
    )
  }
}

// 更新帖子（仅作者可更新）- PATCH方法
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      )
    }

    // 检查帖子是否存在且用户是否为作者
    const existingPost = await prisma.posts.findUnique({
      where: { id },
      select: { authorId: true }
    })

    if (!existingPost) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      )
    }

    if (existingPost.authorId !== userId) {
      return NextResponse.json(
        { error: 'Only the author can update this post' },
        { status: 403 }
      )
    }

    // 获取更新数据
    const updateData = await request.json()

    // 更新帖子
    const updatedPost = await prisma.posts.update({
      where: { id },
      data: {
        title: updateData.title,
        content: updateData.content,
        type: updateData.type || 'TEXT',
        imageUrl: updateData.imageUrl,
        imageUrls: updateData.imageUrls,
        summary: updateData.summary,
        wordCount: updateData.wordCount,
        readTime: updateData.readTime,
        tags: updateData.tags,
        coverImage: updateData.coverImage,
        isDraft: updateData.isDraft,
        publishedAt: updateData.publishedAt,
        updatedAt: new Date()
      },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            avatar: true,
            customAvatar: true
          }
        }
      }
    })

    // 转换数据结构
    const formattedPost = {
      ...updatedPost,
      author: updatedPost.users,
      users: undefined
    }

    return NextResponse.json({
      success: true,
      data: formattedPost
    })

  } catch (error) {
    console.error('Error updating post:', error)
    return NextResponse.json(
      { error: 'Failed to update post' },
      { status: 500 }
    )
  }
}

// 删除帖子（仅作者可删除）
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      )
    }

    // 检查帖子是否存在且用户是否为作者
    const post = await prisma.posts.findUnique({
      where: { id },
      select: { authorId: true }
    })

    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      )
    }

    if (post.authorId !== userId) {
      return NextResponse.json(
        { error: 'Only the author can delete this post' },
        { status: 403 }
      )
    }

    await prisma.posts.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      message: 'Post deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting post:', error)
    return NextResponse.json(
      { error: 'Failed to delete post' },
      { status: 500 }
    )
  }
}
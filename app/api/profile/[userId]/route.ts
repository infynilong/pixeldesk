import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params
    const { searchParams } = new URL(request.url)
    const currentUserId = searchParams.get('currentUserId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      )
    }

    // 获取用户基本信息
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        avatar: true,
        customAvatar: true,
        email: true,
        createdAt: true,
        points: true,
        user_workstations: {
          select: {
            workstationId: true
          },
          take: 1
        },
        _count: {
          select: {
            posts: {
              where: {
                isDraft: false,
                isPublic: true
              }
            },
            post_likes: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // 获取用户的帖子（非博客）
    const posts = await prisma.posts.findMany({
      where: {
        authorId: userId,
        type: {
          in: ['TEXT', 'IMAGE', 'MIXED']
        },
        isDraft: false,
        isPublic: true
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        users: {
          select: {
            id: true,
            name: true,
            avatar: true,
            customAvatar: true,
            user_workstations: {
              select: {
                workstationId: true
              },
              take: 1
            }
          }
        },
        post_likes: currentUserId ? {
          where: {
            userId: currentUserId
          },
          select: {
            userId: true
          }
        } : false
      }
    })

    // 获取用户的博客
    const blogs = await prisma.posts.findMany({
      where: {
        authorId: userId,
        type: 'MARKDOWN',
        isDraft: false,
        isPublic: true
      },
      orderBy: { createdAt: 'desc' },
      take: 6,
      include: {
        users: {
          select: {
            id: true,
            name: true,
            avatar: true,
            customAvatar: true,
            user_workstations: {
              select: {
                workstationId: true
              },
              take: 1
            }
          }
        },
        post_likes: currentUserId ? {
          where: {
            userId: currentUserId
          },
          select: {
            userId: true
          }
        } : false
      }
    })

    // 获取博客总数
    const totalBlogs = await prisma.posts.count({
      where: {
        authorId: userId,
        type: 'MARKDOWN',
        isDraft: false,
        isPublic: true
      }
    })

    // 处理点赞状态并转换数据结构
    const postsWithLikeStatus = posts.map((post: any) => ({
      ...post,
      author: {
        ...post.users,
        workstationId: post.users?.user_workstations?.[0]?.workstationId || null,
        user_workstations: undefined
      },
      users: undefined,
      isLiked: currentUserId ? (post.post_likes && post.post_likes.length > 0) : false,
      post_likes: undefined
    }))

    const blogsWithLikeStatus = blogs.map((blog: any) => ({
      ...blog,
      author: {
        ...blog.users,
        workstationId: blog.users?.user_workstations?.[0]?.workstationId || null,
        user_workstations: undefined
      },
      users: undefined,
      isLiked: currentUserId ? (blog.post_likes && blog.post_likes.length > 0) : false,
      post_likes: undefined
    }))

    return NextResponse.json({
      success: true,
      data: {
        users: {
          ...user,
          workstationId: user.user_workstations?.[0]?.workstationId || null,
          user_workstations: undefined,
          postsCount: user._count.posts,
          likesCount: user._count.post_likes,
          _count: undefined
        },
        posts: postsWithLikeStatus,
        blogs: blogsWithLikeStatus,
        totalBlogs
      }
    })

  } catch (error) {
    console.error('Error fetching user profile:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user profile' },
      { status: 500 }
    )
  }
}

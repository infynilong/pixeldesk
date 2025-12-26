import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import PostDetailClient from './PostDetailClient'

interface PageProps {
  params: { id: string }
}

// 生成动态metadata用于SEO
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = params

  try {
    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      }
    })

    if (!post) {
      return {
        title: '文章未找到 - PixelDesk',
        description: '您访问的文章不存在'
      }
    }

    const title = post.title || '无标题文章'
    const description = post.summary || post.content.substring(0, 160) + '...'
    const imageUrl = post.coverImage || post.imageUrl || '/default-og-image.png'

    return {
      title: `${title} - PixelDesk`,
      description,
      authors: [{ name: post.author.name }],
      keywords: post.tags || [],
      openGraph: {
        title,
        description,
        type: 'article',
        publishedTime: (post.publishedAt || post.createdAt).toISOString(),
        modifiedTime: post.updatedAt.toISOString(),
        authors: [post.author.name],
        tags: post.tags || [],
        images: [
          {
            url: imageUrl,
            width: 1200,
            height: 630,
            alt: title
          }
        ]
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [imageUrl]
      }
    }
  } catch (error) {
    console.error('Error generating metadata:', error)
    return {
      title: 'PixelDesk - 社交办公游戏',
      description: '一个有趣的社交办公游戏平台'
    }
  }
}

export default async function PostDetailPage({ params }: PageProps) {
  const { id } = params

  try {
    // 服务器端获取帖子数据
    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        },
        _count: {
          select: {
            replies: true,
            likes: true
          }
        }
      }
    })

    if (!post) {
      notFound()
    }

    // 增加浏览量
    await prisma.post.update({
      where: { id },
      data: { viewCount: { increment: 1 } }
    })

    // 转换数据格式以匹配Post类型
    const postData = {
      id: post.id,
      title: post.title,
      content: post.content,
      type: post.type as 'TEXT' | 'IMAGE' | 'MIXED' | 'MARKDOWN',
      imageUrl: post.imageUrl,
      isPublic: post.isPublic,
      likeCount: post._count.likes,
      replyCount: post._count.replies,
      viewCount: post.viewCount,
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
      author: post.author,
      isLiked: false, // 客户端会更新这个值
      summary: post.summary,
      wordCount: post.wordCount,
      readTime: post.readTime,
      tags: post.tags,
      coverImage: post.coverImage,
      isDraft: post.isDraft,
      publishedAt: post.publishedAt?.toISOString() || null
    }

    // 生成JSON-LD结构化数据用于SEO
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: post.title || '无标题文章',
      description: post.summary || post.content.substring(0, 160),
      image: post.coverImage || post.imageUrl,
      datePublished: post.publishedAt?.toISOString() || post.createdAt.toISOString(),
      dateModified: post.updatedAt.toISOString(),
      author: {
        '@type': 'Person',
        name: post.author.name
      },
      publisher: {
        '@type': 'Organization',
        name: 'PixelDesk',
        logo: {
          '@type': 'ImageObject',
          url: '/logo.png'
        }
      },
      wordCount: post.wordCount,
      articleSection: post.tags?.[0] || 'General',
      keywords: post.tags?.join(', ')
    }

    return (
      <>
        {/* JSON-LD 结构化数据 */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        <PostDetailClient initialPost={postData} />
      </>
    )
  } catch (error) {
    console.error('Error loading post:', error)
    notFound()
  }
}

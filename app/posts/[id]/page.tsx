import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import PostDetailClient from './PostDetailClient'

interface PageProps {
  params: { id: string }
}

// 获取品牌配置的辅助函数
async function getBrandConfig(locale: string = 'zh-CN') {
  try {
    const configs = await prisma.brand_config.findMany({
      where: { locale }
    })

    const configMap = configs.reduce((acc, config) => {
      acc[config.key] = config.value
      return acc
    }, {} as Record<string, string>)

    return {
      app_name: configMap.app_name || '象素工坊',
      app_slogan: configMap.app_slogan || '社交办公游戏',
      app_logo: configMap.app_logo || '/assets/icon.png',
      app_description: configMap.app_description || '一个有趣的社交办公游戏平台'
    }
  } catch (error) {
    console.error('Error fetching brand config:', error)
    return {
      app_name: '象素工坊',
      app_slogan: '社交办公游戏',
      app_logo: '/assets/icon.png',
      app_description: '一个有趣的社交办公游戏平台'
    }
  }
}

// 生成动态metadata用于SEO
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = params
  const brandConfig = await getBrandConfig('zh-CN')

  try {
    const post = await prisma.posts.findUnique({
      where: { id },
      include: {
        users: {
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
        title: `文章未找到 - ${brandConfig.app_name}`,
        description: '您访问的文章不存在'
      }
    }

    const title = post.title || '无标题文章'
    const description = post.summary || post.content.substring(0, 160) + '...'
    const imageUrl = post.coverImage || post.imageUrl || '/default-og-image.png'

    return {
      title: `${title} - ${brandConfig.app_name}`,
      description,
      authors: [{ name: post.users.name }],
      keywords: post.tags || [],
      openGraph: {
        title,
        description,
        type: 'article',
        publishedTime: (post.publishedAt || post.createdAt).toISOString(),
        modifiedTime: post.updatedAt.toISOString(),
        authors: [post.users.name],
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
      title: `${brandConfig.app_name} - ${brandConfig.app_slogan}`,
      description: brandConfig.app_description
    }
  }
}

export default async function PostDetailPage({ params }: PageProps) {
  const { id } = params
  const brandConfig = await getBrandConfig('zh-CN')

  try {
    // 服务器端获取帖子数据
    const post = await prisma.posts.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            avatar: true
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

    // 获取工位配置，特别是推流成本
    const wsConfig = await prisma.workstation_config.findFirst()
    const billboardPromotionCost = (wsConfig as any)?.billboardPromotionCost ?? 50

    if (!post) {
      notFound()
    }

    // 增加浏览量
    await prisma.posts.update({
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
      imageUrls: post.imageUrls,
      isPublic: post.isPublic,
      likeCount: post._count.post_likes,
      replyCount: post._count.post_replies,
      viewCount: post.viewCount,
      promotionCount: (post as any).promotionCount || 0,
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
      author: post.users,
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
        name: post.users.name
      },
      publisher: {
        '@type': 'Organization',
        name: brandConfig.app_name,
        logo: {
          '@type': 'ImageObject',
          url: brandConfig.app_logo
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

        <PostDetailClient
          initialPost={postData}
          billboardPromotionCost={billboardPromotionCost}
        />
      </>
    )
  } catch (error) {
    console.error('Error loading post:', error)
    notFound()
  }
}

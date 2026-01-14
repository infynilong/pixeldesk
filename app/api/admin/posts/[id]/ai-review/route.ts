import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { GoogleGenerativeAI } from '@google/generative-ai'

// AI 审查 post 内容
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    // 获取 post
    const post = await prisma.posts.findUnique({
      where: { id },
      include: {
        users: {
          select: {
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

    // 获取 AI 配置
    const aiConfig = await prisma.ai_global_config.findFirst({
      where: { isActive: true }
    })

    if (!aiConfig || !aiConfig.apiKey) {
      return NextResponse.json(
        { error: 'AI service not configured' },
        { status: 500 }
      )
    }

    // 使用 Gemini AI 进行内容审查
    const genAI = new GoogleGenerativeAI(aiConfig.apiKey)
    const model = genAI.getGenerativeModel({
      model: aiConfig.modelName || 'gemini-pro'
    })

    // 构建审查提示词
    const prompt = `请审查以下内容是否违规。检查是否包含：
1. 色情、暴力、恐怖内容
2. 政治敏感内容
3. 仇恨言论、歧视性内容
4. 违法信息（诈骗、赌博、毒品等）
5. 垃圾广告或营销内容
6. 其他不适当内容

标题：${post.title || '无标题'}
内容：${post.content}

请以 JSON 格式返回审查结果：
{
  "status": "safe|warning|violation",
  "confidence": 0.0-1.0,
  "issues": ["问题1", "问题2"],
  "suggestion": "审查建议",
  "details": "详细说明"
}

其中 status 含义：
- safe: 内容安全，无问题
- warning: 存在轻微问题，需要人工复查
- violation: 明显违规，建议禁用`

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    // 解析 AI 返回的 JSON
    let aiResult
    try {
      // 尝试提取 JSON（AI 可能返回带代码块的格式）
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        aiResult = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('No JSON found in response')
      }
    } catch (e) {
      // 如果解析失败，使用原始文本
      aiResult = {
        status: 'warning',
        confidence: 0.5,
        issues: [],
        suggestion: '需要人工审查',
        details: text
      }
    }

    // 更新 post 的 AI 审查结果
    const updatedPost = await prisma.posts.update({
      where: { id },
      data: {
        aiReviewResult: JSON.stringify(aiResult),
        aiReviewedAt: new Date(),
        moderationStatus: aiResult.status === 'safe' ? 'approved' :
                         aiResult.status === 'violation' ? 'flagged' : 'pending'
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        post: updatedPost,
        aiResult
      }
    })

  } catch (error) {
    console.error('Error in AI review:', error)
    return NextResponse.json(
      { error: 'Failed to review post', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

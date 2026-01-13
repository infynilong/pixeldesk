import { NextResponse } from 'next/server'
import { redis } from '@/lib/redis'

const ZH_RSS_URL = 'https://readhub.cn/rss'
const EN_RSS_URL = 'https://feeds.bbci.co.uk/news/world/rss.xml'
const CACHE_KEY_PREFIX = 'daily_news_v2_'
const CACHE_TTL = 2 * 60 * 60 // 2 hours for RSS

function parseRSS(xml: string) {
    const items: any[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;

    while ((match = itemRegex.exec(xml)) !== null) {
        const content = match[1];
        const title = content.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/)?.[1] ||
            content.match(/<title>([\s\S]*?)<\/title>/)?.[1] || "";
        const link = content.match(/<link>([\s\S]*?)<\/link>/)?.[1] || "";
        const description = content.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/)?.[1] ||
            content.match(/<description>([\s\S]*?)<\/description>/)?.[1] || "";
        const pubDate = content.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] || "";

        if (title && link) {
            items.push({
                title: title.trim().replace(/&amp;/g, '&'),
                link: link.trim(),
                description: description.trim().replace(/&amp;/g, '&'),
                pubDate: pubDate.trim()
            });
        }
    }
    return items;
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const lang = searchParams.get('lang') || 'zh'
        const cacheKey = `${CACHE_KEY_PREFIX}${lang}`
        const isEn = lang === 'en'
        const url = isEn ? EN_RSS_URL : ZH_RSS_URL

        // 1. Try to get from cache
        const cachedData = await redis.getJSON(cacheKey)
        if (cachedData) {
            console.log(`📰 [News API] Returning cached ${lang} news`)
            return NextResponse.json({ success: true, data: cachedData, source: 'cache' })
        }

        // 2. Fetch from RSS
        console.log(`📰 [News API] Fetching fresh news from ${isEn ? 'BBC' : 'Readhub'} RSS`)
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        })
        const xmlText = await response.text()
        const newsItems = parseRSS(xmlText)

        if (newsItems.length > 0) {
            const resultData = {
                news: newsItems,
                date: new Date().toLocaleDateString(isEn ? 'en-US' : 'zh-CN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                }),
                link: isEn ? 'https://www.bbc.com/news/world' : 'https://readhub.cn',
                lang: lang
            }
            // 3. Store in cache
            await redis.setJSON(cacheKey, resultData, CACHE_TTL)
            return NextResponse.json({ success: true, data: resultData, source: 'api' })
        } else {
            return NextResponse.json({
                success: false,
                error: 'Failed to parse news items'
            }, { status: 502 })
        }
    } catch (error: any) {
        console.error('❌ [News API Error]:', error)
        return NextResponse.json({
            success: false,
            error: 'Internal server error',
            details: error.message
        }, { status: 500 })
    }
}

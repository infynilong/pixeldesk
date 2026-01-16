import { prisma } from './lib/db';

async function main() {
    const posts = await prisma.posts.findMany({
        where: { type: 'MARKDOWN' }
    });

    for (const post of posts) {
        let t = post.content || '';
        // 1. 移除图片 ![alt](url)
        t = t.replace(/!\[.*?\]\(.*?\)/g, '');
        // 2. 移除链接 [text](url) -> text
        t = t.replace(/\[(.*?)\]\(.*?\)/g, '$1');
        // 3. 移除其他格式
        t = t.replace(/[#*`_~>]/g, '');
        t = t.replace(/\s+/g, ' ').trim();

        const summary = t.length > 150 ? t.substring(0, 150) + '...' : t;

        await prisma.posts.update({
            where: { id: post.id },
            data: { summary }
        });
        console.log(`Updated post: ${post.id}`);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());

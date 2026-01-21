/* eslint-disable @typescript-eslint/no-var-requires */
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const nodes = [
        {
            name: '默认',
            slug: 'default',
            description: '默认板块',
            color: '#64748b' // slate-500
        },
        {
            name: '公告',
            slug: 'announcement',
            description: '官方公告发布',
            color: '#ef4444' // red-500
        },
        {
            name: '讨论',
            slug: 'discussion',
            description: '自由交流讨论',
            color: '#3b82f6' // blue-500
        },
        {
            name: '反馈',
            slug: 'feedback',
            description: '建议与问题反馈',
            color: '#f59e0b' // amber-500
        },
        {
            name: '吹水',
            slug: 'water-cooler',
            description: '闲聊八卦',
            color: '#8b5cf6' // violet-500
        }
    ]

    console.log('Start seeding nodes...')

    for (const node of nodes) {
        // Check if node exists by name or slug
        const existingNode = await prisma.post_nodes.findFirst({
            where: {
                OR: [
                    { name: node.name },
                    { slug: node.slug }
                ]
            }
        })

        if (!existingNode) {
            await prisma.post_nodes.create({
                data: node
            })
            console.log(`Created node: ${node.name}`)
        } else {
            console.log(`Node already exists: ${node.name} (ID: ${existingNode.id})`)
        }
    }

    console.log('Seeding finished.')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })

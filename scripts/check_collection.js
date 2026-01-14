const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    console.log('Checking Postcard Exchanges...')
    const exchanges = await prisma.postcard_exchanges.findMany({
        include: {
            sender: { select: { name: true } },
            receiver: { select: { name: true } }
        }
    })
    console.log('Total Exchanges:', exchanges.length)
    exchanges.forEach(e => {
        console.log(`- ${e.sender.name} -> ${e.receiver.name} [${e.status}] (${e.id})`)
    })

    console.log('\nChecking User Collections...')
    const collections = await prisma.user_postcard_collection.findMany({
        include: {
            user: { select: { name: true } },
            owner: { select: { name: true } }
        }
    })
    console.log('Total Collection Items:', collections.length)
    collections.forEach(c => {
        console.log(`- User: ${c.user.name} | From: ${c.owner.name} | Card: ${c.name}`)
    })
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })

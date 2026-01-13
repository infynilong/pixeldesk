
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    console.log('🧹 Cleaning up stuck postcard exchange requests...')

    // Delete all pending requests to allow users to retry cleanly
    // A more targeted approach would be deleting ones without notifications, 
    // but for a dev fix, wiping pending is safer to ensure consistency.
    const { count } = await prisma.postcard_exchanges.deleteMany({
        where: {
            status: 'PENDING'
        }
    })

    console.log(`✅ Deleted ${count} pending exchange requests.`)

    // Also clean up any potential "orphaned" notifications if necessary, 
    // but usually they occupy no logical slots, just UI noise. We leave them.
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })

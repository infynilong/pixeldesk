const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    console.log('Searching for PENDING exchange...')
    const exchange = await prisma.postcard_exchanges.findFirst({
        where: {
            status: 'PENDING'
        }
    })

    if (!exchange) {
        console.log('No PENDING exchange found.')
        return
    }

    console.log(`Found pending exchange: ${exchange.senderId} -> ${exchange.receiverId} (${exchange.id})`)
    console.log('Attempting to process acceptance...')

    try {
        await prisma.$transaction(async (tx) => {
            // 1. Get users with designs
            const sender = await tx.users.findUnique({ where: { id: exchange.senderId }, include: { user_postcards: true } })
            const receiver = await tx.users.findUnique({ where: { id: exchange.receiverId }, include: { user_postcards: true } })

            const getDesignOrDefault = (user) => {
                const design = user.user_postcards
                if (design) return design
                return {
                    name: user.name,
                    content: 'Nice to meet you! 像素世界，幸会！',
                    logoUrl: user.avatar,
                    bgUrl: null,
                    templateId: null
                }
            }

            const senderDesign = getDesignOrDefault(sender)
            const receiverDesign = getDesignOrDefault(receiver)

            console.log('Using designs (or defaults). Creating collection items...')

            // 2. Add to collection
            await tx.user_postcard_collection.create({
                data: {
                    userId: exchange.receiverId,
                    postcardOwnerId: exchange.senderId,
                    name: senderDesign.name,
                    content: senderDesign.content,
                    logoUrl: senderDesign.logoUrl,
                    bgUrl: senderDesign.bgUrl,
                    templateId: senderDesign.templateId
                }
            })

            await tx.user_postcard_collection.create({
                data: {
                    userId: exchange.senderId,
                    postcardOwnerId: exchange.receiverId,
                    name: receiverDesign.name,
                    content: receiverDesign.content,
                    logoUrl: receiverDesign.logoUrl,
                    bgUrl: receiverDesign.bgUrl,
                    templateId: receiverDesign.templateId
                }
            })

            // 3. Update status
            await tx.postcard_exchanges.update({
                where: { id: exchange.id },
                data: { status: 'ACCEPTED' }
            })

            console.log('Exchange processed successfully!')
        })
    } catch (e) {
        console.error('Transaction failed:', e)
    }
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkMessages() {
  try {
    console.log('Checking recent messages in database...');
    
    const messages = await prisma.message.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        sender: {
          select: { name: true, email: true }
        },
        conversation: {
          select: { name: true, type: true }
        }
      }
    });

    console.log(`Found ${messages.length} messages:`);
    messages.forEach((msg, index) => {
      console.log(`\n${index + 1}. Message ID: ${msg.id}`);
      console.log(`   Content: ${msg.content}`);
      console.log(`   Sender: ${msg.sender.name} (${msg.sender.email})`);
      console.log(`   Conversation: ${msg.conversation.name} (${msg.conversation.type})`);
      console.log(`   Status: ${msg.status}`);
      console.log(`   Created: ${msg.createdAt}`);
    });

    // Also check conversations
    console.log('\n\nChecking conversations...');
    const conversations = await prisma.conversation.findMany({
      take: 5,
      orderBy: { updatedAt: 'desc' },
      include: {
        participants: {
          include: {
            user: {
              select: { name: true }
            }
          }
        }
      }
    });

    console.log(`Found ${conversations.length} conversations:`);
    conversations.forEach((conv, index) => {
      console.log(`\n${index + 1}. Conversation ID: ${conv.id}`);
      console.log(`   Name: ${conv.name}`);
      console.log(`   Type: ${conv.type}`);
      console.log(`   Participants: ${conv.participants.map(p => p.user.name).join(', ')}`);
      console.log(`   Updated: ${conv.updatedAt}`);
    });

  } catch (error) {
    console.error('Error checking messages:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMessages();
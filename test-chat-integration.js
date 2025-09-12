const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const JWT_SECRET = "1645c13cd162003cc036c3bd76798574d9fdc4c71074d7ad2dfe0ff5edb53c0d710c0a1d541962fdc97842a5a64285102638763b56450a348f0ac0475466d55f";

async function testChatIntegration() {
  try {
    console.log('Starting chat integration test...');
    
    // Get a real user from the database
    const users = await prisma.user.findMany({ take: 2 });
    if (users.length < 2) {
      console.error('Need at least 2 users in database for testing');
      return;
    }
    
    const [user1, user2] = users;
    console.log('Using users:', user1.name, 'and', user2.name);
    
    // Create a conversation between these users
    const conversation = await prisma.conversation.create({
      data: {
        type: 'direct',
        name: `Test conversation between ${user1.name} and ${user2.name}`,
        participants: {
          create: [
            { userId: user1.id, isActive: true },
            { userId: user2.id, isActive: true }
          ]
        }
      },
      include: {
        participants: true
      }
    });
    
    console.log('Created conversation:', conversation.id);
    
    // Generate JWT token for user1
    const testToken = jwt.sign(
      { userId: user1.id, email: user1.email, name: user1.name },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    console.log('Test token generated for user:', user1.name);
    
    // Connect to WebSocket server
    const ws = new WebSocket(`ws://localhost:3000/api/chat/ws?token=${testToken}`);
    
    // Set timeout to close connection if no response
    const timeout = setTimeout(() => {
      console.log('Timeout: No response received from server');
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
      cleanupTest(conversation.id);
    }, 5000);
    
    ws.on('open', function open() {
      console.log('WebSocket connection established');
      console.log('WebSocket readyState:', ws.readyState);
      
      // Wait a moment to ensure connection is fully established
      setTimeout(() => {
        // Send a test message to the real conversation
        const testMessage = {
          type: 'send_message',
          conversationId: conversation.id,
          content: 'Hello from integration test script'
        };
        
        const messageString = JSON.stringify(testMessage);
        console.log('Sending message string:', messageString);
        console.log('Message length:', messageString.length);
        
        console.log('Sending message now...');
        
        // Check if WebSocket is still open before sending
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(messageString);
          console.log('Test message sent:', testMessage);
        } else {
          console.error('WebSocket is not open. ReadyState:', ws.readyState);
          ws.close();
          cleanupTest(conversation.id);
        }
      }, 500); // Increased delay to ensure connection is fully established
    });
    
    ws.on('message', function message(data) {
      const messageData = JSON.parse(data.toString());
      console.log('Received message:', messageData);
      
      if (messageData.type === 'message_sent' || messageData.type === 'message_received') {
        console.log('SUCCESS: Message was successfully processed!');
        console.log('Message details:', messageData.data);
        
        // Close connection after successful test
        setTimeout(() => {
          ws.close();
          cleanupTest(conversation.id);
        }, 1000);
      } else if (messageData.type === 'error') {
        console.log('ERROR: Message processing failed:', messageData);
        ws.close();
        cleanupTest(conversation.id);
      }
    });
    
    ws.on('error', function error(err) {
      console.error('WebSocket error:', err);
      console.error('Error details:', err.message, err.stack);
      cleanupTest(conversation.id);
    });
    
    // Add close event with more details
    ws.on('close', function close(code, reason) {
      console.log('WebSocket connection closed');
      console.log('Close code:', code);
      console.log('Close reason:', reason?.toString());
    });
    
  } catch (error) {
    console.error('Error in test:', error);
  }
}

async function cleanupTest(conversationId) {
  try {
    // Clean up test conversation
    await prisma.conversation.delete({
      where: { id: conversationId }
    });
    console.log('Cleaned up test conversation');
  } catch (error) {
    console.error('Error cleaning up:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testChatIntegration().catch(console.error);
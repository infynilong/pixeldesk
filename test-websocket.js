const WebSocket = require('ws');
const jwt = require('jsonwebtoken');

// Generate a test JWT token using the actual JWT secret from .env.local
const JWT_SECRET = "1645c13cd162003cc036c3bd76798574d9fdc4c71074d7ad2dfe0ff5edb53c0d710c0a1d541962fdc97842a5a64285102638763b56450a348f0ac0475466d55f";
const testToken = jwt.sign(
  { userId: 'test-user-id', email: 'test@example.com', name: 'Test User' },
  JWT_SECRET,
  { expiresIn: '24h' }
);

console.log('Test token:', testToken);

// Connect to WebSocket server
const ws = new WebSocket(`ws://localhost:3000/api/chat/ws?token=${testToken}`);

ws.on('open', function open() {
  console.log('WebSocket connection established');
  
  // Send a test message
  const testMessage = {
    type: 'send_message',
    conversationId: 'test-conversation-id',
    content: 'Hello from test script'
  };
  
  ws.send(JSON.stringify(testMessage));
  console.log('Test message sent:', testMessage);
});

ws.on('message', function message(data) {
  console.log('Received message:', data.toString());
  
  // If we receive a message response, close after a short delay
  setTimeout(() => {
    ws.close();
  }, 1000);
});

ws.on('error', function error(err) {
  console.error('WebSocket error:', err);
});

ws.on('close', function close() {
  console.log('WebSocket connection closed');
});